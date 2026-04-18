import { HfInference } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

const hf = new HfInference(process.env.HF_API_KEY);
const MODEL = process.env.HF_MODEL || "mistralai/Mistral-7B-Instruct-v0.3";

const MASTER_SYSTEM = `You are CURALINK, an advanced Medical Research AI.
- Detect the user's language (Hindi, English, or Hinglish) and reply in the SAME language.
- Summarize findings from provided research papers and trials.
- Only show evidence-based clinical insights.
- Cite sources as [1], [2] using the provided paper list.
- If data is limited, say so clearly.`;

export async function generate(prompt, systemPrompt = MASTER_SYSTEM) {
  try {
    if (!process.env.HF_API_KEY) return "Error: Add HF_API_KEY to your deployment Environment Variables.";
    const response = await hf.chatCompletion({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
      max_tokens: 1000, temperature: 0.2
    });
    return response.choices[0].message.content;
  } catch (err) {
    console.error("HF Error:", err.message);
    return "Medical analysis engine unavailable. Check API Key.";
  }
}

export async function summarizePapers(papers, query) {
  const context = papers.map((p, i) => `[${i+1}] ${p.title} (${p.year}): ${p.abstract}`).join("\n\n");
  const prompt = `Research Question: ${query}\n\nEvidence:\n${context}\n\nTask: Synthesize a professional medical answer in the user's language.`;
  return await generate(prompt);
}

export const generateWithOllama = (prompt) => generate(prompt);
export const checkOllamaHealth = async () => ({ available: !!process.env.HF_API_KEY, engine: "HuggingFace" });
export const isMedicalQuery = (q) => q.toLowerCase().length > 3;
export const validateOutput = (o) => !!o && o.length > 20;

export default { generate, summarizePapers, generateWithOllama, checkOllamaHealth, isMedicalQuery, validateOutput };
