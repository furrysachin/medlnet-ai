# 🧬 Curalink — AI Medical Research Assistant

## Tech Stack
- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB (optional)
- **LLM**: Mistral via Ollama (local, open-source)
- **APIs**: PubMed, OpenAlex, ClinicalTrials.gov

## Setup

### 1. Install Ollama
Download from: https://ollama.com/download

### 2. Pull Mistral Model
```bash
ollama pull mistral
ollama serve
```

### 3. Start the App
Double-click `start.bat` OR run manually:

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Open Browser
```
http://localhost:5173
```

## Pipeline
1. User enters disease + query
2. LLM expands query with medical terminology
3. Fetch 100+ papers from PubMed + OpenAlex in parallel
4. Fetch 50+ clinical trials from ClinicalTrials.gov
5. Rank & filter to top 8 papers + 6 trials
6. LLM generates structured 5-section analysis
7. Results displayed with full source attribution

## Environment Variables

### backend/.env
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/curalink
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

### frontend/.env
```
VITE_API_URL=http://localhost:5000
```
