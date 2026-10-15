@part I | Foundations | The vocabulary every design conversation is built on: what we are optimising for, how we measure it, and the trade-offs we can never escape.

# What System Design Is

System design is the craft of choosing **components**, the **connections** between them, and the **guarantees** they provide, so that a system meets its requirements at an acceptable cost. A design is never simply "correct". A good design is one where every trade-off was chosen deliberately and can be explained.

## Two kinds of requirements

Every design starts from requirements, and they come in two kinds.

**Functional requirements** describe *what* the system does: "users can upload a photo", "a driver is matched to a rider", "a message is delivered to everyone in a group". They define features.

**Non-functional requirements** describe *how well* the system does it: how many users, how fast, how often it may be down, how fresh the data must be, how much it may cost. They define the *shape* of the architecture. Two systems with identical features can look nothing alike because one serves a thousand users and the other a billion.

| Non-functional property | The question it answers | Typical target |
|---|---|---|
| Scalability | Can we handle 10x the load by adding resources? | Linear-ish growth |
| Latency | How long does one request take? | p99 < 200 ms |
| Throughput | How many requests per second? | 50k req/s |
| Availability | What fraction of time does it work? | 99.95% |
| Durability | Once saved, will data survive failures? | 11 nines |
| Consistency | Do all readers see the same, latest data? | Strong / eventual |
| Cost | What does each request cost us? | $ per million req |

:::key The architecture follows from the non-functional requirements
Features tell you *which* boxes exist. Scale, latency, availability and consistency targets tell you *how many* boxes there are, *where* they live, and *how* they are wired together. Pin these numbers down early.
:::

## The anatomy of a typical web system

Most systems you will design are variations on one skeleton. Learn it well, because nearly every later chapter zooms into one of its boxes.

:::diagram 640x300 | The canonical web architecture. Nearly every chapter in this book zooms into one of these boxes.
box u 10 120 80 50 "Clients" client
box dns 120 20 90 40 "DNS" note
box cdn 120 230 90 46 "CDN" cdn
box lb 140 120 90 50 "Load\nBalancer" lb
box zone 260 70 150 160 "Stateless tier" zone
box a1 280 95 110 36 "App server" svc
box a2 280 140 110 36 "App server" svc
box a3 280 185 110 36 "App server" svc
box c 450 40 90 46 "Cache" cache
box q 450 125 100 40 "Queue" queue
box w 570 120 60 50 "Workers" svc
box db 450 210 90 70 "Primary\nDB" db
box r 560 220 70 55 "Replica" db
arrow u dns "1 resolve" dashed
arrow u cdn "static" dashed
arrow u lb "2 HTTPS"
arrow lb a2
arrow a1 c "read"
arrow a2 q "async"
arrow q w
arrow a3 db "write"
arrow db r "replicate" dashed
:::

A client resolves a name through **DNS**, fetches static assets from a **CDN** close to it, and sends dynamic requests to a **load balancer**. The load balancer spreads them across **stateless application servers**. Those servers read hot data from a **cache**, store durable data in a **database** (often a primary with replicas), and hand slow work to a **queue** for background **workers** to do later.

## A repeatable design process

Whether you are in an interview or a design review, the same seven steps keep you from going in circles.

1. **Clarify the requirements.** Who are the users? What are the three most important features? What is explicitly *out of scope*?
2. **Estimate the scale.** Daily users, requests per second at peak, read/write ratio, storage per year, bandwidth (Chapter 5).
3. **Define the API.** List the endpoints or messages, with their inputs and outputs. This forces precision.
4. **Model the data.** Which entities exist, how they relate, and above all *how they will be queried*.
5. **Sketch the high-level design.** Draw the boxes and arrows, and walk one request end to end.
6. **Deep-dive the bottlenecks.** Ask what breaks first at 10x load, then fix that: cache it, shard it, queue it, or replicate it.
7. **Discuss trade-offs and failures.** What happens when each box dies? What would you monitor? What would you build differently with more time?

:::tip Drive the conversation
Interviewers grade the *process* as much as the final picture. State your assumptions out loud ("I'll assume 100M daily users and a 10:1 read/write ratio"), check them, and move on. Silence while you draw is wasted time.
:::

## Trade-offs are the whole game

You will meet the same tensions in every chapter:

- **Consistency vs. availability.** During a failure, do you return possibly-stale data or an error?
- **Latency vs. throughput.** Batching raises throughput but makes individual requests wait.
- **Simplicity vs. flexibility.** A monolith is easy to reason about. Microservices are easier to scale separately.
- **Cost vs. everything.** Each extra nine of availability or millisecond saved has a price.
- **Read speed vs. write speed.** Indexes, caches and denormalised copies make reads fast and writes slow.

:::tradeoff Every "best practice" is a trade-off in disguise
When someone says "always use a cache" or "never use joins", ask: *what does it cost, and when is that cost worth paying?* By the end of this book you should be able to answer that question for every pattern it contains.
:::

:::quiz
Q: Classify each as functional or non-functional: (a) users can follow other users; (b) the feed loads in under 300 ms; (c) data survives the loss of a data centre; (d) users can search posts by hashtag.
A: (a) Functional. (b) Non-functional (latency). (c) Non-functional (durability and availability). (d) Functional, although *how fast* search must be would be non-functional.

Q: Why is it important for application servers to be stateless in the canonical architecture?
A: If no server holds per-user state between requests, any server can handle any request. The load balancer can then route freely, servers can be added or removed at will (horizontal scaling), and a server crash loses nothing. State goes into dedicated systems built to manage it: databases, caches and session stores.

Q: In a design interview, why should you estimate scale *before* drawing the architecture?
A: Scale decides the shape of the design. At 10 requests per second a single server and database are plenty. At 100,000 per second you need load balancing, caching, sharding and probably asynchronous processing. Without numbers you can't justify adding or leaving out any component.
:::

# Scalability and Performance

A system is **scalable** if it can handle more load by adding resources, without being redesigned, and with performance staying acceptable. Before we can scale anything, we need to say precisely what "load" and "performance" mean.

## Describing load

Load is described by a few **load parameters** chosen for your system. For a web API it might be requests per second. For a chat system, concurrent connections. For a database, the read/write ratio and the size of the working set. For a social network, a famous example is *fan-out*: how many followers' feeds a single post must reach.

Pick the load parameters that actually stress your design. "Ten thousand users" is not a load parameter. "Ten thousand writes per second, each fanning out to an average of 200 followers" is.

## Latency, throughput and percentiles

**Latency** is the time to handle one request. **Throughput** is how many requests are completed per unit time. They are related but not interchangeable. A highway can carry many cars per hour (throughput) while each car still takes forty minutes to cross the city (latency).

Latency is never one number. Each request takes a different amount of time because of garbage collection, cache misses, network jitter, lock contention and so on. So we report **percentiles**:

- **p50 (median):** half of requests are faster than this. It describes the typical experience.
- **p95 / p99:** 95% or 99% of requests are faster. These describe the *tail*, the unhappy users.
- **p99.9:** often your most valuable customers, because the heaviest users make the most requests and so are the most likely to hit the slow ones.

:::pitfall Averages hide pain
An average latency of 80 ms can hide a p99 of 2 seconds. Averages blend fast and slow requests into a number that no actual user experiences. Always ask for percentiles.
:::

:::deep Tail latency amplification
If a page calls 50 backend services in parallel and must wait for all of them, the page is as slow as the *slowest* call. If each service is slow on 1% of requests, the chance that at least one of the 50 is slow is 1 − 0.99⁵⁰ ≈ **39%**. Rare backend slowness becomes common user slowness. This is why large systems obsess over p99 and use techniques like *hedged requests*: send a duplicate request after a short delay and take whichever reply arrives first.
:::

## Vertical vs. horizontal scaling

There are two fundamental ways to add capacity.

:::diagram 640x210 | Vertical scaling grows one machine. Horizontal scaling adds machines behind a load balancer.
box z1 10 20 280 180 "Vertical (scale up)" zone
box s1 40 120 60 50 "4 CPU" svc
box s2 180 70 90 100 "64 CPU\n512 GB" svc
arrow s1 s2 "upgrade" accent
box z2 320 20 310 180 "Horizontal (scale out)" zone
box lb 340 95 70 40 "LB" lb
box h1 450 45 70 32 "node" svc
box h2 450 90 70 32 "node" svc
box h3 450 135 70 32 "node" svc
box h4 545 90 70 32 "+ node" good
arrow lb h1
arrow lb h2
arrow lb h3
text 580 140 "add more\nas needed" small muted
:::

**Vertical scaling** (scaling up) means buying a bigger machine: more CPU, RAM and faster disks. It needs no code changes and keeps everything simple. But hardware has a ceiling, the price of the top-end machines rises much faster than their capacity, and you still have one machine whose failure takes everything down.

**Horizontal scaling** (scaling out) means adding more machines and spreading the load across them. In principle it has no ceiling, uses cheap commodity hardware and survives individual failures. The price is complexity: you now need load balancing, a way to divide data, and answers to the hard questions of distributed systems.

:::tradeoff Start vertical, design for horizontal
A single well-tuned modern server can handle far more than most people expect. Scale up while that is cheap. But keep the application tier stateless from day one, so that scaling out later is a configuration change rather than a rewrite.
:::

## Statelessness: the key enabler

A service is **stateless** if it keeps no client-specific data between requests. Every request carries, or can look up, everything needed to handle it. Stateless servers are interchangeable: the load balancer can send any request anywhere, you can add ten servers during a traffic spike and remove them afterwards, and a crash loses nothing.

State has to live *somewhere*, so we push it into components built for it: databases, distributed caches and session stores. The scaling problem doesn't disappear. It moves to the data tier, where we deal with it carefully, using the replication and partitioning techniques of Part IV.

:::pitfall Sticky sessions
Pinning a user to one server ("session affinity") is a common shortcut that quietly brings state back. If that server dies, the user's session is lost. If one server gets a cluster of heavy users, it overheats while the others sit idle. Prefer external session storage.
:::

## Finding the bottleneck

Throughput is always limited by the slowest stage, which is the **bottleneck**. Adding web servers does nothing if the database is saturated. Before scaling anything, measure where time is actually spent: CPU, memory, disk I/O, network, lock contention, or a downstream dependency.

**Little's Law** links the three quantities you will measure most: *L = λ × W*. The average number of requests in the system (L) equals the arrival rate (λ) times the average time each request spends in it (W). If a service handles 2,000 requests per second with 50 ms latency, about 100 requests are in flight at any moment. You need enough threads or connections for that, plus headroom.

:::example Sizing a thread pool with Little's Law
An API receives 1,200 req/s at peak. Each request waits ~150 ms on a downstream call.
In-flight requests = 1,200 × 0.15 = **180**. With synchronous, thread-per-request servers, the fleet needs at least 180 worker threads in total, plus about 50% headroom for bursts, so roughly **270**. Spread over 6 servers, that is about 45 threads each.
:::

## Performance techniques at a glance

| Technique | Improves | Costs | Chapter |
|---|---|---|---|
| Caching | Latency, DB load | Staleness, invalidation | 12 |
| Load balancing | Throughput, availability | Another hop | 7 |
| Async processing / queues | Latency of user path | Eventual completion | 11 |
| Read replicas | Read throughput | Replication lag | 14 |
| Sharding | Write throughput, storage | Cross-shard queries | 15 |
| CDN | Latency for static content | Purge complexity | 16 |
| Batching | Throughput | Per-item latency | 22 |

:::quiz
Q: A service reports an average latency of 90 ms. Why is that not enough information to judge user experience?
A: An average mixes fast and slow requests into one number that no individual user actually experiences, and a long tail can hide behind it. You need percentiles (p50, p95, p99, p99.9) to see how the slowest requests behave, and the slowest ones often belong to your heaviest users.

Q: A page makes 20 parallel backend calls and waits for all of them. Each call independently exceeds 500 ms 1% of the time. Roughly how often is the page slower than 500 ms?
A: 1 − 0.99²⁰ ≈ 1 − 0.818 ≈ **18%** of page loads. This is tail latency amplification. Fixes include reducing fan-out, hedged requests, tighter timeouts with partial results, and improving the backends' p99.

Q: Give two advantages and two disadvantages of horizontal scaling compared with vertical scaling.
A: Advantages: practically no capacity ceiling; fault tolerance, since losing one node of many is survivable; and cheaper commodity hardware. Disadvantages: more complexity (load balancing, data partitioning, distributed coordination); data consistency gets harder; and more machines to operate and monitor.

Q: A service handles 5,000 req/s and each request takes 40 ms. How many requests are in flight on average?
A: By Little's Law, L = λW = 5,000 × 0.04 = **200** concurrent requests.
:::

# Availability, Reliability and Fault Tolerance

Machines fail. Disks wear out, power supplies die, someone pushes a bad config, a backhoe cuts a fibre line. In a fleet of ten thousand servers, something is *always* broken. This chapter is about building systems that keep working anyway.

## Defining the terms

- **Availability** is the fraction of time a system is able to serve requests successfully.
- **Reliability** is the probability that the system does the *correct* thing over a period of time. A system can be available but unreliable, for example up and responding, but with corrupted data.
- **Fault tolerance** is the ability to keep operating, possibly with reduced capability, when components fail.
- A **fault** is one component going wrong. A **failure** is the system as a whole stopping its service to users. The goal of fault tolerance is to keep faults from becoming failures.

## The nines

Availability is usually quoted in "nines":

| Availability | Downtime / year | Downtime / month | Typical for |
|---|---|---|---|
| 99% (two nines) | 3.65 days | 7.3 hours | Internal tools |
| 99.9% (three nines) | 8.77 hours | 43.8 minutes | Many SaaS products |
| 99.95% | 4.38 hours | 21.9 minutes | Mature web services |
| 99.99% (four nines) | 52.6 minutes | 4.4 minutes | Payments, core infra |
| 99.999% (five nines) | 5.26 minutes | 26 seconds | Telecom, critical systems |

Each extra nine costs roughly ten times the engineering effort. Five nines leaves 26 seconds of downtime a month, which is far less time than it takes a human to notice an alert. At that level, *everything* must recover automatically.

## Availability arithmetic

**Components in series** (all must work) multiply their availabilities, so every dependency lowers the total:

*A(total) = A₁ × A₂ × … × Aₙ*

**Redundant components in parallel** (any one is enough) fail only if *all* fail:

*A(total) = 1 − (1 − A₁) × (1 − A₂) × … × (1 − Aₙ)*

:::diagram 640x190 | Dependencies in series lower availability. Redundancy in parallel raises it.
box z1 10 15 300 165 "Series" zone
box a 30 80 70 40 "LB\n99.99%" lb
box b 125 80 70 40 "App\n99.9%" svc
box c 220 75 70 50 "DB\n99.9%" db
arrow a b
arrow b c
text 160 160 "Total ≈ 99.79%" bold
box z2 330 15 300 165 "Parallel" zone
box p1 380 50 90 36 "Replica A 99%" svc
box p2 380 110 90 36 "Replica B 99%" svc
box sw 520 78 80 40 "Either\nworks" note
arrow p1 sw
arrow p2 sw
text 480 165 "Total = 1 − 0.01² = 99.99%" bold
:::

:::example The cost of a long call chain
A request passes through an API gateway (99.99%), an auth service (99.95%), an order service (99.9%) and a database (99.95%).
Total = 0.9999 × 0.9995 × 0.999 × 0.9995 ≈ **99.79%**, which is about 18 hours of downtime a year, even though each part looks excellent on its own. Removing a hop or making a dependency optional (degrading gracefully if the recommendation service is down, say) raises the ceiling.
:::

## SLIs, SLOs and SLAs

- An **SLI** (Service Level *Indicator*) is a measured number, for example "the fraction of HTTP requests that returned a non-5xx response within 300 ms".
- An **SLO** (Service Level *Objective*) is an internal target for an SLI, for example "99.9% over a rolling 30 days".
- An **SLA** (Service Level *Agreement*) is a contract with customers, with consequences (usually refunds) if it is missed. SLAs are set *looser* than SLOs so that you notice trouble before it costs money.

The gap between 100% and the SLO is the **error budget**. If the SLO is 99.9%, you may "spend" 0.1% of requests on failures each month. While budget remains, ship features fast. When it runs out, slow down and invest in reliability. This turns an endless argument between product and operations teams into a number both can see.

## Eliminating single points of failure

A **single point of failure (SPOF)** is any component whose failure brings down the whole system. Finding them is a systematic exercise. Walk the request path and, for each box, ask: *"If this disappears right now, what happens?"*

The cure is **redundancy**: more than one of everything, ideally in independent failure domains.

:::diagram 640x250 | Redundancy across availability zones. Losing any single box, or a whole zone, leaves the system serving.
box dns 270 10 100 34 "DNS (multi-provider)" note
box zA 20 55 290 185 "Availability zone A" zone
box zB 330 55 290 185 "Availability zone B" zone
box lbA 40 80 90 36 "LB" lb
box lbB 510 80 90 36 "LB" lb
box aA 40 140 110 36 "App x N" svc
box aB 490 140 110 36 "App x N" svc
box dbA 190 150 90 70 "Primary" db
box dbB 360 150 90 70 "Standby" db
arrow dns lbA
arrow dns lbB
arrow lbA aA
arrow lbB aB
arrow aA dbA
arrow aB dbA dashed
arrow dbA dbB "sync replication"
:::

Common redundancy layers include multiple servers behind a load balancer, multiple load balancers sharing a floating IP or DNS entries, database replicas with automatic failover, multiple availability zones (separate data centres in one region), and, for the most critical systems, multiple regions.

## Failover: active-passive and active-active

- **Active-passive.** One node serves while a standby waits. A health check detects failure and promotes the standby. It is simple, but the standby's capacity sits idle, and failover takes seconds to minutes.
- **Active-active.** All nodes serve traffic at once. Losing one shifts its load to the others. Capacity isn't wasted and recovery is near-instant, but for stateful systems you must handle concurrent writes in several places (see Chapter 14).

:::pitfall Split brain
If the primary is merely *slow* rather than dead, a naive failover promotes the standby while the old primary keeps accepting writes. Now two nodes both think they are in charge, and their data diverges. Real systems prevent this with **fencing** (cutting the old leader off from storage or the network) and with **quorum**-based leader election (Chapter 19).
:::

## Designing for failure

Redundancy is only half the job. Every remote call can fail, hang or return garbage, so the code needs defensive habits too.

1. **Timeouts on everything.** A call without a timeout can hang forever and take a thread with it. Set timeouts from the dependency's measured p99.
2. **Retries with exponential backoff and jitter.** Retry transient errors, waiting longer each time (100 ms, 200 ms, 400 ms…) with randomness added, so that thousands of clients don't retry in lockstep.
3. **Idempotency.** Retries create duplicates. Make operations safe to repeat, for example by attaching an *idempotency key* to each payment request so the server can recognise and ignore repeats.
4. **Circuit breakers.** Stop calling a dependency that keeps failing, so that it can recover and your threads aren't wasted (Chapter 18).
5. **Bulkheads.** Isolate resources (thread pools, connection pools) per dependency, so that one slow dependency can't sink the whole service.
6. **Graceful degradation.** Serve a reduced experience rather than an error: hide recommendations, show a cached price, disable non-essential features.

:::pitfall Retry storms
When a service slows down, clients retry. That multiplies load on the struggling service, so more requests fail, so clients retry more. Unbounded retries can turn a brief blip into a full outage. Cap retries, use backoff with jitter, and consider a *retry budget* (for example, retries may never exceed 10% of normal traffic).
:::

## Measuring recovery: MTBF, MTTR, RPO, RTO

- **MTBF** (mean time between failures) measures how often things break.
- **MTTR** (mean time to recovery) measures how fast you fix them. Availability ≈ MTBF / (MTBF + MTTR), so cutting MTTR is often the cheapest way to add a nine.
- **RPO** (recovery point objective): how much data you can afford to lose, measured in time. With an RPO of 5 minutes, backups or replication must be no more than 5 minutes behind.
- **RTO** (recovery time objective): how long you can afford to be down before service is restored.

:::quiz
Q: A system has four dependencies in series, each 99.9% available. What is the best-case total availability, and roughly how much downtime is that per year?
A: 0.999⁴ ≈ 0.996, or **99.6%**, which is roughly 35 hours of downtime per year. Every dependency in series lowers availability.

Q: Two independent replicas are each 99.5% available, and either can serve traffic. What is the combined availability?
A: 1 − (0.005)² = 1 − 0.000025 = **99.9975%**. Note that this assumes the failures are truly independent. Replicas sharing a rack, power supply or bad deploy are *not* independent.

Q: What is an error budget, and how does it change team behaviour?
A: It is the allowed unreliability implied by the SLO. A 99.9% SLO gives a 0.1% budget of failed requests or downtime per period. While budget remains, teams can ship features quickly and take risks. When it is used up, they prioritise reliability work and freeze risky launches. It gives product and operations an objective, shared rule instead of an argument.

Q: Explain why retries without backoff can cause an outage.
A: When a service is overloaded, failing requests get retried immediately, which multiplies the load (each original request may become 3–4 attempts). The extra load causes more failures and so more retries: a positive feedback loop called a retry storm. Exponential backoff, jitter, retry caps and retry budgets break the loop.

Q: What is split brain and how is it prevented?
A: Split brain happens when two nodes both believe they are the primary, usually after a network partition or a slow-but-alive leader, and both accept writes, so the data diverges. It is prevented by quorum-based leader election (a leader needs a majority), fencing tokens or STONITH ("shoot the other node in the head"), and leases that expire.
:::

# Consistency, CAP and PACELC

The moment you keep more than one copy of data, and you will, for availability and performance, you must decide what happens when the copies disagree. That decision is one of the most consequential in any design.

## Why copies disagree

Suppose a user updates their profile photo. The write lands on replica A. Replica B, on another continent, receives the change a few hundred milliseconds later. During that window, a reader hitting B sees the old photo. Whether that matters depends on the data. For a profile photo, nobody cares. For a bank balance, it matters a great deal.

:::diagram 640x170 | Replication lag: a reader hitting the lagging replica sees stale data for a short window.
box w 20 60 80 46 "Writer" client
box A 170 30 100 46 "Replica A" db
box B 170 110 100 46 "Replica B" db
box r 360 110 80 46 "Reader" client
arrow w A "write photo=v2"
arrow A B "replicate (lag ~300ms)" dashed
arrow r B "read → v1 (stale!)" bad
text 540 70 "Window of\ninconsistency" accent
:::

## The consistency spectrum

Consistency models are promises about what a reader may observe. From strongest to weakest:

- **Linearizability (strong consistency).** The system behaves as if there were a single copy and every operation happens instantly at some point between its start and end. Once a write completes, every later read sees it. This is the easiest model to program against and the most expensive to provide.
- **Sequential consistency.** All nodes see operations in the same order, though not necessarily in real-time order.
- **Causal consistency.** Operations that are causally related (a reply and the post it answers) are seen in order by everyone. Unrelated operations may be seen in different orders.
- **Read-your-writes.** A user always sees their own updates, even if other users see them a little later.
- **Monotonic reads.** Once you have seen a value, you never see an older one. Time doesn't run backwards for you.
- **Eventual consistency.** If writes stop, all replicas will *eventually* converge to the same value. No promise is made about when, or what you see in the meantime.

:::key Weaker consistency buys latency and availability
Strong consistency requires coordination: replicas must agree before answering, which costs round trips and becomes impossible when they can't communicate. Weaker models let each replica answer on its own, which is faster and survives partitions, at the price of sometimes returning stale data.
:::

## The CAP theorem

The CAP theorem concerns three properties of a replicated data store:

- **C, Consistency:** in CAP this means linearizability. Every read sees the most recent write.
- **A, Availability:** every request to a non-failed node gets a non-error response.
- **P, Partition tolerance:** the system keeps working even if the network drops messages between nodes.

The theorem says that **when a network partition happens, you must choose between consistency and availability.** You cannot "choose not to have partitions", because networks fail. So the real choice is what to do *during* one:

:::diagram 640x210 | During a partition, node B cannot learn about writes on A. It must either refuse to answer (CP) or answer with possibly stale data (AP).
box A 60 70 120 60 "Node A\nx = 2 (new)" db
box B 460 70 120 60 "Node B\nx = 1 (old)" db
line 200 100 440 100 "network partition" dashed noarrow bad
text 320 116 "✕" big bad
box c 460 160 120 36 "Client reads x" client
arrow c B
text 150 185 "CP: B returns an error / waits" bold
text 150 165 "AP: B returns x = 1 (stale)" bold
:::

- A **CP system** refuses some requests (returns errors or times out) on the side of the partition that can't confirm it has the latest data. Examples: ZooKeeper, etcd, and HBase-style stores. Bank balances and leader election belong here.
- An **AP system** keeps answering everywhere and reconciles afterwards. Examples: Cassandra and DynamoDB in their default configurations, and DNS. Shopping carts, like counts and social feeds belong here.

:::pitfall "Pick two out of three" is misleading
The slogan suggests you could pick "CA" and give up partition tolerance. In a distributed system you can't, because partitions simply happen. CAP only forces a choice *while* a partition is happening. The rest of the time a system can be both consistent and available.
:::

## PACELC: the everyday trade-off

CAP says nothing about normal operation, which is where systems spend 99.99% of their time. **PACELC** fills the gap:

> If there is a **P**artition, choose **A** or **C**; **E**lse (normal operation), choose **L**atency or **C**onsistency.

Even with a perfect network, strong consistency costs time, because a write must reach a quorum or a leader before it is acknowledged. Systems like DynamoDB and Cassandra are **PA/EL**: available during partitions, low-latency otherwise. Traditional single-leader relational setups with synchronous replicas are **PC/EC**. Many databases let you tune this per request.

## Tunable consistency with quorums

Leaderless databases keep *N* replicas of each item and let you choose how many must respond to a write (*W*) and to a read (*R*).

**If R + W > N, every read overlaps with the latest write on at least one replica**, so reads see the latest value (given careful conflict handling).

| N | W | R | Behaviour |
|---|---|---|---|
| 3 | 3 | 1 | Fast reads, slow writes; any one node down blocks writes |
| 3 | 1 | 3 | Fast writes, slow reads |
| 3 | 2 | 2 | Balanced; tolerates one node down for both reads and writes |
| 3 | 1 | 1 | Fastest, but reads may be stale (eventual) |

## Choosing consistency per feature

You rarely choose a single model for a whole system. Choose per kind of data:

| Data | Model | Why |
|---|---|---|
| Account balance, inventory count | Strong | Overselling or double-spending costs money |
| Usernames, uniqueness constraints | Strong | Two users must not get the same name |
| User's own posts and settings | Read-your-writes | Users panic if their edit "disappears" |
| Comments thread | Causal | Replies must not appear before their parent |
| Like counts, view counts | Eventual | Off by a few for a second is harmless |
| Recommendations, analytics | Eventual | Stale by minutes is fine |

:::tip How to talk about CAP in an interview
Don't recite the definition. Apply it: "For the payment ledger I'll choose consistency, so during a partition we reject writes rather than risk a double charge. For the activity feed I'll choose availability and eventual consistency, because showing a feed that is slightly behind is better than showing an error."
:::

:::quiz
Q: In the CAP theorem, why is "CA" not a realistic choice for a distributed system?
A: Because network partitions can't be prevented in a distributed system, so partition tolerance isn't optional. CAP describes what you must give up *during* a partition: consistency or availability. A system that "gives up P" is effectively a single node.

Q: What extra trade-off does PACELC describe that CAP does not?
A: The trade-off during *normal* operation, with no partition: latency vs. consistency. Strong consistency needs coordination (waiting for a quorum or leader acknowledgement), which adds latency even when the network is healthy.

Q: With N = 5 replicas, give a choice of R and W that guarantees reads see the latest write, and one that favours write latency.
A: Any R + W > 5 guarantees overlap, for example W = 3, R = 3 (balanced), or W = 5, R = 1. To favour write latency while keeping overlap, use W = 1, R = 5. Fast writes with no guarantee would be W = 1, R = 1.

Q: Which consistency model fits each: (a) a user editing their bio; (b) a global "trending topics" list; (c) the remaining seats on a flight?
A: (a) Read-your-writes, so the user must see their own edit immediately. (b) Eventual, since minutes of staleness is fine. (c) Strong (linearizable) for the actual booking, to prevent overselling. Browsing availability can be slightly stale as long as the final purchase is checked strongly.
:::

# Back-of-the-Envelope Estimation

Good engineers can tell, within a minute and on a napkin, whether a design needs one server or a thousand. Estimation isn't about precision. It is about getting the **order of magnitude** right, so that you neither over-build nor under-build.

## Numbers worth memorising

| Operation | Approximate latency |
|---|---|
| L1 cache reference | 1 ns |
| Main memory reference | 100 ns |
| Compress 1 KB (fast codec) | 2 µs |
| Read 1 MB sequentially from memory | 3 µs |
| SSD random read (4 KB) | 16–100 µs |
| Read 1 MB sequentially from SSD | 50 µs |
| Round trip within a data centre | 0.5 ms |
| Read 1 MB sequentially from HDD | 1 ms |
| HDD seek | 10 ms |
| Round trip US East ↔ US West | 70 ms |
| Round trip US ↔ Europe | 80–150 ms |

Things to take away: memory is roughly **1000x faster than SSD random access**, the network inside a data centre is fast, the network between continents is slow (light only goes so fast), and spinning-disk seeks are terrible. Design so that the hot path touches memory and avoids cross-region round trips.

## Handy conversions

| Quantity | Value |
|---|---|
| Seconds per day | 86,400 ≈ **10⁵** |
| Seconds per month | ~2.6 million ≈ 2.5 × 10⁶ |
| 1 million requests/day | ≈ **12 req/s** |
| 1 billion requests/day | ≈ **12,000 req/s** |
| 1 KB × 1 million | 1 GB |
| 1 MB × 1 million | 1 TB |
| 1 KB × 1 billion | 1 TB |

**Powers of two:** 2¹⁰ ≈ thousand (KB), 2²⁰ ≈ million (MB), 2³⁰ ≈ billion (GB), 2⁴⁰ ≈ trillion (TB), 2⁵⁰ ≈ quadrillion (PB).

**Rough single-machine capacities** (they vary a lot, so treat them as starting points): a web/app server handles a few thousand simple req/s; a relational database a few thousand to tens of thousands of simple queries per second; an in-memory cache like Redis around 100k+ ops/s per node; a single Kafka partition tens of MB/s.

## The estimation recipe

1. **Users → requests.** Daily active users (DAU) × actions per user per day ÷ 10⁵ gives the average requests per second.
2. **Average → peak.** Multiply by a peak factor (2–3x for smooth global traffic, up to 10x for spiky events).
3. **Split reads and writes** using the read/write ratio.
4. **Storage** = writes per day × object size × retention (× replication factor).
5. **Bandwidth** = requests per second × response size.
6. **Memory for caching:** the 80/20 rule suggests caching the hottest ~20% of daily read data.
7. **Servers** = peak requests per second ÷ capacity per server, plus headroom.

:::example Estimating a photo-sharing service
**Assumptions:** 50M DAU. Each user views 30 photos and uploads 0.2 photos per day. Average photo: 2 MB original, 200 KB in display size. Retain forever, with 3x replication.

**Requests**
- Views: 50M × 30 = 1.5B/day ÷ 10⁵ ≈ **15,000 reads/s** average, ~45,000/s at 3x peak.
- Uploads: 50M × 0.2 = 10M/day ÷ 10⁵ ≈ **100 writes/s**, ~300/s at peak. The read/write ratio is ~150:1, heavily read-dominated, so caching and CDNs are essential.

**Storage**
- 10M photos/day × (2 MB + 200 KB) ≈ 22 TB/day ≈ **8 PB/year**, × 3 replicas ≈ **24 PB/year**. This rules out a database for the image bytes. You need object storage, with metadata in a database.

**Bandwidth**
- Egress: 45,000 views/s × 200 KB ≈ **9 GB/s at peak** (~72 Gbps). A CDN must absorb this.

**Metadata**
- ~500 bytes per photo × 10M/day ≈ 5 GB/day ≈ 1.8 TB/year. That is manageable in a sharded database.
:::

## Sanity checks and common mistakes

- **Keep the units straight.** Bits vs. bytes (network speeds are quoted in bits: 1 Gbps ≈ 125 MB/s).
- **Round aggressively.** 86,400 becomes 100,000. 3.7 becomes 4. You are after the order of magnitude.
- **Don't forget replication and overhead.** Replicas, indexes, backups and metadata often double or triple raw storage.
- **Distinguish average from peak.** Systems fall over at peak, not on average.
- **State your assumptions.** A wrong assumption that is out in the open can be corrected. A hidden one can't.

:::tip Narrate the arithmetic
In an interview, write the formula before the numbers: "views per second = DAU × views per user ÷ 10⁵". If you slip on the arithmetic, the interviewer can still see your reasoning, and your conclusion ("so we need a CDN") is what they really care about.
:::

:::quiz
Q: A service gets 300 million requests per day, with peak at 4x average. Estimate peak requests per second.
A: 300M ÷ 10⁵ ≈ 3,000 req/s average; × 4 ≈ **12,000 req/s** at peak.

Q: A messaging app stores 2 billion messages per day at 200 bytes each and keeps them for 5 years with 3x replication. Estimate the storage.
A: 2 × 10⁹ × 200 B = 400 GB/day. × 365 ≈ 146 TB/year. × 5 years ≈ 730 TB. × 3 replicas ≈ **2.2 PB**.

Q: Why is the ~1000x difference between memory and SSD access worth remembering?
A: It explains why caching and in-memory data structures transform performance. Serving hot data from RAM rather than from disk-backed storage cuts latency by orders of magnitude and lets one machine serve far more requests. It also guides choices like keeping indexes and working sets in memory.

Q: Your API returns 50 KB responses at 20,000 req/s. What egress bandwidth is that, in Gbps?
A: 20,000 × 50 KB = 1,000,000 KB/s = 1 GB/s. × 8 = **8 Gbps**.
:::
