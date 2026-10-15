@part II | Moving Requests | How a request finds its way from a phone to a server and back: naming, transport, load balancing, interfaces, and how APIs are protected.

# Networking Essentials

You can't design distributed systems without understanding the network that connects their parts. This chapter covers the networking every system designer needs: how names become addresses, how bytes travel reliably, and what HTTP actually does.

## The layers that matter

Networking is organised in layers, each building on the one below it. For system design you need four of them:

| Layer | Job | Examples |
|---|---|---|
| Application (L7) | Meaning of messages | HTTP, gRPC, WebSocket, DNS, SMTP |
| Transport (L4) | End-to-end delivery between processes | TCP, UDP, QUIC |
| Network (L3) | Routing packets between machines | IP (v4 / v6) |
| Link (L2) | Moving frames on one physical network | Ethernet, Wi-Fi |

When engineers say a load balancer works at "L4" or "L7", they mean whether it makes decisions from transport information (IP addresses and ports) or from application content (URLs, headers, cookies).

## IP addresses and ports

Every host on a network has an **IP address**. IPv4 addresses are 32 bits (`203.0.113.7`), and they ran out long ago. IPv6 addresses are 128 bits. Private ranges (`10.0.0.0/8`, `192.168.0.0/16`) are used inside data centres and homes, and **NAT** (network address translation) lets many private hosts share one public address.

A **port** (0–65535) identifies a particular process on a host: 443 for HTTPS, 5432 for PostgreSQL, 6379 for Redis. A connection is identified by the 4-tuple *(source IP, source port, destination IP, destination port)*.

## DNS: the internet's phone book

Humans use names. Machines route by IP. The **Domain Name System** translates between them, and it is itself a large, distributed, heavily cached system.

:::diagram 640x250 | Resolving www.example.com. Every level caches answers for their TTL, so most lookups never leave the local resolver.
box c 20 95 90 46 "Browser /\nOS cache" client
box r 190 95 110 46 "Recursive\nresolver" svc
box root 470 15 150 40 "Root servers" svc
box tld 470 100 150 40 ".com TLD servers" svc
box auth 470 185 150 40 "Authoritative\n(example.com)" svc
box ans 190 195 110 44 "203.0.113.7\nTTL 300s" good
arrow c r "1 query"
arrow r root "2 who serves .com?" lx=40 ly=-14
arrow r tld "3 who serves example.com?" lx=20
arrow r auth "4 IP of www?" lx=40 ly=8
arrow r ans "5 answer, cached" lx=50 ly=0
:::

1. The browser checks its own cache, then the operating system's.
2. On a miss, it asks a **recursive resolver** (from your ISP, or a public one).
3. The resolver asks a **root server**, which points to the **TLD servers** for `.com`.
4. The TLD server points to the domain's **authoritative name servers**.
5. The authoritative server returns the record, and every level caches it for its **TTL**.

Common record types: **A** (name → IPv4), **AAAA** (→ IPv6), **CNAME** (alias to another name), **MX** (mail servers), **NS** (delegation), **TXT** (arbitrary text, used for verification).

:::key DNS is a load balancing and failover tool
Returning several A records spreads clients across servers (round-robin DNS). **GeoDNS** returns the nearest data centre's address. Health-checked DNS removes dead endpoints. The catch is the TTL: clients cache answers, so changes take effect only as caches expire. Short TTLs (30–60 s) allow faster failover but put more load on the DNS servers.
:::

## TCP vs. UDP

**TCP** gives you a reliable, ordered byte stream. It sets up a connection with a **three-way handshake** (SYN, SYN-ACK, ACK), numbers every byte, retransmits lost segments, slows down when the network is congested, and delivers data in order. Most application protocols use it: HTTP/1.1, HTTP/2, database protocols.

**UDP** sends independent datagrams with no handshake, no ordering, no retransmission and no congestion control. It is fast and simple, and the application handles any loss. It suits real-time media, games, DNS queries and, increasingly, protocols that build their own reliability on top, such as **QUIC**.

:::diagram 640x200 | TCP needs one round trip before any data flows, and TLS 1.3 adds another. This is why connection reuse matters so much.
box c 40 20 90 30 "Client" client
box s 510 20 90 30 "Server" svc
line 85 55 85 195 "" noarrow dashed
line 555 55 555 195 "" noarrow dashed
line 85 70 555 85 "SYN" accent
line 555 95 85 110 "SYN-ACK" accent
line 85 120 555 135 "ACK + TLS ClientHello"
line 555 145 85 160 "TLS ServerHello, cert, finished"
line 85 170 555 185 "HTTP request (first useful byte)"
:::

| | TCP | UDP |
|---|---|---|
| Connection | Handshake required | None |
| Reliability | Retransmits lost data | Fire and forget |
| Ordering | Guaranteed | None |
| Overhead | Higher (headers, ACKs, state) | Minimal |
| Use cases | Web, APIs, databases, file transfer | Video calls, gaming, DNS, metrics |

:::pitfall Connection setup is expensive
A fresh TCP + TLS connection to a server 100 ms away costs about 200 ms *before the first request byte is sent*. Systems that open a new connection per request waste huge amounts of time. Use **connection pooling** and **keep-alive**, and put servers close to users.
:::

## HTTP: the language of the web

HTTP is a request/response protocol. A request has a **method**, a **path**, **headers** and an optional **body**. A response has a **status code**, headers and a body.

| Method | Meaning | Safe? | Idempotent? |
|---|---|---|---|
| GET | Read a resource | Yes | Yes |
| POST | Create / trigger an action | No | No |
| PUT | Replace a resource entirely | No | Yes |
| PATCH | Partially update | No | Not necessarily |
| DELETE | Remove a resource | No | Yes |

**Status code families:** `2xx` success (200 OK, 201 Created, 204 No Content); `3xx` redirection (301 Moved Permanently, 304 Not Modified); `4xx` client error (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Too Many Requests); `5xx` server error (500, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout).

### HTTP versions

- **HTTP/1.1** sends one request at a time per connection, so browsers open about six connections per host. It suffers from *head-of-line blocking*: a slow response holds up the ones behind it.
- **HTTP/2** multiplexes many concurrent streams over one TCP connection, with binary framing and header compression. But one lost TCP packet still stalls *all* the streams.
- **HTTP/3** runs over **QUIC** (on UDP). Streams are independent, so a lost packet only stalls its own stream. Connection setup is faster (often 1 round trip, or 0 when resuming), and connections survive network changes such as Wi-Fi to cellular.

## TLS and HTTPS

**TLS** encrypts the connection and authenticates the server. During the handshake, the server presents a **certificate** signed by a trusted **certificate authority**. Client and server use asymmetric cryptography to agree on a shared session key, then switch to fast symmetric encryption for the data. TLS 1.3 cut the handshake to one round trip. We return to TLS, mTLS and certificates in Chapter 25.

## Proxies: forward and reverse

- A **forward proxy** sits in front of *clients* and makes requests on their behalf. It is used for corporate filtering, anonymity and caching.
- A **reverse proxy** sits in front of *servers* and receives requests on their behalf. It handles TLS termination, compression, caching, routing and load balancing. Nginx, Envoy, HAProxy and cloud load balancers are all reverse proxies. Clients never see the servers behind them.

:::quiz
Q: Why does DNS caching make failover slower, and what is the trade-off in choosing a TTL?
A: Resolvers and clients cache records until the TTL expires, so after you change a record to point away from a failed server, some clients keep using the old address until their cache expires. Short TTLs mean faster failover and more flexible routing, at the cost of more DNS queries and slightly slower lookups. Long TTLs mean fewer queries but slow changes.

Q: Name two situations where UDP is a better choice than TCP, and explain why.
A: (1) Real-time voice and video: a late packet is useless, so retransmitting it only adds delay, and it is better to skip it. (2) Online games sending frequent position updates, where only the newest update matters. Others: DNS lookups (one small request/response), metrics collection, and QUIC, which builds its own reliability on UDP.

Q: What problem does HTTP/2 solve compared with HTTP/1.1, and what problem remains that HTTP/3 fixes?
A: HTTP/2 multiplexes many requests over one connection, removing application-level head-of-line blocking and the need for many parallel connections. It still runs on TCP, though, so one lost packet stalls every stream on that connection (transport-level head-of-line blocking). HTTP/3 runs over QUIC, whose streams are independent at the transport layer.

Q: Which HTTP methods are idempotent, and why does that matter for retries?
A: GET, PUT, DELETE (as well as HEAD and OPTIONS). Repeating an idempotent request has the same effect as sending it once, so clients and proxies can safely retry it after a timeout. POST isn't idempotent, so retrying it can create duplicates unless the API uses idempotency keys.
:::

# Load Balancing

A load balancer spreads incoming requests across a pool of servers. It is what makes horizontal scaling and redundancy possible, and it is usually the first box after DNS in any design.

## What a load balancer does

1. **Distributes traffic** so that no single server is overwhelmed.
2. **Health-checks** backends and stops sending traffic to failed ones.
3. **Allows elastic scaling**: servers can be added and removed without clients noticing.
4. Often **terminates TLS**, compresses responses, adds headers, and enforces timeouts and limits.

:::diagram 640x230 | A load balancer with health checks. The failed server is removed from rotation automatically.
box c1 20 40 80 34 "Client" client
box c2 20 100 80 34 "Client" client
box c3 20 160 80 34 "Client" client
box lb 200 90 110 54 "Load\nbalancer" lb
box s1 430 30 110 36 "Server 1 ✓" good
box s2 430 97 110 36 "Server 2 ✓" good
box s3 430 164 110 36 "Server 3 ✕" bad
arrow c1 lb
arrow c2 lb
arrow c3 lb
arrow lb s1
arrow lb s2
arrow lb s3 "health check fails" dashed bad
:::

## Layer 4 vs. layer 7

- An **L4 load balancer** routes on IP and port, without looking inside the packets. It is extremely fast and protocol-agnostic, but it can't route by URL or header.
- An **L7 load balancer** understands HTTP (or gRPC and so on). It can route `/api/*` to one pool and `/images/*` to another, split traffic for canary releases, add authentication, rewrite headers and retry failed requests. It does more work per request.

Large systems often stack them: an L4 tier spreads traffic over a fleet of L7 proxies, which then route to services.

## Load balancing algorithms

| Algorithm | How it works | Good for | Weakness |
|---|---|---|---|
| Round robin | Each server in turn | Identical servers, uniform requests | Ignores current load |
| Weighted round robin | Bigger servers get more turns | Mixed hardware | Static weights |
| Least connections | Server with fewest active connections | Long or variable requests | Needs connection tracking |
| Least response time | Fastest recent responses | Latency-sensitive services | Can oscillate |
| IP / consistent hash | hash(key) picks the server | Cache affinity, sticky routing | Uneven load with hot keys |
| Random / power of two choices | Pick 2 at random, use the less loaded | Large fleets | Slight randomness |

:::deep The power of two random choices
Picking one server at random leads to surprisingly uneven load. Picking **two** at random and sending the request to the less loaded one cuts the worst-case load dramatically, with almost no coordination. Many modern proxies use this because it scales to huge fleets without a central view of every server's load.
:::

## Health checks

- **Passive** checks watch real traffic and eject servers that return errors or time out.
- **Active** checks probe an endpoint such as `/healthz` every few seconds.
- Distinguish **liveness** ("the process is running") from **readiness** ("it can serve traffic right now", with database connected and caches warm). Send traffic only to *ready* instances.

:::pitfall Deep health checks can cause cascading failure
If every server's health check also checks the shared database, a brief database hiccup makes *every* server fail its check at once. The load balancer then removes the entire fleet, turning a degraded situation into a total outage. Keep health checks focused on the instance itself, and make sure the load balancer "fails open" if every backend looks unhealthy.
:::

## Session persistence

Sometimes requests from one user must reach the same server, for example when a server holds an in-memory session or a WebSocket. Load balancers support this with cookie-based or IP-based **sticky sessions**. As Chapter 2 argued, prefer externalising state so you don't need this. When you do need affinity (as with WebSockets), use consistent hashing, which limits disruption when servers change.

## Avoiding the load balancer as a SPOF

A single load balancer is itself a single point of failure. Common fixes:

- **Active-passive pair** with a floating virtual IP (VRRP / keepalived). The standby takes over the IP if the active one dies.
- **Active-active** load balancers behind DNS with several A records, or behind **anycast**, where the same IP is announced from many locations and the network routes each client to the nearest one.
- **Managed cloud load balancers**, which are internally distributed and redundant.

## Global load balancing

For multi-region systems, traffic is steered *between* regions with GeoDNS or anycast, by geography (lowest latency), by health (avoid a failed region) and by capacity. Inside each region, local load balancers take over.

:::diagram 640x220 | Global traffic management. GeoDNS or anycast picks a region, and regional load balancers pick a server.
box u1 20 30 80 34 "User (EU)" client
box u2 20 150 80 34 "User (US)" client
box g 180 85 110 54 "GeoDNS /\nAnycast" lb
box r1 380 20 240 80 "eu-west region" zone
box r2 380 125 240 80 "us-east region" zone
box l1 400 45 70 36 "LB" lb
box l2 400 150 70 36 "LB" lb
box a1 510 45 90 36 "services" svc
box a2 510 150 90 36 "services" svc
arrow u1 g
arrow u2 g
arrow g l1 "nearest"
arrow g l2 "nearest"
arrow l1 a1
arrow l2 a2
:::

:::quiz
Q: When would you choose an L7 load balancer over an L4 one?
A: When routing must depend on request content: path-based routing to different services, header- or cookie-based canary splits, authentication at the edge, request retries, gRPC-aware balancing, or HTTP rewriting. L4 is preferred for raw speed, non-HTTP protocols, or as a front tier that spreads traffic across L7 proxies.

Q: Requests to your service vary from 5 ms to 30 seconds. Why is round robin a poor choice, and what would you use?
A: Round robin ignores how busy each server is, so a server stuck with several 30-second requests keeps receiving new ones while others sit idle. **Least connections** (or power-of-two-choices on active requests) sends new work to the least busy server.

Q: Explain the difference between liveness and readiness checks.
A: Liveness answers "is the process alive, or should it be restarted?" Readiness answers "should this instance receive traffic right now?" An instance can be alive but not ready: it may be starting up, warming caches or temporarily overloaded. Load balancers should route by readiness. Orchestrators restart instances based on liveness.

Q: How can the load balancer itself be made highly available?
A: Run several load balancers: an active-passive pair sharing a floating virtual IP, active-active load balancers behind several DNS records or anycast, or a managed cloud load balancer that is distributed internally. Spread them across availability zones.
:::

# Designing APIs

An API is a contract between a service and its clients. Internal APIs connect services. External APIs connect you to customers and partners. A good API is predictable, hard to misuse, efficient, and able to change without breaking the clients that depend on it.

## REST

**REST** models a system as **resources** identified by URLs and manipulated with standard HTTP methods.

```
GET    /v1/users/42              -> fetch user 42
POST   /v1/users                 -> create a user (returns 201 + Location)
PATCH  /v1/users/42              -> update some fields
DELETE /v1/users/42              -> delete
GET    /v1/users/42/orders?status=shipped&limit=20
```

Good REST design means: plural nouns for collections, nesting only for true ownership, HTTP status codes used correctly, **statelessness** (each request carries its own auth and context), and support for caching through `ETag` / `Cache-Control`.

## RPC and gRPC

**RPC** (remote procedure call) models the API as *functions*: `getUser(id)`, `chargeCard(amount)`. **gRPC** is the dominant modern framework. You define services and messages in **Protocol Buffers**, generate typed clients and servers in many languages, and communicate over HTTP/2 with compact binary encoding. It supports unary calls and client, server and bidirectional **streaming**.

```
service OrderService {
  rpc GetOrder (GetOrderRequest) returns (Order);
  rpc WatchOrder (GetOrderRequest) returns (stream OrderEvent);
}
```

## GraphQL

**GraphQL** exposes a single endpoint and a typed schema. Clients send a query describing exactly the fields they want, possibly across several related entities, and get back exactly that shape. This avoids **over-fetching** (receiving fields you don't need) and **under-fetching** (needing several round trips).

```
query {
  user(id: 42) {
    name
    orders(last: 3) { id total items { name } }
  }
}
```

The costs: HTTP caching is harder (everything is a POST to one URL), a single query can be very expensive (you need query cost limits), and naive resolvers cause the **N+1 query problem**, usually fixed with batching (DataLoader).

## Choosing a style

| | REST | gRPC | GraphQL |
|---|---|---|---|
| Model | Resources | Procedures | Typed graph query |
| Encoding | JSON (text) | Protobuf (binary) | JSON |
| Transport | HTTP/1.1+ | HTTP/2 | HTTP |
| Strengths | Simple, cacheable, universal | Fast, typed, streaming | Flexible client-driven queries |
| Weaknesses | Over/under-fetching | Browser support needs a proxy; less human-readable | Caching, query cost control |
| Best for | Public APIs, CRUD | Internal service-to-service calls | Client apps with varied data needs |

:::tip A common, defensible answer
"Public API: REST, because it's universal and cacheable. Internal service-to-service calls: gRPC, for performance and strict contracts. If many different front-ends need different slices of the data, a GraphQL layer (or backend-for-frontend) on top of the services."
:::

## Pagination

Never return unbounded lists. Two main strategies:

- **Offset pagination**: `?limit=20&offset=40`. It is simple and lets you jump to a page, but it gets slow for deep offsets (the database scans and discards rows) and skips or duplicates items when data changes between pages.
- **Cursor (keyset) pagination**: `?limit=20&after=eyJpZCI6MTIzNH0`. The cursor encodes the position, for example the last seen `(created_at, id)`. It is fast at any depth and stable under inserts. It is the right default for feeds and large collections.

## Idempotency keys

Networks fail *after* the server has done the work but *before* the client hears back. If the client retries a `POST /payments`, the customer may be charged twice. The fix is an **idempotency key**: the client generates a unique ID per logical operation and sends it in a header. The server stores the key with the result. If the same key comes again, it returns the stored result instead of repeating the action.

:::diagram 640x200 | An idempotency key turns an unsafe retry into a harmless one.
box c 10 80 80 46 "Client" client
box s 270 80 120 46 "Payments API" svc
box k 470 15 160 46 "Idempotency store\nkey → result" cache
box p 470 140 160 46 "Charge card" svc
arrow c s "POST + Idempotency-Key: abc"
arrow s k "seen 'abc'?" lx=-10
arrow s p "charge only if new" lx=-14
:::

## Versioning and evolution

APIs outlive the code that first implemented them. Strategies include putting the version in the URL (`/v1/…`, the most visible), in a header (`Accept: application/vnd.example.v2+json`), or evolving *without* versions by making only **backward-compatible** changes: add optional fields, never remove or rename fields, never change their meaning. Deprecate with warnings and timelines before removing anything.

## API gateways

An **API gateway** is a reverse proxy that acts as the single entry point for clients in front of many backend services. It centralises cross-cutting concerns:

- Routing requests to the right service
- Authentication and authorisation checks
- Rate limiting and quotas
- Request and response transformation, protocol translation (REST ↔ gRPC)
- Aggregation (one client call fans out to several services)
- Observability: logging, metrics, tracing
- Caching, compression, TLS termination

:::diagram 640x230 | An API gateway gives clients one entry point and keeps cross-cutting concerns out of each service.
box m 20 40 90 36 "Mobile app" client
box w 20 110 90 36 "Web app" client
box p 20 180 90 36 "Partner" client
box g 200 70 140 110 "API Gateway\n\nauth · rate limit\nrouting · logging" lb
box s1 440 30 110 36 "User service" svc
box s2 440 97 110 36 "Order service" svc
box s3 440 164 110 36 "Search service" svc
arrow m g
arrow w g
arrow p g
arrow g s1
arrow g s2
arrow g s3
:::

A related pattern, the **Backend for Frontend (BFF)**, gives each client type its own thin gateway (one for mobile, one for web), shaped to that client's needs.

:::pitfall The gateway that ate the business logic
Keep gateways thin. Once business rules creep into the gateway, it becomes a shared monolith that every team must change and deploy, which defeats the point of separate services.
:::

:::quiz
Q: Why is cursor-based pagination generally preferred over offset pagination for feeds?
A: Offset pagination gets slower at deep offsets (the database must skip N rows), and it produces duplicates or gaps when items are inserted or deleted between page requests. Cursor pagination seeks directly to the last-seen key using an index, so it is fast at any depth and stable while new items arrive.

Q: A client sends `POST /orders`, the server creates the order, but the response is lost. How do you make the client's retry safe?
A: Have the client send a unique idempotency key with the request. The server records the key with the outcome, atomically with creating the order. On a retry with the same key, it returns the original response instead of creating a second order. Keys expire after a reasonable window, such as 24 hours.

Q: What is the N+1 problem in GraphQL and how is it usually solved?
A: Resolving a list of N items, then running a separate query for each item's related field, makes 1 + N database queries. It is solved by batching and caching within a request (the DataLoader pattern), which collects all the IDs requested in one tick and fetches them with a single query.

Q: List four responsibilities an API gateway commonly takes on.
A: Any four of: request routing; authentication and token validation; rate limiting and quotas; TLS termination; request and response transformation or protocol translation; aggregating several backend calls; caching; logging, metrics and tracing; CORS handling.
:::

# Rate Limiting and Authentication

Every public API needs to know two things about each request: **who is calling** (authentication), **what they may do** (authorisation), and whether they are **asking too often** (rate limiting). These controls protect both your users and your infrastructure.

## Why rate limit?

- **Protect availability.** Stop a single client, whether buggy, abusive or malicious, from overwhelming shared resources.
- **Enforce fairness and business tiers.** Free users get 100 requests/minute, paid users 10,000.
- **Control cost,** especially for expensive operations or calls to paid third-party APIs.
- **Reduce abuse:** credential stuffing, scraping, spam.

A rejected request should receive **HTTP 429 Too Many Requests**, ideally with a `Retry-After` header and headers showing the remaining quota.

## Rate limiting algorithms

### Token bucket

A bucket holds up to *B* tokens and is refilled at *r* tokens per second. Each request takes one token. If the bucket is empty, the request is rejected. The bucket allows **bursts** up to *B* while enforcing an average rate of *r*. It is simple, memory-light (two numbers per client) and the most widely used algorithm.

:::diagram 640x190 | Token bucket: tokens drip in at a steady rate; each request spends one; bursts are allowed up to the bucket's capacity.
box refill 40 20 140 36 "Refill: r tokens/s" note
box b 70 70 90 100 "Bucket\ncapacity B\n● ● ● ●" cache
box req 300 100 100 40 "Request" client
box ok 490 60 120 36 "Allowed (−1 token)" good
box no 490 130 120 36 "429 if empty" bad
arrow refill b
arrow req b "take token"
arrow b ok "token available" lx=130 ly=-40
arrow b no "" dashed
:::

### Leaky bucket

Requests enter a fixed-size queue that drains at a constant rate, like water leaking from a bucket. It smooths traffic into a perfectly steady flow, which protects downstream systems, but it adds queueing delay and doesn't allow bursts.

### Fixed window counter

Count requests per client in fixed windows (for example, per calendar minute) and reject once the count passes the limit. It is trivial to implement with a counter that expires. Its flaw: a client can send the full limit at 12:00:59 and again at 12:01:00, which is **double the rate** across the window boundary.

### Sliding window log

Store the timestamp of each request and count those in the last *N* seconds. It is exact, but the memory cost grows with the request rate.

### Sliding window counter

A practical compromise: keep counters for the current and previous fixed windows, and weight the previous one by how much it overlaps the sliding window.

*estimate = current_count + previous_count × (1 − elapsed_fraction_of_current_window)*

It is accurate enough for nearly every use, with O(1) memory.

| Algorithm | Bursts | Memory | Accuracy | Notes |
|---|---|---|---|---|
| Token bucket | Allowed up to B | O(1) | Good | Industry default |
| Leaky bucket | Smoothed out | O(queue) | Good | Steady output rate |
| Fixed window | 2x at boundaries | O(1) | Weak | Simplest |
| Sliding log | Exact | O(requests) | Exact | Expensive at scale |
| Sliding window counter | Mostly prevented | O(1) | Very good | Great compromise |

## Distributed rate limiting

With 50 gateway instances, each needs a shared view of a client's usage. Common approaches:

- **Centralised counters** in Redis, updated atomically (a Lua script or `INCR` with expiry). This is accurate, but adds a network hop and makes Redis critical, so decide whether to fail open or closed if it is unreachable.
- **Local limits with periodic sync.** Each node enforces roughly limit ÷ N and reconciles occasionally. It is fast but approximate.
- **Sticky routing** of each client to a particular limiter node by consistent hashing.

:::tradeoff Fail open or fail closed?
If the rate-limit store is down, **failing open** (allowing requests) keeps the product working but drops protection. **Failing closed** (rejecting requests) keeps protection but causes an outage. Most consumer APIs fail open with a conservative local fallback limit. Security-critical endpoints such as login may fail closed.
:::

## Authentication vs. authorisation

- **Authentication (AuthN):** *who are you?* Verifying identity with passwords, keys, tokens, certificates or biometrics.
- **Authorisation (AuthZ):** *what are you allowed to do?* Checking permissions on a resource. A user authenticated as Alice may still not delete Bob's document.

## Ways to authenticate API calls

**API keys** are long random secrets identifying a calling application. They are simple and good for server-to-server and developer APIs, but they identify an *application* rather than a user, and they are dangerous if leaked. Always send them over TLS, scope them, and make them easy to rotate.

**Session cookies:** after login, the server creates a session record and gives the browser a random session ID in a cookie (`HttpOnly`, `Secure`, `SameSite`). Each request looks the session up. They are easy to revoke (delete the record), but every request needs a lookup in a shared session store.

**Tokens (JWT):** a JSON Web Token is a signed, self-contained statement such as "user 42, role editor, expires 14:05". Any service holding the verification key can check it **without a database lookup**, which suits distributed systems. The catch is revocation: a stolen token stays valid until it expires. Hence the standard pattern of **short-lived access tokens** (5–15 minutes) plus **long-lived refresh tokens** that are stored server-side and can be revoked.

```
header.payload.signature
{"alg":"RS256"} . {"sub":"42","role":"editor","exp":1767225600} . <signature>
```

:::pitfall JWTs are signed, not encrypted
Anyone can base64-decode a JWT and read its payload. Never put secrets in it. Always verify the signature and the `exp`, `aud` and `iss` claims, and never accept `alg: none`.
:::

## OAuth 2.0 and OpenID Connect

**OAuth 2.0** is a framework for *delegated authorisation*. It lets an application act on a user's behalf at another service ("Allow PhotoPrinter to read your photos?") without ever seeing the user's password. **OpenID Connect (OIDC)** adds an *identity* layer on top ("Sign in with…"), returning an ID token that describes who the user is.

:::diagram 640x250 | OAuth 2.0 authorisation-code flow (with PKCE). The app never sees the user's password, only a scoped token.
box u 20 100 80 46 "User +\nbrowser" client
box app 200 20 110 46 "Client app" svc
box as 470 20 140 46 "Authorization\nserver" lb
box rs 470 185 140 46 "Resource server\n(API)" svc
arrow u app "1 'Connect'"
arrow app as "2 redirect, scope=photos.read" off=-8
arrow as app "4 code → exchanged for token" off=8 ly=12
arrow u as "3 log in & consent" dashed lx=30 ly=14
arrow app rs "5 API call + token" lx=-40
:::

## Authorisation models

- **RBAC (role-based):** permissions are attached to roles (viewer, editor, admin), and users get roles. Simple and auditable.
- **ABAC (attribute-based):** policies evaluate attributes of the user, resource and context ("managers can approve expenses under $5,000 in their own department during business hours"). Flexible, but more complex.
- **ReBAC (relationship-based):** permissions follow relationships in a graph ("can edit if a member of a team that owns the folder that contains the document"). This is how document-sharing systems work.

:::tip Where to enforce
Authenticate at the edge (gateway) so that services receive a verified identity. But enforce **authorisation inside the service that owns the data**, because only it knows who owns which record. Missing object-level authorisation checks ("can user 42 read order 9001?") are among the most common API vulnerabilities.
:::

:::quiz
Q: A limit is 100 requests per minute using a fixed window counter. What is the maximum a client can send within any 60-second span, and why?
A: Up to **200**: 100 in the last moments of one window and 100 at the start of the next. Fixed windows reset abruptly at boundaries. Sliding windows or token buckets prevent this.

Q: Why is a token bucket a popular choice for API rate limiting?
A: It enforces an average rate while allowing short bursts (up to the bucket's capacity), which matches real client behaviour. It needs only two values per client (token count and last refill time), is O(1) per request, and is easy to implement atomically in a shared store like Redis.

Q: What is the main drawback of JWT access tokens, and how is it usually mitigated?
A: They are self-contained and verified without a lookup, so they can't easily be revoked before they expire. A stolen token works until `exp`. The mitigation is short-lived access tokens (minutes) with revocable, server-stored refresh tokens. Sometimes a denylist of revoked token IDs is added for emergencies.

Q: Explain the difference between authentication and authorisation with an example.
A: Authentication verifies identity: Alice logs in and proves she is Alice. Authorisation decides what that identity can do: Alice can view her own invoices but not Bob's, and only users with the "admin" role can delete accounts.
:::
