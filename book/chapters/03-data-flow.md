@part III | Moving Data | How services push updates to users in real time, how they talk to each other without waiting, and how caching makes almost everything faster.

# Real-Time Communication

Plain HTTP is *client-initiated*: the server can only speak when spoken to. But chat messages, live scores, collaborative cursors and ride-tracking maps need the server to **push** updates as they happen. This chapter compares the techniques for doing that.

## Short polling

The client asks every few seconds: "anything new?" It is trivial to build and works everywhere. But most responses are empty, so bandwidth and server capacity are wasted. Latency averages half the polling interval, and making the interval shorter multiplies the load.

## Long polling

The client sends a request, and the server **holds it open** until there is data or a timeout (say 30 s) passes. Then the client immediately sends a new request. Updates arrive almost instantly, and far fewer requests come back empty. It still pays HTTP overhead per message, ties up a connection per waiting client, and needs care to avoid losing messages between requests.

## Server-Sent Events (SSE)

The client opens one HTTP connection, and the server streams text events down it indefinitely (`Content-Type: text/event-stream`). Browsers reconnect automatically and resume from the last event ID. SSE is simple, works through most proxies and runs on plain HTTP, but it is **one-directional** (server → client) and text-only. It is ideal for notifications, live feeds, dashboards and streaming LLM output.

## WebSockets

A WebSocket starts as an HTTP request with an `Upgrade` header. After that, the connection becomes a persistent, **full-duplex** channel: both sides can send messages at any time with minimal framing overhead. It is the standard choice for chat, multiplayer games, collaborative editing and trading screens.

:::diagram 640x270 | Four ways to get server updates to a client, from the most wasteful to the most interactive.
box z1 10 10 150 250 "Short polling" zone
box z2 170 10 150 250 "Long polling" zone
box z3 330 10 150 250 "SSE" zone
box z4 490 10 140 250 "WebSocket" zone
line 40 45 40 245 "" noarrow dashed
line 130 45 130 245 "" noarrow dashed
line 40 60 130 70 "any news?"
line 130 80 40 90 "no"
line 40 110 130 120 "any news?"
line 130 130 40 140 "no"
line 40 160 130 170 "any news?"
line 130 180 40 190 "yes: msg"
line 200 45 200 245 "" noarrow dashed
line 290 45 290 245 "" noarrow dashed
line 200 60 290 70 "request"
line 290 150 200 160 "held… msg"
line 200 170 290 180 "re-request"
line 360 45 360 245 "" noarrow dashed
line 450 45 450 245 "" noarrow dashed
line 360 60 450 70 "subscribe"
line 450 100 360 110 "event"
line 450 150 360 160 "event"
line 450 200 360 210 "event"
line 520 45 520 245 "" noarrow dashed
line 600 45 600 245 "" noarrow dashed
line 520 60 600 70 "upgrade"
line 600 100 520 110 "msg"
line 520 140 600 150 "msg"
line 600 180 520 190 "msg"
:::

| | Short polling | Long polling | SSE | WebSocket |
|---|---|---|---|---|
| Direction | Client pull | Client pull (held) | Server → client | Bidirectional |
| Latency | Up to interval | Near real-time | Real-time | Real-time |
| Overhead | High | Medium | Low | Lowest |
| Complexity | Trivial | Moderate | Low | Higher (stateful) |
| Best for | Rare updates | Fallback, simple push | Feeds, notifications | Chat, games, collaboration |

## WebRTC

For **peer-to-peer** audio, video and data (video calls, screen sharing), **WebRTC** lets browsers connect directly, usually over UDP. A *signalling server* (often using WebSockets) helps peers exchange connection details. **STUN** servers help peers discover their public addresses through NAT, and **TURN** servers relay traffic when a direct path is impossible. Group calls usually go through an **SFU** (selective forwarding unit), which receives each participant's stream and forwards it to the others.

## Scaling persistent connections

WebSockets and SSE make servers **stateful**: each connection lives on one specific server. A million concurrent users means a million open connections, spread over a fleet of *connection servers* (a single tuned server can hold hundreds of thousands of mostly idle connections).

The central problem: user A is connected to server 3, and user B to server 17. How does A's message reach B?

:::diagram 640x250 | Routing messages between users on different connection servers through a pub/sub backbone, with a registry recording who is connected where.
box ua 20 40 80 36 "User A" client
box ub 20 170 80 36 "User B" client
box g1 170 40 120 36 "Gateway 3" svc
box g2 170 170 120 36 "Gateway 17" svc
box ps 380 100 120 50 "Pub/Sub\n(e.g. Redis, Kafka)" queue
box reg 520 20 110 50 "Presence\nregistry" cache
arrow ua g1 "ws" both
arrow ub g2 "ws" both
arrow g1 ps "publish to B's channel"
arrow ps g2 "deliver"
arrow g1 reg "B is on 17?" dashed
:::

The usual answer is a **pub/sub backbone**. Each connection server subscribes to channels for the users (or rooms) connected to it, and a sender's server publishes to the recipient's channel. Alternatively, a **presence registry** maps each user to their server, so messages can be routed directly.

:::pitfall Reconnect storms
When a connection server restarts or a deploy rolls out, hundreds of thousands of clients reconnect at once and can overwhelm the remaining servers or the auth service. Use randomised reconnect backoff on clients, drain connections gradually during deploys, and size for reconnect spikes, not just steady state.
:::

:::tip Choose the simplest technique that meets the need
"Notifications only flow server → client, so I'll use SSE: plain HTTP, automatic reconnects. For chat, where clients also send frequently, I'll use WebSockets, with long polling as a fallback for restrictive networks."
:::

:::quiz
Q: Why is SSE often a better choice than WebSockets for a live news feed?
A: The feed only needs server → client updates. SSE runs over plain HTTP, so it works with existing proxies, load balancers and auth. It reconnects and resumes from the last event ID automatically, and it is simpler to operate. WebSockets' bidirectional ability would go unused.

Q: In a chat system with 200 WebSocket servers, how does a message from a user on server 12 reach a recipient on server 140?
A: Server 12 publishes the message to a pub/sub system (on a channel for the recipient or the conversation), and server 140, which subscribed to that channel when the recipient connected, receives it and pushes it down the WebSocket. Alternatively, a presence registry tells server 12 that the recipient is on server 140, and it forwards the message directly. The message is also saved durably so offline or reconnecting users can fetch it.

Q: What are STUN and TURN servers used for in WebRTC?
A: STUN lets a peer discover its public IP and port as seen from outside its NAT, so peers can try to connect directly. TURN relays media between peers when a direct connection is impossible (for example, behind symmetric NATs or strict firewalls). It always works, but it costs server bandwidth.
:::

# Message Queues and Publish/Subscribe

Not every piece of work needs to finish before you reply to the user. When someone uploads a video, you can confirm the upload in milliseconds and transcode it over the next few minutes. **Asynchronous messaging** separates the producers of work from its consumers, in time, in speed and in deployment.

## Why asynchronous messaging?

- **Faster responses:** slow work moves off the user's request path.
- **Load levelling:** a queue absorbs traffic spikes, and consumers work through the backlog at their own pace instead of being flattened.
- **Decoupling:** producers don't know or care who consumes their messages, or whether consumers are up right now.
- **Reliability:** if a consumer crashes, messages wait safely in the queue and are retried.
- **Fan-out:** one event can trigger many independent reactions.

:::diagram 640x170 | A queue absorbs a traffic spike and lets consumers work through the backlog at a steady rate.
box p 20 60 100 46 "Producers\n(spiky)" client
box q 220 60 180 46 "Queue  ▮▮▮▮▮▮▮" queue
box c1 500 20 110 36 "Consumer" svc
box c2 500 65 110 36 "Consumer" svc
box c3 500 110 110 36 "Consumer" svc
arrow p q "10k msg/s burst"
arrow q c1
arrow q c2 "steady 2k msg/s"
arrow q c3
:::

## Point-to-point queues vs. publish/subscribe

**Point-to-point (work queue):** each message is handled by **exactly one** of the competing consumers. You add consumers to increase throughput. Typical uses: sending emails, processing images, running jobs.

**Publish/subscribe:** each message is delivered to **every subscriber** (each subscription gets its own copy). An `OrderPlaced` event can at once update inventory, send a confirmation email, notify analytics and start fraud checks, and none of those services know about each other.

:::diagram 640x230 | Left: competing consumers share the work. Right: every subscriber group receives every event.
box z1 10 10 300 210 "Point-to-point" zone
box p1 30 100 70 40 "Producer" client
box q1 130 100 70 40 "Queue" queue
box w1 230 50 70 32 "Worker" svc
box w2 230 104 70 32 "Worker" svc
box w3 230 158 70 32 "Worker" svc
arrow p1 q1
arrow q1 w1 "msg 1"
arrow q1 w2 "msg 2"
arrow q1 w3 "msg 3"
box z2 330 10 300 210 "Publish / subscribe" zone
box p2 345 100 70 40 "Order svc" client
box t 440 100 70 40 "Topic" queue
box s1 540 45 80 32 "Inventory" svc
box s2 540 104 80 32 "Email" svc
box s3 540 163 80 32 "Analytics" svc
arrow p2 t "OrderPlaced"
arrow t s1
arrow t s2
arrow t s3
:::

## Two families of brokers

**Traditional message brokers** (RabbitMQ, ActiveMQ, Amazon SQS) track the delivery of each message. A message is removed once a consumer acknowledges it. They offer rich routing (exchanges, topics, priorities) and per-message acknowledgement, and are well suited to task queues.

**Log-based brokers** (Apache Kafka, Pulsar, Kinesis) append messages to a durable, **partitioned, ordered log** and keep them for a retention period (days or forever). Consumers track their own **offset** (position) in each partition. Several consumer groups can read the same log independently, and a consumer can **replay** history by rewinding its offset.

:::diagram 640x220 | A partitioned log. Each consumer group tracks its own offset per partition, and messages stay after they are read.
box tp 20 20 600 190 "Topic 'orders' (3 partitions)" zone
box p0 40 50 330 34 "P0: | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |" queue
box p1 40 100 330 34 "P1: | 0 | 1 | 2 | 3 | 4 |" queue
box p2 40 150 330 34 "P2: | 0 | 1 | 2 | 3 | 4 | 5 |" queue
box g1 460 55 140 40 "Group: billing\noffsets 7, 4, 5" svc
box g2 460 135 140 40 "Group: analytics\noffsets 3, 2, 1" svc
arrow p0 g1 "" dashed
arrow p2 g2 "" dashed
:::

**Ordering in Kafka** is guaranteed *within a partition*, not across them. Messages with the same **key** (for example, `order_id` or `user_id`) always go to the same partition, so all events for one entity stay in order. Parallelism equals the number of partitions: within one consumer group, each partition is read by at most one consumer.

| | Message broker (RabbitMQ / SQS) | Log (Kafka) |
|---|---|---|
| Message after consumption | Deleted | Retained for a set period |
| Replay | No | Yes, rewind the offset |
| Ordering | Per queue (weak with many consumers) | Per partition (strong) |
| Throughput | High | Very high (sequential disk I/O) |
| Consumer state | Tracked by broker | Consumer tracks its offset |
| Best for | Task queues, complex routing | Event streams, event sourcing, pipelines |

## Delivery guarantees

- **At-most-once:** a message may be lost but is never duplicated (acknowledge before processing). Acceptable for metrics where a gap doesn't matter.
- **At-least-once:** a message is never lost but may be **delivered more than once** (acknowledge after processing; a crash before the ack causes redelivery). This is the practical default.
- **Exactly-once:** each message affects the result exactly once. True exactly-once delivery across arbitrary systems is impossible in general. What systems provide is *exactly-once processing* within a closed system (Kafka transactions) or *effectively-once* behaviour through idempotent consumers.

:::key At-least-once delivery + idempotent consumers = effectively once
Design every consumer so that handling the same message twice has the same effect as handling it once. Track processed message IDs, use upserts instead of inserts, or use conditional updates ("set status=SHIPPED where status=PACKED"). This is how real systems get correct results from imperfect delivery.
:::

## Dead-letter queues and poison messages

A **poison message** is one that always fails, perhaps because it is malformed or hits a bug. Without protection, it is retried forever and blocks the queue. After *N* failed attempts, move it to a **dead-letter queue (DLQ)** for inspection and later replay. Always monitor DLQ depth.

## Backpressure

If producers outpace consumers indefinitely, queues grow without limit until memory, disk or latency targets give out. **Backpressure** is any way of pushing back: bounded queues that reject or block producers, consumers that scale automatically on queue depth, or shedding low-priority work. *Queue depth* and *consumer lag* are the two most important metrics for any asynchronous system.

:::pitfall A queue is not a magic scalability wand
A queue smooths bursts, but if the *average* arrival rate exceeds the *average* processing rate, the backlog grows forever. Queues buy time. They don't buy capacity.
:::

:::quiz
Q: When would you choose publish/subscribe over a point-to-point queue?
A: When several independent consumers each need to react to the same event, such as an `OrderPlaced` event used by inventory, email, analytics and fraud services. Pub/sub delivers a copy to each subscriber, which decouples the producer from the growing list of consumers. Point-to-point suits splitting work among identical workers, where each task must be done once.

Q: How does Kafka keep all events for a single order in order while still processing in parallel?
A: The producer uses the `order_id` as the message key. Kafka hashes the key to pick a partition, so all events for that order land in the same partition, which is strictly ordered and read by one consumer in the group at a time. Different orders spread across partitions and are processed in parallel.

Q: Your consumer receives the message "charge customer $50" twice. What delivery guarantee causes this, and how do you prevent a double charge?
A: At-least-once delivery: the consumer probably crashed or timed out after processing but before acknowledging, so the message was redelivered. Make the consumer idempotent. Record the message or payment ID in the same transaction as the charge and skip IDs already processed, or use an idempotency key with the payment provider.

Q: What is a dead-letter queue for?
A: It holds messages that failed processing a set number of times (poison messages), so they stop blocking or endlessly consuming the main queue. Engineers can inspect them, fix the bug or data, and replay them. DLQ depth should be monitored and alerted on.
:::

# Caching

A cache is a small, fast store that keeps copies of data that is expensive to fetch or compute. Caching is the most powerful performance tool in system design, and the source of some of its most subtle bugs. As the old joke says, there are only two hard things in computer science: cache invalidation and naming things.

## Why caching works

Data access is rarely uniform. A small fraction of items (a celebrity's profile, today's front page, a popular product) receives most of the traffic. This **skew** means a cache holding just the hottest few percent of the data can serve the large majority of reads.

Effective latency = hit_rate × cache_latency + (1 − hit_rate) × source_latency

With a 1 ms cache, a 50 ms database and a 95% hit rate: 0.95 × 1 + 0.05 × 50 ≈ **3.5 ms** on average, and the database sees just 5% of the read traffic.

## Where caches live

Caches appear at every layer, and a single request may pass through several:

:::diagram 640x170 | Caching layers from the user's device to the database. Each hit saves every hop to its right.
box b 10 60 90 50 "Browser\ncache" client
box cdn 120 60 90 50 "CDN edge" cdn
box gw 230 60 90 50 "Gateway /\nreverse proxy" lb
box app 340 60 90 50 "In-process\ncache" svc
box rc 450 60 80 50 "Distributed\ncache" cache
box db 550 55 80 60 "DB buffer\npool" db
arrow b cdn
arrow cdn gw
arrow gw app
arrow app rc
arrow rc db
text 320 145 "faster, closer to the user  ←→  more authoritative, slower" muted
:::

- **Client / browser:** HTTP caching via `Cache-Control`, `ETag`. It costs nothing, but you can't purge it.
- **CDN:** caches content at edge locations around the world (Chapter 16).
- **Reverse proxy / gateway:** caches whole responses.
- **In-process (local) cache:** a hash map in the application's memory. The fastest option, but each instance has its own copy, so instances can disagree and the cache is lost on restart.
- **Distributed cache:** Redis or Memcached, a shared cluster. Consistent across app instances, a network hop away.
- **Database:** buffer pools and query caches keep hot pages in memory.

## Caching strategies

### Cache-aside (lazy loading)

The application manages the cache explicitly. This is the most common pattern.

```
def get_user(id):
    user = cache.get(f"user:{id}")
    if user is None:                       # miss
        user = db.query("SELECT ... WHERE id = ?", id)
        cache.set(f"user:{id}", user, ttl=300)
    return user

def update_user(id, fields):
    db.update(id, fields)
    cache.delete(f"user:{id}")             # invalidate; next read refills
```

Only requested data is cached, and a cache outage degrades performance without breaking correctness. The first read of each item is slow (a miss), and stale data is possible in the window between a database write and the cache invalidation.

### Read-through

The cache itself loads missing data from the database, so the application only talks to the cache. It is cleaner application code, but needs a cache layer that supports loaders.

### Write-through

Every write goes to the cache **and** the database synchronously before it is acknowledged. The cache is always fresh, but writes are slower, and you cache data that may never be read.

### Write-behind (write-back)

Writes go to the cache and are acknowledged immediately. The cache flushes them to the database asynchronously, often in batches. Write latency is very low and write-heavy workloads are absorbed well, but **data is lost if the cache fails before flushing**, and the logic is more complex.

### Write-around

Writes go straight to the database and skip the cache, and reads fill it on a miss. This avoids filling the cache with data that is written once and rarely read.

:::diagram 640x250 | The four main caching strategies, side by side.
box z1 10 10 150 230 "Cache-aside" zone
box a1 40 40 90 30 "App" svc
box c1 20 150 60 40 "Cache" cache
box d1 95 150 60 50 "DB" db
arrow a1 c1 "1 get" lx=-12
arrow a1 d1 "2 miss→read" lx=14
box z2 170 10 150 230 "Read-through" zone
box a2 200 40 90 30 "App" svc
box c2 200 110 90 36 "Cache" cache
box d2 215 175 60 50 "DB" db
arrow a2 c2
arrow c2 d2 "loads"
box z3 330 10 150 230 "Write-through" zone
box a3 360 40 90 30 "App" svc
box c3 360 110 90 36 "Cache" cache
box d3 375 175 60 50 "DB" db
arrow a3 c3 "write"
arrow c3 d3 "sync write"
box z4 490 10 140 230 "Write-behind" zone
box a4 515 40 90 30 "App" svc
box c4 515 110 90 36 "Cache" cache
box d4 530 175 60 50 "DB" db
arrow a4 c4 "write, ack"
arrow c4 d4 "async batch" dashed
:::

| Strategy | Read latency | Write latency | Freshness | Risk |
|---|---|---|---|---|
| Cache-aside | Miss penalty | DB speed | Stale window | Low |
| Read-through | Miss penalty | DB speed | Stale window | Low |
| Write-through | Fast (hot) | Slower (two writes) | Fresh | Low |
| Write-behind | Fast | Very fast | Fresh in cache | Data loss |
| Write-around | Miss after write | DB speed | Fresh on refill | Low |

## Eviction policies

A cache is smaller than its source, so when it is full something must go:

- **LRU (least recently used):** evict whatever hasn't been touched longest. The sensible default.
- **LFU (least frequently used):** evict the least popular items. Better for stable popularity, slower to adapt to changes.
- **FIFO:** evict the oldest insertion. Simple, but often poor.
- **TTL-based:** items expire after a fixed time, whatever their use.
- Modern variants (W-TinyLFU, ARC) combine recency and frequency and resist one-off scans that would otherwise flush the cache.

## Invalidation: the hard part

When the source data changes, cached copies become stale. The options:

1. **TTL expiry.** Accept staleness for up to *T* seconds. Simple and robust. Choose *T* by how stale the data may be.
2. **Explicit invalidation on write.** Delete (not update) the cache entry when the data changes.
3. **Event-driven invalidation.** Publish change events (or tail the database's change log, CDC) and let cache nodes evict affected keys.
4. **Versioned keys.** Embed a version in the key (`product:42:v17`), so a change produces a new key and old entries simply age out.

:::pitfall Update-then-invalidate race
Thread A reads the old value from the database (a miss). Thread B updates the database and deletes the cache key. Thread A then writes its *old* value into the cache, which now holds stale data until the TTL expires. Mitigations: always set a TTL as a safety net, prefer delete over set on writes, use versioned or compare-and-set writes, or delay a second invalidation slightly ("delayed double delete").
:::

## Cache failure modes

### Cache stampede (thundering herd)

A hot key expires, and thousands of concurrent requests miss at once and all hit the database to recompute the same value.

**Fixes:** *request coalescing* or a per-key lock, so only one request recomputes while the others wait; *early probabilistic refresh* before expiry; serving the stale value while one background job refreshes it (*stale-while-revalidate*); and adding **jitter** to TTLs so that keys don't expire in synchronised waves.

### Cache penetration

Requests for keys that **don't exist** (for example, random IDs from an attacker) always miss and always reach the database. **Fixes:** cache negative results ("not found") with a short TTL, validate inputs, and put a **Bloom filter** of valid keys in front (Chapter 21).

### Cache avalanche

Many keys expire together, or the whole cache cluster restarts, and the full read load lands on the database. **Fixes:** TTL jitter, warming the cache before taking traffic, replicated or highly available cache clusters, and rate limiting or circuit breakers in front of the database.

### Hot keys

One key (a viral post) receives so much traffic that the single cache node holding it saturates. **Fixes:** replicate hot keys across nodes (read from a random replica with a suffixed key like `post:9:r3`), add a small in-process cache in front of the distributed cache, or split the value.

## Distributed caching

Redis and Memcached clusters partition keys across nodes, usually with **consistent hashing** (Chapter 15), so that adding or removing a node remaps only a small fraction of keys. Redis adds rich data structures (lists, sorted sets for leaderboards, hashes, streams), optional persistence and replication. Memcached is a simpler, multi-threaded, pure key-value cache.

:::tip What to say about a cache in a design
Cover five points: **what** is cached (and its key format), **where** (layer), **strategy** (cache-aside and so on), **invalidation/TTL**, and **failure handling** (stampedes, a cold start). "I'll cache rendered user profiles in Redis with cache-aside, keyed by `profile:{id}`, TTL 10 minutes with jitter, invalidated on profile update, and with request coalescing to prevent stampedes on celebrity profiles."
:::

:::quiz
Q: A cache has a 90% hit rate, 2 ms cache latency and 80 ms database latency. What is the average read latency? What if the hit rate rises to 99%?
A: 90%: 0.9 × 2 + 0.1 × 80 = 1.8 + 8 = **9.8 ms**. 99%: 0.99 × 2 + 0.01 × 80 = 1.98 + 0.8 ≈ **2.8 ms**. Going from 90% to 99% cuts latency by about 3.5x and database load by 10x. Hit rate matters enormously.

Q: Why do many systems *delete* the cache entry on update instead of writing the new value into the cache?
A: Deleting is simpler and avoids races in which concurrent updates write values into the cache in the wrong order, leaving it stale. After a delete, the next read loads the current value from the database. It also avoids computing and caching values that may never be read.

Q: What is a cache stampede and name two mitigations.
A: When a popular key expires, many simultaneous requests miss and all hit the backend to recompute the same value, which can overload it. Mitigations: request coalescing or a lock so only one request recomputes; serving the stale value while refreshing in the background; early probabilistic refresh; and TTL jitter.

Q: When is write-behind caching appropriate, and what is its main risk?
A: For write-heavy workloads where low write latency matters and losing a little recent data is tolerable or can be mitigated: counters, analytics, activity tracking, game state. The main risk is data loss, since writes acknowledged by the cache but not yet flushed to the database disappear if the cache node fails.

Q: Attackers request millions of random product IDs that don't exist, and your database is overloaded. What is this called and how do you defend against it?
A: Cache penetration. Defences: cache "not found" results briefly; use a Bloom filter of existing IDs to reject impossible keys before they touch the cache or database; validate the ID format; and rate limit abusive clients.
:::
