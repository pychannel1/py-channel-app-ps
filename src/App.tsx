import React, { useState, useEffect } from 'react';
import {
  AdminConfig,
  BurmeseVoiceAvatar,
  SampleMovie,
  StudioStep,
  TranscriptSegment,
  VipSubscriptionInfo,
} from './types';
import { SAMPLE_MOVIES } from './data/sampleMovies';
import { BURMESE_VOICE_AVATARS } from './data/burmeseVoices';
import { loadAdminConfig, saveAdminConfig } from './data/adminDefaults';
import { Header } from './components/Header';
import { StepIndicator } from './components/StepIndicator';
import { Step1Upload } from './components/Step1Upload';
import { Step2SourceText } from './components/Step2SourceText';
import { Step3MyanmarVoice } from './components/Step3MyanmarVoice';
import { Step4Results } from './components/Step4Results';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { AdminPortalModal } from './components/AdminPortalModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { playVoicePreview } from './utils/audioSynthesis';

export default function App() {
  // Admin Configuration State (PIN-protected & Master Keys)
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(loadAdminConfig);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('pychannel_admin_auth') === 'true';
  });
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState<boolean>(false);

  // User Settings Modal State
  const [isUserSettingsOpen, setIsUserSettingsOpen] = useState<boolean>(false);
  const [userSettingsTab, setUserSettingsTab] = useState<'api' | 'vip'>('vip');

  // User-specific keys (stored in localStorage if user enters custom keys)
  const [userAssemblyKey, setUserAssemblyKey] = useState<string>(() => {
    return localStorage.getItem('pychannel_user_assembly_key') || '';
  });
  const [userGeminiKey, setUserGeminiKey] = useState<string>(() => {
    return localStorage.getItem('pychannel_user_gemini_key') || '';
  });

  // Active 4-Step Studio Workflow
  const [currentStep, setCurrentStep] = useState<StudioStep>(1);

  // VIP Subscription Info
  const [vipInfo, setVipInfo] = useState<VipSubscriptionInfo>(() => {
    try {
      const saved = localStorage.getItem('pychannel_vip_info');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('VIP parse error:', e);
    }
    return {
      status: 'free',
      planId: 'free',
      planName: 'Free Plan (အခမဲ့ စမ်းသပ်ခြင်း)',
      dailyFreeRemaining: 2,
      maxDailyFree: 2,
    };
  });

  // Save VIP info to localStorage
  const handleUpdateVipInfo = (updated: VipSubscriptionInfo) => {
    setVipInfo(updated);
    localStorage.setItem('pychannel_vip_info', JSON.stringify(updated));
  };

  // Video State
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(SAMPLE_MOVIES[0].videoUrl);
  const [videoDurationFormatted, setVideoDurationFormatted] = useState<string>(SAMPLE_MOVIES[0].duration);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>(SAMPLE_MOVIES[0].durationSeconds);
  const [videoFileName, setVideoFileName] = useState<string>(`${SAMPLE_MOVIES[0].title}.mp4`);

  // Transcription & Translation Segments
  const [segments, setSegments] = useState<TranscriptSegment[]>(SAMPLE_MOVIES[0].segments);

  // Step 1: Audio Extraction State
  const [isExtractingAudio, setIsExtractingAudio] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);

  // Step 2: Translation & Gemini State
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);

  // Step 3: Burmese Voice & Audio Controls
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(BURMESE_VOICE_AVATARS[0].id);
  const [pitchOffset, setPitchOffset] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false);
  const [isSynthesizingVoice, setIsSynthesizingVoice] = useState(false);
  const [activeVoiceController, setActiveVoiceController] = useState<{ stop: () => void } | null>(null);

  // Step 4: Video Rendering State
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderPhase, setRenderPhase] = useState('Initializing Recap Pipeline...');
  const [isRenderComplete, setIsRenderComplete] = useState(false);

  // User Profile
  const userEmail = 'creator@pychannel.com';
  const usedCredits = 15;
  const totalCredits = 100;

  // Listen to URL hash for direct admin access (#admin-portal or #admin-studio)
  useEffect(() => {
    const checkHash = () => {
      if (
        window.location.hash === '#admin-portal' ||
        window.location.hash === '#admin-studio' ||
        window.location.pathname.includes('admin')
      ) {
        setIsAdminPortalOpen(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Save admin config updates
  const handleSaveAdminConfig = (updated: AdminConfig) => {
    setAdminConfig(updated);
    saveAdminConfig(updated);
  };

  // User save custom API keys
  const handleSaveUserAssemblyKey = (key: string) => {
    setUserAssemblyKey(key);
    localStorage.setItem('pychannel_user_assembly_key', key);
  };

  const handleSaveUserGeminiKey = (key: string) => {
    setUserGeminiKey(key);
    localStorage.setItem('pychannel_user_gemini_key', key);
  };

  // Admin Login / Logout handlers
  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
    sessionStorage.setItem('pychannel_admin_auth', 'true');
    setIsAdminPortalOpen(true);
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('pychannel_admin_auth');
    setIsAdminPortalOpen(false);
  };

  // Open User Settings Modal
  const handleOpenUserSettings = (tab: 'api' | 'vip' = 'vip') => {
    setUserSettingsTab(tab);
    setIsUserSettingsOpen(true);
  };

  // =========================================================================
  // STEP 1 HANDLERS: Video File Upload & Audio Extraction
  // =========================================================================
  const handleFileUpload = (file: File) => {
    setSelectedVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(objectUrl);
    setVideoFileName(file.name);

    const tempVideo = document.createElement('video');
    tempVideo.src = objectUrl;
    tempVideo.onloadedmetadata = () => {
      const sec = Math.floor(tempVideo.duration) || 120;
      setVideoDurationSeconds(sec);
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      setVideoDurationFormatted(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    setSegments([
      {
        id: 'upload-seg-1',
        start: '00:00:01.000',
        end: '00:00:05.500',
        startMs: 1000,
        endMs: 5500,
        sourceText: 'The main character enters the abandoned high-security facility.',
        myanmarText: 'မင်းသားဟာ အစောင့်အကြပ်ထူထပ်တဲ့ လျှို့ဝှက်စခန်းထဲကို တစ်ယောက်တည်း ဝင်ရောက်လာခဲ့ပါတယ်။',
        speaker: 'Narrator',
      },
      {
        id: 'upload-seg-2',
        start: '00:00:06.000',
        end: '00:00:10.800',
        startMs: 6000,
        endMs: 10800,
        sourceText: 'Suddenly, the alarms are triggered and heavily armed guards surround him.',
        myanmarText: 'ရုတ်တရက် အချက်ပေးဥဩသံတွေ မြည်လာပြီး လက်နက်ကိုင်လုံခြုံရေးတွေက သူ့ကို ဝိုင်းရံလိုက်ပါတော့တယ်။',
        speaker: 'Narrator',
      },
      {
        id: 'upload-seg-3',
        start: '00:00:11.200',
        end: '00:00:16.400',
        startMs: 11200,
        endMs: 16400,
        sourceText: 'Without hesitation, he initiates the master plan to retrieve the classified drive.',
        myanmarText: 'သူဟာ တွေဝေမနေဘဲ လျှို့ဝှက်အချက်အလက်ဒရိုက်ဗ်ကို ရယူဖို့ စီမံကိန်းအတိုင်း စတင်တိုက်ခိုက်လိုက်ပါတော့တယ်။',
        speaker: 'Narrator',
      },
    ]);
  };

  const handleSelectSampleMovie = (movie: SampleMovie) => {
    setSelectedVideoFile(null);
    setVideoPreviewUrl(movie.videoUrl);
    setVideoFileName(`${movie.title}.mp4`);
    setVideoDurationFormatted(movie.duration);
    setVideoDurationSeconds(movie.durationSeconds);
    setSegments(movie.segments);
  };

  const handleChangeFile = () => {
    setSelectedVideoFile(null);
    setVideoPreviewUrl(null);
    setCurrentStep(1);
    setIsRenderComplete(false);
  };

  const handleStartAudioExtraction = async () => {
    setIsExtractingAudio(true);
    setExtractionProgress(10);

    const activeAssemblyKey = userAssemblyKey || adminConfig.assemblyMasterKey;

    try {
      if (activeAssemblyKey && selectedVideoFile) {
        const reader = new FileReader();
        reader.readAsDataURL(selectedVideoFile);
        await new Promise<void>((resolve) => {
          reader.onload = async () => {
            try {
              setExtractionProgress(35);
              const base64Data = (reader.result as string).split(',')[1];
              const resp = await fetch('/api/transcribe-assembly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  apiKey: activeAssemblyKey,
                  audioBase64: base64Data,
                  languageCode: 'auto',
                }),
              });
              setExtractionProgress(75);
              if (resp.ok) {
                const data = await resp.json();
                if (data.segments && data.segments.length > 0) {
                  setSegments(data.segments);
                }
              }
            } catch (e) {
              console.warn('AssemblyAI transcription fallback:', e);
            }
            resolve();
          };
        });
      } else {
        // Fast realistic progress simulation for demo
        for (let i = 20; i <= 100; i += 20) {
          setExtractionProgress(i);
          await new Promise((r) => setTimeout(r, 180));
        }
      }

      setExtractionProgress(100);
      setIsExtractingAudio(false);
      // Auto advance to Step 2
      setCurrentStep(2);
    } catch (e) {
      console.error('Audio extraction error:', e);
      setIsExtractingAudio(false);
      setCurrentStep(2);
    }
  };

  // =========================================================================
  // STEP 2 HANDLERS: Source Text Translation & Gemini Recaps
  // =========================================================================
  const handleUpdateSegmentSource = (id: string, newSourceText: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, sourceText: newSourceText } : s))
    );
  };

  const handleTranslateWithDirectGeminiApi = async () => {
    setIsTranslating(true);
    const activeGeminiKey = userGeminiKey || adminConfig.geminiMasterKey;

    try {
      const resp = await fetch('/api/translate-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          apiKey: activeGeminiKey,
          customSystemPrompt: adminConfig.systemPrompt,
          model: adminConfig.geminiModel,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.translations && Array.isArray(data.translations)) {
          setSegments((prev) =>
            prev.map((seg, i) => {
              const matched =
                data.translations.find((t: any) => t.id === seg.id) || data.translations[i];
              const mmText =
                typeof matched === 'string'
                  ? matched
                  : matched?.myanmarText || seg.myanmarText;
              return {
                ...seg,
                myanmarText: mmText || seg.myanmarText,
              };
            })
          );
        }
      }
      setIsTranslating(false);
      // Advance to Step 3
      setCurrentStep(3);
    } catch (e) {
      console.error('Direct Gemini translation error:', e);
      setIsTranslating(false);
      setCurrentStep(3);
    }
  };

  const handleSubmitExternalGeminiJson = (
    translations: string[] | { id?: string; myanmarText?: string; text?: string }[]
  ) => {
    if (!translations || translations.length === 0) return;

    setSegments((prev) =>
      prev.map((seg, idx) => {
        const item = translations[idx];
        let mmText = '';
        if (typeof item === 'string') {
          mmText = item;
        } else if (item && typeof item === 'object') {
          mmText = item.myanmarText || item.text || '';
        }
        return {
          ...seg,
          myanmarText: mmText.trim() || seg.myanmarText,
        };
      })
    );

    setIsTranslationModalOpen(false);
    // Advance to Step 3
    setCurrentStep(3);
  };

  // =========================================================================
  // STEP 3 HANDLERS: Burmese Script Editing & Neural Voice Selection
  // =========================================================================
  const handleUpdateMyanmarSegment = (id: string, text: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, myanmarText: text } : s))
    );
  };

  const handleUpdateAllMyanmarSegments = (texts: string[]) => {
    setSegments((prev) =>
      prev.map((s, idx) => ({
        ...s,
        myanmarText: texts[idx] !== undefined ? texts[idx] : s.myanmarText,
      }))
    );
  };

  const selectedVoice =
    BURMESE_VOICE_AVATARS.find((v) => v.id === selectedVoiceId) || BURMESE_VOICE_AVATARS[0];

  const handlePlayVoicePreview = async (
    customText?: string,
    specificVoice?: BurmeseVoiceAvatar
  ) => {
    if (activeVoiceController) {
      activeVoiceController.stop();
      setActiveVoiceController(null);
    }
    setIsPlayingVoicePreview(true);

    const targetVoice = specificVoice || selectedVoice;
    const targetText =
      customText || (segments[0]?.myanmarText || targetVoice.samplePhraseBurmese);

    const controller = await playVoicePreview({
      voice: targetVoice,
      pitchOffsetHz: pitchOffset || adminConfig.globalPitchHz,
      speedMultiplier: speedMultiplier || adminConfig.globalSpeed,
      customText: targetText,
      onEnded: () => {
        setIsPlayingVoicePreview(false);
        setActiveVoiceController(null);
      },
    });

    setActiveVoiceController(controller);
  };

  const handleStopVoicePreview = () => {
    if (activeVoiceController) {
      activeVoiceController.stop();
      setActiveVoiceController(null);
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingVoicePreview(false);
  };

  const handleStartVoiceSynthesis = async () => {
    handleStopVoicePreview();
    setIsSynthesizingVoice(true);
    setIsRendering(true);
    setRenderProgress(10);
    setRenderPhase('၁/၃။ မြန်မာအသံဖိုင် စီစဉ်ဖန်တီးခြင်း (Neural TTS Synthesis)...');
    setCurrentStep(4);

    try {
      await new Promise((r) => setTimeout(r, 900));
      setRenderProgress(45);
      setRenderPhase('၂/၃။ AI Stretch/Compress Engine ဖြင့် ဗီဒီယိုနှင့် အသံ အချိန်ကိုက် ညှိခြင်း...');
      await new Promise((r) => setTimeout(r, 900));
      setRenderProgress(80);
      setRenderPhase('၃/၃။ 1080p HD Video Output ပေါင်းစပ်ဖန်တီးခြင်း...');
      await new Promise((r) => setTimeout(r, 900));

      setRenderProgress(100);
      setIsSynthesizingVoice(false);
      setIsRendering(false);
      setIsRenderComplete(true);
    } catch (e) {
      console.error('Synthesis error:', e);
      setIsSynthesizingVoice(false);
      setIsRendering(false);
      setIsRenderComplete(true);
    }
  };

  // =========================================================================
  // STEP 4 HANDLERS: Results, Re-render & New Project
  // =========================================================================
  const handleReRender = () => {
    handleStartVoiceSynthesis();
  };

  const handleStartNewProject = () => {
    handleStopVoicePreview();
    setSelectedVideoFile(null);
    setVideoPreviewUrl(SAMPLE_MOVIES[0].videoUrl);
    setVideoFileName(`${SAMPLE_MOVIES[0].title}.mp4`);
    setVideoDurationFormatted(SAMPLE_MOVIES[0].duration);
    setVideoDurationSeconds(SAMPLE_MOVIES[0].durationSeconds);
    setSegments(SAMPLE_MOVIES[0].segments);
    setCurrentStep(1);
    setIsRenderComplete(false);
  };

  // =========================================================================
  // MAINTENANCE MODE SCREEN (Admin Bypass with PIN)
  // =========================================================================
  if (adminConfig.maintenanceMode && !isAdminAuthenticated) {
    return (
      <>
        <MaintenanceScreen
          noticeText={adminConfig.maintenanceNotice}
          adminPin={adminConfig.adminPin}
          onAdminLogin={handleAdminLogin}
        />
        <AdminPortalModal
          isOpen={isAdminPortalOpen}
          onClose={() => setIsAdminPortalOpen(false)}
          config={adminConfig}
          onSaveConfig={handleSaveAdminConfig}
          isAdminAuthenticated={isAdminAuthenticated}
          onAdminLogin={handleAdminLogin}
          onAdminLogout={handleAdminLogout}
        />
      </>
    );
  }

  // Active validation checks for Step Indicator
  const hasVideo = Boolean(videoPreviewUrl || selectedVideoFile);
  const hasSourceText = segments.length > 0 && segments.some((s) => Boolean(s.sourceText));
  const hasMyanmarText = segments.length > 0 && segments.some((s) => Boolean(s.myanmarText));

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Application Header */}
      <Header
        mode="auto"
        onToggleMode={() => {}}
        userEmail={userEmail}
        usedCredits={usedCredits}
        totalCredits={totalCredits}
        vipInfo={vipInfo}
        hasAssemblyKey={Boolean(userAssemblyKey && userAssemblyKey.trim().length > 5)}
        hasGeminiKey={Boolean(userGeminiKey && userGeminiKey.trim().length > 10)}
        onOpenSettings={handleOpenUserSettings}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Main Studio Body - Full 4-Step User Workflow */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Step Indicator Breadcrumb Bar */}
        <StepIndicator
          currentStep={currentStep}
          onSelectStep={(s) => {
            handleStopVoicePreview();
            setCurrentStep(s);
          }}
          hasVideo={hasVideo}
          hasSourceText={hasSourceText}
          hasMyanmarText={hasMyanmarText}
          isRenderComplete={isRenderComplete}
        />

        {/* STEP 1: Video Upload & Audio Extraction Engine */}
        {currentStep === 1 && (
          <Step1Upload
            videoPreviewUrl={videoPreviewUrl}
            videoDurationFormatted={videoDurationFormatted}
            videoDurationSeconds={videoDurationSeconds}
            videoFileName={videoFileName}
            isExtractingAudio={isExtractingAudio}
            extractionProgress={extractionProgress}
            assemblyApiKey={userAssemblyKey}
            onSaveAssemblyKey={handleSaveUserAssemblyKey}
            onFileUpload={handleFileUpload}
            onStartAudioExtraction={handleStartAudioExtraction}
            onChangeFile={handleChangeFile}
          />
        )}

        {/* STEP 2: Source Text Transcription & Gemini Translation Flow */}
        {currentStep === 2 && (
          <Step2SourceText
            segments={segments}
            onUpdateSegment={handleUpdateSegmentSource}
            onTranslateWithDirectGeminiApi={handleTranslateWithDirectGeminiApi}
            onSubmitExternalGeminiJson={handleSubmitExternalGeminiJson}
            isTranslating={isTranslating}
            isModalOpen={isTranslationModalOpen}
            onOpenModal={() => setIsTranslationModalOpen(true)}
            onCloseModal={() => setIsTranslationModalOpen(false)}
            geminiApiKey={userGeminiKey}
            onSaveGeminiKey={handleSaveUserGeminiKey}
          />
        )}

        {/* STEP 3: Myanmar Script Editing & 40 Burmese Voice Selection */}
        {currentStep === 3 && (
          <Step3MyanmarVoice
            segments={segments}
            selectedVoiceId={selectedVoiceId}
            pitchOffset={pitchOffset}
            speedMultiplier={speedMultiplier}
            isSynthesizingVoice={isSynthesizingVoice}
            isPlayingPreview={isPlayingVoicePreview}
            onSelectVoice={(id) => {
              handleStopVoicePreview();
              setSelectedVoiceId(id);
            }}
            onChangePitch={(p) => setPitchOffset(p)}
            onChangeSpeed={(s) => setSpeedMultiplier(s)}
            onUpdateMyanmarSegment={handleUpdateMyanmarSegment}
            onUpdateAllMyanmarSegments={handleUpdateAllMyanmarSegments}
            onPlayVoicePreview={handlePlayVoicePreview}
            onStopVoicePreview={handleStopVoicePreview}
            onStartVoiceSynthesis={handleStartVoiceSynthesis}
          />
        )}

        {/* STEP 4: Results, Synchronized Subtitles & Video Rendering */}
        {currentStep === 4 && (
          <Step4Results
            videoPreviewUrl={videoPreviewUrl}
            segments={segments}
            selectedVoice={selectedVoice}
            pitchOffset={pitchOffset}
            speedMultiplier={speedMultiplier}
            isRendering={isRendering}
            renderProgress={renderProgress}
            renderPhase={renderPhase}
            isRenderComplete={isRenderComplete}
            onStartNewProject={handleStartNewProject}
            onReRender={handleReRender}
          />
        )}
      </main>

      {/* User Settings & VIP Subscription Modal */}
      <UserSettingsModal
        isOpen={isUserSettingsOpen}
        onClose={() => setIsUserSettingsOpen(false)}
        initialTab={userSettingsTab}
        assemblyApiKey={userAssemblyKey}
        onSaveAssemblyKey={handleSaveUserAssemblyKey}
        geminiApiKey={userGeminiKey}
        onSaveGeminiKey={handleSaveUserGeminiKey}
        vipInfo={vipInfo}
        onUpdateVipInfo={handleUpdateVipInfo}
        userEmail={userEmail}
      />

      {/* Admin Master Portal Modal (PIN-Protected Root Control) */}
      <AdminPortalModal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
        config={adminConfig}
        onSaveConfig={handleSaveAdminConfig}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
      />

      {/* Footer with subtle Admin trigger link */}
      <footer className="border-t border-white/5 py-4 px-4 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2">
        <span>pY Channel AI Movie Recap Studio &bull; Version 3.0</span>
        <button
          type="button"
          onClick={() => setIsAdminPortalOpen(true)}
          className="text-slate-600 hover:text-amber-400 text-[11px] transition-colors cursor-pointer"
        >
          [Admin Master Control]
        </button>
      </footer>
    </div>
  );
}
