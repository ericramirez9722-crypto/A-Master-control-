
export interface Agent {
  type: string;
  style: string;
}

export class AgentOrchestrator {
  agents: Agent[] = [
    { type: "analytical", style: "be logical, technical, and structured" },
    { type: "creative", style: "be artistic, expansive, and evocative" },
    { type: "critical", style: "be strict, precise, and focus on potential failures" }
  ];

  buildPrompts(base: string) {
    return this.agents.map(a => ({
      role: a.type,
      prompt: `${base}\n[AGENT_ROLE: ${a.type.toUpperCase()}]\nInstruction: ${a.style}`
    }));
  }
}
