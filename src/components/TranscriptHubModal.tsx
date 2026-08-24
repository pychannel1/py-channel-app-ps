import React, { useState } from 'react';
import {
  FileText,
  X,
  Copy,
  Check,
  Download,
  Search,
  ArrowUpRight,
  Languages,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TranscriptSegment } from '../types';
import { SAMPLE_MOVIES } from '../data/sampleMovies';

interface TranscriptHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSegments: TranscriptSegment[];
  onLoadSegments: (segments: TranscriptSegment[], title: string) => void;
}

export const TranscriptHubModal: React.FC<TranscriptHubModalProps> = ({
  isOpen,
  onClose,
  currentSegments,
  onLoadSegments,
}) => {
  const { language, t } = useLanguage();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'library'>('current');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportSrt = () => {
    const srtContent = currentSegments
      .map((s, idx) => {
        return `${idx + 1}\n${s.start.replace('.', ',')} --> ${s.end.replace('.', ',')}\n${s.myanmarText || s.sourceText}\n`;
      })
      .join('\n');

    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recap_subtitles_${Date.now()}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => {
    const fullText = currentSegments
      .map((s, idx) => `[${s.start} - ${s.end}]\nမူရင်း: ${s.sourceText}\nမြန်မာပြန်: ${s.myanmarText || '(မရှိသေးပါ)'}\n`)
      .join('\n');

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recap_script_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredCurrent = currentSegments.filter(
    (s) =>
      s.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.myanmarText && s.myanmarText.includes(searchQuery))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden backdrop-blur-2xl animate-fadeIn my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/10 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className={language === 'mm' ? 'font-burmese' : 'font-sans'}>
                  {t.transcriptHub}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {currentSegments.length} Segments
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-burmese">
                {language === 'mm'
                  ? 'မူရင်းစာသားနှင့် မြန်မာပြန်စာသားများကို စီမံခန့်ခွဲခြင်းနှင့် Export ပြုလုပ်ခြင်း'
                  : 'Manage, search, and export transcribed scripts & Myanmar recaps'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Filter */}
        <div className="p-4 border-b border-white/10 bg-slate-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('current')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'current'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-white/10'
              }`}
            >
              {language === 'mm' ? 'လက်ရှိ ပရောဂျက် စာသားများ' : 'Active Project'}
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-white/10'
              }`}
            >
              {language === 'mm' ? 'နမူနာ ရုပ်ရှင် စာကြည့်တိုက်' : 'Sample Movies'}
            </button>
          </div>

          {activeTab === 'current' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={language === 'mm' ? 'စာသား ရှာဖွေရန်...' : 'Search transcripts...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>

              <button
                type="button"
                onClick={handleExportSrt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                title="Export as Subtitle SRT"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>.SRT</span>
              </button>

              <button
                type="button"
                onClick={handleExportTxt}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                title="Export as Text TXT"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>.TXT</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-3">
          {activeTab === 'current' ? (
            filteredCurrent.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                {language === 'mm' ? 'စာသားမှတ်တမ်း မတွေ့ရှိပါ' : 'No transcript segments found'}
              </div>
            ) : (
              filteredCurrent.map((seg, idx) => (
                <div
                  key={seg.id || idx}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-white/20 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                        #{idx + 1}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {seg.start} &rarr; {seg.end}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(seg.myanmarText || seg.sourceText, seg.id)}
                        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/5 transition-colors cursor-pointer"
                      >
                        {copiedId === seg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-300">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Dual language comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5">
                      <p className="text-[10px] font-mono text-slate-500 mb-1">
                        SOURCE ({seg.speaker || 'Narrator'})
                      </p>
                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        {seg.sourceText}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
                      <p className="text-[10px] font-mono text-amber-400 mb-1">
                        BURMESE RECAP (မြန်မာပြန်)
                      </p>
                      <p className="text-xs text-amber-100 font-burmese leading-relaxed">
                        {seg.myanmarText || (
                          <span className="text-slate-500 italic">ဘာသာမပြန်ရသေးပါ</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )
          ) : (
            SAMPLE_MOVIES.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SAMPLE_MOVIES.map((movie) => (
                  <div
                    key={movie.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          {movie.genre}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{movie.duration}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                        {movie.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2">{movie.description}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onLoadSegments(movie.segments, movie.title);
                        onClose();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <span>{language === 'mm' ? 'ဤပရောဂျက်ကို ဖွင့်မည်' : 'Load Into Studio'}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 font-burmese text-sm">
                သိမ်းဆည်းထားသော Script များ မရှိသေးပါ။ Step 1 တွင် Video ဖိုင် တင်သွင်းပါ။
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
