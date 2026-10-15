@part III | Real-Time Experiences | Systems that must react within milliseconds to what millions of people are doing — delivering alerts, merging simultaneous edits, ranking players and predicting the next keystroke.

# Notification System

Design a platform service that other teams use to send notifications (push, SMS, email and in-app) for events like "your order shipped", "new message", "password changed" and weekly digests.

## Step 1: Requirements

**Functional**

- An API for internal services: send to a user, through one or more channels, from a template with parameters.
- Delivery through third-party providers: Apple and Google push services, SMS gateways, email providers.
- User preferences: opt in or out per channel and category, quiet hours, frequency caps.
- Scheduled sends and bulk campaigns (millions of users).
- Delivery tracking: sent, delivered, opened, failed.

**Non-functional**

- **Prioritised:** a one-time password must arrive within seconds, even while a 50M-user marketing campaign is going out.
- **At-least-once delivery, but no visible duplicates.** Users hate getting the same alert twice.
- Survive provider outages and rate limits.
- Scale: 1B notifications/day, with peaks of 100k/s during campaigns.

## Step 2: API

```
POST /v1/notifications
  Idempotency-Key: order-981-shipped
  {user_id, category: "order_updates", template: "order_shipped",
   params: {order_id: 981, eta: "Fri"}, channels: ["push","email"],
   priority: "high" | "normal" | "bulk", send_at?: "2026-10-16T09:00:00Z"}
-> 202 {notification_id}
```

The API **accepts and queues**. It never sends synchronously. Callers get a 202 in milliseconds.

## Step 3: High-level design

:::diagram 640x310 | Notification pipeline. Requests are validated and stored, then flow through priority queues to channel workers that call external providers, with status events fed back.
box svc 10 30 90 40 "Calling\nservices" client
box api 130 30 110 40 "Notification API" svc
box st 130 110 110 50 "Notification\nstore" db
box pref 280 20 110 40 "Preferences +\ntemplates" cache
box qh 280 100 110 30 "queue: high" queue
box qn 280 140 110 30 "queue: normal" queue
box qb 280 180 110 30 "queue: bulk" queue
box wp 430 90 90 34 "Push workers" svc
box ws 430 135 90 34 "SMS workers" svc
box we 430 180 90 34 "Email workers" svc
box apn 560 90 70 34 "APNs/FCM" lb
box sms 560 135 70 34 "SMS gw" lb
box em 560 180 70 34 "Email" lb
box tr 280 250 240 40 "Status events → tracking & analytics" queue
arrow svc api
arrow api st "persist"
arrow api pref "check prefs, render" dashed
arrow api qh
arrow qh wp
arrow qn ws
arrow qb we
arrow wp apn
arrow ws sms
arrow we em
arrow apn tr "callbacks" dashed
:::

1. The **API** validates the request, de-duplicates it by idempotency key, persists it, and works out which channels to use from the user's **preferences** (opted out? quiet hours? frequency cap reached?).
2. It renders the template for each channel (localised) and enqueues one **message per channel** onto a queue for its **priority**.
3. **Channel workers** pull from the queues and call the provider for that channel, through per-provider rate limiting and circuit breakers.
4. Provider responses and callbacks (delivered, bounced, device token invalid) flow back as **status events** to update tracking and clean up bad addresses.

## Step 4: Deep dives

### Priorities and isolation

Use **separate queues, and separate worker capacity, per priority class**. A 50M-message campaign fills the bulk queue but can't delay one-time passwords in the high queue, because high-priority workers never touch bulk work. This is the bulkhead pattern (Vol. 1, Ch. 18) applied to queues. Workers may take bulk work only when the higher queues are empty.

### Fan-out for campaigns

"Send the weekly digest to 50M users" is one request that becomes 50M messages. A **campaign scheduler** pages through the target segment in batches (for example, 10k users), applies preferences, and enqueues messages at a controlled rate, spread over the send window and over time zones ("9 a.m. local time"). This protects the providers and our own downstream services, such as the deep-link pages users open.

:::diagram 640x170 | Campaign fan-out. One request becomes millions of messages, released in batches at a controlled rate and per time zone.
box r 10 60 110 50 "Campaign\nrequest" client
box sch 160 60 120 50 "Scheduler\n(segments, tz)" svc
box b1 330 20 120 30 "batch 1 (10k)" queue
box b2 330 65 120 30 "batch 2 (10k)" queue
box b3 330 110 120 30 "… batch 5,000" queue
box q 500 60 130 50 "Bulk queue\n(rate-limited)" queue
arrow r sch
arrow sch b1
arrow sch b2
arrow sch b3
arrow b1 q
arrow b2 q
arrow b3 q
:::

### Avoiding duplicates

At-least-once queues mean a worker may send, crash before acknowledging, and the message gets redelivered. To stop users from seeing two copies:

- Record `(notification_id, channel)` as *sent* in a fast store **before acknowledging**, and check it before sending.
- Pass a **collapse key or provider-side de-duplication ID** where the provider supports one (push services can replace an earlier notification with the same collapse key).
- Make upstream callers idempotent with idempotency keys, so that a retried "order shipped" call doesn't create a second notification.

A tiny duplicate window can remain (the crash happens after the provider accepted the message but before we recorded it). Collapse keys narrow it further.

### Provider failures and rate limits

Each provider limits our sending rate and sometimes fails. Workers use **token buckets per provider** to stay under limits, **exponential backoff with jitter** on transient errors, and **circuit breakers**. For critical messages, **fail over** to a secondary provider (a second SMS gateway). Permanent failures (invalid number, unregistered device token) are not retried. They update the user's contact record instead.

### Preferences, quiet hours and caps

Preferences are read on every notification, so they must be cached (in Redis or locally with short TTLs). Quiet hours *delay* non-urgent notifications to the next allowed time (re-queued with a scheduled time) rather than dropping them. Frequency caps ("max 3 marketing pushes per day") are counters per user per category with a daily TTL. Transactional and security messages bypass marketing caps but still respect hard opt-outs where the law requires.

### In-app notifications and the inbox

The in-app bell icon is a per-user **inbox**: a list sorted by time with read/unread state, stored in a wide-column store keyed by `user_id`. Online users get new items pushed over their existing WebSocket or SSE connection (Vol. 1, Ch. 10). Unread counts are cached counters.

## Step 5: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Campaign floods the system | OTPs delayed | Separate priority queues and worker pools |
| Provider outage | Channel down | Circuit breaker, retry with backoff, secondary provider for critical messages |
| Worker crash after send | Duplicate message | Sent-log check before send, collapse keys, idempotency |
| Stale device tokens | Wasted sends, provider penalties | Process provider feedback; remove invalid tokens |
| Preferences service slow | Pipeline stalls | Cache preferences; fail safe (skip marketing, still send security messages) |

:::quiz
Q: How do you guarantee that one-time passwords are delivered quickly while a huge marketing campaign is going out?
A: Separate the traffic by priority: different queues and dedicated worker capacity (and provider quota) for high-priority transactional messages, so bulk campaign messages can never fill the queue ahead of them or use up their workers. Campaigns are also throttled by a scheduler. This is the bulkhead pattern.

Q: Why does the notification API return 202 Accepted instead of sending synchronously?
A: Sending depends on slow, rate-limited, sometimes failing third-party providers. Accepting and queueing decouples callers from that: they get a fast response, spikes are absorbed by queues, retries and failover happen in the background, and calling services don't fail when a provider has an outage.

Q: Describe two techniques to stop users from receiving duplicate notifications under at-least-once delivery.
A: (1) Before sending, check and then record a sent marker for `(notification_id, channel)` in a fast store, so a redelivered message is skipped. (2) Use provider de-duplication features such as push collapse keys, so a repeat replaces the earlier notification instead of showing twice. Upstream idempotency keys also prevent callers from creating duplicate notifications.

Q: An SMS provider starts timing out on 30% of requests. How should the SMS workers react?
A: Retry transient failures with exponential backoff and jitter, within per-provider rate limits. A circuit breaker opens when the failure rate crosses a threshold, so workers stop hammering the provider. Critical messages such as one-time passwords fail over to a secondary SMS provider, while bulk messages can wait in the queue until the breaker closes again.

Q: How should quiet hours be handled for a non-urgent notification?
A: Don't drop it: reschedule it for the end of the user's quiet window in their local time zone, by re-queueing it with a delayed send time. Urgent or security notifications may bypass quiet hours according to policy.
:::

# Collaborative Document Editor

Design a real-time collaborative editor like Google Docs: several people edit the same document at once, see each other's changes and cursors within a fraction of a second, and nobody's work is lost.

## Step 1: Requirements

**Functional**

- Create and open rich-text documents. Several users edit at the same time.
- See other users' edits live, plus their cursors and selections (presence).
- Offline editing that merges on reconnect.
- Version history: see and restore earlier versions. Comments and sharing (briefly).

**Non-functional**

- Low latency: your own typing must feel instant (local), and others' edits appear within ~100–300 ms.
- **Convergence:** all users eventually see exactly the same document.
- **Intention preservation:** merged edits should do what each user meant.
- Scale: 100M documents, 10M daily editors, usually 1–10 editors per document, occasionally hundreds.

## Step 2: The core problem

Alice and Bob both see the text `cat`. At the same moment, Alice inserts "s" at the end (position 3) and Bob deletes the "c" at position 0. If each edit is simply applied on the other's machine *as sent*:

- Alice: `cats`, then Bob's "delete at 0" gives `ats` ✓
- Bob: `at`, then Alice's "insert s at 3" means position 3 doesn't exist in a 2-character string, so the result is wrong or an error ✗

Concurrent edits refer to positions in different versions of the document. We need a way to merge them so that every replica converges. There are two families of solutions.

## Step 3: Operational Transformation (OT)

With **OT**, when an operation arrives that was made concurrently with operations you've already applied, you **transform** it against them, adjusting its position so it still means the same thing. Bob's view: Alice's `insert("s", 3)` was concurrent with his `delete(0)`, which removed one character before position 3, so it is transformed to `insert("s", 2)`, giving `ats` ✓. Both sides converge.

:::diagram 640x220 | Operational transformation. A central server orders operations; concurrent operations are transformed against each other so both clients converge.
box a 20 20 110 40 "Alice: 'cat'" client
box b 510 20 110 40 "Bob: 'cat'" client
box s 260 90 120 50 "Server\n(orders ops, v12→v14)" svc
box a2 20 170 110 40 "Alice: 'ats'" good
box b2 510 170 110 40 "Bob: 'ats'" good
arrow a s "ins('s',3) @v12"
arrow b s "del(0) @v12"
arrow s a2 "del(0) (no change)"
arrow s b2 "ins('s',2) (transformed)"
:::

Practical OT systems use a **central server** that assigns every operation a position in one total order (a revision number). Clients send operations tagged with the revision they were based on. The server transforms each incoming operation against any operations committed since that revision, applies it, and broadcasts it. A central sequencer keeps the transformation rules manageable. OT without a central server is notoriously hard to get right.

## Step 4: CRDTs

A **CRDT** (conflict-free replicated data type, Vol. 1, Ch. 14) designed for text gives every character a **unique, permanent identifier** (for example, `(site_id, counter)`) and defines positions *relative to identifiers* instead of indexes: "insert 's' after character `(alice, 3)`". Deletions mark characters as removed (tombstones) instead of shifting positions. Because operations refer to stable IDs and the merge rules are commutative, replicas can apply operations **in any order**, with no central server, and still converge.

:::diagram 640x170 | A text CRDT. Every character has a permanent ID, and inserts reference their neighbour's ID instead of a position.
box c1 20 30 90 46 "'c'\n(A,1)" svc
box c2 120 30 90 46 "'a'\n(A,2)" svc
box c3 220 30 90 46 "'t'\n(A,3)" svc
box c4 320 30 90 46 "'s'\n(B,1)" good
box x 420 30 90 46 "'c' deleted\n= tombstone" bad
text 365 110 "B: insert 's' after (A,3)" small accent
text 465 110 "A: delete (A,1)" small muted
text 320 150 "Operations commute: any order of applying them gives 'ats'." bold
:::

| | OT | CRDT |
|---|---|---|
| Positions | Indexes, transformed | Stable unique IDs |
| Server | Central sequencer (practically required) | Optional, peer-to-peer possible |
| Offline / P2P | Harder | Natural |
| Metadata overhead | Low | Higher (IDs, tombstones), mitigated by compaction |
| Maturity in big products | Long track record | Increasingly common in modern editors |

:::tradeoff Which one?
A centralised, always-online editor can use OT with a server sequencer and keep documents compact. An editor that must work offline for long periods, sync device to device, or avoid a central bottleneck is a natural fit for CRDTs. Many modern systems use CRDTs and still route traffic through a server for persistence, access control and fan-out.
:::

## Step 5: High-level design

:::diagram 640x290 | Collaborative editing architecture. Each open document is owned by one session server that sequences and broadcasts operations, persists them to an operation log, and periodically snapshots the document.
box u1 10 30 80 36 "Editor A" client
box u2 10 100 80 36 "Editor B" client
box u3 10 170 80 36 "Editor C" client
box gw 130 95 100 46 "WebSocket\ngateway" lb
box ds 290 85 130 66 "Document session\n(owner of doc 42)\nsequence + transform" svc
box rt 290 10 130 40 "Routing: doc → session" cache
box ol 480 40 140 46 "Operation log\n(append-only)" db
box sn 480 120 140 46 "Snapshots\n(object storage)" store
box pr 480 200 140 40 "Presence\n(cursors, in-memory)" cache
arrow u1 gw "ws" both
arrow u2 gw "" both
arrow u3 gw "" both
arrow gw rt "which server?" dashed
arrow gw ds "ops" both
arrow ds ol "append"
arrow ds sn "every N ops" dashed
arrow ds pr "" dashed
:::

**Document sessions:** every open document is assigned to **one session server** (via consistent hashing on `doc_id`, or a routing table with leases). All editors of that document connect, through the gateway, to that server, which holds the live document in memory, orders operations, transforms or merges them, and broadcasts the results. One owner per document makes ordering simple and fast. Different documents spread across many servers.

**Persistence:** every accepted operation is appended to the document's **operation log** before it is acknowledged. Every few hundred operations, a **snapshot** of the full document is saved. Loading a document means reading the latest snapshot and replaying the operations after it. The operation log also gives **version history** for free.

**Local-first typing:** the client applies your keystrokes to its local copy immediately (so typing feels instant), sends them asynchronously, and reconciles with the server's ordered stream as acknowledgements and other users' operations arrive.

## Step 6: Deep dives

### Presence

Cursors and selections change constantly and don't need to be durable. They are sent as lightweight, throttled messages (for example, 10/s at most) through the session server and kept only in memory, with a TTL when users go idle. Losing one costs nothing, because the next update replaces it.

### Offline editing

The client queues its operations locally while offline. On reconnect, it sends them tagged with its last known revision (OT), or simply exchanges missing operations (a CRDT state-vector sync). The server merges them. For long offline sessions, CRDTs make this merge straightforward.

### Session server failure

If a session server dies, its documents are reassigned (the lease expires and the routing table points to a new owner). The new owner loads the snapshot plus the operation log. Clients reconnect and resend any operations that weren't acknowledged. Since accepted operations were persisted before being acknowledged, nothing confirmed is lost, and resent operations are de-duplicated by `(client_id, seq)`.

### Very large audiences

A document with 500 simultaneous viewers mostly needs *fan-out*, not merging. Separate a small set of editors from many read-only viewers, and broadcast through a pub/sub tier or the CDN with a slight delay, so the session server isn't sending every keystroke to hundreds of sockets itself.

### Access control

Permissions (owner, editor, commenter, viewer) are checked when a client joins a session, and again whenever they change, by kicking or downgrading connected clients. The session server rejects edit operations from users without edit rights.

## Step 7: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Concurrent conflicting edits | Divergence | OT transformation or CRDT merge rules guarantee convergence |
| Session server crash | Brief disconnect | Reassign doc; reload snapshot + log; clients resend unacked ops |
| Client offline for hours | Large merge | Local op queue; CRDT/state-vector sync |
| Operation log grows forever | Slow loads | Periodic snapshots; compact old history |
| Hundreds of viewers | Fan-out load | Separate viewers; pub/sub broadcast |

:::quiz
Q: Why can't concurrent edits simply be applied as sent on every replica?
A: Operations refer to positions (indexes) in the document version their author saw. A concurrent edit by someone else may have inserted or deleted text before that position, so applying the operation unchanged puts it in the wrong place or makes it invalid, and the replicas diverge. Edits must be transformed (OT) or expressed relative to stable identifiers (CRDT).

Q: How does a text CRDT avoid the position problem?
A: Every character gets a globally unique, permanent ID, and insertions are expressed relative to neighbouring IDs ("after character X") rather than numeric indexes. Deletions mark characters as tombstones instead of shifting positions. Because the merge rules are commutative and idempotent, replicas can apply operations in any order and still converge, without a central sequencer.

Q: Why assign each open document to a single session server?
A: One owner can impose a single total order on that document's operations, which keeps transformation and merging simple and fast, and it holds the live state in memory for low latency. Different documents spread across many servers, so the system scales horizontally. A failed owner is replaced by reassigning the document and reloading its snapshot and operation log.

Q: Why are cursor and selection updates handled differently from document edits?
A: Presence data changes many times per second, matters only while the user is active, and each update replaces the previous one. So it is throttled, kept only in memory with a TTL, and never written to the operation log. Losing an update costs nothing. Document edits, by contrast, must be durable, ordered and merged.

Q: How do snapshots and the operation log together support fast loading and version history?
A: Every operation is appended to a durable log, which is a complete history that allows viewing or restoring any past version. Periodic snapshots save the full document state, so opening a document only needs the latest snapshot plus the operations after it, instead of replaying the entire history.
:::

# Leaderboards and Live Metrics

Design the ranking and counting systems for a large online game: a global leaderboard of player scores updated in real time, rankings for friends and regions, and live dashboards of counts like "players online" and "unique players today".

## Step 1: Requirements

**Functional**

- Submit a score after each match. A player's best score counts.
- Show the top 100 globally, a player's own rank ("you are #48,213"), the players just above and below them, and friends-only and regional boards.
- Daily, weekly and all-time leaderboards.
- Live metrics: concurrent players, matches per minute, unique daily players, top-K most played maps.

**Non-functional**

- Score updates are visible in under a second. Rank queries in under 50 ms.
- 50M players. 20k score updates/s at peak. 100k rank reads/s.
- Approximate answers are fine for metrics, and exact for the top of the leaderboard.

## Step 2: The core structure: sorted sets

A **sorted set** keeps members ordered by score, with O(log n) insert, update and rank lookups. Redis implements it with a skip list plus a hash map (Vol. 1, Ch. 21).

```
ZADD   lb:alltime GT 9120 player:42        # set score, only if greater than the current one
ZREVRANGE lb:alltime 0 99 WITHSCORES       # top 100
ZREVRANK  lb:alltime player:42             # 0-based rank of player 42
ZREVRANGE lb:alltime (rank-5) (rank+5)     # neighbours around the player
```

50M members × ~100 bytes ≈ 5 GB, which fits in the memory of one large node.

## Step 3: High-level design

:::diagram 640x280 | Leaderboard and metrics architecture. Score events update sorted sets in real time, and a stream processor computes approximate live metrics with sketches.
box gs 10 40 90 46 "Game servers" client
box api 150 40 110 46 "Score service\n(validate)" svc
box k 150 140 110 40 "Event stream" queue
box lb 320 20 140 66 "Leaderboards\n(sorted sets,\nsharded)" cache
box db 320 120 140 46 "Scores DB\n(durable)" db
box sp 320 200 140 46 "Stream processor\n(windows, sketches)" svc
box rd 520 20 110 46 "Rank API" svc
box dash 520 200 110 46 "Live\ndashboards" client
arrow gs api "match result"
arrow api lb "ZADD GT"
arrow api db "persist"
arrow api k "events" dashed
arrow k sp
arrow sp dash
arrow rd lb "rank / top-K"
:::

Game servers submit results to the **score service**, which validates them (anti-cheat: server-authoritative results, plausibility checks), persists them durably, updates the sorted sets, and emits an event. The **rank API** answers reads directly from the sorted sets. The **stream processor** consumes events to produce live metrics.

## Step 4: Deep dives

### Time-windowed boards

Keep a separate sorted set per period: `lb:daily:2026-10-15`, `lb:weekly:2026-W42`, `lb:alltime`. Each score update writes to all of the current ones (pipelined). Old period keys get a TTL and are archived to the database for history. Nothing needs to be "reset". A new day simply starts a new key.

### Scaling beyond one node

When one sorted set gets too big or too hot:

- **Shard by score range:** shard 1 holds scores 0–999, shard 2 holds 1000–4999, and so on. A player's rank = their rank within their shard + the total number of members in all higher shards (kept in cached counters). Top-K reads come from the highest shard alone. Score changes may move a player between shards.
- **Shard by player and merge for top-K:** each shard holds a slice of players. The global top 100 = merge each shard's top 100. Exact rank for an arbitrary player requires asking every shard "how many scores are above X?" and adding up the answers. That is fine for a few shards, expensive for many.
- **Approximate rank for the long tail:** few people care whether they are #4,812,113 or #4,812,500. Keep exact sorted sets for the top tier, and estimate deep ranks from a score histogram ("top 9.6%").

:::diagram 640x170 | Sharding a leaderboard by score range. Rank = rank within your shard + the members of all higher shards.
box s3 20 50 180 50 "Shard C: 5,000+\n12,400 players" good
box s2 230 50 180 50 "Shard B: 1,000–4,999\n2.1 M players" svc
box s1 440 50 180 50 "Shard A: 0–999\n47.9 M players" store
text 320 135 "Player with 3,200 points, #8,500 inside shard B → global rank = 12,400 + 8,500 = 20,900" small bold
:::

:::tradeoff Exact where people look, approximate where they don't
Players scrutinise the top of the board and their friends' ranks, so those must be exact and fresh. Deep global ranks can come from a histogram or percentile estimate, which is far cheaper and good enough. Matching precision to attention is a recurring pattern in large systems.
:::

### Friends and regional boards

**Regional:** a separate sorted set per region, updated alongside the global one. **Friends:** most players have fewer than a few hundred friends, so compute on read: fetch each friend's score (a multi-get from a hash) and sort in memory, cached briefly per player. Avoid maintaining a sorted set per friendship graph.

### Durability and rebuilds

The sorted sets are a fast **derived view**. The durable source of truth is the scores database, or the event log. If the cache cluster is lost, rebuild the sets by replaying best scores from the database. Redis persistence and replicas reduce how often this is needed.

### Live metrics with sketches

- **Concurrent players:** each game server reports its connected count every few seconds, and the dashboard sums the latest reports (gauges, Vol. 1, Ch. 24).
- **Matches per minute:** tumbling one-minute windows in the stream processor (Vol. 1, Ch. 22).
- **Unique daily players:** a **HyperLogLog** per day (`PFADD dau:2026-10-15 player:42`) holds ~12 KB regardless of count, and daily sketches merge into weekly ones (Vol. 1, Ch. 21).
- **Top-K most played maps:** a **Count-Min Sketch** plus a small heap of candidates gives approximate heavy hitters in fixed memory.

## Step 5: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Cheated scores | Corrupted board | Server-authoritative results, validation, anomaly detection, moderation tools |
| Cache node lost | Board unavailable | Replicas + failover; rebuild from durable scores |
| Hot sorted set | Latency spikes | Read replicas for rank reads; shard by score range |
| Event backlog | Stale dashboards | Autoscale consumers; dashboards show data freshness |

:::quiz
Q: Why is a sorted set (skip list) a natural fit for a leaderboard?
A: It keeps members ordered by score and supports insert/update, rank lookup and range queries (top-K, neighbours around a player) in O(log n). That covers every leaderboard operation in real time for tens of millions of players held in memory.

Q: How do you implement daily and weekly leaderboards without a reset job?
A: Use a separate sorted-set key per period (such as `lb:daily:2026-10-15`) and write each score to the current period keys along with the all-time key. A new period simply starts writing a new key. Old keys expire through a TTL after being archived, so no reset is needed.

Q: How can you compute an exact global rank when the leaderboard is sharded by score range?
A: A player's rank equals their rank within their own shard plus the total number of members in all shards covering higher score ranges. Each shard's member count is kept in cached counters, so this needs only a lookup in one shard plus a sum.

Q: Which structures would you use to count unique daily players and the most-played maps in fixed memory?
A: A HyperLogLog per day for unique players (~12 KB, ~1% error, mergeable across days), and a Count-Min Sketch with a small heap of top candidates for approximate top-K map plays.
:::

# Search Autocomplete

Design the "type-ahead" suggestion box of a search engine or large e-commerce site: as the user types, show the 10 most relevant completions of their prefix within a few tens of milliseconds.

## Step 1: Requirements

**Functional**

- Given a prefix, return the top 10 suggestions ranked by popularity, with some freshness (trending queries rise quickly) and personalisation.
- Support multiple languages, and filter offensive or unsafe suggestions.

**Non-functional**

- **Very low latency:** under 50 ms end to end, since a request fires on nearly every keystroke.
- High availability. Slightly stale suggestions are fine.
- Scale: 500M searches/day; with an average of ~6 keystroke requests per search, that is **3B requests/day ≈ 35k/s**, peaking around 100k/s.

## Step 2: Core structure: a trie with cached top-K

A **trie** (prefix tree) stores strings character by character, so all queries sharing a prefix share a path. Walking to the node for "sys" finds every query starting with "sys". Collecting and sorting all of them for every keystroke would be too slow for short prefixes, which have millions of descendants. So **each node stores its own precomputed top-K list**.

:::diagram 640x250 | A trie where every node caches the top completions beneath it. A lookup is a walk down the prefix plus one read, with no subtree search.
box r 270 10 100 34 "(root)" svc
box s 270 70 100 34 "s" svc
box sy 170 135 120 46 "sy  top: system\ndesign, sydney…" cache
box sh 360 135 110 46 "sh  top: shoes,\nshein, shrek…" cache
box sys 90 205 160 40 "sys  top: system design, …" good
box syd 270 205 120 40 "syd  top: sydney…" cache
arrow r s
arrow s sy
arrow s sh
arrow sy sys
arrow sy syd
text 560 210 "lookup('sys') = 3 hops + read list" small muted
:::

A lookup is O(prefix length): walk three nodes and return the cached list. The cost moves to **building** the trie, which happens offline.

## Step 3: High-level design

:::diagram 640x300 | Autocomplete architecture. A data pipeline builds tries from query logs, suggestion servers hold them in memory, and caching at every layer absorbs repeated prefixes.
box u 10 40 90 46 "Browser\n(debounce)" client
box cdn 140 40 100 46 "CDN / edge\ncache" cdn
box ss 290 30 130 66 "Suggestion\nservers\n(trie in memory)" svc
box tr 480 40 140 46 "Trending overlay" cache
box ql 290 220 130 40 "Query logs" queue
box agg 480 220 140 40 "Aggregation\n(batch + stream)" svc
box st 290 130 130 46 "Trie snapshots" store
box bld 480 130 140 46 "Trie builder\n+ safety filters" svc
arrow u cdn "q=sys"
arrow cdn ss "miss"
arrow ss ql "search events" dashed lx=-44 ly=40
arrow ql agg
arrow agg bld "counts" lx=30 ly=0
arrow bld st "write"
arrow st ss "load" lx=-20 ly=0
arrow agg tr "spikes" dashed lx=-56 ly=40
arrow tr ss "merge" dashed
:::

**Serving path:** the browser waits ~100 ms of typing inactivity (debounce) and caches responses locally, then asks the CDN edge, which caches popular prefixes for a few minutes. Misses reach the suggestion servers, which hold the trie in memory and answer in microseconds.

**Data path:** search events go to a log. Aggregation jobs count query frequencies over time windows. A builder produces a new trie (with top-K lists computed bottom-up), applies safety filters, and writes a versioned snapshot. Suggestion servers load the new version in the background and switch to it atomically.

## Step 4: Deep dives

### Ranking

Score each query by *frequency with time decay* (recent searches weigh more), plus signals such as click-through rate on the results. The top-K at each node is computed bottom-up: a node's list is the best K entries among its own query (if it is a complete query) and its children's lists.

### Freshness: batch plus trending

A full rebuild from weeks of logs might run hourly or daily. Breaking news can't wait that long. A **streaming path** counts queries in short sliding windows (Vol. 1, Ch. 22), detects sudden spikes, and publishes a small **trending overlay** that suggestion servers merge with the base trie's results at query time. This is the Lambda-architecture idea in miniature: a slow, accurate batch layer and a fast, approximate speed layer.

### Scaling the trie

- **Replicate:** the trie for one language and market is often a few GB, so full copies on many servers handle read throughput, with load balancing between them.
- **Shard when too big:** partition by prefix range ("a–f", "g–m", …), weighted by traffic rather than letters, since "s" is far busier than "x". A router sends each prefix to its shard.
- **Separate tries** per language or market (and per product vertical, where relevant).

:::diagram 640x170 | Serving blends a slow, complete base trie with a fast trending overlay.
box b 20 20 160 46 "Base trie\n(rebuilt hourly)" store
box t 20 100 160 46 "Trending overlay\n(updated every minute)" cache
box m 260 55 140 56 "Merge + rank\n(on the server)" svc
box o 470 55 160 56 "Top 10 for 'eart…'\n'earthquake today' ↑" good
arrow b m
arrow t m
arrow m o
:::

### Personalisation

Blend the global suggestions with the user's own recent searches (kept client-side or in a small per-user store) at the edge or in the browser, so the shared cache stays effective and the trie stays global.

### Safety

Suggestions are a product surface that can embarrass or harm. Filter offensive, hateful and personal-data queries with blocklists and classifiers during the build, apply an emergency blocklist at serving time for instant removals, and require a minimum query frequency from many distinct users, so that a few people can't game suggestions.

## Step 5: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Builder produces bad trie | Wrong or empty suggestions | Validate snapshots (size, sample queries) before rollout; keep previous version for instant rollback |
| Suggestion server overload | Slow typing experience | Debounce, client and edge caching, more replicas |
| Offensive suggestion surfaces | Reputational harm | Build-time filters, serving-time emergency blocklist |
| Trending pipeline lags | Stale for breaking events | Base trie still serves; monitor freshness |

:::quiz
Q: Why does each trie node store a precomputed top-K list?
A: Short prefixes have millions of descendants, and collecting and sorting them on every keystroke would be far too slow. Caching the best K completions at each node makes a lookup a walk of length equal to the prefix plus one read, giving microsecond responses. The cost moves to the offline build.

Q: How do you keep suggestions fresh for breaking news when the main trie is rebuilt only hourly?
A: Add a streaming path that counts recent queries over short sliding windows, detects spikes, and publishes a small trending overlay. Suggestion servers merge it with the base trie's results at query time. Batch gives accuracy, streaming gives speed.

Q: List three layers of caching or request reduction in front of the suggestion servers.
A: (1) Debouncing in the browser, so not every keystroke fires a request. (2) A client-side cache of recent prefix responses. (3) CDN or edge caching of popular prefixes for a few minutes. Within the servers, the in-memory trie is itself a precomputed cache.

Q: How would you stop a small group of users from pushing an offensive phrase into the suggestions?
A: Require a minimum query frequency from many distinct users (and accounts or IPs) before a query can become a suggestion, filter candidates with blocklists and classifiers during the build, and keep an emergency serving-time blocklist so that anything harmful that gets through can be removed instantly without waiting for a rebuild.

Q: Why shard a trie by traffic-weighted prefix ranges rather than equal alphabet ranges?
A: Query volume is very uneven across starting letters: some prefixes get far more traffic than others. Equal alphabet ranges would overload some shards and leave others idle. Weighting shard boundaries by observed traffic balances the load.
:::
