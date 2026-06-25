import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Calculator, 
  Layers, 
  Grid, 
  Brush, 
  Check, 
  RefreshCw, 
  ArrowLeft,
  ChevronRight,
  Info,
  Sparkles,
  Volume2,
  VolumeX,
  Sliders,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MaterialCalculator: React.FC = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'concrete' | 'brickwork' | 'plaster'>('concrete');

  // AI & Voice Reader States
  const DEFAULT_RATES = {
    brickPricePerPc: 13,
    cementPricePerBag: 550,
    sandPricePerCFT: 50,
    stonePricePerCFT: 130,
    rebarPricePerKg: 96,
    laborRateRajMistri: 900,
    laborRateAssistant: 650,
    typicalBrands: {
      cement: ["Shah Cement", "Bashundhara Cement", "Seven Rings Cement", "Fresh Cement"],
      rebar: ["BSRM", "AKS", "KSRM"]
    }
  };

  const [rates, setRates] = useState<any>(DEFAULT_RATES);
  const [loadingEstimate, setLoadingEstimate] = useState<boolean>(false);
  const [estimateResult, setEstimateResult] = useState<string>('');
  const [voiceRate, setVoiceRate] = useState<number>(1);
  const [voiceVolume, setVoiceVolume] = useState<number>(1);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  React.useEffect(() => {
    // Fetch Bangladesh Construction market rates on mount, falling back gracefully to robust defaults
    fetch('/api/calculator/rates')
      .then(res => {
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data && typeof data === 'object') {
          setRates(prev => ({ ...prev, ...data }));
        }
      })
      .catch(err => {
        console.warn("Could not load fresh market rates from server, relying on local standard database:", err.message || err);
      });
  }, []);

  // Ensure speech synthesis stops on component unmount
  React.useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Input States
  // 1. Concrete Layout
  const [concreteLength, setConcreteLength] = useState<string>('10');
  const [concreteWidth, setConcreteWidth] = useState<string>('10');
  const [concreteThickness, setConcreteThickness] = useState<string>('5'); // in inches
  const [concreteRatio, setConcreteRatio] = useState<string>('1:1.5:3'); // (cement:sand:stone)
  const [rebarPercentage, setRebarPercentage] = useState<string>('1.5'); // Rebar density % (typical slab/beam)

  // 2. Brickwork Layout
  const [brickLength, setBrickLength] = useState<string>('10');
  const [brickHeight, setBrickHeight] = useState<string>('10');
  const [brickThickness, setBrickThickness] = useState<'5' | '10'>('5'); // 5" or 10" wall
  const [brickRatio, setBrickRatio] = useState<string>('1:4'); // (cement:sand)

  // 3. Plaster Layout
  const [plasterArea, setPlasterArea] = useState<string>('100'); // SFT
  const [plasterThickness, setPlasterThickness] = useState<string>('0.5'); // in inches (0.5" or 0.75")
  const [plasterRatio, setPlasterRatio] = useState<string>('1:4'); // cement:sand

  // Reset function
  const resetAll = () => {
    setConcreteLength('10');
    setConcreteWidth('10');
    setConcreteThickness('5');
    setConcreteRatio('1:1.5:3');
    setRebarPercentage('1.5');

    setBrickLength('10');
    setBrickHeight('10');
    setBrickThickness('5');
    setBrickRatio('1:4');

    setPlasterArea('100');
    setPlasterThickness('0.5');
    setPlasterRatio('1:4');
  };

  // Helper validators
  const parseNum = (val: string): number => {
    const parsed = parseFloat(val);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  };

  // Standard calculations
  const calculateConcrete = () => {
    const l = parseNum(concreteLength);
    const w = parseNum(concreteWidth);
    const th = parseNum(concreteThickness) / 12; // thickness in feet
    const rebarPct = parseNum(rebarPercentage);

    const volumeCFT = l * w * th;
    const dryVolumeCFT = volumeCFT * 1.54; // Bangladeshi dry volume allowance factor is 1.54

    // Parse ratio
    const ratioParts = concreteRatio.split(':').map(Number);
    const sumRatio = ratioParts.reduce((a, b) => a + b, 0) || 5.5;
    const cementRatio = ratioParts[0] || 1;
    const sandRatio = ratioParts[1] || 1.5;
    const aggregateRatio = ratioParts[2] || 3;

    // Material CFTs
    const cementCFT = (cementRatio / sumRatio) * dryVolumeCFT;
    const sandCFT = (sandRatio / sumRatio) * dryVolumeCFT;
    const aggregateCFT = (aggregateRatio / sumRatio) * dryVolumeCFT;

    // Convert cement to standard Bangladeshi bags (1 bag = 1.25 CFT)
    const cementBagsCount = cementCFT / 1.25;

    // Calculate Rebar weight in Kg
    // Formula: Concrete Volume (CFT) * rebar_pct % * 222.28 Kg (solid steel density relative per CFT)
    const rebarKg = volumeCFT * (rebarPct / 100) * 222.28;

    return {
      volume: volumeCFT.toFixed(2),
      cementBags: Math.ceil(cementBagsCount),
      sand: sandCFT.toFixed(1),
      aggregate: aggregateCFT.toFixed(1),
      rebar: rebarKg.toFixed(1)
    };
  };

  const calculateBrickwork = () => {
    const l = parseNum(brickLength);
    const h = parseNum(brickHeight);
    const totalAreaSFT = l * h;

    // Standard Bangladesh numbers:
    // 5" Wall needs 5 bricks per SFT, dry mortar is 0.15 CFT per SFT
    // 10" Wall needs 10 bricks per SFT, dry mortar is 0.30 CFT per SFT
    const multiplier = brickThickness === '5' ? 5 : 10;
    const mortarFactor = brickThickness === '5' ? 0.15 : 0.30;

    const bricksNeeded = totalAreaSFT * multiplier;
    // Dry mortar volume needed for the total square feet
    const dryMortarVolumeCFT = totalAreaSFT * mortarFactor;

    // Parse ratio
    const ratioParts = brickRatio.split(':').map(Number);
    const sumRatio = ratioParts.reduce((a, b) => a + b, 0) || 5;
    const cementRatio = ratioParts[0] || 1;
    const sandRatio = ratioParts[1] || 4;

    const cementCFT = (cementRatio / sumRatio) * dryMortarVolumeCFT;
    const sandCFT = (sandRatio / sumRatio) * dryMortarVolumeCFT;

    const cementBagsCount = cementCFT / 1.25;

    return {
      area: totalAreaSFT.toFixed(1),
      bricks: Math.ceil(bricksNeeded),
      cementBags: Math.ceil(cementBagsCount),
      sand: sandCFT.toFixed(1)
    };
  };

  const calculatePlaster = () => {
    const area = parseNum(plasterArea);
    const th_inch = parseNum(plasterThickness);
    const th_ft = th_inch / 12;

    const wetVolumeCFT = area * th_ft;
    const dryVolumeCFT = wetVolumeCFT * 1.33; // Standard 1.33 expansion allowance for dry plaster mortar

    // Parse ratio
    const ratioParts = plasterRatio.split(':').map(Number);
    const sumRatio = ratioParts.reduce((a, b) => a + b, 0) || 5;
    const cementRatio = ratioParts[0] || 1;
    const sandRatio = ratioParts[1] || 4;

    const cementCFT = (cementRatio / sumRatio) * dryVolumeCFT;
    const sandCFT = (sandRatio / sumRatio) * dryVolumeCFT;

    const cementBagsCount = cementCFT / 1.25;

    return {
      volume: wetVolumeCFT.toFixed(2),
      cementBags: Math.ceil(cementBagsCount),
      sand: sandCFT.toFixed(1)
    };
  };

  const concreteRes = calculateConcrete();
  const brickRes = calculateBrickwork();
  const plasterRes = calculatePlaster();

  // AI Estimate Trigger
  const handleGetEstimate = async () => {
    setLoadingEstimate(true);
    setEstimateResult('');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    try {
      const activeRes = activeTab === 'concrete' 
        ? concreteRes 
        : activeTab === 'brickwork' 
        ? brickRes 
        : plasterRes;

      const activeInputs = activeTab === 'concrete'
        ? { concreteLength, concreteWidth, concreteThickness, concreteRatio, rebarPercentage }
        : activeTab === 'brickwork'
        ? { brickLength, brickHeight, brickThickness, brickRatio }
        : { plasterArea, plasterThickness, plasterRatio };

      const response = await fetch('/api/calculator/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tab: activeTab,
          inputs: activeInputs,
          results: activeRes
        })
      });

      if (!response.ok) {
        let serverErrorMsg = '';
        try {
          const errData = await response.json();
          serverErrorMsg = errData.error || errData.message || '';
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(serverErrorMsg || `Server returned status ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || '';
      setEstimateResult(text);
      
      // Automatically trigger voice feedback reading
      if (text) {
        setTimeout(() => {
          startSpeech(text);
        }, 200);
      }
    } catch (err: any) {
      console.error(err);
      const detailMsg = err?.message ? ` (${err.message})` : '';
      setEstimateResult(lang === 'bn' 
        ? `দুঃখিত, এআই অ্যাসিস্ট্যান্টের সাথে যোগাযোগ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।${detailMsg}` 
        : `Sorry, failed to connect to Gemini AI. Please try again.${detailMsg}`);
    } finally {
      setLoadingEstimate(false);
    }
  };

  // Speaks complete voice reading utilizing SpeechSynthesis
  const startSpeech = (textOverride?: string) => {
    if (!('speechSynthesis' in window)) {
      alert(lang === 'bn' ? 'আপনার ব্রাউজারটি ভয়েস রিডার সাপোর্ট করে না।' : 'Your browser does not support speech synthesis.');
      return;
    }

    if (isSpeaking && !textOverride) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const labelResults = activeTab === 'concrete' 
      ? `কংক্রিট স্ল্যাব ভলিউম ${concreteRes.volume} সি এফ টি, সিমেন্ট ${concreteRes.cementBags} ব্যাগ, বালু ${concreteRes.sand} সি এফ টি, পাথর ${concreteRes.aggregate} সি এফ টি এবং রড ${concreteRes.rebar} কেজি।`
      : activeTab === 'brickwork'
      ? `মোট ক্ষেত্রফল ${brickRes.area} স্কয়ার ফিট, ইটের পরিমাণ ${brickRes.bricks} পিস, সিমেন্ট ${brickRes.cementBags} ব্যাগ এবং বালু ${brickRes.sand} সি এফ টি।`
      : `প্লাস্টার ভলিউম ${plasterRes.volume} সি এফ টি, সিমেন্ট ${plasterRes.cementBags} ব্যাগ এবং বালু ${plasterRes.sand} সি এফ টি।`;

    const targetText = textOverride !== undefined ? textOverride : estimateResult;
    const cleanText = (labelResults + " " + targetText)
      .replace(/\*\*|##|#/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = voiceRate;
    utterance.volume = voiceVolume;
    
    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find(v => v.lang.includes('bn') || v.name.toLowerCase().includes('bangla') || v.name.toLowerCase().includes('bengali'));
    if (bnVoice) {
      utterance.voice = bnVoice;
    } else {
      utterance.lang = 'bn-BD';
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Custom regex-based markdown parser to render text cleanly
  const renderFormattedText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const elements = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={pIdx} className="text-brand-amber font-black">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
        return (
          <li key={idx} className="ml-4 list-disc text-cream/90 text-[11px] leading-relaxed font-bold my-1">
            {elements.map((el, elIdx) => {
              if (typeof el === 'string') {
                return el.replace(/^[*-\s]+/, '');
              }
              return el;
            })}
          </li>
        );
      }

      const isSubheader = line.startsWith('###') || line.startsWith('##') || line.startsWith('#');
      if (isSubheader) {
        return (
          <h4 key={idx} className="text-brand-blue text-[11px] font-black uppercase tracking-widest mt-4 mb-1.5 flex items-center gap-1">
            <span>⚙️</span> {line.replace(/^#+\s*/, '')}
          </h4>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-cream/90 text-[11px] leading-relaxed font-bold my-1">
          {elements}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-brand-dark pb-32">
      {/* Quick Nav Header */}
      <div className="glass-header sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="p-2.5 bg-brand-surface/80 hover:bg-brand-surface rounded-2xl text-cream active:scale-95 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-brand-amber" />
          </button>
          
          <div className="flex items-center gap-3">
            {/* Highly Polished & Highlighted Estimator Logo */}
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-amber to-brand-amber-light text-white shadow-lg shadow-brand-amber/20 overflow-hidden group">
              <div className="absolute inset-0 bg-white/10 group-hover:scale-115 transition-transform duration-500" />
              <Calculator className="w-5 h-5 animate-pulse" />
              <span className="absolute top-1 right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-blue"></span>
              </span>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-cream leading-none tracking-tight">
                  {lang === 'bn' ? 'ম্যাটেরিয়াল ক্যালকুলেটর' : 'Material Calculator'}
                </h1>
                <span className="bg-brand-amber/15 text-brand-amber border border-brand-amber/30 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full animate-pulse shrink-0">
                  AI PRO
                </span>
              </div>
              <p className="text-[10px] font-black text-gray-teal uppercase tracking-widest mt-1">
                {lang === 'bn' ? 'স্ট্যান্ডার্ড SFT হিসাব' : 'Standard SFT Estimator'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Toggle Grid Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-brand-slate p-1.5 rounded-[24px]">
          <button
            onClick={() => setActiveTab('concrete')}
            className={`py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${
              activeTab === 'concrete' 
                ? 'bg-brand-blue text-white shadow-lg' 
                : 'text-gray-teal hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'কংক্রিট' : 'Concrete'}
          </button>
          <button
            onClick={() => setActiveTab('brickwork')}
            className={`py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${
              activeTab === 'brickwork' 
                ? 'bg-brand-blue text-white shadow-lg' 
                : 'text-gray-teal hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'গাঁথুনি' : 'Brick Wall'}
          </button>
          <button
            onClick={() => setActiveTab('plaster')}
            className={`py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all ${
              activeTab === 'plaster' 
                ? 'bg-brand-blue text-white shadow-lg' 
                : 'text-gray-teal hover:text-white'
            }`}
          >
            {lang === 'bn' ? 'প্লাস্টার' : 'Plaster'}
          </button>
        </div>

        {/* Dynamic Forms */}
        <div className="bg-brand-surface border border-white/5 rounded-[32px] p-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'concrete' && (
              <motion.div
                key="concrete"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 border-b border-white/5 pb-2 mb-2">
                  <Layers className="w-5 h-5 text-brand-amber animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">
                    {lang === 'bn' ? 'কংক্রিট/ঢালাই পরিমাপ' : 'Concrete Slab / Column'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest">
                      {lang === 'bn' ? 'দৈর্ঘ্য (ফুট)' : 'Length (Feet)'}
                    </label>
                    <input
                      type="number"
                      value={concreteLength}
                      onChange={(e) => setConcreteLength(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-sm transition-all focus:ring-1 focus:ring-brand-blue"
                      placeholder="10"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest">
                      {lang === 'bn' ? 'প্রস্থ (ফুট)' : 'Width (Feet)'}
                    </label>
                    <input
                      type="number"
                      value={concreteWidth}
                      onChange={(e) => setConcreteWidth(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-sm transition-all focus:ring-1 focus:ring-brand-blue"
                      placeholder="10"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest">
                      {lang === 'bn' ? 'পুরুত্ব (ইঞ্চি)' : 'Thickness (Inches)'}
                    </label>
                    <input
                      type="number"
                      value={concreteThickness}
                      onChange={(e) => setConcreteThickness(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-sm transition-all focus:ring-1 focus:ring-brand-blue"
                      placeholder="5"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest">
                      {lang === 'bn' ? 'রডার অনুপাত (%)' : 'Rebar (Rod) %'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={rebarPercentage}
                      onChange={(e) => setRebarPercentage(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-sm transition-all focus:ring-1 focus:ring-brand-blue"
                      placeholder="1.5"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest block">
                    {lang === 'bn' ? 'মিশ্রণ অনুপাত (সিমেন্ট : বালু : পাথর)' : 'Mixing Ratio (Cement : Sand : Stone)'}
                  </label>
                  <select
                    value={concreteRatio}
                    onChange={(e) => setConcreteRatio(e.target.value)}
                    className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-xs transition-all uppercase tracking-wider focus:ring-1 focus:ring-brand-blue"
                  >
                    <option value="1:1.5:3">1 : 1.5 : 3 (M20 standard)</option>
                    <option value="1:2:4">1 : 2 : 4 (M15 standard)</option>
                    <option value="1:1:2">1 : 1 : 2 (M25 heavy columns)</option>
                  </select>
                </div>
              </motion.div>
            )}

            {activeTab === 'brickwork' && (
              <motion.div
                key="brickwork"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 border-b border-white/5 pb-2 mb-2">
                  <Grid className="w-5 h-5 text-brand-amber animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">
                    {lang === 'bn' ? 'ইটের গাঁথুনি পরিমাপ' : 'Brick Wall Installation'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest">
                      {lang === 'bn' ? 'দেয়ালের দৈর্ঘ্য (ফুট)' : 'Wall Length (Feet)'}
                    </label>
                    <input
                      type="number"
                      value={brickLength}
                      onChange={(e) => setBrickLength(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-sm transition-all focus:ring-1 focus:ring-brand-blue"
                      placeholder="10"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest">
                      {lang === 'bn' ? 'দেয়ালের উচ্চতা (ফুট)' : 'Wall Height (Feet)'}
                    </label>
                    <input
                      type="number"
                      value={brickHeight}
                      onChange={(e) => setBrickHeight(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-sm transition-all focus:ring-1 focus:ring-brand-blue"
                      placeholder="10"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest block">
                      {lang === 'bn' ? 'দেয়ালের পুরুত্ব' : 'Wall Thickness'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBrickThickness('5')}
                        className={`py-3 rounded-xl border text-[10px] font-black transition-all ${
                          brickThickness === '5'
                            ? 'bg-brand-blue text-white border-brand-blue'
                            : 'bg-brand-slate text-gray-teal border-white/5 hover:text-white'
                        }`}
                      >
                        5 Inch (৫ ইঞ্চি)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrickThickness('10')}
                        className={`py-3 rounded-xl border text-[10px] font-black transition-all ${
                          brickThickness === '10'
                            ? 'bg-brand-blue text-white border-brand-blue'
                            : 'bg-brand-slate text-gray-teal border-white/5 hover:text-white'
                        }`}
                      >
                        10 Inch (১০ ইঞ্চি)
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest block">
                      {lang === 'bn' ? 'মশলা অনুপাত' : 'Mortar Ratio (Cement:Sand)'}
                    </label>
                    <select
                      value={brickRatio}
                      onChange={(e) => setBrickRatio(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-xl px-4 py-3 text-cream font-bold outline-none focus:border-brand-blue text-xs transition-all focus:ring-1 focus:ring-brand-blue"
                    >
                      <option value="1:4">1 : 4 (Standard plaster/wall)</option>
                      <option value="1:5">1 : 5 (Medium load)</option>
                      <option value="1:6">1 : 6 (Boundary walls)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'plaster' && (
              <motion.div
                key="plaster"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 border-b border-white/5 pb-2 mb-2">
                  <Brush className="w-5 h-5 text-brand-amber animate-pulse" />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">
                    {lang === 'bn' ? 'দেয়াল প্লাস্টার পরিমাপ' : 'Wall Plastering'}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest">
                      {lang === 'bn' ? 'মোট ক্ষেত্রফল (বর্গফুট / SFT)' : 'Total Area (Square Feet / SFT)'}
                    </label>
                    <input
                      type="number"
                      value={plasterArea}
                      onChange={(e) => setPlasterArea(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-sm transition-all focus:ring-1 focus:ring-brand-blue"
                      placeholder="100"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest block">
                      {lang === 'bn' ? 'পুরুত্ব (ইঞ্চি)' : 'Thickness (Inches)'}
                    </label>
                    <select
                      value={plasterThickness}
                      onChange={(e) => setPlasterThickness(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-xs transition-all focus:ring-1 focus:ring-brand-blue"
                    >
                      <option value="0.5">0.5 Inch (1/2" — Standard Interior)</option>
                      <option value="0.75">0.75 Inch (3/4" — Standard Exterior)</option>
                      <option value="0.25">0.25 Inch (1/4" — Ceiling plaster)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-teal uppercase tracking-widest block">
                      {lang === 'bn' ? 'মশলা অনুপাত' : 'Mortar Ratio (Cement:Sand)'}
                    </label>
                    <select
                      value={plasterRatio}
                      onChange={(e) => setPlasterRatio(e.target.value)}
                      className="w-full bg-brand-slate border border-brand-surface rounded-2xl px-4 py-3.5 text-cream font-bold outline-none focus:border-brand-blue text-xs transition-all focus:ring-1 focus:ring-brand-blue"
                    >
                      <option value="1:4">1 : 4 (Premium ceiling / wall)</option>
                      <option value="1:5">1 : 5 (Interior partition)</option>
                      <option value="1:6">1 : 6 (Standard wall plaster)</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reset button bar */}
          <div className="flex justify-end border-t border-white/5 pt-4">
            <button
              onClick={resetAll}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-teal hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Inputs
            </button>
          </div>
        </div>

        {/* Calculations Outputs Card */}
        <div className="bg-brand-blue/10 dark:bg-slate-900/40 border border-brand-blue/20 rounded-[32px] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-amber/10 rounded-full blur-[40px] pointer-events-none" />

          <div className="space-y-4">
            <h3 className="text-xs font-black text-cream uppercase tracking-widest border-b border-brand-surface pb-3 flex items-center justify-between">
              <span>{lang === 'bn' ? 'প্রয়োজনীয় উপকরণের হিসাব' : 'Required Materials Estimate'}</span>
              <span className="text-[9px] font-bold text-brand-amber text-nowrap">BD Standard (SFT/CFT)</span>
            </h3>

            {activeTab === 'concrete' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-slate/60 p-4 rounded-2xl border border-brand-surface/30">
                  <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'ঢালাইয়ের আয়তন (CFT)' : 'Concrete Volume (CFT)'}
                  </span>
                  <p className="text-xl font-black text-cream">{concreteRes.volume} <span className="text-[10px] font-normal text-gray-teal">CFT</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl border-l-[3px] border-brand-amber border-y border-r border-brand-surface/30">
                  <span className="text-[8px] font-black text-brand-amber uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'সিমেন্ট (ব্যাগ)' : 'Cement Bags'}
                  </span>
                  <p className="text-xl font-black text-brand-amber">{concreteRes.cementBags} <span className="text-[10px] font-normal text-brand-amber/80">Bags</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl border border-brand-surface/30">
                  <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'বালু (CFT)' : 'Sand (CFT)'}
                  </span>
                  <p className="text-xl font-black text-cream">{concreteRes.sand} <span className="text-[10px] font-normal text-gray-teal">CFT</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl border border-brand-surface/30">
                  <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'পাথর / খোয়া (CFT)' : 'Aggregates/Khoya (CFT)'}
                  </span>
                  <p className="text-xl font-black text-cream">{concreteRes.aggregate} <span className="text-[10px] font-normal text-gray-teal">CFT</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl col-span-2 border-l-[3px] border-brand-blue border-y border-r border-brand-surface/30">
                  <span className="text-[8px] font-black text-brand-blue uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'রড / Rebar ওজন (Kg)' : 'Estimated Rebar/Rod Weight'}
                  </span>
                  <p className="text-xl font-black text-cream">{concreteRes.rebar} <span className="text-[10px] font-normal text-gray-teal">Kg</span></p>
                </div>
              </div>
            )}

            {activeTab === 'brickwork' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-slate/60 p-4 rounded-2xl border border-brand-surface/30">
                  <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'মোট ক্ষেত্রফল (SFT)' : 'Total Wall Area (SFT)'}
                  </span>
                  <p className="text-xl font-black text-cream">{brickRes.area} <span className="text-[10px] font-normal text-gray-teal">SFT</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl border-l-[3px] border-brand-amber border-y border-r border-brand-surface/30">
                  <span className="text-[8px] font-black text-brand-amber uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'ইটের সংখ্যা (পিস)' : 'Bricks Count (Pcs)'}
                  </span>
                  <p className="text-xl font-black text-brand-amber">{brickRes.bricks} <span className="text-[10px] font-normal text-brand-amber/80">Pcs</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl border-l-[3px] border-brand-blue border-y border-r border-brand-surface/30">
                  <span className="text-[8px] font-black text-brand-blue uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'সিমেন্ট (ব্যাগ)' : 'Cement Bags'}
                  </span>
                  <p className="text-xl font-black text-cream">{brickRes.cementBags} <span className="text-[10px] font-normal text-gray-teal">Bags</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl border border-brand-surface/30">
                  <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'বালু (CFT)' : 'Sand (CFT)'}
                  </span>
                  <p className="text-xl font-black text-cream">{brickRes.sand} <span className="text-[10px] font-normal text-gray-teal">CFT</span></p>
                </div>
              </div>
            )}

            {activeTab === 'plaster' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-slate/60 p-4 rounded-2xl border border-brand-surface/30">
                  <span className="text-[8px] font-black text-gray-teal uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'ভেজা প্লাস্টার আয়তন (CFT)' : 'Wet Mortar Volume (CFT)'}
                  </span>
                  <p className="text-xl font-black text-cream">{plasterRes.volume} <span className="text-[10px] font-normal text-gray-teal">CFT</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl border-l-[3px] border-brand-amber border-y border-r border-brand-surface/30">
                  <span className="text-[8px] font-black text-brand-amber uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'সিমেন্ট (ব্যাগ)' : 'Cement Bags'}
                  </span>
                  <p className="text-xl font-black text-brand-amber">{plasterRes.cementBags} <span className="text-[10px] font-normal text-brand-amber/80">Bags</span></p>
                </div>

                <div className="bg-brand-slate/60 p-4 rounded-2xl border-l-[3px] border-brand-blue border-y border-r border-brand-surface/30">
                  <span className="text-[8px] font-black text-brand-blue uppercase tracking-widest leading-none block mb-1">
                    {lang === 'bn' ? 'বালু (CFT)' : 'Sand (CFT)'}
                  </span>
                  <p className="text-xl font-black text-cream">{plasterRes.sand} <span className="text-[10px] font-normal text-gray-teal">CFT</span></p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gemini AI Assistant Section */}
        <div className="bg-brand-surface border border-brand-surface/50 rounded-[32px] p-6 relative overflow-hidden space-y-6 shadow-xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-amber/5 rounded-full blur-[40px] pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-blue/5 rounded-full blur-[40px] pointer-events-none" />

          {/* Header section with brand tags */}
          <div className="flex items-center justify-between border-b border-brand-surface/40 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-amber/20 to-brand-blue/20 text-brand-amber flex items-center justify-center">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-cream uppercase tracking-widest flex items-center gap-1.5">
                  Gemini AI Estimates
                  <span className="bg-brand-amber/15 text-brand-amber px-1.5 py-0.5 rounded text-[8px] font-black lowercase tracking-normal">beta</span>
                </h3>
                <p className="text-[9px] font-extrabold text-gray-teal uppercase tracking-widest mt-0.5">
                  {lang === 'bn' ? 'বাংলাদেশি বাজারদরে নির্ভুল বিশ্লেষণ' : 'Real-Time Bangladeshi Market Analysis'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">AI Live</span>
            </div>
          </div>

          {/* Bangladesh Market Price reference list */}
          {rates && (
            <div className="bg-brand-slate/40 border border-brand-surface/60 p-4 rounded-2xl space-y-2.5">
              <div className="flex justify-between items-center">
                <h4 className="text-[9px] font-black text-cream uppercase tracking-widest flex items-center gap-1.5">
                  <span>📊</span> 
                  {lang === 'bn' ? 'বর্তমান বাংলাদেশি বাজার দর' : 'Active Bangladesh Market Rates'}
                </h4>
                <span className="text-[8px] font-black text-brand-amber uppercase">adjustable in server</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-extrabold text-gray-teal">
                <div className="bg-brand-slate/80 px-3 py-1.5 rounded-xl border border-brand-surface shadow-sm">
                  <span className="text-cream font-black">ইট:</span> ৳ {rates.brickPricePerPc} / Pc
                </div>
                <div className="bg-brand-slate/80 px-3 py-1.5 rounded-xl border border-brand-surface shadow-sm">
                  <span className="text-cream font-black">সিমেন্ট:</span> ৳ {rates.cementPricePerBag} / Bag
                </div>
                <div className="bg-brand-slate/80 px-3 py-1.5 rounded-xl border border-brand-surface shadow-sm">
                  <span className="text-cream font-black">বালু:</span> ৳ {rates.sandPricePerCFT} / CFT
                </div>
                <div className="bg-brand-slate/80 px-3 py-1.5 rounded-xl border border-brand-surface shadow-sm">
                  <span className="text-cream font-black">পাথর/খোয়া:</span> ৳ {rates.stonePricePerCFT} / CFT
                </div>
                <div className="bg-brand-slate/80 px-3 py-1.5 rounded-xl border border-brand-surface shadow-sm">
                  <span className="text-cream font-black">রড:</span> ৳ {rates.rebarPricePerKg} / Kg
                </div>
                <div className="bg-brand-slate/80 px-3 py-1.5 rounded-xl border border-brand-surface shadow-sm">
                  <span className="text-cream font-black">রাজমিস্ত্রি:</span> ৳ {rates.laborRateRajMistri} / Day
                </div>
              </div>
            </div>
          )}

          {/* Trigger button & processing details */}
          <div className="space-y-4">
            {!estimateResult && !loadingEstimate && (
              <div className="bg-brand-slate/30 rounded-2xl p-4 border border-brand-surface/40 flex flex-col items-center justify-center text-center py-6">
                <p className="text-xs font-bold text-gray-teal max-w-sm mb-4 leading-normal">
                  {lang === 'bn' 
                    ? 'আপনার হিসাব করা উপকরণের পরিমাণ থেকে মোট আনুমানিক কত টাকা খরচ হবে, কোন রড বা সিমেন্ট ব্র্যান্ড ভালো হবে এবং কতজন শ্রমিক লাগবে তা এআই দিয়ে জানতে ক্লিক করুন।'
                    : 'Analyze materials with premium AI to determine cost summarization, brand recommendations, and daily labor metrics under active standard rates.'}
                </p>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGetEstimate}
                  className="w-full sm:w-auto px-6 py-4 bg-gradient-to-r from-brand-amber to-[#D97706] hover:from-[#D97706] hover:to-[#B45309] text-brand-dark font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg flex items-center justify-center gap-2.5 transition-all text-neutral-900"
                >
                  <Sparkles className="w-4 h-4 fill-brand-dark/20 animate-spin" />
                  {lang === 'bn' ? 'Ask Gemini AI for Estimation Summary' : 'Ask Gemini AI for Estimation Summary'}
                </motion.button>
              </div>
            )}

            {/* Loading placeholder State */}
            {loadingEstimate && (
              <div className="bg-brand-slate/40 border border-brand-surface/40 rounded-2xl p-6 py-12 flex flex-col items-center justify-center text-center space-y-4">
                <Loader2 className="w-8 h-8 text-brand-amber animate-spin" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-cream uppercase tracking-wider animate-pulse">
                    {lang === 'bn' ? 'হিসাব বিশ্লেষণ করা হচ্ছে...' : 'Analyzing Calculations...'}
                  </p>
                  <p className="text-[10px] font-bold text-gray-teal">
                    {lang === 'bn' 
                      ? 'Gemini 3.5-Flash দিয়ে খরচের নিখুঁত সামারি ও মিস্ত্রি প্রয়োজনীয়তা বের করা হচ্ছে' 
                      : 'Consulting Gemini 3.5-Flash for regional pricing models and rebar suggestions'}
                  </p>
                </div>
              </div>
            )}

            {/* Answer Display Card with interactive voice controls */}
            {estimateResult && !loadingEstimate && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-slate border border-[#3B82F6]/20 rounded-2xl p-5 relative shadow-sm"
              >
                {/* Voice / Custom speaking overlay banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-3.5 mb-3.5 gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🤖</span>
                    <div>
                      <h4 className="text-[11px] font-black text-brand-blue uppercase tracking-widest leading-none">
                        {lang === 'bn' ? 'এআই খরচের প্রতিবেদন' : 'AI Strategic Cost Summary'}
                      </h4>
                      <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                        Powering standard civil standards
                      </p>
                    </div>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                    {/* Speaks voice synthesis (🔊) */}
                    <button
                      onClick={() => startSpeech()}
                      className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                        isSpeaking 
                          ? 'bg-red-500/10 text-red-500 border-red-500/30' 
                          : 'bg-brand-blue/10 text-brand-blue border-brand-blue/30 hover:bg-brand-blue/20'
                      }`}
                      title={isSpeaking ? "Pause/Stop Voice" : "AI Voice Reader (Play)"}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                          <span>AI Voice Reader (🔊)</span>
                        </>
                      )}
                    </button>

                    {/* Adjustable voice slider buttons */}
                    <button
                      onClick={() => setShowSettings(!showSettings)}
                      className={`p-2 rounded-xl border transition-all ${
                        showSettings ? 'bg-brand-amber/20 border-brand-amber text-brand-amber' : 'bg-white/5 border-white/5 text-[#8FA2A2] hover:text-white'
                      }`}
                      title="Adjust Speech Settings"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Speech sliders popup controls */}
                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-brand-dark/60 border border-white/5 p-3 rounded-xl mb-4 space-y-3 overflow-hidden text-[10px] font-black uppercase tracking-widest text-[#8FA2A2]"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-white">Adjustable voice controls</span>
                        <button onClick={() => setShowSettings(false)} className="text-[8px] text-brand-amber">Close</button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Speech Speed (Rate):</span>
                            <span className="text-brand-blue font-bold lowercase">{voiceRate}x</span>
                          </div>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="2" 
                            step="0.1" 
                            value={voiceRate}
                            onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                            className="w-full accent-brand-blue bg-brand-slate h-1 rounded cursor-pointer" 
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Speaker Volume:</span>
                            <span className="text-brand-blue font-bold lowercase">{Math.round(voiceVolume * 100)}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="1" 
                            step="0.1" 
                            value={voiceVolume}
                            onChange={(e) => setVoiceVolume(parseFloat(e.target.value))}
                            className="w-full accent-brand-blue bg-brand-slate h-1 rounded cursor-pointer" 
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Speaking Audio Visualizer bars */}
                {isSpeaking && (
                  <div className="flex items-center justify-between bg-brand-blue/5 border border-brand-blue/20 p-2.5 rounded-xl mb-4">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Speaking Now:</span>
                      <div className="flex gap-0.5 items-end h-3 ms-2">
                        <div className="w-0.5 bg-brand-blue animate-[bounce_0.8s_infinite_100ms] h-full" />
                        <div className="w-0.5 bg-brand-blue animate-[bounce_0.8s_infinite_200ms] h-2/3" />
                        <div className="w-0.5 bg-brand-blue animate-[bounce_0.8s_infinite_300ms] h-full" />
                        <div className="w-0.5 bg-brand-blue animate-[bounce_0.8s_infinite_150ms] h-1/2" />
                        <div className="w-0.5 bg-brand-blue animate-[bounce_0.8s_infinite_400ms] h-full" />
                      </div>
                    </div>
                    <button 
                      onClick={stopSpeech}
                      className="text-[9px] font-bold text-red-400 hover:text-red-500 transition-all uppercase tracking-wider"
                    >
                      Mute 🔇
                    </button>
                  </div>
                )}

                {/* Formatted body */}
                <div className="space-y-1 select-text">
                  {renderFormattedText(estimateResult)}
                </div>

                {/* Action buttons below */}
                <div className="border-t border-white/5 pt-3.5 mt-4 flex justify-between items-center">
                  <span className="text-[8px] font-black uppercase text-[#5E6D6D]">Gemini output report</span>
                  <button
                    onClick={handleGetEstimate}
                    className="flex items-center gap-1 bg-white/5 hover:bg-white/10 text-brand-amber font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                  >
                    <RefreshCw className="w-3" />
                    Update Report
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Informative Tip Badge */}
        <div className="bg-brand-surface border border-white/5 rounded-2xl p-4 flex gap-3 text-slate-400">
          <Info className="w-5 h-5 text-brand-amber flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-[10px] font-black uppercase text-white tracking-widest">Calculations Protocol Notice</h4>
            <p className="text-[10px] leading-relaxed font-bold">
              {lang === 'bn' 
                ? 'উপরের হিসাবগুলো বাংলাদেশের স্ট্যান্ডার্ড কনস্ট্রাকশন পদ্ধতি অনুযায়ী করা হয়েছে। কংক্রিটের জন্য ১.৫৪ এবং মশলার গাঁথুনির জন্য শুষ্ক ফ্যাক্টর হিসাবযুক্ত করা হয়েছে।'
                : 'Estimations follow traditional Bangladeshi public domain standards with shrinkage factors (1.54 dry volume concrete adjustment & 1.33 for plaster/brick mortar overlay). Actual onsite parameters may vary by ±5%.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
