@part VIII | Case Studies | Four complete designs, worked step by step the way you would in a design review or interview — each one exercising a different set of the ideas from Parts I–VII.

# Case Study: A URL Shortener

A URL shortener turns a long URL into a short link (`sho.rt/x7Kp2Q`) and redirects visitors to the original. It looks trivial, but at scale it exercises ID generation, read-heavy caching, and database choice.

## Step 1: Requirements

**Functional**

- Create a short link for a long URL, optionally with a custom alias and expiry.
- Redirect a short link to its long URL.
- Basic click analytics (count per link, by country and day).

**Non-functional**

- Very high availability for redirects, which are on the critical path of every click.
- Low redirect latency (p99 < 50 ms at the server).
- Short codes must be unique and not easily guessable.
- Scale: 100M new links/month and a 100:1 read/write ratio.

## Step 2: Estimates

- Writes: 100M / month ÷ 2.5M s ≈ **40 links/s** (peak ~200/s).
- Reads: 100 × 40 = **4,000 redirects/s** average, ~20,000/s at peak.
- Storage: 100M/month × 12 × 5 years = 6B links × ~500 bytes ≈ **3 TB** (plus replicas).
- Code length: with base62 (`a–z A–Z 0–9`), 62⁷ ≈ 3.5 trillion codes, far more than 6B. **7 characters** is plenty.

## Step 3: API

```
POST /v1/links        {long_url, custom_alias?, expires_at?}  -> 201 {code, short_url}
GET  /{code}          -> 301/302 Location: long_url
GET  /v1/links/{code}/stats  -> {clicks, by_country, by_day}
```

:::tradeoff 301 or 302?
A **301 (permanent)** redirect is cached by browsers, which cuts load but means you never see repeat clicks, so analytics undercount. A **302 (temporary)** sends every click through you: accurate analytics, more load. Most commercial shorteners use 302 (or 307) for analytics.
:::

## Step 4: Generating short codes

**Option A: hash the URL** (e.g. the first 7 base62 characters of SHA-256). This is deterministic, but collisions must be detected and resolved, and the same URL always produces the same code (sometimes undesirable).

**Option B: a unique counter + base62 encoding.** Each new link gets a unique 64-bit integer, encoded in base62. There are no collisions by construction. To avoid a central counter bottleneck, each app server **leases ranges** of IDs from a coordinator (for example, blocks of 10,000 recorded in a tiny ZooKeeper/etcd or database table), or uses Snowflake-style IDs (Chapter 21). Sequential codes are guessable, so if enumeration is a concern, permute the integer with a reversible bijective scramble before encoding.

**Option C: pre-generated random codes.** A key-generation service fills a table of unused random codes, and app servers take batches. The codes are unguessable and handed out with no collision checks at request time.

We choose **B with range leasing**: simple, fast, collision-free, with a scramble step for unguessability.

## Step 5: Data model and storage

```
links(code PK, long_url, user_id, created_at, expires_at)
```

Access is pure key-value by `code`, with no joins, enormous read volume and modest writes. A **key-value / wide-column store** (DynamoDB, Cassandra) partitioned by `code` fits well. A sharded relational database also works. Analytics events go to a separate pipeline, never into the hot path.

## Step 6: High-level design

:::diagram 640x290 | URL shortener architecture. Redirects are served mostly from cache, and click events flow asynchronously to analytics.
box u 10 130 70 46 "Users" client
box lb 105 130 85 46 "LB / CDN\nedge" lb
box w 240 25 120 40 "Write service" svc
box r 240 140 120 46 "Redirect service" svc
box idg 450 10 110 40 "ID range\nallocator" cache
box c 450 95 100 40 "Cache (Redis)" cache
box db 450 175 100 70 "Links store\n(KV, sharded)" db
box k 240 235 120 36 "Kafka (clicks)" queue
box an 450 255 110 30 "Analytics (OLAP)" store
arrow u lb
arrow lb w "POST" lx=-10
arrow lb r "GET /code" ly=-10
arrow w idg "lease block" dashed
arrow w db "insert" lx=-20 ly=-14
arrow r c "1 lookup"
arrow r db "2 on miss" dashed ly=12
arrow r k "click event" lx=34 ly=0
arrow k an
:::

**Redirect path:** look up `code` in the cache. On a miss, read from the store, fill the cache, and return a 302. Emit a click event asynchronously and **never block the redirect** on analytics.

## Step 7: Deep dives

- **Caching:** link popularity is extremely skewed, so a cache holding the hottest ~20% of links absorbs most reads. Use LRU, cache "not found" results briefly to block enumeration (penetration), and consider caching hot redirects at the CDN edge.
- **Expiry:** store `expires_at`, check it on read, and run a background job to purge expired links.
- **Custom aliases:** insert with a conditional write ("only if not exists") to enforce uniqueness.
- **Abuse:** check submitted URLs against malware and phishing lists, rate limit creation per user and IP, and support takedowns.
- **Availability:** redirects depend only on the cache and a replicated store, with multi-AZ deployment and stateless services. Even if analytics is down, redirects keep working.

:::quiz
Q: Why is a 7-character base62 code sufficient for 6 billion links?
A: 62⁷ ≈ 3.5 × 10¹² possible codes, about 580 times more than 6 × 10⁹ links. That leaves plenty of room for growth and keeps the space sparse, which helps make codes hard to guess.

Q: Why should click analytics be published asynchronously rather than written synchronously during the redirect?
A: The redirect is latency-critical and must be highly available. Writing analytics synchronously adds latency and makes redirects depend on the analytics store's availability. Publishing an event to a queue (fire-and-forget, buffered) keeps the redirect fast and isolated, and consumers aggregate clicks in bulk.

Q: How do you generate unique IDs across many app servers without a central counter on every request?
A: Lease ranges: each server takes a block of IDs (e.g. 10,000) from a coordinator with one atomic operation and hands them out locally from memory, asking for a new block when it runs low. Alternatives are Snowflake-style IDs (timestamp + machine ID + sequence) or a pre-generated pool of random codes.
:::

# Case Study: A Social News Feed

Users follow others, and their home feed shows recent posts from the people they follow, ranked by relevance. The core challenge is **fan-out**: how a post reaches millions of feeds quickly, when follower counts range from 10 to 100 million.

## Step 1: Requirements

**Functional:** create posts (text and media); follow and unfollow; view a home feed of followed accounts' posts, ranked, with infinite scroll.

**Non-functional:** feed loads in < 200 ms (p99); new posts appear in followers' feeds within seconds (eventual consistency is fine); 300M DAU; highly available.

## Step 2: Estimates

- Posts: 300M DAU × 0.5 posts/day = 150M posts/day ≈ **1,750 writes/s** (peak ~5k/s).
- Feed reads: 300M × 10 feed loads/day = 3B/day ≈ **35,000 reads/s** (peak ~100k/s).
- Average 200 followers per user, so 150M posts × 200 = **30B feed insertions/day** if we push to every follower.

## Step 3: Fan-out on write vs. fan-out on read

**Fan-out on write (push):** when a user posts, insert the post ID into each follower's precomputed feed (a list in Redis, for example). Reading a feed is then a single fast lookup. The problem: a celebrity with 100M followers creates 100M writes per post, which is slow, expensive, and mostly wasted on inactive users.

**Fan-out on read (pull):** store posts only with their author. When a user opens their feed, fetch recent posts from everyone they follow and merge them. Writes are cheap and celebrities aren't a problem, but reads are expensive (following 1,000 accounts means 1,000 lookups per feed load), which is too slow at 100k reads/s.

:::diagram 640x250 | Hybrid fan-out. Ordinary users' posts are pushed into followers' feed caches; celebrity posts are pulled and merged at read time.
box a 20 30 110 40 "Normal user\npost" client
box cel 20 180 110 40 "Celebrity\npost" client
box fo 200 30 120 40 "Fan-out workers" svc
box ps 200 180 120 44 "Posts store\n(by author)" db
box fc 400 30 130 50 "Feed cache\nper follower" cache
box fs 400 150 130 50 "Feed service\n(merge + rank)" svc
box r 570 150 60 50 "Reader" client
arrow a fo "via queue"
arrow fo fc "push post IDs"
arrow cel ps "store only"
arrow r fs "GET"
arrow fs fc "1 precomputed IDs" lx=48
arrow fs ps "2 pull celebrity posts" dashed ly=18
:::

**Hybrid (the standard answer):** push for normal users, pull for accounts above a follower threshold (say 100k), merging those posts in at read time. Also skip pushing to users who haven't been active for weeks, and build their feed on demand when they return.

## Step 4: Data model

```
users(user_id PK, name, ...)
follows(follower_id, followee_id, created_at)   -- two tables/indexes for both directions
posts(post_id PK (Snowflake, time-sortable), author_id, body, media_keys, created_at)
feed:{user_id} -> Redis sorted set of (post_id, score), trimmed to ~800 entries
```

Posts are sharded by `post_id` (or `author_id` for author timelines). The social graph is stored in a sharded key-value or graph store, with both the "followers of X" and "following of Y" directions indexed. Media lives in object storage behind a CDN.

## Step 5: High-level design

:::diagram 640x300 | News feed architecture. The write path fans out asynchronously, and the read path hydrates cached post IDs into full posts.
box c 10 130 70 46 "Clients" client
box gw 105 130 80 46 "API\ngateway" lb
box pw 220 30 110 40 "Post service" svc
box q 370 30 90 40 "Kafka" queue
box fw 500 30 120 40 "Fan-out workers" svc
box g 500 110 120 40 "Social graph" db
box fr 220 200 110 46 "Feed service" svc
box fc 370 200 100 50 "Feed cache" cache
box pc 500 200 120 50 "Post cache /\nposts DB" db
box rk 220 120 110 40 "Ranking" svc
box cdn 105 240 80 40 "CDN (media)" cdn
arrow c gw
arrow gw pw "create post"
arrow pw q "PostCreated"
arrow q fw
arrow fw g "followers?"
arrow fw fc "push IDs" dashed
arrow gw fr "get feed"
arrow fr fc "IDs"
arrow fr pc "hydrate"
arrow fr rk "score" dashed
arrow c cdn "images" dashed
:::

## Step 6: Deep dives

- **Ranking:** a pure reverse-chronological order is simple. Ranked feeds score candidates (recency, affinity to the author, engagement, content type) with an ML model. Two stages: *candidate generation* (a few hundred post IDs), then *ranking* (scoring them), with cached features.
- **Pagination:** cursor-based on `(score, post_id)` for stable infinite scroll (Chapter 8).
- **Hydration:** feed caches hold only IDs. Post bodies, author info and counts are fetched in batches from caches, with *multi-get*.
- **Counters (likes, comments):** very write-heavy, and a few seconds stale is fine. Increment in Redis or sharded counters and flush to durable storage asynchronously.
- **Deletes and privacy:** a deleted post is filtered at hydration time (a tombstone), which avoids having to remove it from millions of feed caches immediately.
- **Hot posts:** viral posts are replicated across cache nodes and served from local in-process caches.

:::quiz
Q: Why does pure fan-out-on-write break for celebrity accounts?
A: One post from an account with 100M followers needs 100M feed insertions, which takes a long time, costs a lot of write capacity, delays the post for most followers, and mostly writes to feeds of inactive users. Repeated posts multiply the cost.

Q: Describe the hybrid fan-out approach.
A: Posts from ordinary accounts are pushed asynchronously into followers' precomputed feed caches. Posts from accounts above a follower threshold are not pushed, and are fetched from the author's timeline at read time and merged with the precomputed feed before ranking. Inactive users are also skipped during push, with their feed built on demand.

Q: Why store only post IDs in the feed cache rather than full posts?
A: IDs are tiny, so feeds of hundreds of entries fit cheaply in memory for hundreds of millions of users. Post content can change (edits, like counts, deletions) and would otherwise have to be updated in millions of copies. Fetching content at read time from a shared post cache keeps one source of truth.
:::

# Case Study: A Chat System

Design a messaging service like a modern chat app: one-to-one and group conversations, delivery and read receipts, online presence, and message history on every device.

## Step 1: Requirements

**Functional:** 1:1 and group chats (up to 500 members); real-time delivery; message history synced across devices; sent/delivered/read receipts; online/last-seen presence; push notifications when offline.

**Non-functional:** low delivery latency (< 300 ms within a region); messages are **never lost** and appear **in order** within a conversation; 500M DAU, 50M concurrent connections; highly available.

## Step 2: Estimates

- Messages: 500M DAU × 40/day = 20B/day ≈ **230k messages/s** average (peak ~700k/s).
- Storage: 20B × 200 bytes ≈ 4 TB/day ≈ **1.5 PB/year** before replication.
- Connections: 50M concurrent WebSockets ÷ ~100k per gateway ≈ **500+ gateway servers**.

## Step 3: Connection layer

Clients hold a persistent **WebSocket** to a **chat gateway** (Chapter 10). Gateways are stateful (they hold connections) but contain no business logic. A **session registry** (Redis) maps `user_id → {gateway_id, device_id}` for every connected device.

## Step 4: Sending a message

:::diagram 640x300 | Message flow: persist first, acknowledge the sender, then route to recipients' gateways or to push notifications.
box a 10 30 80 40 "Sender" client
box g1 150 30 100 40 "Gateway A" svc
box ms 320 30 130 46 "Message service" svc
box db 510 15 120 66 "Messages DB\n(by conv_id)" db
box sr 510 125 120 40 "Session registry" cache
box g2 320 220 110 40 "Gateway B" svc
box b 150 220 90 40 "Recipient" client
box pn 510 215 120 46 "Push notification\nservice" svc
arrow a g1 "1 send" both
arrow g1 ms "+ client_msg_id" both
arrow ms db "2 persist, seq#"
arrow ms sr "3 where is B?" lx=-10
arrow ms g2 "4 deliver" lx=-28
arrow g2 b
arrow ms pn "offline → push" dashed lx=34
text 200 110 "ack 'sent' returns to sender after step 2" small muted
:::

1. The client sends the message with a client-generated `client_msg_id` (for **idempotent retries**).
2. The message service assigns a **per-conversation sequence number** and persists the message *before* anything else (durability first).
3. The sender gets an acknowledgement and shows a single tick ("sent").
4. The service looks up each recipient's devices in the session registry and forwards the message to their gateways, which push it down the sockets. The recipient's client acks, and the sender is shown "delivered".
5. Offline recipients get a push notification. When they reconnect, their client **syncs** by asking for all messages after the last sequence number it has seen in each conversation.

## Step 5: Ordering and delivery guarantees

- **Ordering:** a per-conversation sequence number (assigned by the conversation's owner shard, or by a counter in the message store) gives a total order within each chat. Clients sort by it and spot gaps.
- **At-least-once + dedup:** retries may duplicate sends, so the server de-duplicates on `client_msg_id`, and clients ignore sequence numbers they already have.
- **Multi-device sync:** each device tracks its own last-synced sequence number per conversation, so a newly signed-in laptop pulls history incrementally.

## Step 6: Storage

The access pattern is "the latest N messages in conversation X, then page backwards", plus an enormous write volume. A **wide-column store** (Cassandra/ScyllaDB/HBase) fits:

```
messages: partition key = conversation_id (+ time bucket for huge groups)
          clustering key = seq_no DESC
          columns: sender_id, body (encrypted), type, created_at
```

An `inbox` table per user (`user_id → conversations` sorted by last activity) powers the chat list screen. Media goes to object storage, and messages carry only references.

## Step 7: Group chats

For small groups, fan out on write: the message service delivers to each member's online devices. For large groups (hundreds of members, or broadcast channels), store the message once and let members fetch it, or route through a pub/sub topic per group that the relevant gateways subscribe to, rather than looking up every member.

## Step 8: Presence

Presence (online/offline, last seen) is high-churn, low-value data:

- Clients send **heartbeats** every ~30 s through the WebSocket. If heartbeats stop for a timeout, the user is marked offline.
- Store presence in an in-memory store with TTLs. Publish changes only to users who currently have the relevant chat open, or to contacts, and **batch and throttle** updates. Exact precision isn't worth the fan-out cost.

## Step 9: End-to-end encryption

With **end-to-end encryption** (E2EE), messages are encrypted on the sender's device with keys only recipients' devices hold, so the server stores and routes only ciphertext. Modern protocols use per-message keys derived through a ratchet, giving forward secrecy. Architecturally, the server can't search or moderate content, multi-device support needs per-device keys, and backups must be encrypted client-side.

:::quiz
Q: Why is the message persisted before it is delivered to recipients?
A: Durability: once the sender sees "sent", the message must never be lost, even if the recipient's gateway or the delivery path fails. Persisting first means delivery can always be retried and offline or new devices can sync it from storage later.

Q: How does the system keep messages in order and avoid duplicates when clients retry?
A: The server assigns a monotonically increasing sequence number per conversation when it persists each message, and clients display messages by sequence number. Clients attach a unique `client_msg_id` to each send, and the server de-duplicates retries by that ID. Recipients ignore sequence numbers they already have.

Q: Why is `conversation_id` a good partition key for message storage?
A: The dominant query is "recent messages in conversation X, paged backwards". Partitioning by conversation puts all of a conversation's messages on one partition, sorted by sequence number, so the read is one sequential partition read. Very large or old conversations can be split further by adding a time bucket to the key.

Q: How would you handle a recipient who is offline?
A: The message is already stored durably. The session registry shows no active connection, so the service sends a push notification through the platform's push service (APNs/FCM). When the user reconnects, the client syncs every conversation from its last known sequence number and acknowledges, which triggers "delivered" receipts to the senders.
:::

# Case Study: A Ride-Hailing Platform

Riders request trips, nearby drivers are matched in seconds, both see each other's live location, and the trip is priced and paid. This design brings together real-time location ingestion, geospatial indexing, matching and consistent state transitions.

## Step 1: Requirements

**Functional:** drivers publish their location while online; riders see nearby cars and request a ride; the system matches a nearby available driver who can accept or decline; both see live locations during the trip; fare estimation, surge pricing and payment.

**Non-functional:** matching within a few seconds; location updates reflected within ~5 s; a driver must **never be assigned two trips at once**, and a trip never gets two drivers; highly available, especially matching; global, multi-city.

## Step 2: Estimates

- 5M drivers online at peak, each sending a location every 4 s, gives **~1.25M location updates/s**. This write load dominates everything else.
- 20M trips/day ≈ 230 trip requests/s on average, with heavy local peaks (rush hour, concerts).
- Each update ~100 bytes, so ~125 MB/s of ingest. Only the *latest* location needs to be kept hot. History goes to cheap storage for analytics.

## Step 3: High-level design

:::diagram 640x310 | Ride-hailing architecture. Location updates flow into an in-memory geospatial index, and matching queries it and claims drivers atomically.
box d 10 40 80 40 "Driver app" client
box r 10 220 80 40 "Rider app" client
box gw 120 130 90 46 "Gateway\n(WebSocket)" lb
box loc 260 30 120 40 "Location service" svc
box geo 430 30 130 50 "Geo index\n(in-memory, by cell)" cache
box k 430 110 130 34 "Kafka (history)" queue
box m 260 140 120 46 "Matching service" svc
box tr 260 240 120 46 "Trip service\n(state machine)" svc
box tdb 430 230 110 66 "Trips DB\n(strong)" db
box pr 580 160 55 60 "Pricing\n& surge" svc
arrow d gw "loc every 4s"
arrow r gw "request ride"
arrow gw loc
arrow loc geo "update cell"
arrow loc k "" dashed
arrow gw m
arrow m geo "nearby available?"
arrow m tr "create / assign"
arrow tr tdb "conditional update"
arrow m pr "" dashed
:::

## Step 4: Location ingestion and geospatial index

Drivers send updates over a persistent connection to the **location service**, which updates an **in-memory geospatial index** that maps each cell (geohash prefix, S2 cell or H3 hexagon, Chapter 21) to the available drivers in it. The index is partitioned **by city or region and cell**, so that each partition handles a manageable area, with replicas for availability. Every update is also appended to Kafka for trip tracking, analytics, ETA model training and fraud detection.

Why not write every update to a database? 1.25M writes/s of data that is obsolete in 4 seconds doesn't need durability. Losing one update costs nothing, because the next arrives shortly. Keep the latest positions in memory (Redis GEO, or custom services) with TTLs, so that drivers who go silent drop out of the index automatically.

## Step 5: Matching

1. A rider requests a trip. The matching service finds the rider's cell and queries it and its **neighbouring cells** for available drivers, widening the radius if too few are found.
2. Candidates are ranked by **estimated time of arrival** (using the road network, not straight-line distance), driver rating, vehicle type, and so on.
3. The best driver gets an offer with a short timeout (~10 s). If they decline or time out, the next candidate gets one.

**Preventing double assignment** is a consistency problem (Chapters 4 and 13). Claim the driver with an **atomic conditional update**: `UPDATE drivers SET state='ON_OFFER', trip=:t WHERE id=:d AND state='AVAILABLE'`, or the equivalent compare-and-set in the store. Only one matcher can win, and any others move on to the next candidate. A lease with an expiry returns the driver to AVAILABLE if the offer times out.

## Step 6: The trip state machine

Each trip is a **state machine** stored in a strongly consistent database, with each transition applied as a conditional write:

`REQUESTED → DRIVER_ASSIGNED → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED → PAID` (plus `CANCELLED` from several states).

State changes emit events through a transactional outbox (Chapter 20) to notifications, pricing, payments and analytics. Payment runs **after** completion as a saga, with idempotency keys, retries and compensation (refunds) when needed.

## Step 7: Surge pricing and ETAs

- **Surge:** a stream processor (Chapter 22) computes demand (open requests) and supply (available drivers) per hexagon over sliding windows of a minute or two, and publishes multipliers that the pricing service reads. Smoothing and caps keep prices from swinging wildly.
- **ETA:** routing engines over the road graph with live traffic, refined by ML models trained on historical trips, and cached per cell pair for speed.

## Step 8: Reliability and scale

- **Partition by geography:** cities are largely independent, so each region's services and data can scale and fail in isolation, and an outage in one city doesn't affect others.
- **Graceful degradation:** if ETA services are slow, fall back to distance-based estimates. If surge computation lags, use the last known multiplier.
- **Hot spots:** an airport or stadium cell can get thousands of drivers. Subdivide hot cells (adaptive resolution) and queue drivers fairly (an airport FIFO).

:::quiz
Q: Why are live driver locations kept in memory rather than written to a durable database on every update?
A: At ~1M+ updates per second, durable writes would be very expensive, and each value is obsolete within seconds, so losing one update is harmless because the next one replaces it. An in-memory geospatial index with TTLs handles the write rate cheaply and answers proximity queries fast. History is streamed to Kafka and cheap storage for analytics.

Q: How do you make sure two matchers can't assign the same driver to two riders at the same time?
A: Claim the driver with an atomic conditional update (compare-and-set) that succeeds only if the driver's state is still AVAILABLE, moving them to ON_OFFER with that trip ID. Only one claim can succeed, and the losers try other candidates. An offer timeout or lease releases the driver if they don't accept.

Q: Why does the matcher search neighbouring cells, and why rank by ETA rather than straight-line distance?
A: A rider near a cell boundary may have the closest drivers in adjacent cells, so searching only one cell would miss them. Straight-line distance ignores roads, rivers, one-way streets and traffic: a driver 300 m away across a river may be 15 minutes away by road, so ETA reflects real pickup time.

Q: Which parts of this system need strong consistency, and which can be eventual?
A: Strong: driver assignment (no double-booking), trip state transitions, payments and the ledger. Eventual: driver positions on the rider's map, the nearby-cars display, surge multipliers, ETAs, analytics, and ratings aggregation.
:::
