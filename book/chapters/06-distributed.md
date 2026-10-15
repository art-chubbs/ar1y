@part VI | Distributed Systems | What makes distributed computing hard — unreliable networks, unsynchronised clocks, disagreeing nodes — and the algorithms and data structures that tame it.

# Distributed Systems Fundamentals

A distributed system is one in which a computer you didn't even know existed can make your own computer unusable. Behind that old joke is a real lesson: once a computation spans several machines, a whole new class of failures appears. This chapter covers the core problems and the ideas used to solve them.

## The fallacies of distributed computing

Engineers new to distributed systems tend to assume things that are false:

1. The network is reliable.
2. Latency is zero.
3. Bandwidth is infinite.
4. The network is secure.
5. Topology doesn't change.
6. There is one administrator.
7. Transport cost is zero.
8. The network is homogeneous.

Every pattern in this book exists because one of these assumptions fails in production.

## Partial failure and the unreliable network

On a single machine, things either work or crash. In a distributed system, **some parts fail while others keep working**, and you often *can't tell which*. When you send a request and get no reply, any of these may have happened:

:::diagram 640x190 | When a request times out, the caller cannot tell which of these happened, so a timeout is ambiguous.
box a 20 70 90 46 "Caller" client
box b 520 70 100 46 "Remote node" svc
text 315 30 "① request lost in the network" small
text 315 55 "② remote node crashed before processing" small
text 315 80 "③ remote node is slow / paused (GC)" small
text 315 105 "④ processed it, but the reply was lost" small bold
text 315 130 "⑤ reply is merely delayed" small
line 120 160 510 160 "timeout… ?" dashed
:::

Case ④ is why operations must be **idempotent**: you can't know whether to retry, so retrying must be safe. Timeouts are the only failure detector we have, and they are imperfect. Too short, and you declare healthy-but-slow nodes dead. Too long, and you wait ages to react to real failures.

## Time and clocks

Distributed systems often need to know *when* something happened, or at least *in what order*. But physical clocks are unreliable:

- Each machine's quartz clock **drifts** (by tens of parts per million).
- **NTP** synchronisation corrects drift only to within milliseconds, sometimes far worse, and can make a clock *jump backwards*.
- Virtual machines and garbage collection can **pause** a process for seconds without it noticing.

So comparing timestamps from different machines to order events is dangerous. "Last write wins" based on wall-clock time can silently discard the actually-later write.

### Logical clocks

**Lamport clocks** order events without physical time. Each node keeps a counter. It increments the counter on every event, attaches it to every message, and on receiving a message sets its counter to `max(local, received) + 1`. If event A *caused* event B, then `L(A) < L(B)`. The reverse doesn't hold: two concurrent events may get any order.

**Vector clocks** go further. Each node keeps a vector of counters, one per node. Comparing two vectors tells you whether one event **happened before** the other, or whether they are **concurrent**, which is exactly what is needed to detect write conflicts in multi-leader and leaderless databases.

:::diagram 640x210 | Lamport clocks: the counter travels with each message, and a receiver jumps ahead of any timestamp it has seen.
text 40 40 "Node A" bold start
text 40 110 "Node B" bold start
text 40 180 "Node C" bold start
line 110 40 620 40 "" noarrow
line 110 110 620 110 "" noarrow
line 110 180 620 180 "" noarrow
text 150 28 "1" accent
text 230 28 "2" accent
line 230 40 330 110 "msg(2)"
text 330 98 "3 = max(1,2)+1" accent
text 200 98 "1" accent
line 400 110 500 180 "msg(4)"
text 400 98 "4" accent
text 500 168 "5" accent
text 300 168 "1" accent
:::

### Hybrid and bounded-uncertainty clocks

**Hybrid logical clocks** combine physical time with a logical counter: they stay close to wall-clock time while preserving causal order. Google Spanner's **TrueTime** exposes clock *uncertainty* explicitly (`now()` returns an interval [earliest, latest] kept small by GPS and atomic clocks) and makes transactions *wait out* the uncertainty before committing. That gives globally consistent ordering.

## Failure detection and membership

Nodes detect failed peers with **heartbeats**: periodic "I'm alive" messages. Missing *k* heartbeats makes a node suspect. At scale, all-to-all heartbeats are too expensive, so **gossip protocols** are used: each node periodically exchanges its view of membership with a few random peers, and information spreads through the cluster like an epidemic, reaching everyone in O(log N) rounds. Cassandra and Consul use gossip. **Phi-accrual detectors** output a suspicion *level* that adapts to observed network conditions, rather than a yes/no answer.

## Leader election

Many systems need exactly one node to coordinate: to accept writes, assign work or hold a lock. **Leader election** chooses one, and a new one when it fails. The danger is a *false* failure detection producing two leaders (split brain).

**Leases** limit the damage. A leader holds leadership for a bounded time (say 10 s) and must renew it. A new leader can only be elected after the old lease *expires*. Combined with **fencing tokens**, a number that increases with each new leader and is checked by storage on every write, a stale ex-leader's writes are rejected even if it wakes from a long pause still believing it leads.

:::diagram 640x190 | Fencing tokens. Storage rejects writes carrying an older token, so a paused ex-leader can't corrupt data.
box l1 20 30 140 40 "Old leader\n(token 33) — paused" bad
box l2 20 120 140 40 "New leader\n(token 34)" good
box st 420 70 180 56 "Storage\nhighest seen: 34" db
arrow l2 st "write (34) ✓"
arrow l1 st "write (33) ✕ rejected" dashed bad
:::

## Consensus

**Consensus** is getting several nodes to agree on a value (who the leader is, the next entry in a log, whether a transaction commits) even when some nodes fail and messages are delayed. It is the foundation of reliable coordination.

A consensus algorithm must guarantee:

- **Agreement:** no two nodes decide differently.
- **Validity:** the decided value was actually proposed.
- **Termination:** non-failed nodes eventually decide.

The key insight is the **majority quorum**. With 2f + 1 nodes, a decision needs f + 1 votes. Any two majorities overlap in at least one node, so two conflicting decisions can't both win. Such a cluster survives f failures: 3 nodes tolerate 1, and 5 tolerate 2.

### Raft in brief

**Raft** was designed to be understandable, and it is used by etcd, Consul, CockroachDB and others.

1. **Leader election.** Nodes are followers. If a follower hears no heartbeat for a randomised timeout, it becomes a *candidate*, increments the **term** number, and asks for votes. A candidate that wins a majority becomes leader for that term. Randomised timeouts make split votes rare.
2. **Log replication.** Clients send commands to the leader, which appends them to its log and replicates them to followers. Once a **majority** has stored an entry, it is **committed** and applied to the state machine. Followers apply committed entries in the same order, so all replicas reach the same state (*state machine replication*).
3. **Safety.** A candidate can only win if its log is at least as up to date as a majority's, so committed entries are never lost across leader changes.

:::diagram 640x220 | Raft log replication. An entry is committed once a majority of nodes (3 of 5) have stored it.
box cl 20 90 80 40 "Client" client
box L 170 85 120 50 "Leader\nlog: … x=5" good
box f1 420 10 160 34 "Follower ✓ stored" svc
box f2 420 55 160 34 "Follower ✓ stored" svc
box f3 420 100 160 34 "Follower (slow)" svc
box f4 420 145 160 34 "Follower ✕ down" bad
arrow cl L "set x=5"
arrow L f1 "AppendEntries"
arrow L f2
arrow L f3 "" dashed
arrow L f4 "" dashed
text 290 200 "Leader + 2 followers = 3/5 majority → committed" bold
:::

**Paxos** is the older, foundational consensus algorithm, proven correct and famously hard to understand. Raft and Multi-Paxos are equivalent in practice.

:::key You rarely implement consensus; you use it
Production systems put consensus inside a coordination service, such as **etcd**, **ZooKeeper** or **Consul**, and build on top of it: leader election, distributed locks, configuration, service discovery, membership. Keep these clusters small (3 or 5 nodes) and on the critical path only for coordination, never for bulk data.
:::

## Distributed locks

A distributed lock ensures that only one process at a time does something, such as running a nightly job or editing a resource. Implementations use consensus systems (an etcd lease, a ZooKeeper ephemeral node) or Redis (`SET key value NX PX 30000`).

:::pitfall Locks are leases, and processes pause
A process can take a lock, pause for 40 seconds (GC, VM migration), and wake up after its lock expired and someone else took it, then go ahead and write anyway. Locks used for *correctness* must be paired with **fencing tokens** checked by the resource. Locks used only for *efficiency* (avoiding duplicate work) can tolerate the occasional double execution.
:::

:::quiz
Q: A request to a remote service times out. List three different things that might have happened, and explain why this matters for retries.
A: The request was lost before arriving; the remote node crashed or is paused; or the remote node processed the request but the reply was lost or delayed. Because the caller can't tell whether the operation happened, a blind retry may duplicate it, so retried operations must be idempotent (or carry idempotency keys).

Q: Why is ordering events by wall-clock timestamps across machines unsafe?
A: Clocks on different machines drift and are only loosely synchronised (milliseconds or worse), NTP can make a clock jump backwards, and processes can pause. An event that truly happened later may get an earlier timestamp, so last-write-wins can silently discard the newer write. Logical clocks, hybrid clocks or bounded-uncertainty clocks avoid this.

Q: How many node failures can a 5-node Raft cluster tolerate, and why not more?
A: Two. Commits and elections need a majority (3 of 5). With 3 nodes down, the remaining 2 can't form a majority, so the cluster stops accepting writes to preserve consistency (it chooses C over A).

Q: What is a fencing token and what problem does it solve?
A: A monotonically increasing number issued with each lock acquisition or leadership term. The protected resource remembers the highest token it has seen and rejects requests carrying older ones. This stops a stale lock holder or ex-leader (for example, one that paused and lost its lease without noticing) from corrupting data.

Q: What do vector clocks give you that Lamport clocks do not?
A: Vector clocks can tell whether two events are causally related (one happened before the other) or **concurrent**. Lamport clocks give a total order consistent with causality but can't distinguish concurrency from causation. Detecting concurrency is essential for spotting conflicting writes.
:::

# Distributed Transactions

Within one database, a transaction updates many rows atomically. But in a microservices system the steps of one business operation (reserve stock, charge the card, create the shipment) touch *different services with different databases*. How do we keep them consistent when any step can fail?

## The problem

Placing an order requires: (1) the Order service creates an order, (2) the Inventory service reserves the items, (3) the Payment service charges the customer. If the payment fails after the stock was reserved, the reservation must be released. If the Order service crashes halfway through, the system mustn't be left in a half-done state forever.

## Two-phase commit (2PC)

**2PC** makes several participants commit atomically under a **coordinator**.

1. **Prepare phase.** The coordinator asks every participant: "can you commit?" Each one does all its work, writes it durably, locks the resources, and votes *yes* (a promise that it *can* commit, whatever happens) or *no*.
2. **Commit phase.** If every vote is yes, the coordinator logs the decision and tells everyone to **commit**. If any vote is no, or a participant times out, it tells everyone to **abort**.

:::diagram 640x245 | Two-phase commit. Every participant must vote yes before anyone commits.
box co 250 15 140 46 "Coordinator" lb
box p1 30 165 150 46 "Orders DB" db
box p2 245 165 150 46 "Inventory DB" db
box p3 460 165 150 46 "Payments DB" db
arrow co p1 "prepare? / yes" both lx=-30
arrow co p2 "prepare? / yes" both lx=40
arrow co p3 "prepare? / yes" both lx=30
text 320 225 "Phase 1: all vote yes  →  Phase 2: COMMIT sent to all (any no → ABORT)" small bold
:::

**Problems with 2PC:**

- **Blocking.** A participant that voted yes must hold its locks until it hears the outcome. If the coordinator crashes after collecting votes, participants are **stuck in doubt**, holding locks, until it recovers.
- **Latency.** Several round trips, plus synchronous durable writes, on every transaction.
- **Availability.** All participants must be up. Any one failure aborts the transaction.
- **Coupling.** Every participant must support the protocol (XA), which most modern services, queues and APIs don't.

2PC works well *inside* a single distributed database (Spanner and CockroachDB run consensus-replicated 2PC internally), but it is a poor fit across independent microservices.

## The Saga pattern

A **saga** breaks a distributed transaction into a sequence of **local transactions**, one per service. Each step commits on its own and triggers the next. If a step fails, the saga runs **compensating transactions** to *semantically undo* the steps already completed.

| Step | Action | Compensation |
|---|---|---|
| 1 | Create order (PENDING) | Cancel order |
| 2 | Reserve inventory | Release inventory |
| 3 | Charge payment | Refund payment |
| 4 | Mark order CONFIRMED | (none, final step) |

If step 3 fails: run "release inventory", then "cancel order".

### Choreography vs. orchestration

**Choreography:** there is no central controller. Each service listens for events and reacts: `OrderCreated` → Inventory reserves → `InventoryReserved` → Payment charges → `PaymentFailed` → Inventory releases → … It is simple, decoupled and has no single point of control. But the overall flow is implicit, spread across services, hard to follow, and prone to cyclic dependencies as the steps multiply.

**Orchestration:** a central **saga orchestrator** (a state machine) tells each service what to do and handles replies: "Inventory, reserve" → reply → "Payment, charge" → failure → "Inventory, release". The flow is explicit and in one place, which makes it easier to monitor, test and change. The orchestrator is one more component, and it must be durable (workflow engines such as Temporal, Step Functions or Camunda provide this).

:::diagram 640x250 | Saga orchestration. On payment failure, the orchestrator runs compensations in reverse order.
box o 230 15 180 50 "Saga orchestrator\n(state machine)" lb
box s1 20 175 150 44 "Order service" svc
box s2 245 175 150 44 "Inventory service" svc
box s3 470 175 150 44 "Payment service" bad
arrow o s1 "1 create · 5 cancel ↩" both lx=-40
arrow o s2 "2 reserve · 4 release ↩" both lx=0 ly=-2
arrow o s3 "3 charge → ✕ declined" both lx=40
text 320 240 "↩ = compensating transaction, run in reverse order" small muted
:::

:::pitfall Sagas are not isolated
Unlike an ACID transaction, a saga's intermediate states are **visible** to other operations. Another request might read "inventory reserved" for an order that is about to be cancelled. Countermeasures: *semantic locks* (a PENDING status that others respect), designing steps to commute, re-reading values before acting, and ordering steps so that the ones that can't be compensated (sending an email, shipping a parcel) come last.
:::

Compensations must themselves be **idempotent** and **retryable**: a refund that is retried mustn't refund twice.

## The dual-write problem and the transactional outbox

A service often needs to **update its database and publish an event**: save the order, then publish `OrderCreated`. Doing these as two separate operations is a **dual write**, and it is broken. If the service crashes between them, the database has the order but no event was published. If you publish first, the event may describe an order that never got saved.

The **transactional outbox** pattern fixes this. In the **same local transaction** as the business change, insert the event into an `outbox` table. A separate **relay** process reads the outbox and publishes to the broker, marking rows as sent.

:::diagram 640x200 | The transactional outbox. The business row and the event commit atomically, and a relay publishes events afterwards.
box svc 20 70 110 50 "Order service" svc
box z 170 20 220 160 "One local DB transaction" zone
box t1 190 50 180 40 "orders: INSERT order 42" db
box t2 190 115 180 40 "outbox: INSERT OrderCreated" db
box relay 430 115 90 40 "Relay /\nCDC" svc
box br 550 115 80 40 "Broker" queue
arrow svc t1
arrow svc t2
arrow t2 relay "poll or tail log"
arrow relay br "publish"
:::

The relay can poll the table, or use **change data capture (CDC)**, tailing the database's replication log (with Debezium, for example). Either way, publishing is *at-least-once*, so consumers must be idempotent, using an event ID to de-duplicate (the **inbox** pattern on the consumer side).

## Other techniques

- **Idempotency keys** across service boundaries make every retried step safe (Chapter 8).
- **Reservation / TCC (Try-Confirm-Cancel):** each service first *tries* (tentatively reserves resources with an expiry), then the coordinator *confirms* or *cancels*. It is like 2PC at the business level, with timeouts instead of indefinite locks.
- **Avoiding the distributed transaction** by redrawing boundaries: if two pieces of data must always change atomically, perhaps they belong in the same service.

:::tip Default answer for cross-service consistency
"I'll avoid 2PC across services. The order flow is an orchestrated saga with compensating actions; each service updates its DB and emits events through a transactional outbox; and all consumers are idempotent. The system is eventually consistent, and the order shows PENDING until the saga completes."
:::

:::quiz
Q: Why is two-phase commit called a "blocking" protocol?
A: After voting "yes", a participant has promised to commit if told to and must hold its locks until it learns the outcome. If the coordinator crashes after collecting votes but before announcing a decision, participants can't decide on their own and stay blocked, holding locks, until the coordinator recovers.

Q: In a saga for booking a trip (flight, hotel, car), the car rental fails. What happens?
A: The saga runs compensating transactions for the steps already completed, in reverse order: cancel the hotel booking, then cancel the flight booking. Each compensation is a local transaction in its service, and must be idempotent and retried until it succeeds. The trip ends in a "failed / cancelled" state.

Q: Compare choreography and orchestration for sagas.
A: Choreography: services react to each other's events with no central coordinator. It is loosely coupled and simple for a few steps, but the flow is implicit, hard to see and debug, and can get tangled. Orchestration: a central orchestrator tells services what to do and tracks state. The flow is explicit, easier to monitor, change and test, and good for complex processes, at the cost of an extra component and some centralisation.

Q: What is the dual-write problem, and how does the transactional outbox solve it?
A: Updating a database and publishing a message as two independent operations can't be atomic. A crash between them leaves one done and the other not, so you get lost or phantom events. The outbox writes the event into an outbox table in the same local transaction as the data change, so both commit or neither does. A relay (polling or CDC) then publishes the outbox rows to the broker, at least once.
:::

# Data Structures for Scale

At large scale, exact answers can be impossibly expensive. Some ingenious data structures trade a tiny, controlled amount of accuracy for huge savings in memory and time. Others organise space or data so that queries remain fast at billions of items. Every senior engineer should know these.

## Bloom filters: "definitely not" or "probably yes"

A **Bloom filter** answers *"is this item in the set?"* using a fraction of the memory of storing the set. It may give **false positives** ("probably yes" when the answer is no) but **never false negatives**: a "no" is certain.

**How it works:** a bit array of *m* bits, all initially 0, and *k* independent hash functions. To **add** an item, hash it *k* times and set those *k* bits to 1. To **query**, hash it *k* times. If any of those bits is 0, the item is **definitely not** in the set. If all are 1, it is *probably* in the set (the bits may have been set by other items).

:::diagram 640x200 | A Bloom filter with 3 hash functions. "cat" sets three bits. A query for "dog" finds a 0 bit, so dog is definitely absent.
box b0 150 90 24 28 "0" svc
box b1 178 90 24 28 "1" cache
box b2 206 90 24 28 "0" svc
box b3 234 90 24 28 "0" svc
box b4 262 90 24 28 "1" cache
box b5 290 90 24 28 "0" svc
box b6 318 90 24 28 "0" svc
box b7 346 90 24 28 "0" svc
box b8 374 90 24 28 "1" cache
box b9 402 90 24 28 "0" svc
box b10 430 90 24 28 "0" svc
box b11 458 90 24 28 "0" svc
box b12 486 90 24 28 "0" svc
box b13 514 90 24 28 "1" cache
box b14 542 90 24 28 "0" svc
box b15 570 90 24 28 "0" svc

box add 230 5 110 32 "add('cat')" client
box q 230 160 110 32 "query('dog')" client
arrow add b1 "h1" accent
arrow add b4 "h2" accent
arrow add b8 "h3" accent
arrow q b4 "" dashed
arrow q b10 "" dashed bad
arrow q b13 "" dashed
text 500 180 "bit 10 is 0  →  'dog' is definitely NOT in the set" bold
text 480 40 "positions set by 'cat' (h1, h2, h3)" small muted
:::

With about 10 bits per item and 7 hash functions, the false-positive rate is about **1%**, whatever the item size. A billion URLs fit in ~1.2 GB instead of ~100 GB. Standard Bloom filters don't support deletion. *Counting Bloom filters* and *cuckoo filters* do.

**Uses:** skipping disk lookups for absent keys in LSM-tree databases; blocking cache penetration (Chapter 12); "have we already crawled this URL?"; checking weak passwords; detecting duplicate events.

## Count-Min Sketch: frequencies in fixed memory

Estimates how often each item occurs in a stream, in fixed memory. It is a grid of *d* rows × *w* counters, with one hash function per row. To count an item, increment one counter in each row. To estimate its count, take the **minimum** of its *d* counters. Collisions only *inflate* counters, so the estimate never undercounts, and taking the minimum limits the overcount. **Uses:** heavy hitters or "top K" (trending hashtags, the most-requested URLs), rate-limiting heuristics, network traffic analysis.

## HyperLogLog: counting distinct items

How many *unique* visitors did the site get today? Storing every ID takes gigabytes. **HyperLogLog** estimates cardinality using about **12 KB** for billions of items, with ~0.8% standard error.

**Intuition:** hash each item to a uniformly random bit string. Long runs of leading zeros are rare: a run of *n* zeros turns up roughly once every 2ⁿ items. The longest run you have seen tells you roughly how many distinct items there have been. HyperLogLog splits items into thousands of buckets and averages their estimates (with a harmonic mean) to keep the variance low. Sketches can be **merged**, so daily counts combine into weekly ones. Redis has it built in (`PFADD`, `PFCOUNT`).

## Merkle trees: comparing huge datasets cheaply

A **Merkle tree** is a tree of hashes. Each leaf hashes a block of data, and each parent hashes its children's hashes. The root hash summarises the whole dataset. If one block changes, its hash changes and so do all the hashes above it.

:::diagram 640x220 | A Merkle tree. Comparing root hashes tells two replicas whether they differ, and descending only into mismatched branches finds the differing blocks in O(log n) steps.
box r 255 15 130 36 "root = H(H12 + H34)" good
box h12 100 85 130 36 "H12 = H(H1+H2)" svc
box h34 410 85 130 36 "H34 ≠ (differs)" bad
box b1 20 160 120 36 "H1 (block 1)" svc
box b2 170 160 120 36 "H2 (block 2)" svc
box b3 350 160 120 36 "H3 (block 3)" svc
box b4 500 160 120 36 "H4 ≠ block 4" bad
arrow h12 r
arrow h34 r
arrow b1 h12
arrow b2 h12
arrow b3 h34
arrow b4 h34
:::

**Uses:** anti-entropy repair between database replicas (Cassandra, DynamoDB), so that only out-of-sync ranges are exchanged; Git (commits are hash trees); blockchains; certificate transparency logs; verifying file downloads in chunks.

## Geospatial indexing: geohash, quadtrees, S2

"Find drivers within 2 km" is hard with ordinary indexes, which sort along one dimension, while location has two.

**Geohash** interleaves the bits of latitude and longitude and encodes them as a base-32 string. The map is recursively divided into a grid, and each extra character narrows the cell. **Points in the same cell share a prefix**, so a prefix query (`WHERE geohash LIKE '9q8yy%'`) on an ordinary B-tree finds nearby points. Cells at boundaries need the 8 neighbouring cells checked too.

| Geohash length | Cell size (approx.) |
|---|---|
| 4 | 39 km × 20 km |
| 5 | 4.9 km × 4.9 km |
| 6 | 1.2 km × 0.6 km |
| 7 | 153 m × 153 m |

**Quadtrees** recursively split a region into four quadrants *only where points are dense*, so a city centre is finely divided while the ocean is one big cell. They adapt well to uneven distributions and are usually held in memory.

**Google S2** and **Uber H3** project the sphere onto cells (squares on a cube for S2, hexagons for H3) with hierarchical IDs, avoiding distortion near the poles. Hexagons have uniform neighbour distances, which suits ride-hailing supply/demand grids.

:::diagram 640x210 | Left: geohash cells share prefixes. Right: a quadtree subdivides only where points are dense.
box z1 10 10 300 190 "Geohash grid" zone
box g1 40 40 110 70 "9q8y" svc
box g2 150 40 110 70 "9q8z" svc
box g3 40 110 110 70 "9q8v" svc
box g4 150 110 110 70 "9q8w" svc
text 205 75 "● ●" accent
box z2 330 10 300 190 "Quadtree" zone
box q1 350 35 130 75 "" svc
box q2 480 35 130 75 "" svc
box q3 350 110 130 75 "" svc
box q4a 480 110 65 37 "●●" svc
box q4b 545 110 65 37 "●" svc
box q4c 480 147 65 38 "●●●" svc
box q4d 545 147 65 38 "" svc
text 415 150 "sparse: 1 cell" small muted
:::

## Skip lists and sorted sets

A **skip list** is a linked list with "express lanes": extra levels of pointers that skip over many elements, giving O(log n) search, insertion and deletion, and efficient range queries, with a simple, lock-friendly implementation. Redis **sorted sets** (leaderboards, rate-limit windows, priority queues) are built on skip lists. LSM memtables often use them too.

## Unique ID generation at scale

Auto-increment IDs need a single counter, which is a bottleneck and a single point of failure across shards. Alternatives:

- **UUID v4:** 128 random bits generated anywhere with no coordination. But IDs are large and random, which scatters B-tree inserts (bad locality) and doesn't sort by time. **UUID v7** puts a timestamp first and fixes the ordering.
- **Snowflake-style IDs:** 64 bits = **41-bit millisecond timestamp** + **10-bit machine ID** + **12-bit per-millisecond sequence**. They sort roughly by time, are compact, and are generated locally (up to 4,096 IDs per millisecond per machine).
- **Ticket servers / range allocation:** a central service hands out *blocks* of IDs (1–10,000 to server A), and servers allocate locally from their block.

:::diagram 640x110 | Snowflake ID layout: 64 bits that sort roughly by time and need no coordination.
box s 20 30 30 40 "0" note
box t 50 30 330 40 "41 bits: ms since custom epoch (~69 years)" cdn
box m 380 30 130 40 "10 bits: machine" svc
box q 510 30 110 40 "12 bits: sequence" cache
:::

| Structure | Answers | Memory | Error |
|---|---|---|---|
| Bloom filter | Is X in the set? | ~10 bits / item | False positives only |
| Count-Min Sketch | How often does X occur? | Fixed (KB) | Overestimates only |
| HyperLogLog | How many distinct items? | ~12 KB | ~1% |
| Merkle tree | Where do datasets differ? | O(n) hashes | Exact |
| Geohash / quadtree / S2 | What is near this point? | Index size | Exact (with neighbours) |
| Skip list | Ordered set operations | O(n) | Exact |

:::quiz
Q: A Bloom filter reports that an item is present. Can you trust it? What if it reports the item is absent?
A: "Present" means *probably* present: it could be a false positive, because the bits may have been set by other items, so confirm with the real data store if it matters. "Absent" is certain: Bloom filters have no false negatives, because an added item always sets all its bits.

Q: You must count unique daily visitors across billions of events, with weekly and monthly roll-ups, in minimal memory. Which structure fits, and why?
A: HyperLogLog. It estimates the number of distinct items with ~1% error using about 12 KB per counter, whatever the cardinality. Daily sketches can be merged into weekly or monthly ones without double-counting visitors who appear on several days.

Q: How do Merkle trees make replica repair efficient?
A: Replicas compare root hashes. If they match, the data is identical and nothing needs to move. If not, they compare child hashes and descend only into mismatched branches, finding the differing blocks in O(log n) comparisons. Only those blocks are exchanged, not the whole dataset.

Q: Why does a geohash query need to check neighbouring cells?
A: Two points can be very close together but on opposite sides of a cell boundary, so they don't share a prefix. Searching only the target cell would miss them. Querying the cell plus its 8 neighbours covers everything within the search radius, and you then filter by exact distance.

Q: What are the parts of a Snowflake ID, and what properties does that layout give?
A: A sign bit, a 41-bit millisecond timestamp, a 10-bit machine/worker ID and a 12-bit sequence number. IDs are unique without coordination (machine ID + sequence), sort roughly by creation time (timestamp first, which also helps index locality), fit in 64 bits, and can be generated at up to 4,096 per millisecond per worker.
:::
