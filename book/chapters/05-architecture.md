@part V | Architecture | How to carve a system into parts: monoliths, microservices, serverless and event-driven designs, and the patterns that keep distributed services healthy.

# Architectural Styles

Architecture is about where you draw boundaries: what lives together, what lives apart, and how the parts communicate. There is no universally best style. Each fits a particular team size, a stage of the product, and a set of scaling needs.

## The monolith

A **monolith** is a single deployable unit containing all of the application's functionality: user management, orders, payments and notifications, built and deployed together, usually sharing one database.

**Strengths:** simple to develop, test, debug and deploy; in-process calls are fast and reliable; transactions across features are just database transactions; one thing to monitor. For a small team and a young product, a monolith is usually the *right* choice.

**Weaknesses as it grows:** the codebase gets tangled; any change means redeploying everything; one bad component (a memory leak in reports) can take down the whole app; all features must scale together; many teams in one codebase step on each other.

:::key The modular monolith
A middle path: one deployable application, internally split into well-separated **modules** with explicit interfaces and no reaching into each other's tables. You keep the operational simplicity of a monolith, gain clean boundaries, and later, if needed, can extract a module into a service along a seam that already exists.
:::

## Microservices

**Microservices** split the system into small, independently deployable services, each owning one business capability *and its own data*, and communicating over the network (HTTP/gRPC or messaging).

:::diagram 640x250 | Microservices: each service owns its own datastore and can be deployed and scaled independently.
box gw 260 10 120 40 "API Gateway" lb
box us 30 100 120 40 "User service" svc
box os 190 100 120 40 "Order service" svc
box ps 350 100 120 40 "Payment service" svc
box ns 510 100 110 40 "Notification" svc
box d1 50 180 80 55 "Users DB" db
box d2 210 180 80 55 "Orders DB" db
box d3 370 180 80 55 "Payments DB" db
box bus 490 185 140 40 "Event bus" queue
arrow gw us
arrow gw os
arrow gw ps
arrow us d1
arrow os d2
arrow ps d3
arrow os ps "gRPC"
arrow ps bus "PaymentSucceeded"
arrow bus ns
:::

**Strengths:** teams own services end to end and ship independently; each service scales on its own (scale search, not billing); failures can be isolated; each service can use the technology that suits it; smaller codebases are easier to understand.

**Costs:** *a distributed system*, with network latency, partial failures, retries and timeouts everywhere; data consistency across services needs sagas and events instead of transactions (Chapter 20); debugging requires distributed tracing; many deployment pipelines; and a large investment in platform tooling (service discovery, observability, CI/CD).

:::pitfall The distributed monolith
Services that must be deployed together, share a database, or call each other in long synchronous chains give you all the costs of microservices and none of the benefits. If changing one feature means coordinating releases of five services, your boundaries are wrong.
:::

### Drawing service boundaries

Use **domain-driven design (DDD)**. Identify *bounded contexts*: areas of the business with their own language and models (Catalog, Ordering, Shipping, Billing). A "Product" in Catalog (descriptions, images) is a different model from a "Product" in Shipping (weight, dimensions). Good service boundaries:

- Follow business capabilities, not technical layers ("Order service", not "Database service").
- Have **high cohesion** inside and **low coupling** outside.
- Own their data. No other service reads their tables directly.
- Align with team ownership (Conway's law: systems mirror the communication structure of the organisations that build them).

## Serverless

**Serverless** (Functions-as-a-Service, such as AWS Lambda and Cloud Functions, plus managed services) means you deploy functions, and the platform runs them on demand, scales them automatically from zero to thousands of instances, and bills per invocation.

**Strengths:** no servers to manage; automatic scaling; pay only for use (excellent for spiky or low traffic); fast to build event-driven glue.

**Weaknesses:** **cold starts** (the first invocation after an idle period is slow); execution time and memory limits; statelessness forced on you; vendor lock-in; harder local testing; cost can *exceed* servers at high, steady load.

**Good fits:** image thumbnails on upload, webhooks, scheduled jobs, lightweight APIs with variable traffic, and data pipeline steps.

## Event-driven architecture

In an **event-driven architecture**, services communicate by publishing **events**, facts about something that happened (`OrderPlaced`, `PaymentFailed`), instead of calling each other directly. Interested services subscribe and react.

- **Loose coupling:** the producer doesn't know who consumes its events. New consumers are added without changing it.
- **Resilience:** consumers can be down temporarily, and events wait.
- **Scalability:** asynchronous processing absorbs load.
- **Costs:** eventual consistency; the flow of a business process is spread across services and harder to follow; you need good tooling for tracing, schema evolution and replay.

### Event notification vs. event-carried state transfer

- **Event notification:** a thin event ("order 42 changed"). Consumers call back to fetch details, so they stay coupled at runtime.
- **Event-carried state transfer:** the event includes the data consumers need ("order 42 changed: status=SHIPPED, items=[…]"). Consumers keep their own local copies and never call back. More decoupled, but there is more duplicated data.

## Event sourcing and CQRS

**Event sourcing:** instead of storing the *current state* (balance = $70), store the **full sequence of events** (deposited $100, withdrew $30) as the source of truth. Current state is derived by replaying events, usually with periodic snapshots. You get a complete audit trail, the ability to rebuild state as of any point in time, and new views built later from the history. The costs are complexity, event-schema evolution, and needing projections for queries.

**CQRS (Command Query Responsibility Segregation):** use *separate models* for writes (commands) and reads (queries). Writes go to a model optimised for validation and consistency, and changes flow (often through events) into one or more **read models** optimised for specific queries: a search index, a denormalised view, a cache.

:::diagram 640x200 | CQRS with event sourcing. Commands append events, and projections build read-optimised views.
box c 20 30 90 40 "Commands" client
box q 20 140 90 40 "Queries" client
box w 160 30 120 40 "Write model" svc
box es 330 20 120 60 "Event store\n(append-only)" db
box pr 500 30 120 40 "Projectors" svc
box r1 330 135 120 50 "Read model\n(SQL view)" db
box r2 500 135 120 50 "Read model\n(search index)" store
arrow c w
arrow w es "append events"
arrow es pr "stream"
arrow pr r1
arrow pr r2
arrow q r1
:::

:::tradeoff Powerful but heavy
Event sourcing and CQRS shine in domains with complex rules, strict audit requirements or very different read and write patterns (finance, logistics, booking). For a simple CRUD application they add a lot of machinery and eventual consistency between writes and reads. Use them where they pay for themselves.
:::

## Choosing a style

| Situation | Sensible default |
|---|---|
| New product, small team, finding product–market fit | (Modular) monolith |
| Several teams blocking each other, parts with very different scaling needs | Extract microservices along domain boundaries |
| Spiky, event-triggered, short tasks | Serverless functions |
| Many independent reactions to business events | Event-driven with a message broker |
| Audit-critical domain, temporal queries | Event sourcing (+ CQRS) |

:::quiz
Q: Give three reasons a startup with five engineers should usually start with a monolith.
A: (1) It is simpler to build, test, debug and deploy, so the team moves faster. (2) Requirements and domain boundaries are still changing, and wrong service boundaries are expensive to fix. (3) It avoids distributed-systems costs: network failures, distributed transactions, tracing, and lots of infrastructure. A modular monolith keeps future extraction possible.

Q: What is a "distributed monolith" and what are its symptoms?
A: A system split into services that are still tightly coupled, so it has the operational costs of microservices without the independence. Symptoms: services must be deployed together; shared databases; long chains of synchronous calls where one failure breaks everything; changing one feature touches many services.

Q: What is the difference between event notification and event-carried state transfer?
A: Event notification sends a minimal "something changed" message, and consumers call the source to get details, so they stay coupled at runtime. Event-carried state transfer includes the relevant data in the event, so consumers can keep local copies and never call back. That is more decoupled and resilient, at the cost of larger events and duplicated data.

Q: In event sourcing, how is the current state of an account obtained, and why are snapshots used?
A: By replaying all of the account's events in order (deposits, withdrawals and so on) to compute the balance. Snapshots periodically save the computed state, so a rebuild starts from the latest snapshot and replays only later events instead of the entire history.
:::

# Microservices Patterns

Splitting a system into services trades in-process function calls for network calls. Network calls fail, slow down and time out. This chapter covers the patterns that make a fleet of services find each other, talk safely and survive each other's failures.

## Service discovery

Service instances come and go constantly (autoscaling, deploys, crashes), and their IP addresses change. How does the Order service find a healthy Payment instance?

- **Service registry:** instances register themselves (or are registered by the platform) in a registry such as Consul, etcd, ZooKeeper or Kubernetes' API, and send heartbeats. Instances that stop heartbeating are removed.
- **Client-side discovery:** the caller queries the registry and picks an instance itself (load balancing in the client library).
- **Server-side discovery:** the caller talks to a stable address (a load balancer or a DNS name like `payments.internal`), and the platform routes to a healthy instance. Kubernetes Services work this way.

:::diagram 640x200 | Service discovery: instances register with heartbeats, and callers resolve a name to healthy instances.
box reg 250 20 140 50 "Service registry" cache
box p1 470 90 140 34 "payments #1 10.0.1.4" svc
box p2 470 140 140 34 "payments #2 10.0.2.9" svc
box o 30 110 130 46 "Order service" svc
arrow p1 reg "heartbeat" dashed
arrow p2 reg "" dashed
arrow o reg "1 where is payments?"
arrow o p2 "2 call chosen instance"
:::

## Circuit breaker

When a dependency is failing, continuing to call it wastes threads waiting on timeouts, piles load onto a struggling service, and spreads the failure upstream. A **circuit breaker** wraps calls to a dependency and tracks failures.

:::diagram 640x200 | Circuit breaker states. An open breaker fails fast, and a half-open breaker sends trial requests to test recovery.
box cl 40 70 140 56 "CLOSED\ncalls flow normally" good
box op 460 70 140 56 "OPEN\nfail fast, no calls" bad
box hf 250 150 140 44 "HALF-OPEN\nallow a few trials" cache
arrow cl op "failure rate > threshold" off=-10
arrow op hf "after cool-down"
arrow hf cl "trials succeed"
arrow hf op "trial fails"
:::

- **Closed:** requests pass through and failures are counted.
- **Open:** after failures pass a threshold (say 50% over 20 calls), the breaker *trips*. Calls fail immediately or return a **fallback** (cached data, a default, a degraded response) without touching the dependency.
- **Half-open:** after a cool-down, a few trial requests go through. If they succeed, the breaker closes. If they fail, it opens again.

The breaker protects *the caller* (threads not wasted) and *the dependency* (given room to recover).

## Bulkhead

Named after a ship's watertight compartments: isolate resources so that one failure can't sink everything. Give each dependency its **own thread pool or connection pool**. If the slow recommendation service fills its 20-thread pool, calls to the payment service, with their own pool, carry on unaffected.

## Timeouts, retries and backoff (revisited)

Every remote call needs a **timeout**. Without one, a hung dependency hangs you too. Retries need **exponential backoff with jitter** and a cap. Retry only **idempotent** operations or those protected by idempotency keys. Set timeouts *end-to-end*: if the user-facing request has a 2-second budget, pass the remaining **deadline** down the call chain, so that deep services don't keep working on requests the caller has already abandoned.

:::pitfall Retry amplification across layers
If each of four service layers retries a failing call 3 times, one user request can become 3⁴ = **81** calls to the bottom service. Retry at one layer (usually closest to the failure, or at the edge), not at all of them.
:::

## Sidecar and service mesh

Cross-cutting networking concerns (mTLS, retries, timeouts, circuit breaking, metrics, tracing) used to be built into every service through libraries, one per language. A **sidecar** moves them into a separate proxy process deployed next to each service instance. All traffic flows through that proxy.

A **service mesh** (Istio, Linkerd, Consul Connect) is a fleet of sidecars (the **data plane**) managed by a central **control plane** that pushes routing rules, security policies and certificates to every proxy.

:::diagram 640x210 | A service mesh. Sidecar proxies handle the network concerns, and the control plane configures them all.
box cp 240 10 160 40 "Control plane" lb
box z1 30 80 250 110 "Pod: Order" zone
box a 50 110 100 50 "Order app" svc
box s1 165 110 100 50 "Sidecar\nproxy" cdn
box z2 360 80 250 110 "Pod: Payment" zone
box s2 375 110 100 50 "Sidecar\nproxy" cdn
box b 490 110 100 50 "Payment app" svc
arrow a s1 "localhost"
arrow s1 s2 "mTLS, retries, metrics"
arrow s2 b "localhost"
arrow cp s1 "config, certs" dashed
arrow cp s2 "" dashed
:::

**Benefits:** consistent security (automatic mTLS between all services), traffic control (canary routing, fault injection), and uniform telemetry, all without code changes. **Costs:** an extra network hop and some latency per call, more resource use, and significant operational complexity.

## Other essential patterns

**API composition / aggregator:** one service (or the gateway) calls several services and combines their responses for the client.

**Strangler fig:** migrate a monolith gradually. Put a routing layer in front, rebuild one feature at a time as a new service, route its traffic there, and repeat until the monolith can be retired. There is no big-bang rewrite.

:::diagram 640x170 | The strangler fig pattern: features move one by one from the monolith to new services behind a router.
box u 20 65 80 40 "Clients" client
box r 160 60 110 50 "Router /\nproxy" lb
box m 360 20 130 46 "Legacy monolith\n(shrinking)" bad
box n 360 105 130 46 "New services\n(growing)" good
arrow u r
arrow r m "/reports, /admin"
arrow r n "/orders, /users"
:::

**Database per service:** each service owns its data exclusively, and others get it through the service's API or events. This enables independent changes to schemas and technology, but cross-service queries need composition or CQRS views.

**Anti-corruption layer:** a translation layer between a new service and a legacy system (or external API), so that the legacy model doesn't leak into the clean new design.

**Health check API, externalised configuration, and centralised logging/tracing** (Chapter 24) are table stakes for operating services.

:::tip Bring patterns in by need
Name a pattern together with the failure it prevents: "Payment calls can hang when the provider has issues, so I'll add a 2-second timeout, a circuit breaker with a fallback that queues the payment for retry, and a separate connection pool (bulkhead) so checkout browsing isn't affected."
:::

:::quiz
Q: Describe the three states of a circuit breaker and the transitions between them.
A: Closed: calls go through and failures are tracked. When failures pass a threshold, it moves to Open: calls fail fast or use a fallback without contacting the dependency. After a cool-down it moves to Half-open: a limited number of trial calls go through. Success returns it to Closed; failure sends it back to Open.

Q: How does the bulkhead pattern prevent one slow dependency from causing a full outage?
A: Each dependency gets its own limited pool of resources (threads, connections). If one dependency becomes slow and fills its pool, only calls to that dependency are affected. Other dependencies keep their own pools, so the rest of the service keeps working instead of every thread getting stuck.

Q: What is a service mesh, and what are its trade-offs?
A: An infrastructure layer of sidecar proxies, one per service instance, that handle service-to-service networking: mTLS, retries, timeouts, load balancing, metrics and tracing. A central control plane configures them. Benefits: consistent security and observability without code changes, and fine-grained traffic control. Costs: added latency per hop, resource overhead, and substantial operational complexity.

Q: How would you migrate a large monolith to microservices without a risky big-bang rewrite?
A: Use the strangler fig pattern. Put a proxy or router in front of the monolith, pick one well-bounded capability, build it as a new service (with its own data, synchronised as needed), and route that capability's traffic to it. Repeat feature by feature, using anti-corruption layers at the boundaries, until the monolith is gone or reduced to a small core.
:::
