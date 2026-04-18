import { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { sendMessage } from '../api';

const ALL_DISEASES = ['Diabetes', 'Cancer', 'Alzheimer', 'Hypertension', 'COVID-19', 'Parkinson', 'Asthma', 'Tuberculosis', 'Arthritis', 'Depression', 'Stroke', 'HIV/AIDS', 'Heart Disease'];
const CHIPS = ['Cancer', 'Diabetes', 'COVID-19', 'Alzheimer', 'Hypertension'];

function Field({ icon, value, onChange, onFocus, placeholder, right }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 bg-white border transition-all"
      style={{ borderColor: focused ? '#2563EB' : '#E5E7EB', boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none' }}>
      <span className="text-gray-400 shrink-0">{icon}</span>
      <input value={value} onChange={e => onChange(e.target.value)}
        onFocus={() => { setFocused(true); onFocus?.(); }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder} autoComplete="off"
        className="flex-1 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none" />
      {right}
    </div>
  );
}

function Textarea({ value, onChange, onKeyDown }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      placeholder="Ask a clinical research question…" rows={5}
      className="w-full rounded-xl px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-400 bg-white border outline-none resize-none transition-all"
      style={{ borderColor: focused ? '#2563EB' : '#E5E7EB', boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none' }} />
  );
}

export default function LeftPanel({ onResult, isLoading, setIsLoading }) {
  const [disease, setDisease] = useState('');
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (!ref.current?.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const onDiseaseInput = (v) => {
    setDisease(v);
    setFiltered(v ? ALL_DISEASES.filter(d => d.toLowerCase().includes(v.toLowerCase())).slice(0, 6) : ALL_DISEASES.slice(0, 6));
    setShowDrop(true);
  };

  const pick = (d) => { setDisease(d); setShowDrop(false); };

  const submit = async () => {
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const { data } = await sendMessage({ sessionId, disease, query, location, isFollowUp: false });
      onResult({
        papers: data.papers || [],
        trials: data.trials || [],
        insights: data.insights || null,
        response: data.response || '',
        confidence: typeof data.confidence === 'object' ? data.confidence : { score: data.confidence || 0, label: 'Medium', reason: '' },
        trends: data.trends || null,
        meta: data.meta || null
      });
    } catch (err) {
      onResult({ papers: [], trials: [], insights: null, response: `Error: ${err.response?.data?.error || err.message}`, confidence: null, trends: null, meta: null });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full px-4 py-5 gap-5 overflow-y-auto">

      {/* Disease */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Disease</label>
        <div className="relative" ref={ref}>
          <Field icon={<Search size={13} />} value={disease} onChange={onDiseaseInput}
            onFocus={() => { setFiltered(ALL_DISEASES.slice(0, 6)); setShowDrop(true); }}
            placeholder="e.g. Lung Cancer"
            right={disease && <button type="button" onMouseDown={() => { setDisease(''); setShowDrop(false); }} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>} />
          {showDrop && filtered.length > 0 && (
            <div className="absolute z-30 w-full mt-1 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-lg py-1">
              {filtered.map(d => (
                <button key={d} type="button" onMouseDown={() => pick(d)}
                  className="w-full text-left px-3.5 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                  {d}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {CHIPS.map(c => (
            <button key={c} onClick={() => pick(c)} type="button"
              className="text-xs px-2.5 py-1 rounded-full border transition-all"
              style={{
                background: disease === c ? '#EFF6FF' : '#F9FAFB',
                borderColor: disease === c ? '#93C5FD' : '#E5E7EB',
                color: disease === c ? '#1D4ED8' : '#6B7280'
              }}
              onMouseEnter={e => { if (disease !== c) { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151'; } }}
              onMouseLeave={e => { if (disease !== c) { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.color = '#6B7280'; } }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Location <span className="text-gray-300 font-normal">(optional)</span></label>
        <Field icon={<MapPin size={13} />} value={location} onChange={setLocation} placeholder="India, USA…" />
      </div>

      {/* Query */}
      <div className="flex-1 flex flex-col">
        <label className="block text-xs font-medium text-gray-500 mb-1.5">Research Question</label>
        <Textarea value={query} onChange={setQuery}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
      </div>

      {/* Submit */}
      <div className="space-y-3">
        <button onClick={submit} disabled={!query.trim() || isLoading}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700 active:scale-98 select-none"
          style={{ transition: 'all .2s ease' }}
          onMouseEnter={e => { if (!isLoading && query.trim()) e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
          {isLoading
            ? <span className="flex items-center justify-center gap-1.5">
                <span className="d1 w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span className="d2 w-1.5 h-1.5 rounded-full bg-white inline-block" />
                <span className="d3 w-1.5 h-1.5 rounded-full bg-white inline-block" />
              </span>
            : 'Analyze Research'}
        </button>
        <p className="text-center text-xs text-gray-300">PubMed · OpenAlex · ClinicalTrials.gov</p>
      </div>
    </div>
  );
}
