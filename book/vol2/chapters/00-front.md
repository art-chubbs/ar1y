# [front] Preface

Volume 1 taught the building blocks: load balancers, caches, queues, replication, sharding, consensus, sagas, and the arithmetic that tells you which ones you need. This volume puts those blocks together. Each chapter takes one real kind of system and designs it from a blank page to a defensible architecture.

The ten systems were chosen so that, together, they cover the questions that come up again and again in practice: how to move huge files cheaply, how to never lose or double-count money, how to keep many people's views of shared data in sync, how to rank and search at speed, and how to protect a system from its own popularity.

## How each chapter works

Every case study follows the same eight steps, so that the method becomes a habit:

1. **Requirements:** functional and non-functional, plus what is out of scope.
2. **Estimates:** the numbers that decide the architecture.
3. **API:** the contract between clients and the system.
4. **Data model:** entities, keys and access patterns.
5. **High-level design:** boxes and arrows, with one request walked end to end.
6. **Deep dives:** the two or three problems that make this system hard.
7. **Failure modes:** what breaks, what users see, and how the system recovers.
8. **Quiz:** questions that test whether the reasoning stuck.

References like **(Vol. 1, Ch. 12)** point back to the chapter of Volume 1 that explains a building block in depth.

## How to practise with it

Read only the requirements of a chapter, then close the book. Give yourself 40 minutes and a blank page and design the system yourself, out loud if you can. Then read the chapter and compare. The gaps between your design and the book's are exactly what you need to study. The practice problem bank at the end gives you ten more prompts for the same exercise, with hints but no full solutions.
