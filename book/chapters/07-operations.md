@part VII | Operating at Scale | Processing oceans of data, shipping changes safely many times a day, seeing inside running systems, and defending them against attackers.

# Big Data Processing

Online systems answer user requests in milliseconds. But organisations also need to process *all* their data: compute daily reports, train recommendation models, detect fraud patterns, rebuild search indexes. This chapter covers the two great families of data processing, **batch** and **stream**, and the architectures that combine them.

## OLTP vs. OLAP

| | OLTP (transactional) | OLAP (analytical) |
|---|---|---|
| Typical query | Read/write a few rows by key | Aggregate millions to billions of rows |
| Users | End users via the application | Analysts, dashboards, ML pipelines |
| Latency | Milliseconds | Seconds to hours |
| Data | Current state | Historical, append-mostly |
| Storage layout | Row-oriented | **Column-oriented** |
| Examples | PostgreSQL, MySQL, DynamoDB | Snowflake, BigQuery, Redshift, ClickHouse |

**Column-oriented storage** keeps each column's values together. A query like `SELECT avg(price) FROM sales WHERE year = 2026` reads only the `price` and `year` columns instead of every whole row, and similar values packed together compress dramatically (often 10x). This is why analytical warehouses are columnar.

## Batch processing and MapReduce

**Batch processing** runs a job over a large, *bounded* dataset (yesterday's logs, the full user table) and produces output. Throughput matters more than latency.

**MapReduce** made large-scale batch processing accessible by expressing jobs in two functions that the framework runs in parallel over thousands of machines:

1. **Map:** read input records and emit key-value pairs. (For word count: each word → `(word, 1)`.)
2. **Shuffle:** the framework groups all values by key, sorting and moving data across the network, so each key's values land on one reducer.
3. **Reduce:** process each key's values. (Sum the 1s → `(word, total)`.)

:::diagram 640x240 | MapReduce word count. Mappers run in parallel over input splits, the shuffle groups by key, and reducers aggregate.
box i1 10 30 110 36 "split 1: 'a b a'" store
box i2 10 100 110 36 "split 2: 'b c'" store
box i3 10 170 110 36 "split 3: 'a c c'" store
box m1 170 30 100 36 "map" svc
box m2 170 100 100 36 "map" svc
box m3 170 170 100 36 "map" svc
box sh 320 85 100 66 "shuffle\n& sort\nby key" queue
box r1 470 30 150 36 "reduce: a → 3" good
box r2 470 100 150 36 "reduce: b → 2" good
box r3 470 170 150 36 "reduce: c → 3" good
arrow i1 m1
arrow i2 m2
arrow i3 m3
arrow m1 sh "(a,1)(b,1)(a,1)" lx=-5
arrow m2 sh
arrow m3 sh
arrow sh r1
arrow sh r2
arrow sh r3
:::

The framework takes care of the hard parts: **data locality** (running map tasks on the machines that hold the data), **fault tolerance** (re-running failed tasks, which works because inputs are immutable and tasks are deterministic), and **scheduling**.

MapReduce writes intermediate results to disk between stages, which is robust but slow for multi-step jobs. **Apache Spark** keeps intermediate data in memory and models jobs as a graph of transformations over distributed datasets (RDDs and DataFrames), recovering lost partitions by recomputing them from their lineage. It is often 10–100x faster for iterative and multi-stage work, and it has largely replaced classic MapReduce.

## Data warehouses, lakes and lakehouses

- **Data warehouse:** structured, cleaned, schema-on-write data in a columnar store, optimised for SQL analytics and BI. Reliable and fast to query, but costly and rigid for raw or unstructured data.
- **Data lake:** cheap object storage holding *raw* data of every kind (logs, JSON, images, Parquet files), with schema-on-read. Flexible and cheap, but without discipline it becomes a "data swamp".
- **Lakehouse:** open table formats (Apache Iceberg, Delta Lake, Hudi) add warehouse features (ACID transactions, schema enforcement, time travel, efficient updates) on top of lake storage, so one copy of the data serves both BI and ML.

**ETL vs. ELT:** traditionally data was *Extracted, Transformed, then Loaded* into the warehouse. With cheap, scalable warehouses, it is now common to *Extract, Load* raw data first, then *Transform* inside the warehouse with SQL.

## Stream processing

**Stream processing** handles *unbounded* data continuously, as events arrive: fraud detection within seconds of a card swipe, live dashboards, real-time recommendations, alerting. Engines include **Apache Flink**, Kafka Streams and Spark Structured Streaming, usually reading from a log such as Kafka.

Key concepts:

- **Event time vs. processing time.** *Event time* is when something happened (the timestamp on the phone). *Processing time* is when the system sees it. Events arrive late and out of order (a phone offline in a tunnel), so correct results need event time.
- **Windows** group the unbounded stream into finite chunks: *tumbling* (fixed, non-overlapping: every minute), *sliding* (overlapping: the last 5 minutes, updated every minute), *session* (activity separated by gaps of inactivity).
- **Watermarks** declare "we believe all events up to time T have arrived". They let a window close and emit results while bounding how long to wait for latecomers. Events later than that go to a side output or update an earlier result.
- **State and checkpoints.** Operators keep state (counts, joins). Engines like Flink periodically snapshot state together with input offsets, so after a failure they restore and replay, achieving *exactly-once state updates*.

:::diagram 640x170 | Tumbling vs. sliding windows over the same event stream.
line 30 50 620 50 "" noarrow
text 330 30 "● ●  ●   ● ● ●  ●    ●  ● ●   ●  ●" accent
box t1 30 70 145 30 "tumbling 0–1m" svc
box t2 175 70 145 30 "1–2m" svc
box t3 320 70 145 30 "2–3m" svc
box t4 465 70 145 30 "3–4m" svc
box s1 30 115 290 22 "sliding: last 2m @ t=2m" cache
box s2 175 140 290 22 "sliding: last 2m @ t=3m" cache
:::

## Lambda and Kappa architectures

**Lambda architecture** runs two paths side by side: a *batch layer* that periodically recomputes accurate views from all historical data, and a *speed layer* that processes recent events in real time for fresh but approximate results. A serving layer merges the two. It is accurate and fresh, but you maintain the same logic in two systems.

**Kappa architecture** uses *only* a stream processor over a replayable log. To recompute (after fixing a bug, say), you replay the log from the beginning into a new version of the job. One codebase, simpler operations. It depends on long log retention and a capable stream engine.

:::diagram 640x220 | Lambda (batch + speed layers) versus Kappa (one streaming path over a replayable log).
box z1 10 10 300 200 "Lambda" zone
box s 25 95 60 40 "Events" queue
box b 120 40 90 36 "Batch layer" svc
box sp 120 150 90 36 "Speed layer" svc
box sv 235 95 65 40 "Serving" db
arrow s b
arrow s sp
arrow b sv
arrow sp sv
box z2 330 10 300 200 "Kappa" zone
box log 345 95 80 40 "Replayable\nlog" queue
box st 455 95 80 40 "Stream\nprocessor" svc
box sv2 560 95 60 40 "Serving" db
arrow log st
arrow st sv2
text 480 160 "reprocess = replay log" small muted
:::

:::quiz
Q: Why are analytical databases usually column-oriented?
A: Analytical queries typically aggregate a few columns across huge numbers of rows. Columnar storage reads only the columns a query needs (far less I/O), and values of one type stored together compress extremely well. That allows vectorised processing and large speed-ups over row stores for these workloads.

Q: Explain the map, shuffle and reduce phases using the example of counting page views per URL from log files.
A: Map: each mapper reads part of the logs and emits `(url, 1)` for each page view. Shuffle: the framework groups all pairs by URL and sends each URL's values to one reducer (sorting by key). Reduce: each reducer sums the values for its URLs and outputs `(url, total_views)`.

Q: What is the difference between event time and processing time, and why do watermarks exist?
A: Event time is when the event actually happened. Processing time is when the system processes it. Network delays and offline devices make events arrive late and out of order, so windows based on processing time give wrong results. A watermark estimates how far event time has progressed ("all events before T have probably arrived"), so the engine knows when to close a window while bounding how long it waits for late data.

Q: What is the main drawback of the Lambda architecture that Kappa tries to fix?
A: Lambda needs the same business logic implemented and maintained in two different systems (batch and streaming), and the two must give consistent results, which doubles the complexity. Kappa uses a single stream-processing codebase and recomputes by replaying the log.
:::

# Deployment and Release Engineering

The fastest-moving engineering organisations deploy hundreds of times a day, *and* have fewer outages than those that deploy monthly. The secret isn't heroics. It is small changes, automation, and release strategies that limit the blast radius when something goes wrong.

## CI/CD pipelines

- **Continuous Integration (CI):** every change is merged to the main branch frequently and automatically built and tested (unit tests, linters, static analysis, security scans). Integration problems are caught within minutes, not at the end of a release cycle.
- **Continuous Delivery:** every change that passes the pipeline is *deployable*, and releasing is a button press.
- **Continuous Deployment:** every passing change goes to production automatically.

:::diagram 640x130 | A typical CI/CD pipeline. Each stage is a gate, and a failure stops the change before production.
box c 10 45 80 40 "Commit" client
box b 110 45 80 40 "Build" svc
box t 210 45 80 40 "Test" svc
box a 310 45 80 40 "Artifact\n(image)" store
box s 410 45 80 40 "Staging" svc
box p 510 45 110 40 "Production\n(progressive)" good
arrow c b
arrow b t
arrow t a
arrow a s
arrow s p
:::

Build an **immutable artifact** (a container image tagged with the commit hash) once, and promote *that same artifact* through every environment. Never rebuild for production. Keep environments as similar as possible, and define infrastructure as code (Terraform, Kubernetes manifests) so environments are reproducible and changes are reviewed like code.

## Deployment strategies

### Recreate

Stop the old version, start the new one. Simple, but there is downtime. Acceptable only for internal or non-critical tools.

### Rolling deployment

Replace instances a few at a time (say 10% per step), waiting for health checks before continuing. There is no downtime and no extra capacity needed. But two versions run side by side during the rollout (so they must be compatible), and rollback is another rolling deploy.

### Blue-green deployment

Run two complete environments. **Blue** serves production while **green** gets the new version and is tested. Then switch the router so that all traffic goes to green. Rollback is instant: switch back. It costs double the capacity during the switch, and database changes must work with both versions.

:::diagram 640x200 | Blue-green deployment. Traffic switches all at once, and rollback is flipping it back.
box u 20 80 80 40 "Users" client
box r 160 75 100 50 "Router" lb
box bl 360 20 150 56 "BLUE (v1)\nidle, kept for rollback" svc
box gr 360 120 150 56 "GREEN (v2)\nlive" good
arrow u r
arrow r gr "100% traffic" accent
arrow r bl "standby" dashed
:::

### Canary release

Route a *small* percentage of real traffic (1% → 5% → 25% → 100%) to the new version while closely comparing its error rate, latency and business metrics against the old version. If the metrics get worse, roll back automatically. Only a small fraction of users ever see a bad release. It needs good observability and traffic-splitting infrastructure.

:::diagram 640x170 | Canary release. A small slice of traffic tests the new version, and the share grows only while its metrics stay healthy.
box u 20 65 80 40 "Users" client
box r 160 60 100 50 "Router" lb
box v1 360 20 140 46 "v1 (stable)" svc
box v2 360 105 140 46 "v2 (canary)" cache
box m 540 60 90 50 "Compare\nmetrics" note
arrow u r
arrow r v1 "95%"
arrow r v2 "5%"
arrow v2 m "" dashed
:::

### Shadow (dark) launch

Copy real production traffic to the new version, but *throw away its responses*. Users are unaffected, and you see how the new code behaves under real load. Be careful with side effects: shadowed requests must never send emails or charge cards.

| Strategy | Downtime | Rollback speed | Extra capacity | Risk exposure |
|---|---|---|---|---|
| Recreate | Yes | Slow | None | All users |
| Rolling | No | Medium | Minimal | Grows gradually |
| Blue-green | No | Instant | 2x | All users at the switch |
| Canary | No | Fast | Small | Small slice first |
| Shadow | No | N/A | Extra | None (responses discarded) |

## Feature flags

**Feature flags** (toggles) separate *deploying* code from *releasing* features. New code ships turned off behind a flag, and is then switched on gradually for internal users, beta testers, a percentage of users or particular regions, all without a deploy. Flags allow trunk-based development, A/B testing, instant kill switches for misbehaving features, and gradual rollouts.

:::pitfall Flag debt
Every flag doubles the number of code paths to reason about and test. Flags left in place for months make code tangled and fragile. Give release flags an owner and an expiry date, and delete them once the rollout is complete.
:::

## Database migrations without downtime

Code can roll back in seconds. Schema changes can't. Use the **expand–contract** (parallel change) pattern so that every step is compatible with both the old and new code:

1. **Expand:** add the new column or table (nullable, with no constraints that old code would break).
2. **Dual-write:** deploy code that writes both old and new structures. Backfill existing rows in batches.
3. **Switch reads** to the new structure, and verify.
4. **Contract:** stop writing the old structure, then drop it in a later release.

Never rename or drop a column in the same release that stops using it, and run large backfills in throttled batches so they don't lock tables or overload replication.

:::tip Talk about the blast radius
"Deploys go out through a canary in one region at 1%, with automatic rollback on SLO regression, then progressively to all regions. Risky features sit behind flags. Schema changes follow expand–contract, so any single deploy can be rolled back on its own."
:::

:::quiz
Q: Compare blue-green and canary deployments. When would you prefer each?
A: Blue-green switches all traffic at once between two full environments. Rollback is instant, but every user is exposed at the switch and it needs double capacity. Canary sends a small, growing percentage of traffic to the new version while comparing metrics, which limits how many users a bad release reaches, but it needs traffic splitting and solid observability. Prefer canary for high-traffic user-facing services. Blue-green suits simpler setups, or cases where both versions can't serve side by side.

Q: What does it mean to separate "deploy" from "release"? Which tool enables it?
A: Deploying puts code on production servers. Releasing exposes a feature to users. Feature flags let new code be deployed switched off and then turned on gradually (or turned off instantly) without another deploy.

Q: You need to rename the column `fullname` to `display_name` with zero downtime. Outline the steps.
A: Expand–contract: (1) add the `display_name` column; (2) deploy code that writes both columns; (3) backfill `display_name` from `fullname` in batches; (4) deploy code that reads `display_name`, still writing both; (5) deploy code that writes only `display_name`; (6) in a later release, drop `fullname`. Each step is compatible with the code before and after it, so any deploy can be rolled back.
:::

# Observability

You can't fix what you can't see. **Monitoring** tells you *whether* something is wrong. **Observability** is the ability to work out *why*, including for failures you never anticipated, from the signals the system emits. The three classic pillars are **logs**, **metrics** and **traces**.

## Logs

Logs are timestamped records of discrete events: "user 42 logged in", "payment 9f2 failed: card declined".

- **Structured logging:** emit JSON with consistent fields (`timestamp`, `level`, `service`, `trace_id`, `user_id`, `message`) rather than free text, so logs can be searched, filtered and aggregated by machines.
- **Centralised aggregation:** ship logs from every instance to a central system (an ELK/OpenSearch stack, Loki, a managed service). Instances are ephemeral, so local log files disappear with them.
- **Levels and sampling:** DEBUG, INFO, WARN, ERROR. At high volume, sample routine logs, but keep every error.
- **Never log secrets** (passwords, tokens, full card numbers), and be careful with personal data.

## Metrics

Metrics are numeric measurements aggregated over time: request rate, error count, latency histogram, CPU usage, queue depth. They are cheap to store and fast to query, which makes them ideal for dashboards and alerts.

- **Counter:** only goes up (total requests, total errors). Graph its *rate*.
- **Gauge:** goes up and down (memory in use, queue depth, active connections).
- **Histogram:** distribution of values in buckets (request latency), from which percentiles are computed.

Two widely used checklists of what to measure:

- **RED** (for services): **R**ate (requests/s), **E**rrors (failed requests/s), **D**uration (latency distribution).
- **USE** (for resources): **U**tilisation, **S**aturation (queued work), **E**rrors.
- The **four golden signals**: latency, traffic, errors, saturation.

:::pitfall Cardinality explosions
Each unique combination of metric labels is a separate time series. Labelling a metric with `user_id` or `request_id` creates millions of series and can bring down your metrics system. Keep labels low-cardinality (endpoint, status code, region). High-cardinality detail belongs in logs and traces.
:::

## Distributed tracing

In a microservices system, one user request may touch twenty services. Logs show each service's part separately, but nothing ties them together. **Distributed tracing** follows a request across services.

- A **trace** represents one end-to-end request and has a unique **trace ID**.
- It is made of **spans**, timed operations (an HTTP call, a database query), each with a span ID, a parent span ID, timing and attributes.
- The trace context is **propagated** in request headers (the W3C `traceparent` standard) from service to service.
- **OpenTelemetry** is the vendor-neutral standard for producing traces, metrics and logs, and backends such as Jaeger, Zipkin or Tempo store and visualise them.

:::diagram 640x210 | A trace as a waterfall of spans. Each bar is an operation, and nesting shows which call caused which, making the slow span obvious.
text 20 25 "trace 7f3a… GET /checkout (480 ms)" bold start
box s1 20 40 600 24 "gateway  480ms" lb
box s2 40 72 560 24 "checkout-service  450ms" svc
box s3 60 104 120 24 "auth  40ms" svc
box s4 190 104 380 24 "payment-service  360ms  ← slow" bad
box s5 210 136 330 24 "external card API  330ms" cache
box s6 60 168 100 24 "db read 20ms" db
:::

Traces answer questions like "why is checkout slow for users in Brazil?" by showing exactly which hop takes the time. Because tracing every request is expensive, systems **sample**: *head-based* sampling decides at the start (keep 1%), while *tail-based* sampling decides after the request finishes, keeping all slow or failed traces.

:::key Correlate the three pillars
Put the `trace_id` in every log line. Then an alert on a metric (error rate up) leads to example traces (which requests failed, and where), which lead to the exact logs for those requests. Signals that are linked like this are what turn monitoring into observability.
:::

## Alerting

- **Alert on symptoms, not causes.** Page a human when *users are affected* (the error-rate SLO is burning, latency is above target), not because CPU hit 80%, which may be perfectly fine.
- **SLO burn-rate alerts:** alert when the error budget is being consumed fast enough to run out soon, with fast-burn alerts that page and slow-burn alerts that open a ticket.
- **Every page must be actionable and urgent.** Noisy alerts train people to ignore them ("alert fatigue").
- Each alert should link to a **runbook** describing diagnosis and mitigation steps.

## Incidents and learning

When things break: detect, assign an **incident commander**, communicate status, mitigate first (roll back, fail over, shed load), and only then find the root cause. Afterwards, write a **blameless post-mortem**: a timeline, contributing factors, what went well, and concrete action items. The goal is to improve the *system*, not to blame people.

:::quiz
Q: What is the difference between a counter, a gauge and a histogram? Give an example of each.
A: A counter only increases (total HTTP requests served); you look at its rate. A gauge rises and falls (current queue depth, memory usage). A histogram records the distribution of observations in buckets (request latency), allowing percentiles like p99.

Q: Why shouldn't `user_id` be a label on a metric?
A: Each distinct label value creates a separate time series. Millions of users would mean millions of series, which explodes the metrics system's memory, storage and query cost (a cardinality explosion). Per-user detail belongs in logs and traces.

Q: How does distributed tracing link work across many services into one picture?
A: The first service creates a trace ID and a root span, and each downstream call carries the trace context in headers. Every service records spans (timed operations with parent span IDs) tagged with that trace ID. The tracing backend assembles all spans with the same trace ID into a tree, or waterfall, showing the whole request path and where the time went.

Q: Why is "alert on symptoms, not causes" a good principle?
A: Symptoms (high error rate, high latency, SLO burn) directly reflect user impact and are always worth waking someone up for. Causes (high CPU, one node down) often have no user impact in a redundant system, which creates noisy pages and alert fatigue. Cause-level signals are better on dashboards and for diagnosis.
:::

# Security at Scale

Security isn't a feature you add at the end. It is a property of the whole design. This chapter covers the essential concepts that come up in system design: protecting data in transit and at rest, managing secrets, controlling access, and defending against common attacks.

## Principles

- **Defence in depth:** multiple independent layers (network controls, authentication, authorisation, encryption, monitoring), so that one failure isn't a breach.
- **Least privilege:** every user, service and key gets the minimum access it needs, and no more.
- **Zero trust:** don't trust a request because it comes from "inside the network". Authenticate and authorise every request, service-to-service calls included.
- **Secure by default:** safe defaults (encryption on, ports closed, public access off) that must be explicitly relaxed.
- **Minimise the attack surface:** expose as few endpoints, ports and dependencies as possible.

## Encryption in transit: TLS and mTLS

All network traffic, internal included, should be encrypted with **TLS**. During the handshake, the server proves its identity with a **certificate** (its public key, signed by a certificate authority the client trusts). The two sides then agree on symmetric session keys using an ephemeral key exchange, which gives **forward secrecy**: even if the server's private key leaks later, past sessions can't be decrypted.

**Mutual TLS (mTLS)** has *both* sides present certificates. It is the standard way to authenticate services to each other in a zero-trust network, and service meshes automate it by issuing short-lived certificates to every workload.

:::diagram 640x200 | A TLS 1.3 handshake in outline. Asymmetric crypto establishes trust and a shared key, then fast symmetric encryption carries the data.
box c 30 20 100 34 "Client" client
box s 510 20 100 34 "Server" svc
line 80 60 80 195 "" noarrow dashed
line 560 60 560 195 "" noarrow dashed
line 80 75 560 90 "ClientHello + key share"
line 560 105 80 120 "ServerHello + key share + certificate + Finished"
line 80 140 560 155 "verify cert chain → Finished"
line 80 175 560 185 "encrypted application data (AES-GCM / ChaCha20)" accent
:::

## Encryption at rest

Data on disks, in databases, backups and object storage should be encrypted, so that stolen disks or misconfigured snapshots don't leak it. The standard approach is **envelope encryption**: data is encrypted with a *data key*, and the data key is itself encrypted with a *master key* held in a **key management service (KMS)** or hardware security module (HSM) that never exports it. Rotating the master key re-wraps the data keys without re-encrypting all the data.

For particularly sensitive fields (national IDs, card numbers), add **application-level** or field-level encryption, or **tokenisation**: replace the value with a meaningless token and keep the real value in a separate, tightly controlled vault.

## Secrets management

Passwords, API keys, database credentials and private keys must **never** sit in source code, container images or plain config files.

- Store them in a **secrets manager** (HashiCorp Vault, AWS Secrets Manager, Kubernetes secrets with encryption).
- Inject them at runtime, scoped to the services that need them, with every access audited.
- **Rotate** them regularly and automatically. Prefer **short-lived, dynamically generated credentials** (Vault issuing a database login valid for 1 hour) over long-lived static ones.
- Scan repositories for leaked secrets, and revoke immediately on exposure.

## Identity and access control

Chapter 9 covered authentication (sessions, JWTs, OAuth 2.0/OIDC) and authorisation models (RBAC, ABAC, ReBAC). At organisational scale:

- **Single sign-on (SSO):** users authenticate once with a central identity provider and reach many applications. Enterprise SSO uses **SAML** (XML-based assertions, common in older enterprise apps) or **OIDC** (JSON/JWT-based, modern).
- **Multi-factor authentication (MFA):** something you know + something you have (a TOTP app, a hardware key) + something you are. Phishing-resistant factors (FIDO2/WebAuthn passkeys) stop most account-takeover attacks.
- **Workload identity:** services get cryptographic identities (SPIFFE IDs, cloud IAM roles) instead of shared passwords.

## Common attacks and defences

| Attack | What happens | Defences |
|---|---|---|
| SQL / command injection | Untrusted input executed as code | Parameterised queries, input validation, least-privilege DB users |
| Cross-site scripting (XSS) | Attacker's script runs in victims' browsers | Output encoding, Content Security Policy, HttpOnly cookies |
| Cross-site request forgery (CSRF) | Victim's browser makes unwanted authenticated requests | SameSite cookies, CSRF tokens |
| Broken object-level authorisation | User reads others' data by changing an ID | Check ownership on every object access |
| Credential stuffing | Leaked passwords tried at scale | Rate limiting, MFA, breached-password checks, bot detection |
| SSRF | Server tricked into calling internal URLs | Allow-lists for outbound requests, block metadata endpoints |
| DDoS | Traffic floods exhaust resources | CDN/edge absorption, anycast, rate limiting, autoscaling, WAF |
| Supply chain | Malicious or vulnerable dependency | Pinning, signature verification, SBOMs, dependency scanning |

## DDoS protection

Distributed denial-of-service attacks flood a system with traffic from many sources. **Volumetric** attacks (hundreds of Gbps of UDP floods) are absorbed by the huge capacity of CDN and anycast networks. **Protocol** attacks (SYN floods) are mitigated by edge devices and SYN cookies. **Application-layer** attacks (floods of expensive-looking HTTP requests) need a **web application firewall (WAF)**, rate limiting, bot detection and caching. Design so that the origin is never directly reachable, and all traffic passes through the protective edge.

## Auditing, privacy and compliance

- Keep **immutable audit logs** of security-relevant actions (who accessed what, when, from where).
- Practise **data minimisation:** don't collect or keep what you don't need, and set retention limits.
- Regulations (GDPR, HIPAA, PCI-DSS, SOC 2) affect architecture: data residency (keeping EU data in the EU), the right to deletion (you must be able to find and delete a user's data, including derived copies and backups within set timelines), and strict separation of cardholder data.

:::tip Security in a design interview
Mention it briefly but concretely: "TLS everywhere with mTLS between services; secrets in a vault with rotation; encryption at rest with KMS; authentication at the gateway with short-lived JWTs; object-level authorisation inside each service; WAF and rate limiting at the edge; audit logs for admin actions."
:::

:::quiz
Q: What is mutual TLS, and why is it used between microservices?
A: In mTLS, both client and server present and verify certificates, so each side cryptographically authenticates the other, and the traffic is encrypted. Between microservices it provides zero-trust service identity: a service accepts calls only from authenticated workloads, not just from anything on the internal network. Service meshes usually automate certificate issuance and rotation.

Q: Explain envelope encryption and its advantage.
A: Data is encrypted with a data encryption key (DEK). The DEK is encrypted ("wrapped") with a key encryption key (master key) held in a KMS or HSM, and only the wrapped DEK is stored with the data. The master key never leaves the KMS, access can be tightly controlled and audited, and rotating the master key only means re-wrapping the small DEKs, not re-encrypting all the data.

Q: Why are short-lived dynamic credentials preferable to long-lived static secrets?
A: If they leak, they expire quickly, which limits the damage. Each workload can get unique credentials, so access is attributable and revocable individually. Rotation is built in rather than a risky manual chore. Static secrets tend to get copied, shared and forgotten, and stay valid for years.

Q: A user changes `/api/orders/1001` to `/api/orders/1002` and sees someone else's order. What vulnerability is this, and how do you fix it?
A: Broken object-level authorisation (also called IDOR, insecure direct object reference). Fix it by checking, on every request in the service that owns the data, that the authenticated user is allowed to access that specific object (for example, that the order belongs to them or that they have an appropriate role). Unguessable IDs alone are not a fix.
:::
