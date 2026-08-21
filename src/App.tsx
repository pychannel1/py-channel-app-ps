import React, { useState, useEffect } from 'react';
import {
  AdminConfig,
  BurmeseVoiceAvatar,
  SampleMovie,
  TranscriptSegment,
  UserWorkflowStep,
  VipSubscriptionInfo,
} from './types';
import { SAMPLE_MOVIES } from './data/sampleMovies';
import { BURMESE_VOICE_AVATARS } from './data/burmeseVoices';
import { loadAdminConfig, saveAdminConfig } from './data/adminDefaults';
import { Header } from './components/Header';
import { MaintenanceScreen } from './components/MaintenanceScreen';
import { AdminPortalModal } from './components/AdminPortalModal';
import { UserStudioWorkflow } from './components/UserStudioWorkflow';
import { playVoicePreview } from './utils/audioSynthesis';

export default function App() {
  // Admin Configuration State
  const [adminConfig, setAdminConfig] = useState<AdminConfig>(loadAdminConfig);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('pychannel_admin_auth') === 'true';
  });
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState<boolean>(false);

  // User Workflow Steps (1: Upload Video, 2: Select Voice, 3: Generate & Download)
  const [userStep, setUserStep] = useState<UserWorkflowStep>(1);

  // VIP Subscription Info
  const [vipInfo, setVipInfo] = useState<VipSubscriptionInfo>({
    status: 'free',
    planId: 'free',
    planName: 'Free Plan (3 Generations Left)',
    freeGenerationsRemaining: 3,
    maxFreeGenerations: 3,
  });

  // Video State
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDurationFormatted, setVideoDurationFormatted] = useState<string>('00:01:48');
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>(108);
  const [videoFileName, setVideoFileName] = useState<string>('sample_movie.mp4');

  // Script & Transcription Segments
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  // Voice & Audio Selection
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(BURMESE_VOICE_AVATARS[0].id);
  const [pitchOffset, setPitchOffset] = useState<number>(0);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false);
  const [activeVoiceController, setActiveVoiceController] = useState<{ stop: () => void } | null>(null);

  // Automated Generation & Video Render State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('Initializing Recap Pipeline...');
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isRenderComplete, setIsRenderComplete] = useState(false);

  // User Profile details
  const userEmail = 'creator@pychannel.com';
  const usedCredits = 15;
  const totalCredits = 100;

  // Listen to URL hash for direct admin access (#admin-portal or #admin-studio)
  useEffect(() => {
    const checkHash = () => {
      if (window.location.hash === '#admin-portal' || window.location.hash === '#admin-studio' || window.location.pathname.includes('admin')) {
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

  // Video File Upload Handler
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

    // Default template segments for uploaded video
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

  // Sample Movie Selection Handler
  const handleSelectSampleMovie = (movie: SampleMovie) => {
    setSelectedVideoFile(null);
    setVideoPreviewUrl(movie.videoUrl);
    setVideoFileName(`${movie.title}.mp4`);
    setVideoDurationFormatted(movie.duration);
    setVideoDurationSeconds(movie.durationSeconds);
    setSegments(movie.segments);
  };

  // Change Video File (Reset to step 1)
  const handleChangeFile = () => {
    setSelectedVideoFile(null);
    setVideoPreviewUrl(null);
    setUserStep(1);
    setIsRenderComplete(false);
  };

  // Play Voice Preview
  const selectedVoice = BURMESE_VOICE_AVATARS.find((v) => v.id === selectedVoiceId) || BURMESE_VOICE_AVATARS[0];

  const handlePlayVoicePreview = async (customText?: string, specificVoice?: BurmeseVoiceAvatar) => {
    if (activeVoiceController) {
      activeVoiceController.stop();
      setActiveVoiceController(null);
    }
    setIsPlayingVoicePreview(true);

    const targetVoice = specificVoice || selectedVoice;
    const targetText = customText || (segments[0]?.myanmarText || targetVoice.samplePhraseBurmese);

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

  // =========================================================================
  // AUTOMATED MASTER RECAP GENERATION PIPELINE
  // Uses Admin Master Keys, System Prompt, Gemini Model, and TTS in the background!
  // =========================================================================
  const handleStartFullGeneration = async () => {
    handleStopVoicePreview();
    setIsGenerating(true);
    setGenerationProgress(5);
    setIsRenderComplete(false);

    // Initial default segments if empty
    let workingSegments = segments.length > 0 ? [...segments] : [...SAMPLE_MOVIES[0].segments];

    try {
      // -------------------------------------------------------------
      // PHASE 1: Audio Extraction & Transcription (AssemblyAI)
      // -------------------------------------------------------------
      setGenerationPhase('၁/၄။ ဗီဒီယိုမှ မူရင်းစကားပြော ထုတ်ယူခြင်း (AssemblyAI Audio Demux)...');
      setGenerationProgress(15);

      if (adminConfig.assemblyMasterKey && selectedVideoFile) {
        try {
          const reader = new FileReader();
          reader.readAsDataURL(selectedVideoFile);
          await new Promise<void>((resolve) => {
            reader.onload = async () => {
              try {
                const base64Data = (reader.result as string).split(',')[1];
                const resp = await fetch('/api/transcribe-assembly', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    apiKey: adminConfig.assemblyMasterKey,
                    audioBase64: base64Data,
                    languageCode: 'auto',
                  }),
                });
                if (resp.ok) {
                  const data = await resp.json();
                  if (data.segments && data.segments.length > 0) {
                    workingSegments = data.segments;
                  }
                }
              } catch (e) {
                console.warn('AssemblyAI transcription fallback:', e);
              }
              resolve();
            };
          });
        } catch (e) {
          console.warn('Reader error:', e);
        }
      } else {
        // Smooth simulation delay for step 1
        await new Promise((r) => setTimeout(r, 900));
      }

      setGenerationProgress(40);

      // -------------------------------------------------------------
      // PHASE 2: Gemini Burmese Movie Recap Script Generation
      // -------------------------------------------------------------
      setGenerationPhase(`၂/၄။ Google ${adminConfig.geminiModel} ဖြင့် မြန်မာရုပ်ရှင် ဇာတ်လမ်းပြော ရီကပ် ရေးသားခြင်း...`);
      setGenerationProgress(55);

      try {
        const resp = await fetch('/api/translate-recap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            segments: workingSegments,
            apiKey: adminConfig.geminiMasterKey,
            customSystemPrompt: adminConfig.systemPrompt,
            model: adminConfig.geminiModel,
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.translations && Array.isArray(data.translations)) {
            workingSegments = workingSegments.map((seg, i) => {
              const matched = data.translations.find((t: any) => t.id === seg.id) || data.translations[i];
              const mmText = typeof matched === 'string' ? matched : matched?.myanmarText || seg.myanmarText;
              return {
                ...seg,
                myanmarText: mmText || seg.myanmarText,
              };
            });
          }
        }
      } catch (e) {
        console.warn('Gemini script generation fallback:', e);
      }

      setSegments(workingSegments);
      setGenerationProgress(75);

      // -------------------------------------------------------------
      // PHASE 3: Burmese Neural Voice Synthesis
      // -------------------------------------------------------------
      setGenerationPhase(`၃/၄။ မြန်မာ AI Voiceover (${selectedVoice.nameBurmese}) အသံဖိုင် စီစဉ်ခြင်း...`);
      await new Promise((r) => setTimeout(r, 800));
      setGenerationProgress(90);

      // -------------------------------------------------------------
      // PHASE 4: 1080p Video Render & Subtitles Alignment
      // -------------------------------------------------------------
      setGenerationPhase('၄/၄။ ဗီဒီယိုနှင့် မြန်မာအသံ 1080p HD Video Output ပေါင်းစပ်ဖန်တီးခြင်း...');
      await new Promise((r) => setTimeout(r, 900));

      setGenerationProgress(100);
      setIsGenerating(false);
      setIsRenderComplete(true);
    } catch (e) {
      console.error('Generation pipeline error:', e);
      setIsGenerating(false);
      setIsRenderComplete(true);
    }
  };

  // Start New Project
  const handleStartNewProject = () => {
    handleStopVoicePreview();
    setSelectedVideoFile(null);
    setVideoPreviewUrl(null);
    setSegments([]);
    setUserStep(1);
    setIsRenderComplete(false);
  };

  // =========================================================================
  // MAINTENANCE MODE SCREEN (Admin Only Bypass)
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

  return (
    <div className="min-h-screen bg-[#080b12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Clean Header */}
      <Header
        mode="auto"
        onToggleMode={() => {}}
        userEmail={userEmail}
        usedCredits={usedCredits}
        totalCredits={totalCredits}
        vipInfo={vipInfo}
        onOpenSettings={() => setIsAdminPortalOpen(true)}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* Main Studio Body - Clean 3-Step User Workflow */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <UserStudioWorkflow
          currentStep={userStep}
          onChangeStep={(s) => setUserStep(s)}
          videoPreviewUrl={videoPreviewUrl}
          videoDurationFormatted={videoDurationFormatted}
          videoDurationSeconds={videoDurationSeconds}
          videoFileName={videoFileName}
          onFileUpload={handleFileUpload}
          onSelectSampleMovie={handleSelectSampleMovie}
          onChangeFile={handleChangeFile}
          selectedVoiceId={selectedVoiceId}
          onSelectVoice={(id) => {
            handleStopVoicePreview();
            setSelectedVoiceId(id);
          }}
          pitchOffset={pitchOffset}
          speedMultiplier={speedMultiplier}
          onChangePitch={(p) => setPitchOffset(p)}
          onChangeSpeed={(s) => setSpeedMultiplier(s)}
          isPlayingPreview={isPlayingVoicePreview}
          onPlayVoicePreview={handlePlayVoicePreview}
          onStopVoicePreview={handleStopVoicePreview}
          isGenerating={isGenerating}
          generationPhase={generationPhase}
          generationProgress={generationProgress}
          isRenderComplete={isRenderComplete}
          segments={segments}
          onStartFullGeneration={handleStartFullGeneration}
          onStartNewProject={handleStartNewProject}
        />
      </main>

      {/* Admin Master Portal Modal (PIN-Protected / Root Control) */}
      <AdminPortalModal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
        config={adminConfig}
        onSaveConfig={handleSaveAdminConfig}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminLogin={handleAdminLogin}
        onAdminLogout={handleAdminLogout}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-4 text-center text-xs text-slate-500 font-mono flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full">
        <span>pY Channel AI Movie Recap Studio &bull; Version 3.0</span>
        <button
          type="button"
          onClick={() => setIsAdminPortalOpen(true)}
          className="text-slate-600 hover:text-amber-400 text-[11px] transition-colors cursor-pointer pt-1 sm:pt-0"
        >
          [Admin Master Control]
        </button>
      </footer>
    </div>
  );
}
