# IA Studio A+B Master Control

> A system that doesn't just generate images — it improves them automatically until they reach professional quality.

From single-shot generation → to autonomous creative refinement loops.

---

## Why this matters

Most AI image systems generate outputs once and stop.

This system introduces iteration, evaluation, and optimization loops — bringing AI closer to a creative decision-making process rather than a single-shot generator.

Built for creative directors who need precision, not luck.

---

## What it does

A closed-loop pipeline that runs autonomously:

**Generation → Multi-judge Evaluation → Prompt Evolution → Policy Relearning**

The system keeps iterating until the output meets a defined quality threshold — without manual intervention.

---

## How it works

### 1. Pre-Execution Intuition (`IntuitionEngine`)
Before spending a single token, the system checks memory of past executions to estimate expected quality and cost. If predicted ROI is too low, it recommends refining the prompt instead of executing.

### 2. Evaluation — 4 Parallel Judges (`Evaluator`)
Four independent Gemini calls score each result simultaneously. The system accepts or continues iterating based on the combined score.

### 3. Prompt Evolution (`GeneticEngine`)
When quality is insufficient, the prompt evolves: elite preservation, mutation, and crossover between the best-performing candidates.

### 4. Policy Learning (`PolicyLearner`)
Tracks which strategies produce better results over time. Automatically adapts execution mode to each user's patterns.

### 5. MetaDecisionEngine
Dynamically selects between three operation modes:
- `fast` — single agent
- `focused` — full 4-judge pipeline
- `conserve` — early stop when quality threshold is met

---

## Real-time Collaboration

WebSocket-based rooms with shared state:
- Up to 50 simultaneous users per room
- Real-time cursor synchronization
- Comments anchored to the generated image
- Automatic cleanup of inactive rooms

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Styles | Tailwind CSS |
| Animations | Framer Motion |
| Backend | Node.js + Express |
| Real-time | WebSockets (`ws`) |
| AI Core | Google Gemini SDK |

---

## Technical Details

### Evaluation Score

$$\lambda = 0.35 \cdot r_{\text{relevance}} + 0.25 \cdot c_{\text{coherence}} + 0.25 \cdot q_{\text{quality}} + 0.15 \cdot s_{\text{strict}}$$

### Policy Reward Function

$$\text{Reward} = \lambda - 0.05 \cdot \text{costo\_API}$$

### Retry Strategy

$$t_{\text{retry}}(n) = t_0 \cdot 2^n + \mathcal{U}(0,\, 500\text{ms})$$

Idempotency guaranteed via `AbortController`.

---

## Installation

```bash
gh repo clone ericramirez9722-crypto/A-Master-control-
npm install
