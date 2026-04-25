
import { NeuralSystem } from "../core/NeuralSystem";

const system = new NeuralSystem();

export async function executeNeuralOperation(input: string, onUpdate?: (data: any) => void) {
  // 1) Get Intuition (C-ROI estimation based on memory)
  const intuition = await system.intuition.infer(input);
  
  // 2) Optional Gate: Already handled inside NeuralSystem.run, 
  // but we pass intuition to avoid redundant computation.
  return await system.run(input, onUpdate, intuition);
}
