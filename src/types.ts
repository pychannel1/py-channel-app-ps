export interface TranscriptSegment {
  id: string;
  start: string; // "00:00:02.100"
  end: string;   // "00:00:05.400"
  startMs: number;
  endMs: number;
  sourceText: string; // Chinese or English original transcription
  myanmarText?: string; // Translated Myanmar script
  speaker?: string; // e.g., "Narrator", "Protagonist"
  stretchRatio?: number; // 0.8 to 1.3
}

export interface BurmeseVoiceAvatar {
  id: string;
  code: string; // "BB", "NL", "PW", "KM", "ZK", "HS", "SL", "YS", "EC", "TS"
  nameBurmese: string; // e.g. "ဘိုဘို"
  nameEnglish: string; // "Bo Bo"
  gender: 'male' | 'female';
  voiceName: 'my-MM-ThihaNeural' | 'my-MM-NilarNeural' | string;
  voiceModel: 'my-MM-ThihaNeural' | 'my-MM-NilarNeural' | string;
  toneCategory: string; // "Action / Thriller", "Documentary", etc.
  description: string;
  basePitch: number; // e.g. -0.15
  basePitchHz: number; // e.g. -10 to -30 Hz for male, 0 to +20 Hz for female
  baseRate: number;  // e.g. 1.05
  avatarColor: string; // gradient color string
  samplePhraseBurmese: string;
}

export interface SampleMovie {
  id: string;
  title: string;
  genre: string;
  duration: string;
  durationSeconds: number;
  videoUrl: string;
  thumbnailUrl: string;
  sourceLanguage: 'Chinese' | 'English' | 'Korean';
  description: string;
  segments: TranscriptSegment[];
}

export type StudioStep = 1 | 2 | 3 | 4;

export type UserWorkflowStep = 1 | 2 | 3; // 1: Upload Video, 2: Select Voice, 3: Generate & Download

export type StudioMode = 'manual' | 'auto';

export type VipStatus = 'free' | 'pending' | 'active_vip';

export type PlanTierId = 'free' | 'vip_unlimited' | 'basic' | 'standard' | 'unlimited_pro';

export interface PricingPlan {
  id: PlanTierId;
  tierNumber: number;
  nameBurmese: string;
  nameEnglish: string;
  priceMmk: number;
  priceDisplay: string;
  priceFormattedNumber: string;
  billingCycle: string;
  limitDescription: string;
  badge?: string;
  features: string[];
  isPaid: boolean;
  recapLimit: number; // 2 for free daily, 999999 for unlimited
  periodType: 'daily' | 'monthly' | 'unlimited';
}

export interface VipSubscriptionInfo {
  status: VipStatus;
  planId: PlanTierId;
  planName: string;
  dailyFreeRemaining?: number;
  maxDailyFree?: number;
  monthlyRemaining?: number;
  maxMonthlyLimit?: number;
  submittedAt?: string;
  approvedAt?: string;
  expiresAt?: string;
  transactionRef?: string;
  slipImage?: string; // base64 or object url
  paymentMethod?: 'kpay' | 'wavepay';
}

export interface PaymentVerificationRequest {
  id: string;
  userEmail: string;
  customerPhone: string;
  transactionRef: string;
  paymentMethod: 'kpay' | 'wavepay';
  planId: PlanTierId;
  amountMmk: number;
  slipImageUrl?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AdminConfig {
  maintenanceMode: boolean;
  maintenanceNotice: string;
  assemblyMasterKey: string;
  geminiMasterKey: string;
  geminiModel: 'gemini-3.6-flash' | 'gemini-3.7-flash' | 'gemini-2.0-flash' | 'gemini-1.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite' | 'gemini-flash-latest';
  systemPrompt: string;
  systemPromptPreset: 'cinematic_hype' | 'dramatic_story' | 'fast_comedy' | 'suspense_horror' | 'custom';
  globalSpeed: number; // 0.8 to 1.4
  globalPitchHz: number; // -15 to +15
  commaPauseMs: number; // e.g. 80ms
  periodPauseMs: number; // e.g. 180ms
  kpayEnabled: boolean;
  wavepayEnabled: boolean;
  adminPin: string;
  verificationRequests: PaymentVerificationRequest[];
}

export interface StudioState {
  currentStep: StudioStep;
  mode: StudioMode;
  assemblyApiKey: string;
  isAssemblyKeyCollapsed: boolean;
  selectedVideoFile: File | null;
  videoPreviewUrl: string | null;
  videoDuration: number;
  videoDurationFormatted: string;
  videoFileName: string;
  isExtractingAudio: boolean;
  extractionProgress: number;
  segments: TranscriptSegment[];
  isTranslating: boolean;
  translationPathModalOpen: boolean;
  selectedVoiceId: string;
  pitchOffset: number; // -30 to +30 Hz
  speedMultiplier: number; // 0.8 to 1.5
  isSynthesizingVoice: boolean;
  isVoicePreviewPlaying: boolean;
  isRendering: boolean;
  renderProgress: number;
  renderPhase: string;
  isRenderComplete: boolean;
  activeSubtitleIndex: number;
  userCredits: {
    used: number;
    total: number;
    email: string;
  };
}
