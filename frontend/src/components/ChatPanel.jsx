import { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Trash2, MapPin, Stethoscope, Search } from 'lucide-react';
import { sendMessage } from '../api';

const DISEASES = [
  'Diabetes', 'Cancer', 'Alzheimer', 'Hypertension', 'COVID-19',
  'Parkinson', 'Asthma', 'Arthritis', 'Depression', 'Heart Disease',
  'Stroke', 'Tuberculosis', 'Malaria', 'HIV/AIDS', 'Hepatitis',
  'Kidney Disease', 'Liver Disease', 'Obesity', 'Anemia', 'Epilepsy',
  'Multiple Sclerosis', 'Lupus', 'PCOS', 'Thyroid', 'Osteoporosis'
];

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 fade-in">
      <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-blue-400" />
      </div>
      <div className="glass rounded-2xl px-4 py-3">
        <p className="text-xs text-blue-400/70 mb-2">Analyzing medical literature...</p>
        <div className="flex gap-1.5">
          <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" />
          <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" />
          <span className="typing-dot w-2 h-2 rounded-full bg-blue-400" />
        </div>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex items-start gap-3 fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isUser ? 'bg-blue-600/30 border border-blue-500/40' : 'bg-blue-500/20 border border-blue-500/30'}`}>
        {isUser ? <User size={14} className="text-blue-300" /> : <Bot size={14} className="text-blue-400" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${isUser ? 'bg-blue-600/20 border border-blue-500/30' : 'glass'}`}>
        {msg.disease && !isUser && (
          <span className="inline-flex items-center gap-1 text-xs text-blue-400/70 mb-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full">
            <Stethoscope size={10} /> {msg.disease}
          </span>
        )}
        <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        {msg.meta && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.meta.finalPapers > 0 && (
              <span className="text-xs text-blue-400/60 bg-blue-500/10 px-2 py-0.5 rounded-full">
                {msg.meta.finalPapers} papers
              </span>
            )}
            {msg.meta.finalTrials > 0 && (
              <span className="text-xs text-green-400/60 bg-green-500/10 px-2 py-0.5 rounded-full">
                {msg.meta.finalTrials} trials
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({ onResult, isLoading, setIsLoading }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hello! I'm CuraLink, your AI Medical Research Assistant. Enter a disease and your query to get evidence-based insights from PubMed, OpenAlex, and ClinicalTrials.gov."
  }]);
  const [disease, setDisease] = useState('');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const diseaseRef = useRef(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  const handleDiseaseChange = (val) => {
    setDisease(val);
    setShowDropdown(true);
    setSuggestions(val.length > 0 ? DISEASES.filter(d => d.toLowerCase().includes(val.toLowerCase())).slice(0, 6) : DISEASES.slice(0, 6));
  };

  const selectDisease = (d) => {
    setDisease(d);
    setSuggestions([]);
    setShowDropdown(false);
  };

  useEffect(() => {
    const handler = (e) => { if (diseaseRef.current && !diseaseRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isFollowUp = messages.filter(m => m.role === 'user').length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMsg = { role: 'user', content: query, disease };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setSuggestions([]);
    setIsLoading(true);

    try {
      const { data } = await sendMessage({ sessionId, disease, query, location, isFollowUp });
      const assistantMsg = { role: 'assistant', content: data.response, disease: data.meta?.disease, meta: data.meta };
      setMessages(prev => [...prev, assistantMsg]);
      onResult({ papers: data.papers, trials: data.trials, insights: data.insights, confidence: data.confidence, trends: data.trends, meta: data.meta, response: data.response });
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.response?.data?.error || err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([{ role: 'assistant', content: "Session cleared. Start a new research query." }]);
    onResult({ papers: [], trials: [], meta: null, response: '' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 p-4 border-t border-blue-900/30">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative" ref={diseaseRef}>
            <div className="flex items-center gap-2 glass px-3 py-2.5">
              <Stethoscope size={14} className="text-blue-400 shrink-0" />
              <input
                value={disease}
                onChange={e => handleDiseaseChange(e.target.value)}
                onFocus={() => { setShowDropdown(true); setSuggestions(disease.length > 0 ? DISEASES.filter(d => d.toLowerCase().includes(disease.toLowerCase())).slice(0, 6) : DISEASES.slice(0, 6)); }}
                placeholder="Disease (e.g. Diabetes)"
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                autoComplete="off"
              />
              {disease && (
                <button type="button" onClick={() => { setDisease(''); setSuggestions([]); setShowDropdown(false); }}
                  className="text-slate-500 hover:text-slate-300 transition-colors text-xs">✕</button>
              )}
            </div>

            {showDropdown && suggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 overflow-hidden" style={{background:'#111B2E', border:'1px solid rgba(79,157,255,0.2)', borderRadius:'12px', boxShadow:'0 8px 32px rgba(0,0,0,0.4)'}}>
                <p className="px-3 pt-2 pb-1 text-xs text-slate-500 uppercase tracking-wider">
                  {disease ? 'Suggestions' : 'Common Diseases'}
                </p>
                {suggestions.map(s => (
                  <button key={s} type="button" onMouseDown={() => selectDisease(s)}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
                    style={{color: s === disease ? '#60a5fa' : '#cbd5e1'}}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(79,157,255,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <Stethoscope size={11} className="text-blue-400/50 shrink-0" />
                    {s}
                    {s === disease && <span className="ml-auto text-blue-400 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['Diabetes', 'Cancer', 'COVID-19', 'Hypertension', 'Alzheimer'].map(d => (
                <button key={d} type="button" onMouseDown={() => selectDisease(d)}
                  className="text-xs px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: disease === d ? 'rgba(79,157,255,0.2)' : 'rgba(255,255,255,0.04)',
                    border: disease === d ? '1px solid rgba(79,157,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
                    color: disease === d ? '#60a5fa' : '#64748b'
                  }}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 glass px-3 py-2.5">
            <MapPin size={14} className="text-blue-400 shrink-0" />
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 glass px-3 py-2.5">
              <Search size={14} className="text-blue-400 shrink-0" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Ask a medical research question..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
              />
            </div>
            <button type="submit" disabled={!query.trim() || isLoading}
              className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0">
              <Send size={15} className="text-white" />
            </button>
            <button type="button" onClick={handleClear}
              className="w-10 h-10 rounded-xl glass glass-hover flex items-center justify-center transition-colors shrink-0">
              <Trash2 size={15} className="text-slate-400" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
