@part I | Content at Scale | Systems whose main job is moving and storing very large amounts of data — video, files and the web itself — as cheaply and reliably as possible.

# Video Streaming Platform

Design a platform where creators upload videos and viewers around the world watch them smoothly on any device and connection. The defining traits are enormous file sizes, expensive processing, and a read load that dwarfs everything else.

## Step 1: Requirements

**Functional**

- Creators upload videos (up to several GB) with a title, description and thumbnail.
- Viewers stream videos on web, mobile and TV, at a quality that adapts to their connection.
- Viewers see view counts, like videos and get a home page of recommendations.
- Search by title and description (we will touch on this only briefly).

**Non-functional**

- Playback starts quickly (under 2 s) and rarely stalls (rebuffering is the number-one complaint).
- Uploads are never lost once acknowledged. Processing may take minutes.
- Highly available for playback. Brief unavailability of uploads is more tolerable.
- Scale: 500M daily viewers, 1M uploads per day.

**Out of scope:** live streaming, ads, comments, monetisation.

## Step 2: Estimates

- **Uploads:** 1M/day ≈ 12/s. Average raw upload 500 MB, so about **500 TB/day** of raw video.
- **Transcoded outputs:** about 6 renditions (240p–4K) at a combined ~50% of the raw size, so ~250 TB/day more. Keeping raw files plus renditions with replication or erasure coding means **hundreds of PB per year**. Object storage is the only option.
- **Views:** 500M viewers × 5 videos/day = 2.5B views/day ≈ **29k video starts/s**.
- **Egress:** if an average session streams 300 MB, then 2.5B × 300 MB = 750 PB/day ≈ **70 Tbps average**. No origin can serve this, so nearly all bytes must come from CDN caches close to viewers.

:::key The numbers dictate the design
Storage in the hundreds of petabytes means object storage with lifecycle tiers. Egress in the tens of terabits means the CDN *is* the delivery system. Upload volume is small by comparison, but each upload triggers heavy, parallel transcoding work.
:::

## Step 3: API

```
POST /v1/uploads                      -> {upload_id, parts: [pre-signed URLs]}
POST /v1/uploads/{id}/complete        {etag_list, title, description}
GET  /v1/videos/{id}                  -> metadata + manifest URL + status
GET  /v1/videos/{id}/manifest.m3u8    -> HLS master playlist (served via CDN)
POST /v1/videos/{id}/views            (batched client heartbeat events)
```

## Step 4: Data model

```
videos(video_id PK, owner_id, title, description, status, duration_s,
       raw_object_key, created_at, published_at)
renditions(video_id, profile, codec, bitrate, segment_prefix, ready_at)
video_stats(video_id PK, views, likes)          -- counters, updated asynchronously
```

Metadata lives in a sharded relational or wide-column store, sharded by `video_id`. Media lives in object storage: `raw/{video_id}` for the original, and `hls/{video_id}/{profile}/seg_00042.ts` for the segments.

## Step 5: High-level design

:::diagram 640x300 | Video platform overview. Uploads go straight to object storage, a transcoding pipeline produces segmented renditions, and the CDN serves nearly all playback traffic.
box cr 10 30 80 40 "Creator" client
box up 130 30 110 40 "Upload service" svc
box raw 290 20 110 56 "Raw storage" store
box q 450 30 90 40 "Job queue" queue
box tc 450 110 90 50 "Transcode\nworkers" svc
box hls 290 110 110 56 "Segments\n(HLS/DASH)" store
box md 130 120 110 50 "Metadata DB" db
box cdn 290 220 110 46 "CDN edges" cdn
box v 130 225 80 40 "Viewer" client
arrow cr up "1 get URLs"
arrow cr raw "2 multipart PUT" ly=14 lx=20
arrow raw q "3 uploaded event"
arrow q tc
arrow tc hls "4 write renditions"
arrow tc md "5 status=READY" dashed
arrow v cdn "6 manifest + segments"
arrow cdn hls "miss" dashed
:::

## Step 6: Deep dives

### The upload path

Videos are large and connections are flaky, so uploads use **multipart, resumable uploads straight to object storage** with pre-signed URLs (Vol. 1, Ch. 16). The client splits the file into 8–16 MB parts, uploads several in parallel, retries failed parts, and can resume after closing the app. When every part is uploaded, the client calls `complete`. The upload service stitches the parts together, records the video as `UPLOADED`, and emits an event. Application servers never touch the video bytes.

### The transcoding pipeline

A single 4K video can take longer than its own duration to encode on one machine. So the pipeline is a **directed acyclic graph (DAG)** of tasks run by a pool of workers:

1. **Validate and probe** the file (container, codec, duration). Reject corrupt files early.
2. **Split** the video into chunks of a few seconds, cut at keyframes.
3. **Encode each chunk × each rendition in parallel**, which may be hundreds of tasks per video, spread across a large worker pool (often spot or preemptible machines, for cost).
4. **Package** the encoded chunks into HLS/DASH segments and write the manifests.
5. **Extract** thumbnails, captions, and fingerprints for copyright matching.
6. **Publish:** mark renditions ready and update metadata.

:::diagram 640x200 | Transcoding as a DAG. Chunking turns one slow job into hundreds of small parallel ones.
box in 10 80 80 40 "Raw video" store
box sp 120 80 80 40 "Split at\nkeyframes" svc
box e1 240 20 120 30 "chunk 1 × 6 profiles" svc
box e2 240 65 120 30 "chunk 2 × 6 profiles" svc
box e3 240 110 120 30 "…" note
box e4 240 150 120 30 "chunk N × 6 profiles" svc
box pk 400 80 90 40 "Package\nHLS/DASH" svc
box pub 530 80 90 40 "Publish" good
arrow in sp
arrow sp e1
arrow sp e2
arrow sp e4
arrow e1 pk
arrow e2 pk
arrow e4 pk
arrow pk pub
:::

Tasks are **idempotent** (re-encoding a chunk produces the same output path), so a worker that dies or a preempted machine simply means the task is retried. A workflow engine or a job queue with a state table tracks which tasks of which video have completed.

:::tradeoff Encode everything, or encode on demand?
Most videos are watched rarely, and a few are watched enormously. Encoding every upload into every format wastes compute on videos nobody watches. Platforms often encode a few common renditions immediately, then add higher resolutions or more efficient codecs (which are slower to encode) only once a video gets popular.
:::

### Adaptive bitrate playback

Each rendition is cut into **segments** of 2–6 seconds. A **master manifest** lists the available renditions, and each rendition's playlist lists its segments. The player measures throughput and buffer level, and picks the rendition for each *next* segment. When bandwidth drops, it switches down instead of stalling. Because segments are small, immutable files with stable URLs, they cache perfectly at the CDN.

:::diagram 640x200 | Adaptive bitrate. The player picks a rendition per segment from measured bandwidth, stepping down instead of stalling.
box m 10 20 120 46 "master.m3u8\nlists renditions" store
box r1 180 10 120 30 "1080p · 5 Mbps" svc
box r2 180 50 120 30 "720p · 2.5 Mbps" svc
box r3 180 90 120 30 "360p · 0.8 Mbps" svc
box p 10 140 120 46 "Player\n(buffer 12 s)" client
box s1 360 140 60 34 "seg 41\n1080p" good
box s2 430 140 60 34 "seg 42\n720p" cache
box s3 500 140 60 34 "seg 43\n360p" bad
box s4 570 140 60 34 "seg 44\n720p" cache
arrow m r1
arrow m r2
arrow m r3
arrow p s1 "bandwidth: 6 → 3 → 1 → 3 Mbps" ly=-14
:::

### CDN strategy

- **Long-tail vs. head:** the most popular few percent of videos account for most views and stay hot in every edge cache. Long-tail videos miss at the edge and are fetched from a **regional mid-tier cache** before the origin (tiered caching), which shields object storage from a flood of misses.
- **Pre-warming:** when a video from a hugely popular creator is published, push its first segments to the edges ahead of demand.
- **Embedded caches:** very large platforms put cache servers inside ISPs' networks, so the traffic never crosses the internet backbone.

### View counting

Counting 29k+ views/s exactly, in real time, is unnecessary and expensive. Players send batched heartbeat events to an ingestion endpoint that writes them to a log (Kafka). A stream processor de-duplicates (the same session refreshing the page), filters bots, and aggregates per video per minute, then increments counters in a store. The public count may lag by seconds or minutes. That is fine.

## Step 7: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Transcode worker dies mid-task | That chunk's task stalls | Task lease expires; another worker retries (idempotent output) |
| Corrupt or malicious upload | Pipeline errors, possible exploit | Validate in a sandbox; quarantine; mark FAILED and notify the creator |
| CDN edge outage | Viewers in one city affected | DNS/anycast routes to the next nearest edge |
| Origin overloaded by misses | Slow starts for long-tail videos | Tiered caches, request coalescing at the mid-tier |
| Metadata DB unavailable | New pages fail to load | Cache video metadata; playback of already-loaded manifests continues |

:::quiz
Q: Why do uploads go directly to object storage with pre-signed URLs instead of through the application servers?
A: Videos are gigabytes in size. Streaming them through application servers would waste huge amounts of their bandwidth, memory and CPU and limit throughput. Pre-signed URLs let clients upload straight to object storage, which is built for large transfers, while the application still controls who may upload what. Multipart uploads also make large uploads parallel and resumable.

Q: How does chunked transcoding reduce the time to publish a long video?
A: The video is split at keyframes into many short chunks, and each chunk-rendition pair is encoded as an independent task on a large worker pool at the same time. Total time is roughly the time to encode one chunk plus splitting and packaging, rather than the time to encode the whole video serially. Failed tasks are retried individually.

Q: What makes video segments ideal for CDN caching?
A: They are small, immutable files with stable, unique URLs. Their content never changes once published, so they can be cached for a very long time with no invalidation, and the same segment serves every viewer watching that rendition.

Q: Why are view counts aggregated asynchronously instead of incremented in the database on every view?
A: The event rate is enormous (tens of thousands per second, with very hot keys for viral videos), and exact real-time counts aren't needed. Logging events and aggregating them in a stream processor allows de-duplication and bot filtering, batches writes, avoids hot-row contention in the database, and keeps playback independent of the counting system. The cost is a count that lags slightly.
:::

# File Storage and Sync

Design a service like Dropbox or Google Drive: users keep files in a folder on each of their devices, and changes on one device appear on all the others. Files can be shared with other users.

## Step 1: Requirements

**Functional**

- Upload, download, rename, move and delete files and folders.
- Automatic sync across a user's devices (desktop, mobile, web).
- Share files and folders with other users (view or edit).
- Version history: restore earlier versions of a file.

**Non-functional**

- **Never lose data.** Durability is the top priority.
- Sync changes within seconds when online. Work offline and reconcile later.
- Bandwidth-efficient: a small edit to a large file shouldn't re-upload the whole file.
- Scale: 100M users, 1B files, 10 PB stored.

## Step 2: Estimates

- 100M users × ~100 files modified per week ≈ 10B changes/week ≈ **16k file changes/s**.
- Average file 1 MB, but sizes are long-tailed: many tiny files, some multi-GB.
- Storage: 10 PB of unique content, and *much* more without deduplication.
- Metadata: 1B files × ~1 KB ≈ 1 TB, plus version history. That is a modest amount in bytes, but it gets heavy read/write traffic.

## Step 3: The core idea: split files into chunks

Instead of treating a file as one blob, the client splits it into **chunks** (for example, 4 MB each) and computes a cryptographic hash of each chunk. A file is then just an ordered list of chunk hashes, its **manifest**.

:::diagram 640x200 | A file as a list of content-addressed chunks. Editing one part of a file changes only the chunk that contains it.
box f 10 70 100 50 "report.pdf\nv1" client
box c1 170 20 110 34 "chunk a1f3…" store
box c2 170 70 110 34 "chunk 9c0e…" store
box c3 170 120 110 34 "chunk 47bd…" store
box f2 340 70 100 50 "report.pdf\nv2 (edited)" client
box c4 500 120 120 34 "chunk e812… (new)" good
arrow f c1
arrow f c2
arrow f c3
arrow f2 c1 dashed
arrow f2 c2 dashed
arrow f2 c4 "only this uploads" accent
:::

This one idea delivers three big wins:

- **Delta sync:** when a file changes, only the chunks that changed are uploaded.
- **Deduplication:** chunks are stored by hash (*content-addressed*). If any user anywhere has already stored that chunk, it is never stored or uploaded again.
- **Resumable transfers:** an interrupted upload resumes at the next missing chunk.

:::deep Content-defined chunking
With fixed-size chunks, inserting one byte at the start of a file shifts every chunk boundary, so every chunk hash changes. **Content-defined chunking** places boundaries where a rolling hash of the data matches a pattern, so the boundaries move with the content and an insertion changes only the chunks around it. Backup and sync tools use this to make dedup and deltas robust to edits in the middle of files.
:::

## Step 4: Data model

```
files(file_id PK, owner_ns, parent_id, name, is_folder, latest_version, deleted)
versions(file_id, version, chunk_list[hash...], size, modified_by, modified_at)
chunks(hash PK, size, storage_location, ref_count)
namespace_journal(namespace_id, seq, op, file_id, version, ts)   -- ordered change log
```

A **namespace** is a user's root folder or a shared folder. Each namespace has an append-only, ordered **journal** of changes. This journal is the heart of sync.

## Step 5: High-level design

:::diagram 640x290 | File sync architecture. Chunk bytes go to block storage by hash, metadata commits go to a transactional store, and a notification service tells other devices to pull.
box d1 10 40 90 40 "Desktop\nclient" client
box d2 10 200 90 40 "Phone\nclient" client
box bs 170 20 120 46 "Block service" svc
box blob 360 15 110 56 "Chunk store\n(by hash)" store
box ms 170 120 120 46 "Metadata service" svc
box mdb 360 110 110 66 "Metadata DB\n+ journal" db
box nt 170 210 120 40 "Notification\n(long poll / WS)" svc
box q 360 210 110 36 "Change events" queue
arrow d1 bs "1 upload missing chunks"
arrow bs blob
arrow d1 ms "2 commit new version" ly=12
arrow ms mdb "atomic"
arrow mdb q "3 journal append" dashed
arrow q nt
arrow nt d2 "4 'namespace changed'"
arrow d2 ms "5 pull changes since seq" dashed lx=-10
:::

**Uploading a change:**

1. The client detects a file change (via the OS file watcher), re-chunks the file and hashes the chunks.
2. It asks the block service which hashes are missing, and uploads only those.
3. It **commits** the new version to the metadata service: "file X, base version 7, new chunk list [...]". The metadata service checks the base version (optimistic concurrency), writes the new version and appends to the namespace journal, **in one transaction**.
4. Other devices subscribed to that namespace get a notification and **pull** all journal entries after the last sequence number they have seen, then download any chunks they lack.

:::key Separate the control plane from the data plane
Small, critical, transactional metadata goes through the metadata service. Huge, immutable chunk bytes go through the block service to object storage. Each can be scaled, cached and secured on its own terms.
:::

## Step 6: Deep dives

### Conflicts

Two devices edit the same file while one is offline. When the second device commits with a base version that is no longer current, the metadata service rejects the commit. The client then keeps both versions: it saves its own as `report (conflicted copy from Laptop, 2026-10-15).pdf` and syncs the server's version. Automatically merging arbitrary binary files is impossible, and keeping both never loses data. (Collaborative editors take a different approach; see Chapter 8.)

:::diagram 640x210 | Conflict handling. The second commit fails the base-version check, and the client keeps its edit as a conflicted copy.
box l 10 30 110 40 "Laptop\n(offline edit)" client
box p 10 140 110 40 "Phone\n(edit, online)" client
box ms 260 80 130 50 "Metadata service\nlatest = v8" svc
box ok 470 140 160 40 "v8 committed (phone)" good
box cc 470 20 160 50 "rejected: base v7 ≠ v8\n→ 'conflicted copy'" bad
arrow p ms "commit base=v7 → v8" ly=14
arrow l ms "commit base=v7 (later)"
arrow ms ok "" dashed
arrow ms cc "" dashed
:::

### Notifications

Millions of idle desktop clients need to hear about changes within seconds. Each keeps a long-poll or WebSocket connection to the notification service (Vol. 1, Ch. 10), subscribed to its namespaces. Notifications carry no data, only "namespace N changed". The client then pulls from the journal. If a notification is lost, nothing breaks: clients also poll occasionally, and the journal is the source of truth.

### Metadata scaling

The metadata store needs transactions (version checks, journal appends, moving folders) and heavy read traffic. Shard it by **namespace**, so that every operation inside a folder tree stays in one shard. Shared folders are their own namespaces, mounted into the trees of each member. Listing a folder and syncing are both reads within one namespace.

### Deleting data safely

Deleting a file just writes a new journal entry (a tombstone). Chunks are shared between files and users, so a chunk can only be removed when no version anywhere refers to it. Use **reference counting** or periodic **mark-and-sweep** garbage collection, with a grace period and version-history retention (for example, 30 days), so that accidental deletes can be undone.

### Security and privacy

Encrypt chunks at rest (Vol. 1, Ch. 25). Cross-user deduplication can leak information: an attacker can learn whether someone already has a particular file by watching whether its upload is skipped. Many services therefore deduplicate only within a user's own data, or within an organisation.

## Step 7: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Upload interrupted | Partial file | Chunks resume; commit only after all chunks exist |
| Commit races from two devices | Conflict | Optimistic version check; conflicted copy |
| Missed notification | Delayed sync | Periodic polling; journal is the source of truth |
| Chunk store region down | Downloads fail | Erasure-coded, multi-region replication of chunks |
| Bug deletes metadata | Data appears lost | Journals, version history, point-in-time backups |

:::quiz
Q: List three benefits of splitting files into content-addressed chunks.
A: (1) Delta sync: only changed chunks are uploaded after an edit. (2) Deduplication: identical chunks, within or across files and users, are stored once. (3) Resumability and parallelism: transfers proceed chunk by chunk, so interruptions resume where they stopped and chunks can be transferred in parallel. Chunk hashes also verify integrity.

Q: Why does the sync design use a per-namespace journal with sequence numbers?
A: The journal gives a total order of every change in a namespace. Each device remembers the last sequence number it has applied and pulls everything after it, which makes sync incremental, resumable and correct even after long offline periods or missed notifications. It also makes notifications simple: they only need to say "something changed".

Q: Two devices edit the same file offline. What happens when they reconnect, and why not merge automatically?
A: The first to commit succeeds. The second commit fails the base-version check, so the client saves its edit as a "conflicted copy" next to the synced version. Arbitrary binary formats can't be merged safely and automatically, and keeping both guarantees nothing is lost. The user resolves the conflict.

Q: A 2 GB video file has one paragraph's worth of frames changed at the start. Why does content-defined chunking matter here?
A: With fixed-size chunks, any insertion near the start shifts every later chunk boundary, so every chunk hash changes and the whole file is re-uploaded. Content-defined chunking places boundaries based on the data itself, so only the chunks around the change get new hashes and everything after it deduplicates against the previous version.

Q: Why is metadata sharded by namespace rather than by file ID?
A: Most operations (listing a folder, moving files within a tree, committing changes and appending to the journal, syncing) touch many files within one namespace and need transactions across them. Sharding by namespace keeps those operations on one shard, so they stay atomic and fast.
:::

# Web Crawler

Design a crawler that downloads billions of web pages for a search engine: it starts from seed URLs, fetches pages, extracts links, and keeps going, while being polite to websites and avoiding traps.

## Step 1: Requirements

**Functional**

- Start from seed URLs, fetch pages, parse them, extract links, and add new links to the crawl.
- Store page content for the indexer.
- Re-crawl pages periodically, more often if they change often.

**Non-functional**

- **Politeness:** never overload a website. Respect `robots.txt` and crawl delays.
- **Scale:** 5B pages per month.
- **Robustness:** survive malformed HTML, infinite URL spaces (crawler traps), slow servers and duplicate content.
- **Extensibility:** new content types and processing steps can be added later.

## Step 2: Estimates

- 5B pages/month ÷ 2.6M s ≈ **2,000 pages/s** on average.
- Average page ~100 KB, so ~200 MB/s download, and about **500 TB/month** of raw HTML (much less compressed).
- URLs seen: tens of billions over time. At ~100 bytes each, a full set is several TB, too big for one machine's memory, which is a hint that compact, approximate structures will be useful.

## Step 3: High-level design

:::diagram 640x300 | The crawl loop. The frontier decides what to fetch next, fetchers download politely, and parsed links flow back through de-duplication filters.
box seed 10 20 80 34 "Seed URLs" note
box fr 120 15 130 50 "URL frontier\n(priority + politeness)" queue
box dns 300 15 90 40 "DNS cache" cache
box fe 300 90 110 46 "Fetchers\n(+ robots.txt)" svc
box cs 470 90 150 46 "Content store\n(object storage)" store
box pa 300 180 110 46 "Parser /\nlink extractor" svc
box cd 470 180 150 40 "Content dedup\n(fingerprints)" cache
box uf 120 180 130 46 "URL filter\n+ seen-URL set" cache
arrow seed fr
arrow fr fe "next URL"
arrow fe dns "resolve" dashed
arrow fe cs "raw page"
arrow fe pa
arrow pa cd "duplicate?" dashed
arrow pa uf "new links"
arrow uf fr "unseen URLs"
:::

**The loop:** the frontier hands a URL to a fetcher. The fetcher checks `robots.txt` (cached per host), resolves DNS (cached), downloads the page, and stores it. The parser extracts links and normalises them (lowercase host, remove fragments and tracking parameters). The links are filtered against the set of URLs already seen, and new ones go back into the frontier.

## Step 4: Deep dives

### The URL frontier: priority and politeness

The frontier must answer two questions at once: *which URL matters most?* and *which host is it safe to hit right now?*

:::diagram 640x240 | Frontier design. Front queues order URLs by priority, and back queues hold one host each so that each host is fetched at a polite rate.
box in 10 100 80 40 "New URLs" client
box pr 120 100 90 40 "Prioritiser" svc
box f1 240 30 110 30 "front: high" queue
box f2 240 80 110 30 "front: medium" queue
box f3 240 130 110 30 "front: low" queue
box rt 380 80 80 40 "Router\n(by host)" svc
box b1 490 20 130 30 "back: example.com" queue
box b2 490 65 130 30 "back: news.site" queue
box b3 490 110 130 30 "back: blog.org" queue
box hp 490 170 130 50 "Heap: host →\nnext allowed time" cache
arrow in pr
arrow pr f1
arrow pr f2
arrow pr f3
arrow f1 rt
arrow f2 rt
arrow f3 rt
arrow rt b1
arrow rt b2
arrow rt b3
:::

- **Front queues (priority):** URLs are scored by importance (link-based page rank, domain authority, how often the page changes) and placed into priority queues. Higher-priority queues are drained more often.
- **Back queues (politeness):** each back queue holds URLs for **a single host**. A heap records each host's **next allowed fetch time**. A fetcher takes the host whose time has come, fetches one URL, and pushes that host's next time forward by its crawl delay (for example, 1 s, or several times the last response time).

The frontier is far too big for memory, so it is stored on disk (in a log or a database), with in-memory buffers at the heads and tails of the queues. It is partitioned across crawler nodes **by host** (consistent hashing on the hostname), so each host's politeness is enforced by exactly one node.

### "Have we seen this URL?"

Checking tens of billions of URLs against a database for every extracted link is too slow. Use a **Bloom filter** (Vol. 1, Ch. 21) over normalised URL hashes: "definitely new" URLs go straight into the frontier, and "probably seen" ones are dropped. A small false-positive rate means a few new pages are skipped, which is acceptable for a crawler. Partition the filter by host along with the frontier.

### Duplicate content

Many URLs serve the same or almost the same content (mirrors, session IDs in URLs, printer-friendly versions). Exact duplicates are caught with a content hash. **Near-duplicates** are caught with similarity fingerprints such as **SimHash** or MinHash. Similar documents get fingerprints that differ in only a few bits, which can be found quickly. Duplicates are stored once, and their links aren't followed again.

### Crawler traps and robustness

- **Infinite URL spaces:** calendars with a "next month" link forever, or session IDs generating endless unique URLs. Defend with maximum URL length, maximum depth per host, per-host page budgets, and URL pattern detection.
- **Slow or hostile servers:** strict connect and read timeouts, maximum page size, and limited redirects.
- **Malformed content:** a fault-tolerant parser, run in isolated workers.

### Freshness: re-crawling

Pages change at very different rates: a news front page every minute, an old blog post never. Estimate each page's change rate from its history (did its content hash change since the last crawl?), and schedule re-crawls with a frequency proportional to change rate × importance. Conditional requests (`If-Modified-Since`, `ETag`) make unchanged pages cheap to re-check.

:::diagram 640x150 | Re-crawl scheduling. Pages that change often and matter more are revisited sooner.
box n 10 50 140 46 "News front page\nchanges: hourly" bad
box b 175 50 140 46 "Product page\nchanges: weekly" cache
box o 340 50 140 46 "Old blog post\nchanges: never" good
box sch 505 50 125 46 "Next crawl:\n10 min · 3 d · 60 d" svc
arrow o sch
:::

### DNS

At 2,000 fetches/s, DNS lookups would become a bottleneck and annoy resolvers. Run local caching resolvers, cache per host for the record's TTL, and resolve upcoming hosts asynchronously ahead of time.

## Step 5: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Crawler node dies | Its hosts stop being crawled | Frontier on durable storage; reassign host partitions via consistent hashing |
| Host overloaded by us | Site blocks us, complaints | Per-host back queues, adaptive delays, honour robots.txt and 429/503 |
| Trap generates endless URLs | Frontier floods with junk | Depth limits, per-host budgets, pattern detection |
| Parser crash on bad page | Worker restarts | Isolate parsing; skip and log the page |

:::quiz
Q: Why does the frontier use separate front (priority) and back (per-host) queues?
A: The two goals pull in different directions. Priority wants the most important URLs first, while politeness wants each host fetched slowly with a delay between requests. Front queues order URLs by priority. Back queues group URLs by host, and a heap of next-allowed times ensures each host is fetched at most at its polite rate, so fetchers stay busy across many hosts without overloading any one of them.

Q: Why is a Bloom filter a good fit for the seen-URL check, and what is the cost of its false positives here?
A: It stores tens of billions of URL hashes in a small fraction of the memory of an exact set, and answers in constant time, which is essential at thousands of links per second. A false positive means a genuinely new URL is wrongly treated as seen and skipped. For a crawler, missing a tiny fraction of pages is an acceptable trade for the huge savings.

Q: How can a crawler avoid getting stuck in a calendar that links to "next month" forever?
A: Use trap defences: limit the crawl depth and number of pages per host, cap URL length, detect repeating URL patterns or parameters, and lower the priority of URLs whose content is near-duplicate or low value. Each host gets a budget, so runaway URL spaces can't swamp the frontier.

Q: How does a crawler detect that two different URLs serve nearly identical pages?
A: Exact copies are caught by a content hash. Near-duplicates are caught with similarity fingerprints such as SimHash or MinHash, where similar documents produce fingerprints that differ in only a few bits. Pages whose fingerprints are close are treated as duplicates: stored once, and their links not re-followed.

Q: Why is the frontier partitioned by hostname across crawler nodes?
A: So that all URLs for a host live on one node, which can then enforce that host's politeness (crawl delay, concurrency limit) locally without coordinating with other nodes. Consistent hashing on the hostname spreads hosts evenly and limits reshuffling when nodes are added or removed.
:::
