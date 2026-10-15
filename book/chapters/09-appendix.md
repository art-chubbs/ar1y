# [appendix] The Design Interview Playbook

A one-page method for any design question, with time budgets for a 45-minute session.

| Phase | Time | What to do | Output |
|---|---|---|---|
| 1. Requirements | 5 min | Ask about users, core features, scale, consistency and latency needs. Agree on what is out of scope. | 3–5 functional + 3–5 non-functional requirements |
| 2. Estimates | 3–5 min | QPS (avg/peak), read/write ratio, storage, bandwidth. | Numbers that justify the design |
| 3. API | 3–5 min | Endpoints/messages with key parameters. | A contract |
| 4. Data model | 3–5 min | Entities, keys, access patterns; choose stores. | Schema + store choice |
| 5. High-level design | 10 min | Draw the boxes; walk the read and write paths end to end. | A working architecture |
| 6. Deep dives | 10–15 min | Bottlenecks at 10x: caching, sharding, async, consistency, hot spots. | Justified refinements |
| 7. Wrap-up | 3–5 min | Failures, monitoring, security, trade-offs, future work. | Evidence of senior judgement |

## Questions to ask in every design

- What are the read and write paths, and their ratio?
- What is the single most important non-functional requirement?
- Where does state live, and what is the source of truth?
- What is the shard key, and does the main query hit one shard?
- What gets cached, how is it invalidated, and what happens on a stampede?
- What is synchronous, and what can be asynchronous?
- Which data needs strong consistency, and which can be eventual?
- What happens when each component fails? Where are the single points of failure?
- How do retries stay safe (idempotency)?
- What would you monitor and alert on?

## Phrases that show judgement

- "Let me state my assumptions so you can correct them…"
- "The bottleneck here will be ___, because ___."
- "I'm choosing ___ over ___ because our priority is ___; the cost is ___."
- "This part can be eventually consistent; this part cannot."
- "If this component fails, the user sees ___, and we recover by ___."

# [appendix] Reference Numbers

## Latency

| Operation | Time |
|---|---|
| L1 cache / branch mispredict | ~1–5 ns |
| Main memory access | ~100 ns |
| Mutex lock/unlock (uncontended) | ~20 ns |
| SSD random read | ~16–100 µs |
| Same-datacentre round trip | ~0.5 ms |
| Redis GET over the network | ~0.2–1 ms |
| Simple indexed DB query | ~1–5 ms |
| HDD seek | ~10 ms |
| Cross-continent round trip | ~70–150 ms |
| TCP + TLS 1.3 setup at 100 ms RTT | ~200 ms |

## Throughput rules of thumb (single node, order of magnitude)

| Component | Capacity |
|---|---|
| Stateless web/API server | 1k–10k req/s |
| Relational DB (simple queries) | 5k–50k queries/s |
| Redis / Memcached | 100k–1M ops/s |
| Kafka partition | ~10–50 MB/s |
| WebSocket gateway (mostly idle) | 100k–1M connections |
| 1 Gbps network link | ~125 MB/s |
| 10 Gbps network link | ~1.25 GB/s |

## Time and availability

| Availability | Downtime/year | Downtime/day |
|---|---|---|
| 99% | 3.65 days | 14.4 min |
| 99.9% | 8.77 h | 1.44 min |
| 99.99% | 52.6 min | 8.6 s |
| 99.999% | 5.26 min | 0.86 s |

1 day ≈ 10⁵ s · 1M/day ≈ 12/s · 1B/day ≈ 12k/s · 1 KB × 1B = 1 TB

# [appendix] Glossary

<dl class="glossary">
<dt>ACID</dt><dd>Atomicity, Consistency, Isolation, Durability: the guarantees of database transactions (Ch. 13).</dd>
<dt>Anycast</dt><dd>Announcing one IP address from many locations, so the network routes each client to the nearest one (Ch. 7).</dd>
<dt>Availability zone</dt><dd>An isolated data centre (or group of data centres) within a cloud region, with independent power and networking.</dd>
<dt>Backpressure</dt><dd>A way for an overloaded consumer to slow its producers instead of being overwhelmed (Ch. 11).</dd>
<dt>Bloom filter</dt><dd>A compact probabilistic set that can say "definitely not present" or "probably present" (Ch. 21).</dd>
<dt>Bulkhead</dt><dd>Isolating resources per dependency so that one failure can't exhaust everything (Ch. 18).</dd>
<dt>CAP theorem</dt><dd>During a network partition, a replicated system must choose between consistency and availability (Ch. 4).</dd>
<dt>CDC</dt><dd>Change data capture: streaming a database's committed changes by reading its replication log (Ch. 20).</dd>
<dt>CDN</dt><dd>Content delivery network: edge servers that cache content close to users (Ch. 16).</dd>
<dt>Circuit breaker</dt><dd>A wrapper that stops calling a failing dependency, failing fast until it recovers (Ch. 18).</dd>
<dt>Consensus</dt><dd>Getting distributed nodes to agree on a value despite failures; e.g. Raft, Paxos (Ch. 19).</dd>
<dt>Consistent hashing</dt><dd>Hashing keys and nodes onto a ring, so adding or removing a node moves only ~1/N of the keys (Ch. 15).</dd>
<dt>CQRS</dt><dd>Command Query Responsibility Segregation: separate models for writes and reads (Ch. 17).</dd>
<dt>CRDT</dt><dd>Conflict-free replicated data type: a structure whose replicas merge deterministically without coordination (Ch. 14).</dd>
<dt>Dead-letter queue</dt><dd>Where messages go after repeatedly failing processing (Ch. 11).</dd>
<dt>Denormalisation</dt><dd>Duplicating data where it is read, to avoid joins at the cost of extra writes (Ch. 13).</dd>
<dt>Error budget</dt><dd>The amount of unreliability an SLO allows; spent on risk and releases (Ch. 3).</dd>
<dt>Eventual consistency</dt><dd>Replicas converge if writes stop, with no guarantee about when (Ch. 4).</dd>
<dt>Fan-out</dt><dd>One event producing many downstream writes or messages, e.g. a post delivered to followers' feeds (Ch. 27).</dd>
<dt>Fencing token</dt><dd>An increasing number that lets storage reject requests from a stale leader or lock holder (Ch. 19).</dd>
<dt>Gossip protocol</dt><dd>Peer-to-peer, epidemic-style spreading of state such as cluster membership (Ch. 19).</dd>
<dt>HyperLogLog</dt><dd>A probabilistic structure estimating distinct counts in ~12 KB (Ch. 21).</dd>
<dt>Idempotency</dt><dd>Doing an operation several times has the same effect as doing it once; essential for safe retries (Ch. 3, 8).</dd>
<dt>Leader election</dt><dd>Choosing one node to coordinate, and replacing it on failure (Ch. 19).</dd>
<dt>Linearizability</dt><dd>The strongest single-object consistency: the system behaves as if there were one copy and operations are instantaneous (Ch. 4).</dd>
<dt>LSM tree</dt><dd>A write-optimised storage structure built from memtables and immutable sorted files merged by compaction (Ch. 14).</dd>
<dt>mTLS</dt><dd>Mutual TLS: both sides authenticate with certificates (Ch. 25).</dd>
<dt>Outbox pattern</dt><dd>Writing events to an outbox table in the same transaction as the data change, then publishing them (Ch. 20).</dd>
<dt>p99</dt><dd>The 99th-percentile latency: 99% of requests are faster than this (Ch. 2).</dd>
<dt>PACELC</dt><dd>If Partitioned, choose Availability or Consistency; Else, choose Latency or Consistency (Ch. 4).</dd>
<dt>Quorum</dt><dd>The minimum number of nodes that must take part for an operation to succeed; with R + W > N, reads see the latest write (Ch. 4).</dd>
<dt>Rate limiting</dt><dd>Restricting how many requests a client may make in a period (Ch. 9).</dd>
<dt>Replication lag</dt><dd>The delay before a follower reflects the leader's writes (Ch. 14).</dd>
<dt>Saga</dt><dd>A sequence of local transactions with compensating actions, replacing a distributed transaction (Ch. 20).</dd>
<dt>Sharding</dt><dd>Splitting data horizontally across nodes by a shard key (Ch. 15).</dd>
<dt>Sidecar</dt><dd>A helper process deployed next to each service instance, e.g. a mesh proxy (Ch. 18).</dd>
<dt>SLI / SLO / SLA</dt><dd>Indicator (what you measure) / Objective (internal target) / Agreement (contract) (Ch. 3).</dd>
<dt>SPOF</dt><dd>Single point of failure: a component whose failure takes down the whole system (Ch. 3).</dd>
<dt>Split brain</dt><dd>Two nodes both acting as leader after a partition, so their data diverges (Ch. 3, 19).</dd>
<dt>Stateless service</dt><dd>A service that keeps no client state between requests, so any instance can serve any request (Ch. 2).</dd>
<dt>Strangler fig</dt><dd>Migrating a legacy system by gradually routing features to new services (Ch. 18).</dd>
<dt>Thundering herd</dt><dd>Many clients doing the same expensive thing at once, e.g. a cache stampede (Ch. 12).</dd>
<dt>Two-phase commit</dt><dd>An atomic commit protocol with prepare and commit phases under a coordinator (Ch. 20).</dd>
<dt>Watermark</dt><dd>In stream processing, the estimate that all events before time T have arrived (Ch. 22).</dd>
</dl>
