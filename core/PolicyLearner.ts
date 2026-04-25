
export interface Policy {
  variants: number;
  judges: number;
  strategy: string;
}

export class PolicyLearner {
  history: { policy: Policy; reward: number }[] = [];

  record(policy: Policy, reward: number) {
    this.history.push({ policy, reward });
    console.log(`[POLICY_LEARNER] Recorded reward: ${reward.toFixed(4)} for policy: ${JSON.stringify(policy)}`);
  }

  getBestPolicy() {
    if (this.history.length < 5) return null;

    const grouped = new Map<string, number[]>();

    for (const h of this.history) {
      const key = JSON.stringify(h.policy);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(h.reward);
    }

    let best: Policy | null = null;
    let bestScore = -Infinity;

    for (const [k, rewards] of grouped) {
      const avg = rewards.reduce((a, b) => a + b, 0) / rewards.length;
      if (avg > bestScore) {
        bestScore = avg;
        best = JSON.parse(k);
      }
    }

    return best;
  }
}
