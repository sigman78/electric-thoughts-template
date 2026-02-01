---
title: "The Myth of Self-Documenting Code"
date: 2026-01-20T14:05:07Z
excerpt: "Code shows what, comments show why."
tags: ["documentation", "maintenance"]
---

Code shows what, comments show why.

Variable names reveal intent but can't explain business context. A function named `calculateTotal` doesn't tell you about tax rules or discount policies.

Comments are commitments. When they lie, they cost more than no comments. Keep them short, keep them accurate, update them when code changes.

The best documentation is the code you don't have to write. Delete dead code. Extract complex logic. Make the obvious path the easy path.
