import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const GEMINI_MODEL = "gemini-2.0-flash";

const MASTER_SYSTEM = `You are CURALINK, an advanced Medical Research AI.
- Detect the user's language (Hindi, English, or Hinglish) and reply in the SAME language.
- Summarize findings from provided research papers and trials.
- Only show evidence-based clinical insights.
- Cite sources as [1], [2] using the provided paper list.
- If data is limited, say so clearly.`;

export async function generate(prompt, systemPrompt = MASTER_SYSTEM, retries = 3) {
  try {
    console.log(`🤖 Calling Gemini (${GEMINI_MODEL})...`);
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ No GEMINI_API_KEY found.");
      return "Error: Gemini API key is missing. Please add GEMINI_API_KEY to your .env file.";
    }
    
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    return response.text();
  } catch (err) {
    if (err.message.includes("429") && retries > 0) {
      console.log(`⏱️ Rate limit hit (429), waiting 10s and retrying... (${retries} retries left)`);
      await new Promise(r => setTimeout(r, 10000));
      return generate(prompt, systemPrompt, retries - 1);
    }
    console.error("❌ Gemini Error:", err.message);
    return "Medical analysis engine unavailable. Please check backend setup and Gemini API key.";
  }
}

export const generateWithOllama = (prompt) => generate(prompt);

export const checkOllamaHealth = async () => {
  return { available: !!process.env.GEMINI_API_KEY, engine: "Gemini API" };
};

export const isMedicalQuery = (q) => {
  const medicalTerms = [
    'treatment', 'symptom', 'trial', 'drug', 'medicine', 'cause', 'prevention', 'diagnosis', 
    'research', 'patient', 'clinical', 'cancer', 'oncology', 'outcomes', 'therapy', 
    'disease', 'virus', 'infection', 'pain', 'doctor', 'hospital', 'surgery', 'immunotherapy',
    'diabetes', 'heart', 'liver', 'lung', 'brain', 'brain damage', 'parkinson', 'alzheimer',
    'stroke', 'cardiac', 'renal', 'neuro', 'oncology', 'pediatric', 'geriatric', 'infection',
    'mutation', 'variant', 'efficacy', 'toxicity', 'safety', 'prognosis', 'survival'
  ];
  const lowerQ = q.toLowerCase();
  return lowerQ.length > 5 && medicalTerms.some(term => lowerQ.includes(term));
};

export const detectDiseaseFromQuery = (q) => {
  const commonDiseases = [
    'lung cancer', 'diabetes', 'alzheimer', 'heart disease', 'hypertension', 'tuberculosis',
    'breast cancer', 'covid', 'stroke', 'parkinson', 'brain damage', 'asthma', 'arthritis',
    'kidney disease', 'liver disease', 'hiv', 'schizophrenia', 'depression', 'obesity', 'cancer'
  ];
  const lowerQ = q.toLowerCase();
  return commonDiseases.find(d => lowerQ.includes(d)) || null;
};

export const validateOutput = (output, papers) => {
  if (!output || output.length < 50) return false;
  // Check if it's just an error message
  if (output.includes("Medical analysis engine unavailable")) return false;
  return true;
};

export function buildLLMPrompt({ name, disease, query, location, papers, trials, history, counts, analyzedTrials }) {
  const papersText = papers.map((p, i) => `[${i+1}] ${p.title} (${p.year}) - ${p.source}. Abstract: ${(p.abstract || "").slice(0, 300)}...`).join("\n\n");
  const trialsText = trials.map((t, i) => `[T${i+1}] ${t.title} - Status: ${t.status}, Phase: ${t.phase}. Objective: ${t.description}`).join("\n\n");
  
  return `
User: ${name}
Location: ${location || "Global"}
Disease/Topic: ${disease}
Research Question: ${query}

Evidence from ${papers.length} peer-reviewed papers (out of ${counts?.papersAnalyzed || papers.length} analyzed) and ${trials.length} clinical trials (out of ${analyzedTrials || trials.length} screened):

PAPERS:
${papersText}

TRIALS:
${trialsText}

TASK: Provide a comprehensive, evidence-based answer to the research question using only the provided sources. Cite papers as [1], [2] and trials as [T1], [T2]. If the question is in Hindi or Hinglish, respond in that language.
`;
}

export function buildInsightsPrompt({ disease, query, papers, trials, intent }) {
  return `
Generate structured medical insights for:
DISEASE: ${disease}
QUERY: ${query}
INTENT: ${intent}

PAPERS: ${papers.map((p, i) => `[${i+1}] ${p.title}`).join(", ")}
TRIALS: ${trials.map((t, i) => `[T${i+1}] ${t.title}`).join(", ")}

STRUCTURE YOUR RESPONSE EXACTLY LIKE THIS:
KEY_INSIGHTS:
- [Point 1 based on papers/trials]
- [Point 2 based on papers/trials]

CONDITION_OVERVIEW:
[Brief overview from data]

EVIDENCE_SYNTHESIS:
[Detailed synthesis of the evidence]

TRIALS_CONNECTION:
[How current trials relate to the research]

CRITICAL_INSIGHT:
[Any gaps or limitations in current research]
`;
}

export function buildDirectPrompt(query, disease) {
  return `Answer this simple medical question briefly in the user's language. Topic: ${disease}. Question: ${query}`;
}

export function computeConfidenceScore(papers, trials) {
  let score = 30; // base score
  score += Math.min(papers.length * 5, 40);
  score += Math.min(trials.length * 5, 20);
  
  const hasRCT = papers.some(p => /randomized|rct/i.test(`${p.title} ${p.abstract}`));
  if (hasRCT) score += 10;
  
  return Math.min(score, 99);
}

export function extractDrugsFromPapers(papers) {
  const commonDrugs = ['remdesivir', 'paxlovid', 'metformin', 'insulin', 'pembrolizumab', 'aspirin', 'dexamethasone'];
  const found = new Set();
  papers.forEach(p => {
    const text = `${p.title} ${p.abstract}`.toLowerCase();
    commonDrugs.forEach(drug => {
      if (text.includes(drug)) found.add(drug);
    });
  });
  return [...found];
}

export function buildTrendPrompt(disease, papers, trials) {
  const papersText = papers.map((p, i) => `[${i+1}] ${p.title} (${p.year}) - ${p.source}. Abstract: ${(p.abstract || "").slice(0, 300)}...`).join("\n\n");
  const trialsText = trials.map((t, i) => `[T${i+1}] ${t.title} - Status: ${t.status}, Phase: ${t.phase}. Objective: ${t.description}`).join("\n\n");

  return `
Analyze emerging research trends for: ${disease}

Evidence context:
PAPERS:
${papersText}

TRIALS:
${trialsText}

TASK: Identify 5 distinct research trends based ONLY on the provided evidence.
FORMAT YOUR RESPONSE EXACTLY AS:
TREND_1: [Trend Name]
EVIDENCE: [Summarize evidence from papers/trials with [1] or [T1] citations]
WHY: [Explain why this is an emerging trend]

TREND_2: ...
[Repeat for 5 trends]

FINAL_SUMMARY: [A 2-3 line summary of the global research landscape for ${disease}]
`;
}

export default { 
  generate, 
  summarizePapers: async (papers, query) => {
    const context = papers.map((p, i) => `[${i+1}] ${p.title} (${p.year}): ${p.abstract}`).join("\n\n");
    return await generate(`Research Question: ${query}\n\nEvidence:\n${context}`);
  }, 
  generateWithOllama, 
  checkOllamaHealth, 
  isMedicalQuery, 
  validateOutput,
  buildLLMPrompt,
  buildInsightsPrompt,
  buildDirectPrompt,
  computeConfidenceScore,
  extractDrugsFromPapers,
  buildTrendPrompt
};
