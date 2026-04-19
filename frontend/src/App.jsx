import { useState, useEffect, Component } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Workspace from './components/Workspace';
import EvidencePanel from './components/EvidencePanel';
import { checkHealth, sendMessage } from './api';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8">
          <p className="text-red-500 text-sm mb-2">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} className="text-xs text-blue-600">Retry</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const [status, setStatus] = useState('loading');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('research'); // research | simple
  const [context, setContext] = useState({ disease: '', intent: 'general', location: '' });
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('papers');
  const [sessionId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    checkHealth().then(() => setStatus('online')).catch(() => setStatus('offline'));
  }, []);

  const handleQuery = async (query) => {
    if (!query.trim() || isLoading) return;
    setIsLoading(true);

    // Auto-detect disease from query
    const diseaseMap = {
      'lung cancer': 'Lung Cancer', 'diabetes': 'Diabetes', 'alzheimer': "Alzheimer's Disease",
      'heart disease': 'Heart Disease', 'hypertension': 'Hypertension', 'tuberculosis': 'Tuberculosis',
      'breast cancer': 'Breast Cancer', 'covid': 'COVID-19', 'cancer': 'Cancer',
      'stroke': 'Stroke', 'parkinson': 'Parkinson', 'asthma': 'Asthma', 'arthritis': 'Arthritis'
    };
    const q = query.toLowerCase();
    const detectedDisease = Object.entries(diseaseMap).find(([k]) => q.includes(k))?.[1];
    
    // Always update if detected new disease
    if (detectedDisease && detectedDisease !== context.disease) {
      setContext(prev => ({ ...prev, disease: detectedDisease }));
    }

    // Auto-detect active tab
    const detectedTab = /researcher|author|scientist/.test(q) ? 'researchers'
      : /trial|clinical study/.test(q) ? 'trials'
      : /trend|recent|latest/.test(q) ? 'trends'
      : 'papers';
    setActiveTab(detectedTab);

    const session = { id: Date.now(), query, context: { ...context }, timestamp: new Date(), result: null };
    setSessions(prev => [session, ...prev.slice(0, 19)]);
    setActiveSession(session.id);

    try {
      const { data } = await sendMessage({
        sessionId,
        disease: context.disease,
        query,
        location: context.location,
        isFollowUp: sessions.length > 0
      });
      const resultData = {
        query,
        context: { ...context },
        response: data.response || '',
        insights: data.insights || null,
        papers: data.papers || [],
        trials: data.trials || [],
        confidence: typeof data.confidence === 'object' ? data.confidence : { score: data.confidence || 0, label: 'Medium', reason: '' },
        counts: data.counts || { papersUsed: (data.papers||[]).length, trialsUsed: (data.trials||[]).length, papersAnalyzed: data.meta?.totalFetched || 0, trialsAnalyzed: data.meta?.totalTrials || 0 },
        trends: data.trends || null,
        followUps: data.followUps || [],
        meta: data.meta || null
      };
      setResult(resultData);
      // Save result into session
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, result: resultData } : s));
    } catch (err) {
      const errResult = { query, context: { ...context }, response: `Error: ${err.response?.data?.error || err.message}`, insights: null, papers: [], trials: [], confidence: null, trends: null, meta: null };
      setResult(errResult);
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, result: errResult } : s));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSession = (id) => {
    setActiveSession(id);
    const session = sessions.find(s => s.id === id);
    if (session?.result) {
      setResult(session.result);
      setContext(session.context);
    }
  };

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        <Navbar context={context} setContext={setContext} mode={mode} setMode={setMode} status={status} />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar sessions={sessions} activeSession={activeSession} onSelect={handleSelectSession} onNew={() => { setResult(null); setActiveSession(null); }} />
          <Workspace result={result} isLoading={isLoading} onQuery={handleQuery} context={context} mode={mode} />
          {(result?.papers?.length > 0 || result?.trials?.length > 0) && (
            <EvidencePanel data={result} isLoading={isLoading} activeTab={activeTab} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
