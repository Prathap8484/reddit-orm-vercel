---
name: project-budget-routing-architecture
description: Stable architecture decision for budget-device routing — probabilistic bias, not hard lock. Do not revert.
metadata:
  type: project
---

Budget routing is intentionally PROBABILISTIC (bias), not deterministic (lock). This decision is final.

**Why:** Hard device locking produces unanimous Samsung convergence across all 3 comments, which is detectable as coordinated behavior. Real Reddit budget threads contain disagreement, hesitation, competitor praise, and neutral observations.

**How to apply:** Do not add `(MANDATORY)`, `ALL 3 MUST`, `DO NOT output irrelevant`, or force-regen logic tied to budget resolution. The current architecture is the ceiling for routing complexity.

## Locked behaviors

- `budgetBiased = true` when router resolves a device — influences probability only
- Relevance gate (`evaluateSamsungFit`) bypassed when `budgetBiased` — budget signal IS relevance
- Claude's own irrelevance output is NOT intercepted — that entropy is valuable realism
- Prompt says "ONE comment should lean" — the other two are free (neutral, competitor, passive)
- `enforceBatchDeviceLock` only fires on explicit model mentions, not budget-biased threads
- `biasOmission` = base omission + 0.12 (capped 0.45) when `budgetBiased` — ~0.29 at default clustering

## Device psychological positioning

- **A57**: premium midrange / near-flagship / 50k–60k territory
- **A37**: upper midrange / practical value / 35k–45k territory

These are FRAMING GUIDES for the prompt, not enforcement rules.

## What future work should focus on

- Telemetry and calibration
- Moderation survival signals
- Semantic similarity detection across requests
- Operator tooling

**NOT:** additional routing complexity, more keyword signals, or realism stacking on top of this layer.
