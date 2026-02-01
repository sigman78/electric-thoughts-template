---
title: "The Cost of Abstractions"
date: 2026-01-23T11:30:45Z
excerpt: "Every abstraction has a cost. Sometimes the cure is worse than the disease."
tags: ["architecture", "complexity"]
---

Every abstraction has a cost. Sometimes the cure is worse than the disease.

ORMs promise database independence but leak SQL concepts anyway. Microservices promise independent deployments but introduce network failures. Frameworks promise rapid development but create upgrade nightmares.

The best code is often boring code. Use the database directly. Write plain HTTP handlers. Keep it simple until complexity pays for itself.
