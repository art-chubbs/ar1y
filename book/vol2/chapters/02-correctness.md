@part II | Correctness Under Pressure | Systems where a single mistake costs real money or trust — double charges, oversold seats, unfair limits — and where correctness must survive retries, races and traffic spikes.

# Payment System

Design the payment backend of an online marketplace: buyers pay for orders with cards and wallets, the platform keeps a fee, and sellers are paid out. Money must never be lost, created or moved twice.

## Step 1: Requirements

**Functional**

- Accept payments for orders through external payment service providers (PSPs) that handle the card networks.
- Refunds, full and partial.
- Track balances for the platform and sellers. Pay sellers out on a schedule.
- A complete, auditable history of every money movement.

**Non-functional**

- **Correctness above all:** no double charges, no lost payments, every cent accounted for.
- **Idempotent** under retries at every layer.
- High availability for checkout, while staying strongly consistent for balances.
- Moderate throughput: 1,000 payments/s at peak. Payment systems are rarely limited by raw scale.
- Security and compliance: we must never store raw card numbers ourselves (PCI-DSS scope).

## Step 2: Key concepts

- **PSP (payment service provider):** an external company (a card processor, a wallet provider) that actually moves money through card networks and banks. We call its API. It calls us back with **webhooks**.
- **Authorisation vs. capture:** an *authorisation* reserves funds on the buyer's card. A *capture* actually takes them (often when the order ships). Uncaptured authorisations expire.
- **Tokenisation:** the buyer's card details go straight from their browser to the PSP's hosted form or SDK, which returns a **token**. Our servers only ever see the token, which keeps us out of most PCI scope.
- **Ledger:** our internal, append-only record of every money movement, using **double-entry bookkeeping**.

## Step 3: API

```
POST /v1/payments
  Idempotency-Key: 7c1e…
  {order_id, amount: 4999, currency: "EUR", payment_token, buyer_id}
  -> 201 {payment_id, status: "PENDING" | "SUCCEEDED" | "FAILED" | "REQUIRES_ACTION"}

POST /v1/payments/{id}/refunds   Idempotency-Key: …  {amount}
POST /v1/webhooks/psp            (signed callbacks from the PSP)
GET  /v1/payments/{id}
```

Amounts are **integers in minor units** (cents). Never use floating point for money.

## Step 4: Data model

```
payments(payment_id PK, order_id, buyer_id, amount, currency, status,
         psp, psp_reference, idempotency_key UNIQUE, created_at, updated_at)
payment_events(payment_id, seq, from_status, to_status, payload, ts)    -- audit trail
ledger_entries(entry_id PK, txn_id, account_id, direction(DEBIT/CREDIT),
               amount, currency, created_at)                             -- append-only
accounts(account_id PK, type(buyer_clearing/seller/platform_fees/psp_receivable), currency)
```

### Double-entry bookkeeping

Every movement of money is a **transaction made of at least two entries whose debits and credits sum to zero**. Money is never created or destroyed. It only moves between accounts. A payment of €49.99 with a 10% platform fee becomes:

| Account | Debit | Credit |
|---|---|---|
| PSP receivable (money the PSP owes us) | 49.99 | |
| Seller balance | | 44.99 |
| Platform fees | | 5.00 |
| **Total** | **49.99** | **49.99** |

Balances are computed by summing entries (with periodic snapshots for speed). The ledger is **append-only**. Mistakes are corrected with new, reversing entries, never by editing old ones, so the history is a complete audit trail.

:::key The ledger is the source of truth for money
Statuses on payment rows tell you where a workflow is. The double-entry ledger tells you where the money is. Because every transaction must balance, a whole class of bugs (money appearing or vanishing) becomes detectable with a single sum.
:::

## Step 5: High-level design

:::diagram 640x300 | Payment flow. The payment service drives a state machine, calls the PSP with idempotency keys, records ledger entries atomically, and reconciles against the PSP's reports.
box b 10 20 90 40 "Buyer browser" client
box psp 500 20 130 46 "PSP (external)" lb
box co 10 130 110 46 "Checkout /\nOrder service" svc
box ps 250 130 130 46 "Payment service\n(state machine)" svc
box db 250 230 130 60 "Payments DB\n+ Ledger" db
box ob 440 240 90 40 "Outbox" queue
box rc 500 130 130 46 "Reconciliation\njob" svc
arrow b psp "1 card details → token"
arrow co ps "2 pay + Idempotency-Key"
arrow ps psp "3 charge (same key)" off=-10 lx=-30
arrow psp ps "4 webhook" dashed off=10 lx=30
arrow ps db "5 status + ledger, one txn" lx=70 ly=0
arrow db ob "events"
arrow rc psp "settlement file" dashed lx=40 ly=0
arrow rc db "compare" ly=10
:::

## Step 6: Deep dives

### Idempotency end to end

Retries happen at every hop: the browser double-clicks, the checkout service times out, the payment service crashes after calling the PSP. Correctness relies on **idempotency at each boundary**:

1. **Client → payment service:** the `Idempotency-Key` header (derived from `order_id` plus attempt) is stored with a unique constraint. A repeated request returns the stored result instead of starting a second payment.
2. **Payment service → PSP:** we pass our own payment ID as the PSP's idempotency key, so a retried charge after a timeout returns the original result instead of charging again.
3. **PSP → us (webhooks):** webhooks may arrive late, out of order, or more than once. We verify the signature, look up the payment by `psp_reference`, and apply the transition only if it is valid from the current state (`PENDING → SUCCEEDED`, never `FAILED → SUCCEEDED` without a new attempt), recording the event ID so that duplicates are ignored.

### The payment state machine

```
CREATED → PENDING ──→ SUCCEEDED → (PARTIALLY_)REFUNDED
            │   └──→ REQUIRES_ACTION (3-D Secure) → PENDING
            └──────→ FAILED
```

:::diagram 640x200 | The payment state machine. Each arrow is a guarded, conditional update; anything else is rejected.
box c 10 90 90 40 "CREATED" svc
box p 150 90 100 40 "PENDING" cache
box ra 130 10 140 40 "REQUIRES_ACTION" queue
box s 320 90 110 40 "SUCCEEDED" good
box f 320 160 110 36 "FAILED" bad
box r 480 90 150 40 "REFUNDED\n(full or partial)" svc
arrow c p
arrow p ra "3-D Secure" off=-14 lx=-36
arrow ra p "done" off=-14 lx=30
arrow p s "PSP ok"
arrow p f "declined" lx=-10
arrow s r "refund"
:::

Every transition is a **conditional update** (`UPDATE … SET status='SUCCEEDED' WHERE id=? AND status='PENDING'`) written **in the same database transaction** as its ledger entries and an outbox event (Vol. 1, Ch. 20). So a payment can never be marked as succeeded without the matching ledger entries, and downstream systems (order fulfilment, emails) are notified reliably, at least once.

### The unknown outcome

The hardest case: we call the PSP and the request **times out**. Did the charge happen? We can't know (Vol. 1, Ch. 19). The wrong reactions are to assume failure (the customer pays again and is charged twice) or to assume success (we ship without payment). The right reaction is to leave the payment in `PENDING` (or `UNKNOWN`), then resolve it by **querying the PSP** for that idempotency key, by waiting for the webhook, and finally through reconciliation. Retrying the charge with the same idempotency key is also safe.

### Reconciliation

Distributed systems drift: webhooks get lost, bugs happen, and PSPs make mistakes. Every day, the PSP provides a **settlement report** listing every transaction it processed. A reconciliation job matches it line by line against our payments and ledger:

- Matched: good.
- In the PSP's report but not ours: a missed webhook or a crash. Fix our state.
- In ours but not the PSP's: a charge we think happened but didn't. Investigate.
- Amount or currency mismatch: raise an alert, and correct with reversing entries.

Reconciliation is the safety net that turns "we hope it's right" into "we prove it's right" every day.

:::diagram 640x180 | Daily reconciliation. Every line of the PSP's settlement report is matched against the internal ledger.
box rep 10 60 130 50 "PSP settlement\nreport (daily)" store
box led 10 130 130 40 "Our ledger" db
box m 220 80 120 50 "Matcher" svc
box ok 420 10 210 34 "matched → done" good
box mis 420 60 210 34 "missing in ours → repair state" cache
box ext 420 110 210 34 "missing in PSP → investigate" bad
box amt 420 150 210 26 "amount mismatch → reversing entry" bad
arrow rep m
arrow led m
arrow m ok
arrow m mis
arrow m ext
arrow m amt
:::

### Payouts and refunds

Payouts aggregate each seller's ledger balance and send transfers through a payout provider, recorded as ledger transactions (`seller balance` debit, `bank clearing` credit) with their own idempotency keys and reconciliation. Refunds are new transactions that reverse the original split, never edits of it.

### Consistency and scale

Throughput is modest, so a **strongly consistent relational database** with serializable or carefully locked transactions is the right tool. Shard by `merchant_id` or `account_id` if needed, keeping each ledger transaction within one shard where possible, or use a ledger database built for this. Hot accounts (the platform's fee account receives a credit on every payment) can be split into several sub-accounts that are summed when read.

## Step 7: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Double-click / client retry | Duplicate request | Idempotency key with unique constraint |
| PSP timeout | Outcome unknown | Keep PENDING; query PSP; safe retry with same key; reconcile |
| Duplicate / out-of-order webhook | Wrong state transition | Signature check, event de-dup, state-machine guards |
| Crash between DB write and event publish | Fulfilment never triggered | Transactional outbox |
| Silent drift between us and PSP | Money mismatch | Daily reconciliation, alerting, reversing entries |

:::quiz
Q: Why should amounts be stored as integers in minor units rather than floating point?
A: Floating-point numbers can't represent most decimal fractions exactly (0.1 + 0.2 ≠ 0.3), so repeated arithmetic accumulates rounding errors and amounts fail to balance. Integer cents (with an explicit currency) are exact, which accounting requires.

Q: What is double-entry bookkeeping, and how does it help catch bugs?
A: Every transaction is recorded as two or more entries (debits and credits) across accounts that sum to zero, so money only moves and is never created or destroyed. Any bug that loses or duplicates money produces an imbalance that a simple sum detects, and the append-only entries give a full audit trail.

Q: A call to the PSP times out. Why is it wrong to mark the payment as failed, and what should you do?
A: The PSP may have charged the card even though the response was lost. Marking the payment failed would invite the customer to pay again, which is a double charge. Instead, keep the payment PENDING or UNKNOWN, then resolve it: query the PSP using the idempotency key, wait for the webhook, retry safely with the same key, and rely on reconciliation as a backstop.

Q: A webhook saying "payment succeeded" arrives twice, and another saying "failed" arrives after the success. How should the service handle them?
A: Verify each signature, then de-duplicate by the webhook's event ID, so the second success is ignored. Apply transitions only through the state machine's guarded conditional updates: PENDING → SUCCEEDED is allowed, but SUCCEEDED → FAILED is not, so the late "failed" event is recorded for audit and rejected as a transition (and investigated if it indicates a real discrepancy).

Q: What does daily reconciliation catch that idempotency and webhooks don't?
A: Silent drift: missed or never-delivered webhooks, bugs that wrote wrong states or amounts, and PSP-side errors. Matching the PSP's settlement report line by line against the internal ledger finds discrepancies that no single request-path mechanism would notice.
:::

# Ticket Booking System

Design a system that sells seats for concerts and sports events. Most of the time traffic is modest, but when a popular event goes on sale, millions of people arrive in the same minute for a few tens of thousands of seats.

## Step 1: Requirements

**Functional**

- Browse events and see a seat map with live availability.
- Select seats and hold them for a few minutes while paying.
- Complete purchase. Seats become sold and tickets are issued.
- Release holds that expire or are abandoned.

**Non-functional**

- **No double-selling:** a seat is sold at most once. This is non-negotiable.
- **Fairness:** during on-sales, users get in roughly in arrival order, and bots don't win.
- **Survive spikes:** 10M users arriving within minutes for 50k seats.
- Seat maps may be slightly stale while browsing. The final booking must be exact.

## Step 2: Estimates

- Normal day: about 100 bookings/s across all events.
- Hot on-sale: 10M users, many refreshing the seat map every few seconds, which means **millions of reads/s** for one event, and tens of thousands of hold attempts per second on the same 50k rows.
- The data is small (an event has tens of thousands of seat rows). The problem is **contention**, not volume.

:::key Contention, not size
A stadium's seats fit in memory on one machine. What makes this hard is that millions of requests compete for the same few thousand rows in the same seconds. The design is about controlling that competition fairly and safely.
:::

## Step 3: Data model

```
events(event_id PK, venue_id, name, starts_at, on_sale_at, status)
seats(event_id, seat_id, section, row, number, price_tier,
      status(AVAILABLE/HELD/SOLD), hold_id, hold_expires_at, version)
      PRIMARY KEY (event_id, seat_id)
holds(hold_id PK, user_id, event_id, seat_ids[], expires_at, status)
orders(order_id PK, hold_id UNIQUE, user_id, amount, status, payment_id)
```

## Step 4: High-level design

:::diagram 640x300 | Ticketing architecture. A virtual waiting room meters users into the booking path, seat-map reads come from a cache, and holds are taken with atomic conditional writes.
box u 10 135 70 40 "Fans" client
box cdn 110 130 100 50 "CDN / edge\n(static pages)" cdn
box wr 250 20 130 46 "Virtual\nwaiting room" queue
box api 250 130 130 50 "Booking API" svc
box sm 440 20 130 46 "Seat-map cache" cache
box inv 440 130 130 60 "Inventory DB\n(strong)" db
box pay 250 230 130 40 "Payments" svc
box exp 440 235 130 40 "Hold-expiry worker" svc
arrow u cdn
arrow cdn wr "enqueue" lx=-20
arrow wr api "admit + token" lx=40 ly=0
arrow api sm "read map" dashed lx=-20
arrow api inv "hold (CAS)"
arrow api pay "checkout" lx=30 ly=0
arrow inv sm "changes" dashed lx=34 ly=0
arrow exp inv "release" lx=30 ly=0
:::

## Step 5: Deep dives

### Holding seats without double-selling

When a user selects seats, the booking service tries to move them from AVAILABLE to HELD **atomically**, in one statement or transaction:

```sql
UPDATE seats
   SET status = 'HELD', hold_id = :h, hold_expires_at = now() + interval '8 minutes'
 WHERE event_id = :e AND seat_id IN (:s1, :s2)
   AND status = 'AVAILABLE';
-- succeed only if rows_affected == 2, else roll back and report "seat taken"
```

Only one transaction can win each seat: the `WHERE status = 'AVAILABLE'` condition is a compare-and-set. Everyone else gets "seat no longer available" and picks again. Taking all of a user's seats in one transaction (or all-or-nothing with rollback) prevents half-held groups.

Purchase then moves seats from HELD to SOLD *only if the hold is still theirs and hasn't expired* (`WHERE hold_id = :h AND hold_expires_at > now()`), in the same transaction as creating the order, which is linked to a payment idempotency key (Chapter 4).

:::tradeoff Pessimistic vs. optimistic locking
`SELECT … FOR UPDATE` locks the rows while the transaction runs (pessimistic). That is simple, but under heavy contention, transactions queue up behind locks. Conditional updates and version columns (optimistic) never wait. Losers fail fast and retry. With many users competing for few seats, failing fast and asking the user to choose again gives better throughput and a clearer experience.
:::

:::diagram 640x170 | Seat lifecycle. Each transition is an atomic conditional write, and holds fall back to AVAILABLE when they expire.
box a 40 60 130 46 "AVAILABLE" good
box h 260 60 130 46 "HELD\n(hold_id, expires)" cache
box s 480 60 130 46 "SOLD" svc
arrow a h "hold (CAS)" off=-10
arrow h a "expired / released" off=-10
arrow h s "purchase (same hold, not expired)"
:::

### Expiring holds

Holds must expire so that abandoned carts return seats to sale. Two complementary mechanisms:

- **Lazy:** the hold query treats `HELD` seats whose `hold_expires_at` has passed as available (`WHERE status='AVAILABLE' OR (status='HELD' AND hold_expires_at < now())`).
- **Active:** a background worker regularly releases expired holds and updates the seat-map cache, so that browsing users see the seats come back.

Using *time-bounded holds* is the same idea as leases (Vol. 1, Ch. 19): ownership that disappears on its own if the owner vanishes.

### The virtual waiting room

Letting 10M users hit the booking API at once would melt it, and it would reward whoever has the fastest connection or the most bots. Instead, during an on-sale:

1. Users arriving before or at on-sale time get a place in a **queue**, either randomised among early arrivals (so being first by milliseconds doesn't matter) or in arrival order.
2. The waiting-room page is static, served from the CDN, and polls a lightweight queue-position endpoint.
3. An **admission controller** lets users in at a rate the booking system can handle (for example, 2,000 per minute), issuing each a short-lived **signed token**.
4. The booking API accepts only requests carrying a valid admission token. Everyone else stays in line.

:::diagram 640x170 | The waiting room turns an uncontrollable spike into a steady, fair flow.
box sp 10 60 110 50 "10M arrivals\nin 2 minutes" bad
box q 170 60 160 50 "Waiting room queue\n(position shown)" queue
box ad 380 60 110 50 "Admit\n2,000 / min" lb
box bk 540 60 90 50 "Booking\nflow" good
arrow sp q
arrow q ad
arrow ad bk "token"
:::

Combined with bot defences (CAPTCHA at entry, device fingerprinting, per-account purchase limits), this keeps the system up and the sale fair.

### Serving seat maps

Millions of fans refreshing a seat map must not query the inventory database. The map is a **read model** in a cache, updated from inventory changes (CDC or events) and pushed to the CDN or to clients every second or two. It is allowed to be slightly stale: a seat shown as available may already be held, and the atomic hold catches that. For the hottest sales, show availability by section ("few left") rather than seat by seat, which reduces both load and wasted clicks.

### Scaling inventory writes

A single event's seats live in one partition of the inventory store, partitioned by `event_id`, so each hold is a single-partition transaction. For extreme events, split the inventory into **sections**, each owned by its own partition or in-memory actor. A booking for seats in section 112 touches only that section's owner.

## Step 6: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Two users click the same seat | Race | Conditional update; exactly one wins |
| User abandons checkout | Seats stuck | Hold expiry (lazy + active) |
| Payment succeeds after hold expired | Paid but seat released | Extend hold during payment; if lost, refund automatically or offer alternatives |
| On-sale spike | API overload, unfairness | Waiting room, admission tokens, CDN-served pages |
| Bots | Real fans lose out | CAPTCHA, purchase limits, anomaly detection |

:::quiz
Q: How does the system guarantee a seat is never sold twice?
A: Every change of a seat's state is an atomic conditional update in a strongly consistent store: AVAILABLE → HELD only `WHERE status='AVAILABLE'` (or the hold has expired), and HELD → SOLD only `WHERE hold_id` matches and the hold hasn't expired. Only one transaction can satisfy the condition for a given seat, so concurrent attempts lose and must choose again.

Q: Why use time-bounded holds instead of locking seats until the user finishes?
A: Users abandon checkouts, close tabs or lose connection. Holds that expire automatically return seats to sale without depending on the user or any cleanup message, like a lease. Indefinite locks would strand inventory and need fragile manual release.

Q: What problems does a virtual waiting room solve during a big on-sale?
A: (1) Overload: it meters users into the booking system at a rate the system can handle, instead of letting millions of simultaneous requests crush the database. (2) Fairness: positions are assigned by arrival or randomised among early arrivals, so raw speed and refresh-spamming give no advantage. (3) It gives a stable, informative experience (a queue position) served cheaply from the CDN.

Q: Why is it acceptable for the seat map to be slightly stale?
A: The map is only for browsing. Correctness is enforced at hold time by the atomic conditional update, which rejects seats that were taken in the meantime. Serving the map from a cache keeps millions of reads off the inventory database, at the cost of occasional "seat already taken" responses.
:::

# Distributed Rate Limiter

Design a rate-limiting service used by an API platform with gateways in several regions. It must enforce limits such as "1,000 requests per minute per API key" and "5 login attempts per minute per account", while adding almost no latency.

## Step 1: Requirements

**Functional**

- Define rules by key type (API key, user, IP, endpoint), limit and window, plus tiers (free and paid).
- On each request, decide *allow* or *reject* (HTTP 429 with `Retry-After`).
- Return headers showing the limit, how much remains and when it resets.

**Non-functional**

- **Low latency:** under 1–2 ms added at p99. The limiter sits on every request.
- **High availability:** limiter trouble must not take down the API.
- **Accuracy:** close enough. Small overshoots are acceptable for most rules, but security rules (login) should be strict.
- Scale: 1M requests/s across 50 gateway instances in 3 regions, 10M active keys.

## Step 2: Choosing the algorithm

Vol. 1, Ch. 9 compared the algorithms. For a general-purpose API limiter, two stand out:

- **Token bucket:** allows bursts up to the bucket size, enforces an average rate, and needs only two numbers per key (`tokens`, `last_refill`).
- **Sliding window counter:** two counters per key, smooth limits, no boundary bursts.

We'll use a **token bucket** by default and sliding windows for rules that need smoothness.

## Step 3: Rules and data

```yaml
- match: {key_type: api_key, tier: free}
  limit: 1000 per 60s, burst: 100
- match: {key_type: account, endpoint: POST /login}
  limit: 5 per 60s, mode: strict
```

Rules are stored centrally, pushed to every gateway, and cached in memory. Live counters are stored as `rl:{rule}:{key}` → `{tokens, ts}` with a TTL slightly longer than the window, so idle keys disappear on their own.

## Step 4: High-level design

:::diagram 640x270 | Rate limiter architecture. Gateways check a local fast path, consult a regional Redis cluster atomically, and fall back to local limits if Redis is unavailable.
box c 10 110 70 46 "Clients" client
box zone 110 20 330 230 "Region (×3)" zone
box g1 130 50 110 40 "Gateway +\nlimiter lib" lb
box g2 130 110 110 40 "Gateway +\nlimiter lib" lb
box g3 130 170 110 40 "Gateway +\nlimiter lib" lb
box r 300 100 120 60 "Redis cluster\n(sharded by key)" cache
box cfg 480 40 140 46 "Rules service" svc
box api 480 130 140 46 "Backend APIs" svc
arrow c g2
arrow g1 r "atomic Lua" dashed
arrow g2 r
arrow g3 r "" dashed
arrow cfg g1 "push rules" dashed
arrow g2 api "allowed" lx=0 ly=-12
:::

**Request path:** the gateway's limiter library finds the matching rules, then executes **one atomic script** in Redis that refills and takes a token for each rule key, returning allow/deny plus the remaining count. The Redis cluster is sharded by key (consistent hashing), so the load spreads out and each key's state lives on one shard.

```lua
-- KEYS[1]=bucket key; ARGV: capacity, refill_per_ms, now_ms, cost
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(b[1]) or tonumber(ARGV[1])
local ts = tonumber(b[2]) or tonumber(ARGV[3])
tokens = math.min(tonumber(ARGV[1]), tokens + (ARGV[3] - ts) * ARGV[2])
local allowed = tokens >= tonumber(ARGV[4])
if allowed then tokens = tokens - ARGV[4] end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', ARGV[3])
redis.call('PEXPIRE', KEYS[1], 120000)
return {allowed and 1 or 0, tokens}
```

Running the read-modify-write as one script makes it atomic: two gateways can't both spend the last token.

## Step 5: Deep dives

### Latency: avoiding a network hop on every request

A Redis round trip inside the region costs ~0.3–1 ms, which is usually acceptable. To go further:

- **Local pre-check:** keys that are clearly far below their limit (from recent responses) can be allowed locally, with usage reported asynchronously in batches. Only keys near their limit check Redis synchronously.
- **Local deny cache:** once a key is denied, cache "denied until T" locally, so abusive clients don't generate Redis traffic at all.
- **Pipelining:** check all of a request's rules in one round trip.

### Multiple regions

Clients may hit any region. Options:

1. **Per-region limits:** each region enforces limit ÷ number of regions, or a share weighted by traffic. Simple and fast, but a client concentrated in one region gets less than its full limit.
2. **Global counters, asynchronously synced:** each region counts locally and periodically exchanges deltas with the others (a G-counter CRDT per window, Vol. 1, Ch. 14). It is approximately global, and the overshoot is bounded by the sync interval.
3. **Home region per key:** route each key's checks to one region. Exact, but cross-region latency for clients far from home.

:::diagram 640x200 | Three ways to enforce one limit across regions.
box z1 10 10 200 180 "1 · Split per region" zone
box a1 30 50 160 34 "EU: 333/min" svc
box a2 30 95 160 34 "US: 333/min" svc
box a3 30 140 160 34 "APAC: 333/min" svc
box z2 220 10 200 180 "2 · Local + async sync" zone
box b1 240 50 70 34 "EU count" svc
box b2 330 50 70 34 "US count" svc
box b3 285 125 80 34 "APAC count" svc
arrow b1 b2 "deltas" both
arrow b2 b3 "" both
arrow b3 b1 "" both
box z3 430 10 200 180 "3 · Home region per key" zone
box c1 450 50 160 34 "key 42 → home: EU" good
box c2 450 120 160 34 "US gateway asks EU" svc
arrow c2 c1 "~80 ms" dashed
:::

Most platforms use (1) or (2) for general limits, and keep strict security limits in a single home region or a strongly consistent store.

### Failing open or closed

If Redis is unreachable, the limiter must decide (Vol. 1, Ch. 9). Default rules **fail open** with a conservative **local** token bucket per gateway (limit ÷ number of gateways), so the API keeps working with rough protection. **Strict** rules (login, OTP, payments) **fail closed**, since letting brute-force attempts through is worse than a brief error.

### Hot keys

One huge customer at 100k requests/s concentrates load on one Redis shard. Spread the key into *N* sub-buckets (`rl:key#0…#7`), each allowed limit ÷ N, with the gateway picking one at random. Or give that customer a local-allowance scheme that synchronises in batches.

### Telling clients what happened

Return `429 Too Many Requests`, `Retry-After`, and `RateLimit-Limit / RateLimit-Remaining / RateLimit-Reset` headers. Well-behaved clients can back off accurately, and support teams can explain the behaviour. Log denials (sampled) with rule IDs for dashboards and abuse detection.

## Step 6: Failure modes

| Failure | Effect | Mitigation |
|---|---|---|
| Redis shard down | Limits for its keys unavailable | Replicas with failover; fail-open local fallback for normal rules |
| Network partition between regions | Global counts diverge | Bounded overshoot; reconcile when healed |
| Hot key | One shard saturated | Sub-bucket sharding; local allowances |
| Clock skew between gateways | Refill miscalculated | Use Redis server time inside the script (`TIME`) |
| Bad rule pushed | Legitimate traffic rejected | Staged rollout of rules, dry-run "shadow" mode, quick rollback |

:::quiz
Q: Why must the token-bucket update run as a single atomic operation (such as a Lua script) in Redis?
A: The update is a read-modify-write: read tokens, refill, compare and decrement. If two gateways do this at the same time as separate commands, both can read the same token count and both spend the last token, letting extra requests through. Running it atomically on the server serialises updates per key.

Q: Give two ways to enforce one limit across multiple regions, with their trade-offs.
A: (1) Split the limit per region (limit ÷ regions): fast and simple, with no cross-region traffic, but a client using one region can't reach its full limit. (2) Count locally and sync deltas asynchronously between regions (CRDT counters): close to a true global limit, at the cost of temporary overshoot bounded by the sync interval. A third option, a single home region per key, is exact but adds cross-region latency.

Q: Which rules should fail open and which fail closed when the limiter's store is unavailable?
A: General API usage limits should fail open (allow, ideally with a conservative local limit) so that a limiter outage doesn't become an API outage. Security-critical rules such as login attempts, one-time-password checks or payment attempts should fail closed, because allowing unlimited attempts would enable brute-force attacks.

Q: One customer sends 100,000 requests per second under a single API key. What problem does this cause, and how do you fix it?
A: All of that key's limiter operations land on one Redis shard, which becomes a hot spot and adds latency for every key on that shard. Split the key into N sub-buckets (`key#0`…`key#N-1`), each holding limit ÷ N, with gateways picking one at random; or give that customer local allowances on each gateway that sync in batches.

Q: How can you reduce the latency the limiter adds to every request?
A: Run the limiter library inside the gateway with rules cached locally; use one pipelined round trip to a nearby (same-region) Redis; cache recent denials locally; and allow requests from keys far below their limit locally, reporting usage asynchronously in batches, so that only keys near their limit need a synchronous check.
:::
