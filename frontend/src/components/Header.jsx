import { motion } from 'framer-motion';
import { Dna, Activity, Download } from 'lucide-react';
import { generateReport } from '../api';

export default function Header({ status, currentDisease, resultData }) {
  const isOnline = status === 'online';

  const handleExport = async () => {
    if (!resultData?.response) return;
    try {
      const { data } = await generateReport({
        disease: resultData.meta?.disease || currentDisease,
        query: resultData.meta?.disease || '',
        answer: resultData.response,
        papers: resultData.papers || [],
        trials: resultData.trials || [],
        confidence: resultData.confidence
      });
      const blob = new Blob([data.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = data.filename || 'curalink_report.txt'; a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
  };

  return (
    <header className="shrink-0 border-b border-blue-900/30 px-6 py-3 flex items-center justify-between"
      style={{ background: 'rgba(11,18,32,0.9)', backdropFilter: 'blur(20px)' }}>

      {/* Logo */}
      <motion.div className="flex items-center gap-3"
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center neon-border"
          style={{ background: 'rgba(37,99,235,0.15)' }}
          animate={{ rotate: [0, 5, -5, 0] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}>
          <Dna size={18} className="text-blue-400" />
        </motion.div>
        <div>
          <h1 className="font-bold text-base gradient-text leading-none">CuraLink</h1>
          <p className="text-xs text-slate-600 mt-0.5">AI Medical Research Intelligence</p>
        </div>
      </motion.div>

      {/* Center — disease badge */}
      {currentDisease && (
        <motion.div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-xl neon-border"
          style={{ background: 'rgba(37,99,235,0.08)' }}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <Activity size={12} className="text-blue-400" />
          <span className="text-xs font-medium text-blue-300">{currentDisease}</span>
        </motion.div>
      )}

      {/* Right */}
      <div className="flex items-center gap-3">
        {resultData?.response && (
          <motion.button onClick={handleExport} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-blue-300 transition-colors glass glass-hover">
            <Download size={12} /> Export
          </motion.button>
        )}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 pulse-ring' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-500 hidden sm:block">{isOnline ? 'Connected' : 'Offline'}</span>
        </div>
      </div>
    </header>
  );
}
