# [front] Preface

Every large system you use today, whether a search engine, a ride-hailing app or a video platform, started as a single program on a single machine. At some point the load outgrew that machine. Someone had to decide how to split the work, where to keep the data, what to do when a disk died at 3 a.m., and which guarantees to give up for the sake of speed. **System design is the discipline of making those decisions on purpose.**

This book teaches that discipline from the ground up. It assumes you can write code and know roughly what a database and an HTTP request are. It does not assume you have run anything at scale. Each chapter starts from a concrete problem, builds the mechanism that solves it, draws it, and then spends as much time on what the mechanism *costs* as on what it buys. That last part matters most. Nobody hires a senior engineer to name every component. They hire one to know when *not* to use it.

## How the book is organised

The book has eight parts, and each one depends on the parts before it.

| Part | What you will learn |
|---|---|
| **I. Foundations** | The vocabulary: scalability, latency, availability, reliability, consistency, and the arithmetic of estimation. |
| **II. Moving Requests** | How a request travels: DNS, TCP, HTTP, load balancers, API design, gateways, rate limiting and authentication. |
| **III. Moving Data** | How services talk to each other in real time and asynchronously, and how caching makes everything faster. |
| **IV. Storing Data** | Choosing databases, indexing, replication, sharding, and storing files and objects at scale. |
| **V. Architecture** | Monoliths, microservices, serverless and event-driven systems, and the patterns that keep them standing. |
| **VI. Distributed Systems** | Time, ordering, consensus and distributed transactions, plus clever data structures for huge data. |
| **VII. Operating at Scale** | Batch and stream processing, safe deployment, observability and security. |
| **VIII. Case Studies** | Four complete designs that put it all together, worked as you would in an interview. |

## How to study with it

1. **Read actively.** Before each diagram, try to predict what it will show.
2. **Do the quizzes.** Every chapter ends with questions. Answer them in writing before you click *See answer*. Struggling to recall something is what moves it into long-term memory.
3. **Redraw the figures from memory.** If you can redraw a figure and explain each arrow, you understand it.
4. **Work the case studies twice.** First on your own with a blank page, then with the book.

The road from "it works on my laptop" to "it works for a hundred million people" is long, but it is not mysterious. Let's begin.
