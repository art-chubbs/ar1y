@part IV | Storing Data | Choosing the right database, making queries fast, keeping copies in sync, splitting data across machines, and storing files at petabyte scale.

# Choosing a Database

The database is usually the hardest part of a system to change later. Application servers are interchangeable and caches can be rebuilt, but data lasts, and migrating it is slow and risky. Choose with care.

## Relational databases

Relational databases (PostgreSQL, MySQL, SQL Server, Oracle) store data in **tables** of rows and columns with a fixed **schema**, link tables through **foreign keys**, and query them with **SQL**, including **joins** across tables.

Their great strength is **ACID transactions**:

- **Atomicity:** a transaction's changes all happen or none do. A transfer never debits one account without crediting the other.
- **Consistency:** a transaction moves the database from one valid state to another, respecting constraints such as uniqueness and foreign keys. (This is a different "C" from CAP.)
- **Isolation:** concurrent transactions don't see each other's partial work. They behave as if run in some order, to a degree set by the *isolation level*.
- **Durability:** once committed, changes survive crashes. They are written to a write-ahead log on disk before the commit is acknowledged.

### Isolation levels and anomalies

| Level | Prevents | Still allows |
|---|---|---|
| Read uncommitted | (almost nothing) | Dirty reads |
| Read committed | Dirty reads | Non-repeatable reads, lost updates |
| Repeatable read / snapshot | Non-repeatable reads | Write skew (in snapshot isolation) |
| Serializable | All of the above | (none: behaves like serial execution) |

Higher isolation is safer but has lower concurrency. Many databases default to *read committed*, so know what your database actually guarantees.

:::example A lost update
Two requests read a counter (value 10) at the same time, each add 1 and each write 11. One increment is lost. Fixes: an atomic update (`UPDATE … SET n = n + 1`), a row lock (`SELECT … FOR UPDATE`), optimistic concurrency (`UPDATE … WHERE version = 7`, retrying if no row matched), or serializable isolation.
:::

## NoSQL families

"NoSQL" covers several data models, each giving up some relational features to gain scale, flexibility or performance for a particular access pattern.

**Key-value stores** (Redis, DynamoDB, Riak) work like a giant hash map: `get(key)` and `put(key, value)`. They are extremely fast and scale horizontally by partitioning on the key. They suit sessions, caches, carts, feature flags, and anything you look up by ID.

**Document stores** (MongoDB, Couchbase, Firestore) hold JSON-like documents with nested structure and flexible schemas. A whole aggregate (a user with their addresses and preferences) is stored and fetched together, so no joins are needed. They suit content, catalogues and user profiles.

**Wide-column stores** (Cassandra, HBase, Bigtable, ScyllaDB) hold rows identified by a partition key, with a sorted, sparse set of columns within each partition. They are built for massive write throughput and huge datasets spread across many nodes. They suit time series, messaging, activity logs and IoT data, where you query by partition key and a range within it.

**Graph databases** (Neo4j, Neptune) store nodes and edges as first-class citizens, so following relationships is cheap. They suit social graphs, recommendations, fraud rings and knowledge graphs: queries like "friends of friends who like X".

Other specialists: **time-series databases** (InfluxDB, TimescaleDB) for metrics; **search engines** (Elasticsearch, OpenSearch) for full-text search with inverted indexes; **vector databases** for similarity search on embeddings; **NewSQL** (Spanner, CockroachDB) for SQL and ACID with horizontal scaling.

:::diagram 640x210 | The same "user with orders" data in three models.
box z1 10 10 200 190 "Relational" zone
box t1 25 40 170 40 "users(id, name)" db
box t2 25 120 170 40 "orders(id, user_id, total)" db
arrow t1 t2 "FK join"
box z2 220 10 200 190 "Document" zone
box d1 235 40 170 140 "{ id: 42,\n  name: 'Ana',\n  orders: [\n   {id: 9, total: 30},\n   {id: 11, total: 12}\n  ] }" store
box z3 430 10 200 190 "Wide-column" zone
box w1 445 40 170 140 "partition: user#42\n────────────\norder#2025-01 → 30\norder#2025-03 → 12\n(sorted by key)" store
:::

## SQL vs. NoSQL: how to decide

| Choose relational when… | Choose NoSQL when… |
|---|---|
| Data is relational, with many-to-many links | Access is by key or a simple pattern |
| You need multi-row ACID transactions | You need huge horizontal write scale |
| Queries are ad hoc and change over time | Queries are known and fixed in advance |
| Strong consistency and constraints matter | Flexible or rapidly evolving schemas |
| Data fits on one large node (or a few shards) | Data is many TB to PB across regions |

:::key Model around your queries
In relational design, you normalise the data and let queries join it. In NoSQL design, especially wide-column and key-value, you start from the **access patterns** and shape (often duplicate) the data so that each query reads one partition. List your queries *before* choosing a store.
:::

:::tip The default answer
"I'll start with PostgreSQL: it's mature, gives me transactions and flexible queries, and scales vertically a long way, plus read replicas. If a specific workload outgrows it, such as a 1M-writes/sec activity log, I'll move that workload to a store designed for it, like Cassandra." Using several stores in one system, each suited to its job, is called **polyglot persistence**.
:::

## Normalisation vs. denormalisation

**Normalisation** stores each fact once (user names live only in `users`), which avoids update anomalies but needs joins. **Denormalisation** copies data to where it is read (each `order` row also stores `user_name`), making reads fast and join-free at the cost of extra storage and the work of keeping copies in sync. Read-heavy systems at scale denormalise deliberately, often keeping the copies up to date asynchronously via events.

:::quiz
Q: Explain each letter of ACID in one sentence.
A: Atomicity: all of a transaction's changes happen or none do. Consistency: transactions keep the database valid with respect to its constraints. Isolation: concurrent transactions don't see each other's partial work and behave as if run in some order. Durability: committed data survives crashes because it is persisted (usually through a write-ahead log) before the commit is acknowledged.

Q: Which database type would you pick for: (a) a shopping cart; (b) friend-of-friend recommendations; (c) billions of IoT sensor readings per day; (d) an accounting ledger?
A: (a) Key-value or document store (accessed by user ID; simple and fast). (b) Graph database (relationship traversal). (c) Wide-column or time-series store (huge write throughput, queries by device and time range). (d) Relational database (multi-row ACID transactions, constraints, auditability).

Q: Two concurrent requests each increment a stock counter from 10, and the result is 11 instead of 12. Name this anomaly and two ways to prevent it.
A: A lost update. Prevent it with an atomic in-database update (`SET n = n + 1`), pessimistic locking (`SELECT … FOR UPDATE`), optimistic concurrency control (a version column with a conditional update and retry), or a stronger isolation level.
:::

# Indexing and Replication

This chapter covers two techniques every database relies on: **indexes**, which make reads fast, and **replication**, which keeps copies of data for availability and read scale.

## Why indexes?

Without an index, finding rows where `email = 'ana@x.com'` means a **full table scan**: reading every row. With 100 million rows, that takes seconds. An index is an auxiliary data structure that maps column values to row locations, turning a scan into a lookup that touches a handful of pages.

## B-tree indexes

The **B-tree** (strictly, the B+tree) is the default index in nearly every relational database. It is a balanced tree of fixed-size pages, each holding hundreds of sorted keys, so even billions of rows need only 3–4 levels. Leaf pages are linked, which makes **range scans** (`WHERE created_at BETWEEN …`) efficient.

:::diagram 640x210 | A B+tree. Each page holds many keys, so a lookup in a billion rows touches only 3–4 pages. Linked leaves make range scans fast.
box root 260 15 120 36 "[ 40 | 80 ]" svc
box i1 70 85 120 36 "[ 10 | 25 ]" svc
box i2 260 85 120 36 "[ 50 | 65 ]" svc
box i3 450 85 120 36 "[ 90 | 120 ]" svc
box l1 20 160 90 34 "1…9" store
box l2 125 160 90 34 "10…24" store
box l3 230 160 90 34 "40…49" store
box l4 335 160 90 34 "50…64" store
box l5 440 160 90 34 "80…89" store
box l6 545 160 85 34 "90…119" store
arrow root i1
arrow root i2
arrow root i3
arrow i1 l1
arrow i1 l2
arrow i2 l3
arrow i2 l4
arrow i3 l5
arrow i3 l6
line 110 200 125 200 "" noarrow
line 320 200 335 200 "" noarrow
text 320 205 "leaf pages are linked → efficient range scans" small muted
:::

## LSM trees

**Log-structured merge trees** (used by Cassandra, RocksDB, LevelDB, HBase) optimise for *writes*. A write goes to an in-memory sorted buffer (the **memtable**) and to an append-only log for durability. When the memtable fills, it is flushed to disk as an immutable sorted file (an **SSTable**). Background **compaction** merges SSTables and throws away overwritten values. Reads check the memtable, then the SSTables from newest to oldest, helped by a **Bloom filter** per file that skips files which can't contain the key.

| | B-tree | LSM tree |
|---|---|---|
| Writes | In-place page updates (random I/O) | Sequential appends (fast) |
| Reads | Fast, predictable | May check several files (Bloom filters help) |
| Write amplification | Moderate | From compaction |
| Space | Some fragmentation | Better compression |
| Typical use | OLTP relational databases | Write-heavy, large-scale stores |

## Other index types

- **Hash index:** O(1) equality lookups. No range queries.
- **Composite index** on `(a, b, c)`: serves queries filtering on `a`, `a,b` or `a,b,c` (the *leftmost prefix* rule), but not on `b` alone.
- **Covering index:** contains every column a query needs, so the table itself is never read ("index-only scan").
- **Inverted index:** maps each *term* to the list of documents containing it. It is the core of full-text search.
- **Geospatial index** (R-tree, geohash, S2): "find points near me" (Chapter 21).

:::tradeoff Every index taxes every write
Each index must be updated on every insert, update and delete, and it takes disk and memory. Index the columns you actually filter, join and sort on, guided by your real query patterns and the database's `EXPLAIN` plans, not every column "just in case".
:::

## Replication: why keep copies?

1. **High availability:** if one node dies, another has the data.
2. **Read scaling:** spread reads across replicas.
3. **Lower latency:** place replicas near users in several regions.
4. **Disaster recovery:** survive the loss of a whole data centre.

## Single-leader replication

One node, the **leader** (primary), accepts all writes. It sends its change stream to **followers** (replicas), which apply the changes in order. Reads can go to any replica.

:::diagram 640x220 | Single-leader replication: writes go to the leader and flow to followers, and reads spread across all of them.
box app 20 90 100 46 "App" svc
box L 240 80 110 66 "Leader" db
box F1 470 20 110 56 "Follower 1" db
box F2 470 140 110 56 "Follower 2" db
arrow app L "writes"
arrow L F1 "replication log"
arrow L F2 "replication log"
line 120 125 470 170 "reads" dashed
:::

**Synchronous vs. asynchronous replication:**

- **Synchronous:** the leader waits for the follower to confirm before acknowledging the write. The follower is guaranteed up to date, but a slow or dead follower blocks writes.
- **Asynchronous:** the leader acknowledges immediately and sends the change later. Writes are fast, but if the leader dies, recently acknowledged writes that never reached a follower are **lost**.
- **Semi-synchronous:** one follower is synchronous and the rest asynchronous. A common compromise: at least two nodes always have every write.

### Replication lag and its anomalies

Asynchronous followers trail the leader, usually by milliseconds, sometimes by seconds or minutes under load. This produces the anomalies from Chapter 4:

- **Reading your own write:** a user saves a comment and then reads from a lagging replica, and the comment is "gone". *Fix:* read the user's own recent data from the leader, or track the user's last write position and read only from replicas that have caught up to it.
- **Time going backwards:** two successive reads hit replicas with different lag. *Fix:* pin each user to one replica (monotonic reads).

### Failover

When the leader fails, a follower must be **promoted**: detect the failure (usually by timeout), choose the most up-to-date follower, and reconfigure clients and the other followers. The dangers: losing asynchronous writes that never replicated, *split brain* if the old leader comes back still thinking it is in charge, and false failovers caused by temporary slowness. Consensus-based systems (Chapter 19) make this much safer.

## Multi-leader replication

Several nodes, typically one per region, accept writes and replicate to each other. Writes are fast and local in every region, and each region keeps working when others are cut off. The great difficulty is **write conflicts**: two regions change the same record at the same time.

Conflict-resolution strategies:

- **Last-write-wins (LWW):** the highest timestamp wins. Simple, but silently drops the other write, and clock skew makes it unreliable.
- **Application-level merging:** keep both versions and resolve with business logic, or ask the user.
- **CRDTs** (conflict-free replicated data types): data structures such as counters, sets and text sequences that merge automatically and deterministically. They are used in collaborative editors and distributed counters.
- **Avoid conflicts:** route all writes for a given record to one "home" region.

## Leaderless replication

Any replica accepts reads and writes (Dynamo-style systems such as Cassandra and Riak). The client, or a coordinator, sends each write to all *N* replicas and waits for *W* acknowledgements. Reads query *R* replicas and take the newest version. With **R + W > N**, reads and writes overlap on at least one up-to-date node.

Stale replicas catch up through **read repair** (a read that sees an outdated replica writes the newer value back), **anti-entropy** (background comparison, often using Merkle trees, Chapter 21) and **hinted handoff** (writes meant for a down node are held by another node and passed on when it recovers).

| | Single-leader | Multi-leader | Leaderless |
|---|---|---|---|
| Writes accepted by | Leader only | Any leader | Any replica |
| Write conflicts | None | Yes, must resolve | Yes, must resolve |
| Write availability | Lost during failover | High | High |
| Consistency | Easiest to make strong | Eventual | Tunable via quorums |
| Examples | PostgreSQL, MySQL | Multi-region setups, CouchDB | Cassandra, DynamoDB, Riak |

:::quiz
Q: Why can a composite index on `(country, city)` speed up `WHERE country='FR'` but not `WHERE city='Paris'`?
A: The index is sorted by country first, then by city within each country. Filtering on country uses a prefix of the sort order, so the database can seek straight to France. Paris entries are scattered across every country's section, so a city-only filter can't use the index's order (the leftmost prefix rule).

Q: Why are LSM trees better suited to write-heavy workloads than B-trees?
A: LSM trees turn random writes into sequential ones: writes go to an in-memory buffer and an append-only log, and are flushed as sorted immutable files, all of which is sequential I/O. B-trees update pages in place, which causes random I/O and page splits. The cost moves to reads, which may check several files, and to background compaction.

Q: A user updates their profile and immediately reloads, but sees the old version. What happened and how do you fix it?
A: Replication lag: the write went to the leader, but the reload was served by an asynchronous follower that hadn't applied it yet. To guarantee read-your-writes: read a user's own profile from the leader (perhaps for a short time after a write), or record the write's log position and serve reads only from replicas that have reached it.

Q: What is the risk of asynchronous replication during failover?
A: Writes the old leader acknowledged but hadn't yet sent to any follower are lost when a follower is promoted. If the old leader comes back and still accepts writes, split brain can follow. Semi-synchronous replication or consensus-based replication reduces this risk.

Q: Give two ways multi-leader systems resolve write conflicts, and a weakness of last-write-wins.
A: Last-write-wins using timestamps; application-defined merge logic; CRDTs that merge deterministically; or avoiding conflicts by giving each record one home region. LWW silently throws away concurrent writes, and clock skew between nodes can make an older write "win".
:::

# Partitioning and Sharding

Replication copies the *same* data to several nodes. It helps reads and availability but not *write* capacity or *storage* capacity, since every node still holds everything. When the data or write load outgrows one machine, you must **partition** it: split it so that each node holds only a subset. In databases this is called **sharding**.

## Vertical vs. horizontal partitioning

- **Vertical partitioning** splits by *columns* or *features*: user profiles in one database, orders in another, rarely used large columns in a separate table. It is easy at first, but each piece can still outgrow its machine.
- **Horizontal partitioning (sharding)** splits by *rows*: users 1–10M on shard A, 10–20M on shard B. Every shard has the same schema and holds a fraction of the rows.

## Choosing a shard key

The **shard key** (partition key) decides which shard each row lives on. It is the most important decision in a sharded design, and it is hard to change later. A good shard key:

1. **Spreads data and load evenly** (high cardinality, no dominant values).
2. **Keeps related data together**, so common queries hit **one shard**.
3. **Doesn't produce hotspots** over time.

:::pitfall Monotonic keys create hotspots
Sharding by a timestamp or auto-increment ID with *range* partitioning sends every new write to the shard holding the latest range. One shard burns while the rest sit idle. Hash the key, or prefix it with something well spread, such as `user_id`.
:::

## Partitioning strategies

### Range partitioning

Each shard owns a contiguous key range (A–F, G–M, …). Range scans are efficient and the routing is easy to understand. But hotspots are likely when access is skewed or keys are sequential, and ranges need rebalancing as data grows.

### Hash partitioning

The shard is `hash(key) mod N`. Keys spread evenly, and hotspots from sequential keys disappear. Range queries become scatter-gather across all shards. And with naive `mod N`, **changing N moves almost every key**, which is a disaster for caches and databases alike.

### Directory (lookup) partitioning

A lookup service maps each key (or key group) to its shard. It is very flexible: individual tenants can be moved and big customers given dedicated shards. The directory is extra infrastructure and must be fast and highly available.

### Geographic partitioning

Data is partitioned by user region (EU users in EU shards). This reduces latency and can meet data-residency laws.

## Consistent hashing

**Consistent hashing** fixes the "change N, move everything" problem. Imagine the hash space as a **ring** (0 to 2³²−1). Each node is hashed to positions on the ring. Each key is hashed onto the ring and belongs to the **first node clockwise** from it.

When a node is **added**, it takes over only the keys between itself and its predecessor, about 1/N of all keys. When a node is **removed**, only its keys move, to the next node clockwise. Everything else stays put.

:::diagram 640x300 | A consistent hash ring. Each key belongs to the next node clockwise. Adding node D moves only the keys in the arc between C and D.
circle 190 150 105
box nA 165 30 50 28 "A" svc
box nB 270 136 50 28 "B" svc
box nC 165 241 50 28 "C" svc
box nD 60 136 50 28 "D (new)" good
text 278 72 "● k1 → B" small
text 285 228 "● k2 → C" small
text 92 228 "● k3 → D" small accent
text 92 72 "● k4 → A" small
text 190 150 "hash ring\n0 … 2³²" small muted
box exp 380 40 250 220 "Why it matters\n\nmod-N hashing: adding a 5th\nnode remaps ~80% of keys.\n\nConsistent hashing: a new node\ntakes only the keys in the arc\nbefore it (~1/N), here from A.\n\nVirtual nodes: each server sits\nat ~100–200 ring positions\nto even out the load." note
:::

**Virtual nodes:** with only a few physical positions, the arcs are uneven and some nodes get much more data. Giving each physical node many positions on the ring (*virtual nodes*) evens out the distribution. It also lets a node's load spread across *many* neighbours when it fails, rather than all landing on one, and lets more powerful machines take more virtual nodes.

Consistent hashing underpins Dynamo-style databases, distributed caches (memcached client libraries), CDNs, and load balancers that need affinity.

## Rebalancing

As data grows, partitions must move between nodes. Approaches:

- **Fixed number of partitions:** create many more partitions than nodes up front (say 1,000 partitions over 10 nodes) and move *whole partitions* when nodes join. This is simple and widely used (Elasticsearch, Kafka, Riak).
- **Dynamic splitting:** split a partition when it grows too large, merge when it shrinks (HBase, MongoDB, Spanner).
- **Proportional to nodes:** a fixed number of partitions per node (Cassandra's virtual nodes).

Rebalancing moves a lot of data over the network, so throttle it and avoid fully automatic triggers that can make an overload worse.

## The cost of sharding

Sharding solves scale and creates new problems:

- **Cross-shard queries:** a query not filtered by the shard key must **scatter-gather** to every shard and merge the results, which is slow and fragile.
- **Cross-shard joins:** usually impossible. Denormalise instead, so that data needed together lives together.
- **Cross-shard transactions:** need distributed transaction protocols (Chapter 20), or a design that avoids them.
- **Global secondary indexes:** an index on a non-shard-key column is either *local* (one per shard, so queries must scatter) or *global* (partitioned separately and updated asynchronously, so it may lag).
- **Unique IDs:** auto-increment no longer works across shards. Use UUIDs or a distributed ID generator such as Snowflake (Chapter 21).
- **Operational complexity:** backups, schema migrations and monitoring across many shards.

:::tip Shard as late as you can
Before sharding: optimise queries and indexes, scale vertically, add read replicas, cache aggressively, and archive cold data. Shard when the *write* volume or *data size* truly exceeds what one primary can handle. When you do, explain your shard key choice in terms of the main query patterns.
:::

:::example Choosing a shard key for a chat app
Messages are queried as "the latest 50 messages in conversation X".
- `message_id` (hashed): even, but one conversation's messages are scattered, so every read hits every shard. Bad.
- `user_id`: a message belongs to a conversation with several users. Ambiguous.
- **`conversation_id`** (hashed): all messages of a conversation sit on one shard, sorted by time within it. Reads hit exactly one shard. Huge group chats could become hot, so mitigate by splitting very large conversations into time buckets: `(conversation_id, month)`.
:::

:::quiz
Q: Why doesn't adding read replicas solve a write-throughput bottleneck?
A: Every replica must apply *every* write, so all of them carry the full write load. Replicas spread reads but not writes. Write capacity grows only by spreading writes across nodes that each own a subset of the data, which is partitioning or sharding.

Q: With `hash(key) mod 4`, roughly what fraction of keys move when you go to 5 nodes? With consistent hashing?
A: With mod-N, about 80% of keys change location (a key stays only if `hash mod 4 == hash mod 5`). With consistent hashing, only about 1/5 (20%) move: the keys the new node takes from its neighbours.

Q: What problem do virtual nodes solve in consistent hashing?
A: With few ring positions per node, the arcs are uneven, so the load is unbalanced, and a failed node's load shifts entirely to its single successor. Many virtual positions per physical node even out the distribution, spread a failed node's load across many nodes, and allow weighting by capacity.

Q: An e-commerce orders table is sharded by `order_id`. A common query is "all orders for customer X". What is the problem, and what are two possible solutions?
A: Customer X's orders are spread across all shards, so the query must scatter-gather to every shard. Solutions: shard by `customer_id` instead, so a customer's orders live together; or keep a global secondary index (or a separate customer → orders table, sharded by customer) maintained asynchronously.
:::

# Storage Systems and CDNs

Databases store structured records. But systems also need to store **files and blobs**, such as images, videos, backups and logs, often totalling petabytes. This chapter covers the three storage models and the content delivery networks that bring content close to users.

## Block, file and object storage

**Block storage** presents raw fixed-size blocks, like a virtual hard drive (AWS EBS, SAN volumes). The operating system puts a filesystem on it. It gives the lowest latency and is what databases and VM disks use, but it is usually attached to one machine at a time.

**File storage** presents a hierarchical filesystem (directories and files) shared over a network (NFS, SMB, EFS). Many machines can mount it at once. It is good for shared content and legacy applications, but scaling and performance limits appear at very large sizes.

**Object storage** stores immutable **objects** (data + metadata) in a flat namespace of **buckets** and **keys**, accessed over HTTP (S3, GCS, Azure Blob). It scales almost without limit, is extremely durable (often "eleven nines", through replication or erasure coding across facilities), is cheap per GB, and supports lifecycle rules. Latency is higher than block storage, and objects are replaced whole rather than edited in place.

| | Block | File | Object |
|---|---|---|---|
| Interface | Disk blocks | POSIX paths | HTTP API (PUT/GET) |
| Sharing | One host | Many hosts | Global, any client |
| Scale | TBs per volume | TBs–PBs | Effectively unlimited |
| Latency | Lowest | Low–medium | Higher (ms) |
| Typical use | Databases, VM disks | Shared files | Media, backups, data lakes |

:::key Separate metadata from blobs
Never store large files in your database. Put the bytes in object storage, and store only the metadata (owner, size, content type, object key, checksums) in the database. The database stays small and fast, and object storage does what it is good at.
:::

## Uploading large files directly

Routing uploads through your application servers wastes their bandwidth and CPU. Instead, the server issues a **pre-signed URL**: a time-limited, permission-scoped URL that lets the client upload straight to object storage.

:::diagram 640x200 | Direct-to-storage uploads with pre-signed URLs keep large transfers off your application servers.
box c 20 80 90 46 "Client" client
box api 230 20 120 46 "Upload API" svc
box s3 230 140 120 50 "Object storage" store
box db 470 20 120 50 "Metadata DB" db
box q 470 140 120 40 "Process queue" queue
arrow c api "1 request upload URL"
arrow c s3 "2 PUT bytes (pre-signed)"
arrow api db "record pending"
arrow s3 q "3 'object created' event"
:::

For very large files, use **multipart upload**: split the file into chunks (say 8–100 MB), upload them in parallel, retry only failed chunks, and resume after interruptions.

## Durability: replication vs. erasure coding

Storing three full copies triples the storage cost. **Erasure coding** splits data into *k* data fragments plus *m* parity fragments (for example, 10 + 4), and *any* *k* fragments can rebuild the original. That gives similar or better durability than 3x replication with only ~1.4x overhead, at the cost of more CPU and slower rebuilds. Large object stores use erasure coding for most data.

## Distributed file systems

Systems such as **HDFS** and **Google File System** split huge files into large blocks (64–128 MB), replicate each block on several data nodes, and keep the file → block mapping on a **metadata node** (NameNode). They are designed for large sequential reads by batch jobs (Chapter 22), not for many small files or low-latency random access.

## Content Delivery Networks

A **CDN** is a globally distributed network of edge servers (points of presence, PoPs) that cache content close to users. A user in Mumbai fetches an image from a Mumbai PoP in 10 ms instead of from Virginia in 250 ms.

:::diagram 640x240 | A CDN serves cached content from edge locations near users, and only cache misses travel to the origin.
box o 260 10 120 50 "Origin\n(object storage)" store
box e1 40 110 110 46 "Edge: Frankfurt" cdn
box e2 265 110 110 46 "Edge: Mumbai" cdn
box e3 490 110 110 46 "Edge: São Paulo" cdn
box u1 50 190 90 36 "Users" client
box u2 275 190 90 36 "Users" client
box u3 500 190 90 36 "Users" client
arrow e1 o "miss" dashed
arrow e3 o "miss" dashed
arrow u1 e1 "hit"
arrow u2 e2 "hit"
arrow u3 e3 "hit"
:::

**Pull CDN:** the edge fetches from the origin on the first request (a miss) and caches according to `Cache-Control` headers. It is easy to set up, and the first request at each edge is slow.

**Push CDN:** you upload content to the CDN in advance. Better for large, predictable assets such as a game patch or video catalogue, but you manage what is stored.

**Cache-busting:** rather than purging, publish new versions under new URLs (`app.3f9a2c.js`). The old URLs can then be cached "forever" (`max-age=31536000, immutable`) and updates appear instantly.

Modern CDNs also terminate TLS near users, absorb DDoS attacks, accelerate *dynamic* content by keeping warm connections to the origin, and run code at the edge (edge functions) for personalisation, A/B tests and authentication checks.

## Video streaming: a storage case in miniature

Video platforms **transcode** each upload into several resolutions and bitrates (240p → 4K), split each into short **segments** (2–10 s), and publish a manifest (HLS / DASH). Players use **adaptive bitrate streaming**: they measure bandwidth and switch quality segment by segment. Segments are ordinary immutable objects, so they cache perfectly in CDNs.

:::quiz
Q: Why should you store images in object storage rather than as BLOBs in your relational database?
A: Large binaries bloat the database: slower backups and replication, wasted buffer-pool memory, and costly storage. Object storage is cheaper per GB, scales without limit, is extremely durable, serves content over HTTP, and works directly with CDNs. Keep only metadata and the object key in the database.

Q: What is a pre-signed URL, and why use it for uploads?
A: A URL signed with your credentials that grants temporary, limited permission (for example, PUT one specific key for 15 minutes). Clients can upload straight to object storage without going through your servers, which saves your bandwidth and CPU, while you still control who may upload what.

Q: Compare 3x replication with 10+4 erasure coding in storage overhead and fault tolerance.
A: 3x replication costs 3.0x storage and survives the loss of 2 copies. 10+4 erasure coding costs 1.4x and survives the loss of any 4 of 14 fragments. Erasure coding is far more storage-efficient with equal or better durability, but uses more CPU and network for encoding and rebuilding, and gives slower degraded reads.

Q: How does fingerprinting asset filenames (e.g. `app.3f9a2c.js`) simplify CDN caching?
A: Each content version gets a unique URL, so files can be cached for a very long time and marked immutable. Deploying a new version changes the URL referenced by your HTML, so clients pick it up immediately with no purge needed and no risk of mixing stale and fresh assets.
:::
