import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

// Default to Mistral-7B-Instruct-v0.3
const hf = new HfInference(process.env.HF_API_KEY);
const MODEL = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

/**
 * CORE GENERATION (Hugging Face)
 * Replaces Ollama completely for cloud deployment.
 */
async function generate(prompt, systemPrompt = "You are a professional medical researcher.") {
  try {
    if (!process.env.HF_API_KEY) {
      return "Error: HF_API_KEY missing. Please add it to environment variables.";
    }
    const response = await hf.chatCompletion({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.2
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error("HF Generation Error:", err.message);
    return "Error: AI engine unreachable. Check HF_API_KEY.";
  }
}

export async function summarizePapers(papers, query) {
  const context = papers.map((p, i) => `[${i+1}] ${p.title}: ${p.abstract}`).join("\n\n");
  const prompt = `Research Question: ${query}\n\nEvidence:\n${context}\n\nTask: Synthesize a professional medical answer...`;
  return await generate(prompt);
}

// ── BACKWARD COMPATIBILITY ALIASES ──
export const generateWithOllama = (prompt) => generate(prompt);
export const checkOllamaHealth = async () => ({ available: !!process.env.HF_API_KEY, engine: "HuggingFace" });
export const isMedicalQuery = (q) => q.length > 5;
export const validateOutput = (o) => o.length > 20;

export default {
  generate,
  summarizePapers,
  generateWithOllama,
  checkOllamaHealth
};
