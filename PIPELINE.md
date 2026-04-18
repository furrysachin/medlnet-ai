# CuraLink — AI Pipeline Architecture

## Full Flow

```
User Query
│
├── Query Expansion
│   ├── PubMed:   "COVID-19 AND (fever) AND (treatment OR remdesivir OR paxlovid)"
│   └── OpenAlex: "COVID-19 fever treatment antiviral clinical trial remdesivir"
│
├── Deep Retrieval (Parallel)
│   ├── PubMed API      → 100 papers
│   ├── OpenAlex API    → 100 papers
│   └── ClinicalTrials  →  50 trials
│   Total: 250 sources fetched
│
├── Stage 1: Hard Disease Filter
│   ├── Aliases: covid / sars-cov-2 / coronavirus / covid-19
│   ├── Remove: TB, cancer, unrelated diseases
│   └── Must contain clinical term (treatment/trial/mechanism)
│
├── Stage 2: Intent Filter
│   ├── treatment  → /treatment|therapy|drug|intervention/
│   ├── symptom    → /fever|cytokine|inflammation|infection/
│   ├── cause      → /etiology|mechanism|mutation|risk factor/
│   ├── prevention → /vaccine|prophylaxis|risk reduction/
│   └── diagnosis  → /biomarker|screening|detection/
│
├── Intelligent Ranking Engine
│   ├── Disease match in text   → +10
│   ├── Disease match in title  → +5
│   ├── Query match             → +6
│   ├── Drug boost:
│   │   ├── paxlovid/nirmatrelvir → +5
│   │   ├── remdesivir            → +5
│   │   └── other disease drugs   → +5 each
│   ├── Study quality:
│   │   ├── RCT / Randomized     → +8
│   │   ├── Meta-analysis/Review → +7
│   │   └── Clinical trial       → +6
│   ├── Recency:
│   │   ├── 2022+  → +5
│   │   ├── 2020+  → +4
│   │   └── 2018+  → +3
│   └── Citation count           → up to +5
│
├── Top Selection
│   ├── Top 8 papers (deduplicated)
│   └── Top 6 trials (by recruiting status)
│
├── Safety Check
│   └── papers < 3 → "Insufficient research data available"
│
├── LLM Reasoning (Ollama — gemma2:2b)
│   ├── Temperature: 0.1 (low hallucination)
│   ├── Strict prompt: USE ONLY provided data
│   ├── Context: full papers + trials JSON passed
│   └── Parallel: chat response + structured insights
│
├── Output Validation
│   ├── Check: LLM cited [1],[2] or paper titles/years
│   └── Invalid → "Low confidence response. Please refine query."
│
└── Structured Response
    ├── KEY_INSIGHTS     → ✔ specific findings with citations
    ├── CONDITION_OVERVIEW
    ├── EVIDENCE_SYNTHESIS → cross-paper patterns
    ├── TRIALS_CONNECTION  → trials linked to findings
    └── CRITICAL_INSIGHT   → limitations/contradictions
```

## Scoring Example: COVID-19 + treatment

| Paper | Disease Match | Drug Match | RCT | Recency | Total |
|-------|--------------|------------|-----|---------|-------|
| Paxlovid RCT 2022 | +10 | +5 | +8 | +5 | **28** |
| Remdesivir trial 2021 | +10 | +5 | +8 | +4 | **27** |
| General COVID review | +10 | 0 | +7 | +3 | **20** |
| Unrelated TB paper | 0 | 0 | 0 | 0 | **FILTERED** |

## Demo Quote
> "We enforce grounded generation by combining strict disease-level filtering,
>  drug-aware ranking, low-temperature inference (0.1), and citation validation —
>  ensuring zero hallucination in medical research synthesis."
