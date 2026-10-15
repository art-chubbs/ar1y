@part IV | Putting It Together | The handful of building blocks that keep reappearing across all ten designs, and how to recognise which ones a new problem needs.

# Patterns Across Problems

After ten case studies, a surprising fact stands out: the systems look different on the surface, but they are built from the same dozen or so recurring combinations. Learning to spot these combinations is what turns a new, unfamiliar problem into a familiar one.

## Pattern 1: Accept fast, process later

**Shape:** the API validates, persists and enqueues, and returns immediately (202 Accepted or PENDING). Workers do the slow work asynchronously.

**Seen in:** video transcoding, notifications, the crawler's parse step, payment webhooks.

**Why it works:** it keeps user-facing latency low, absorbs spikes in queues, and isolates users from slow or failing dependencies (Vol. 1, Ch. 11).

**What to watch:** queue depth and consumer lag; idempotent workers; dead-letter queues; telling the user about eventual completion (status pages, push notifications).

## Pattern 2: Separate the control plane from the data plane

**Shape:** small, critical metadata goes through a transactional service. Huge payloads go directly between clients and blob storage or CDNs, authorised by tokens or pre-signed URLs.

**Seen in:** video uploads, file sync (metadata service vs. block service), CDN delivery of segments.

**Why it works:** each plane scales and fails independently. Application servers never carry gigabytes. Metadata keeps strong guarantees while blobs get cheap, massive throughput.

## Pattern 3: Atomic conditional writes guard scarce resources

**Shape:** "change X from state A to state B *only if* it is still in state A", as one atomic operation (compare-and-set, `UPDATE … WHERE status = …`, a version check).

**Seen in:** seat holds, payment state transitions, file-version commits, driver assignment (Vol. 1, Ch. 29), token-bucket updates in Lua.

**Why it works:** exactly one competitor wins and the others fail fast, without long-held locks.

**Pair it with:** expiry (leases, holds) so that abandoned claims return on their own.

## Pattern 4: Idempotency at every boundary

**Shape:** every request that changes something carries a unique key. The receiver records keys and returns the stored result for repeats.

**Seen in:** payments (client → service → PSP), notifications, file chunk uploads (the hash *is* the key), collaborative edit operations `(client_id, seq)`, crawler fetch tasks.

**Why it works:** networks force retries, retries create duplicates, and idempotency makes duplicates harmless (Vol. 1, Ch. 8 and 11).

## Pattern 5: Durable log as the source of truth, with derived views

**Shape:** append every change to a durable, ordered log or journal. Build fast, disposable views (caches, sorted sets, search indexes, tries) from it, and rebuild them by replaying.

**Seen in:** the file-sync namespace journal, the collaborative-editing operation log with snapshots, leaderboards rebuilt from durable scores, autocomplete tries rebuilt from query logs, the payment ledger.

**Why it works:** the log gives ordering, auditability and recovery. Views can be optimised freely for reads, because they can always be regenerated (Vol. 1, Ch. 17).

## Pattern 6: The outbox for reliable side effects

**Shape:** write the state change and its outgoing event in one local transaction, and relay events afterwards (Vol. 1, Ch. 20).

**Seen in:** payment success → fulfilment, inventory changes → seat-map cache, notification status updates.

**Why it works:** it removes the dual-write gap where state and events disagree after a crash.

## Pattern 7: Precompute for the read path

**Shape:** do expensive work at write time or offline so that reads become lookups.

**Seen in:** trie nodes caching top-K, transcoded renditions, news-feed fan-out (Vol. 1, Ch. 27), seat-map read models, daily leaderboard keys.

**Why it works:** most systems read far more than they write. Moving work off the read path buys latency and capacity where it matters.

**Watch:** write amplification and staleness. Use hybrid approaches (precompute for the common case, compute on read for the extremes).

## Pattern 8: Exact where it matters, approximate everywhere else

**Shape:** spend precision only on what users scrutinise or what correctness requires. Use sketches, sampling and estimates for the rest.

**Seen in:** exact top-of-leaderboard vs. estimated deep ranks; HyperLogLog unique players; Bloom-filter seen-URLs; asynchronous view counts; approximate global rate limits with strict login limits.

**Why it works:** approximate structures cost orders of magnitude less memory and coordination (Vol. 1, Ch. 21).

## Pattern 9: Meter the flood

**Shape:** when demand can exceed capacity by orders of magnitude, control admission instead of trying to absorb it: waiting rooms, rate limits, priority queues, campaign schedulers, debouncing.

**Seen in:** ticket on-sales, notification campaigns, rate limiting, autocomplete debouncing, crawler politeness.

**Why it works:** systems degrade gracefully and fairly instead of collapsing for everyone.

## Pattern 10: One owner per hot object

**Shape:** route all activity for one entity (a document, a host, an event's inventory, a chat) to a single owner process, chosen by consistent hashing or a lease-based routing table.

**Seen in:** collaborative document sessions, crawler hosts, ticket inventory sections, chat conversations (Vol. 1, Ch. 28).

**Why it works:** a single owner can order operations and enforce invariants locally, without distributed coordination. Different entities spread across many owners, so the system still scales out.

**Watch:** failover (leases, fencing), and entities too hot for one owner (split them).

## Pattern 11: Reconcile, don't just trust

**Shape:** periodically compare your state against an independent source of truth and repair the differences.

**Seen in:** payment reconciliation against PSP settlement files, the crawler re-checking freshness, anti-entropy between replicas (Merkle trees, Vol. 1, Ch. 21), clients polling the journal in case a notification was missed.

**Why it works:** every real system drifts. Request-path guarantees reduce drift, and reconciliation catches what slips through.

## A recognition table

| If the problem has… | Reach for… |
|---|---|
| Big files or media | Pattern 2 (pre-signed uploads, object storage, CDN), Pattern 1 (async processing) |
| Money, inventory, uniqueness | Patterns 3, 4, 6, 11 |
| Many users editing shared state | Pattern 10 (owner per object), plus OT/CRDT, Pattern 5 (operation log) |
| Read-heavy, latency-critical lookups | Pattern 7 (precompute), caching, CDN |
| Huge counts or sets | Pattern 8 (sketches, approximate) |
| Sudden extreme spikes | Pattern 9 (metering, queues, waiting rooms) |
| Slow external dependencies | Pattern 1, circuit breakers, retries with idempotency |
| Anything that must be auditable | Pattern 5 (append-only log), double-entry where money is involved |

:::tip The meta-skill
Faced with a new problem, ask four questions: *What is scarce?* (Correctness patterns.) *What is huge?* (Data-plane and approximation patterns.) *What is spiky?* (Metering and async patterns.) *What is shared between users?* (Ownership and merge patterns.) The answers usually name most of the architecture before you draw a single box.
:::

:::quiz
Q: Name three case studies that rely on "atomic conditional writes", and say what resource each one protects.
A: Ticket booking (seats: AVAILABLE→HELD only if still available); payments (payment state transitions such as PENDING→SUCCEEDED only from a valid prior state); file sync (committing a new version only if the base version is current). Others: the rate limiter's atomic token update, ride-hailing driver assignment.

Q: What do the file-sync journal, the collaborative-editing operation log and the payment ledger have in common?
A: Each is an append-only, ordered, durable log that serves as the source of truth. Current state or views are derived from it, it gives a full history and audit trail, and it allows recovery or catch-up by replaying from a known position.

Q: Give an example of "exact where it matters, approximate elsewhere" and explain why it is acceptable.
A: Leaderboards: the top of the board and friends' ranks are exact, while deep global ranks are estimated from a score histogram. Users scrutinise the top and their friends, but nobody cares whether they are rank 4,812,113 or 4,812,500, so the cheap estimate loses nothing they value. Others: HyperLogLog unique counts, Bloom filters for seen URLs.

Q: Why is "one owner per hot object" scalable even though each object has a single owner?
A: Ownership is per object, not global. Millions of documents, hosts or events spread across many owner processes through consistent hashing, so total capacity grows with the number of owners. Each owner orders and validates its own objects' operations locally with no cross-node coordination, and only exceptionally hot single objects need further splitting.
:::

# [appendix] Practice Problem Bank

Ten more design problems for practice. For each, the hints point at what makes the problem interesting and which patterns from Chapter 11 and chapters of both volumes apply. Try each one for 40 minutes before reading the hints.

## 1. Ride-sharing surge pricing service

Compute a price multiplier for every small area of a city every minute, from live demand and supply.
*Hints:* geospatial cells (H3); streaming windows over request and driver events; smoothing and caps; serving multipliers from a cache; what happens if the stream lags (use the last known value). Vol. 1, Ch. 21–22, 29.

## 2. Distributed job scheduler (cron at scale)

Run millions of scheduled jobs ("every day at 9:00 in the user's time zone") exactly once each, on a fleet of workers.
*Hints:* time-bucketed job tables or a timing wheel; leader election or partition ownership for scanning; leases and fencing so that a job isn't run twice; idempotent job handlers; catching up after downtime. Vol. 1, Ch. 19; Patterns 3, 4, 10.

## 3. Hotel reservation system

Book rooms by room type and date range, allowing controlled overbooking.
*Hints:* inventory per (hotel, room type, date) counters rather than individual rooms; atomic decrement across all nights of a stay (one transaction, or a saga); holds with expiry; idempotent reservation requests. Chapter 5; Patterns 3, 4.

## 4. Metrics monitoring and alerting system

Ingest millions of metric points per second from servers, store them, graph them and alert on thresholds.
*Hints:* time-series storage (compression, downsampling, retention tiers); label cardinality limits; a pull vs. push collection model; alert evaluation as a stream; alerts deduplicated and routed through a notification system. Vol. 1, Ch. 24; Chapter 7.

## 5. Typeahead for people search inside a company

Like autocomplete, but over 500k employee names with permissions (some people are hidden from some viewers).
*Hints:* a small dataset (it fits in memory everywhere); filtering by permission at query time; prefix matching on first and last names and nicknames; personal ranking (your team first). Chapter 10.

## 6. Online auction (eBay-style)

Users bid on items, and the highest bid at closing time wins.
*Hints:* a single owner per auction for ordering bids (Pattern 10); atomic "accept a bid only if higher than the current one"; anti-sniping extensions; fan-out of live price updates over WebSockets; a precise close time with a server-side clock. Chapters 5, 8.

## 7. URL-shortener analytics at 1M clicks/s

Real-time click counts by link, country and referrer, with daily unique visitors.
*Hints:* log ingestion; streaming aggregation into OLAP storage; HyperLogLog per link per day; Count-Min Sketch for top referrers; pre-aggregated rollups. Vol. 1, Ch. 26; Chapter 9.

## 8. Code deployment system

Push new builds to 10,000 servers safely within 10 minutes.
*Hints:* artifact distribution (peer-to-peer or tiered caches, like a CDN); canary waves with automatic rollback on health metrics; idempotent deploy agents that converge to a desired version; a deploy-lock per service. Vol. 1, Ch. 23.

## 9. Multiplayer game server matchmaking

Group players of similar skill and region into matches of 10 within 30 seconds.
*Hints:* queues per region and skill bucket; widening the skill window over time; atomically claiming players so they aren't in two matches (Pattern 3); allocating game servers; handling players who drop during matching.

## 10. Email service (Gmail-style)

Receive, store, search and send email for 1B users.
*Hints:* SMTP ingestion; spam filtering pipeline (async); mailbox storage sharded by user, with blobs in object storage; inverted index per user for search; threads and labels as metadata; push to clients. Chapters 2, 7; Vol. 1, Ch. 14–16.
