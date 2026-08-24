export interface UserAccount {
  email: string;
  name: string;
  photoURL?: string;
  isGoogleUser: boolean;
  createdAt: number;
}

export interface UserUsageData {
  email: string;
  videosGenerated: number;
  maxFreeLimit: number;
  history: Array<{
    id: string;
    title: string;
    date: string;
    voiceName: string;
    duration?: string;
  }>;
}

export const ADMIN_EMAIL = 'pychannel1years@gmail.com';

const USER_ACCOUNT_STORAGE_KEY = 'pychannel_user_account';
const USAGE_PREFIX_STORAGE_KEY = 'pychannel_user_usage_';

export function getStoredUserAccount(): UserAccount {
  try {
    const saved = localStorage.getItem(USER_ACCOUNT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.email) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse user account from storage:', e);
  }

  // Default guest user account
  return {
    email: 'user.recap@gmail.com',
    name: 'Movie Creator',
    isGoogleUser: true,
    createdAt: Date.now(),
  };
}

export function saveUserAccount(account: UserAccount): void {
  try {
    localStorage.setItem(USER_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch (e) {
    console.warn('Failed to save user account to storage:', e);
  }
}

export function getUserUsage(email: string): UserUsageData {
  const cleanEmail = email.trim().toLowerCase();
  const storageKey = `${USAGE_PREFIX_STORAGE_KEY}${cleanEmail}`;
  
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        email: cleanEmail,
        videosGenerated: Number(parsed.videosGenerated) || 0,
        maxFreeLimit: 2,
        history: Array.isArray(parsed.history) ? parsed.history : [],
      };
    }
  } catch (e) {
    console.warn('Failed to get user usage from storage:', e);
  }

  return {
    email: cleanEmail,
    videosGenerated: 0,
    maxFreeLimit: 2,
    history: [],
  };
}

export function saveUserUsage(usage: UserUsageData): void {
  const cleanEmail = usage.email.trim().toLowerCase();
  const storageKey = `${USAGE_PREFIX_STORAGE_KEY}${cleanEmail}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(usage));
  } catch (e) {
    console.warn('Failed to save user usage to storage:', e);
  }
}

export function recordVideoGeneration(
  email: string,
  videoTitle: string,
  voiceName: string,
  duration?: string
): UserUsageData {
  const current = getUserUsage(email);
  const updated: UserUsageData = {
    ...current,
    videosGenerated: current.videosGenerated + 1,
    history: [
      {
        id: `vid_${Date.now()}`,
        title: videoTitle || 'Movie Recap Video',
        date: new Date().toLocaleString(),
        voiceName: voiceName || 'Burmese AI Voice',
        duration,
      },
      ...current.history,
    ],
  };

  saveUserUsage(updated);
  return updated;
}

export function isAdminUser(email?: string, isAdminAuth?: boolean): boolean {
  if (isAdminAuth) return true;
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Secret Admin Voice Cloning Access Gate
 * Gates access behind feature flag, admin identity (pychannel1years@gmail.com),
 * or secret query params (?admin_voice=true / ?secret_clone=true).
 * Fully hidden from regular standard users.
 */
export function isVoiceCloneAccessible(
  email?: string,
  isAdminAuth?: boolean,
  configShowVoiceClone?: boolean
): boolean {
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (
        urlParams.get('admin_voice') === 'true' ||
        urlParams.get('secret_clone') === 'true' ||
        urlParams.get('admin_clone') === 'true' ||
        urlParams.get('voice_lab') === 'true'
      ) {
        return true;
      }
    } catch {}
  }

  const isAdmin = isAdminUser(email, isAdminAuth);
  if (isAdmin && configShowVoiceClone) {
    return true;
  }

  return false;
}

export function checkGenerationQuota(
  email: string,
  isVipActive: boolean,
  isAdminAuth: boolean
): { allowed: boolean; remaining: number; maxLimit: number; reason?: string } {
  // Admin has unlimited generation access
  if (isAdminUser(email, isAdminAuth)) {
    return { allowed: true, remaining: 999999, maxLimit: 999999 };
  }

  // VIP user has plan limit access
  if (isVipActive) {
    return { allowed: true, remaining: 9999, maxLimit: 9999 };
  }

  // Free user: strictly 2 videos max
  const usage = getUserUsage(email);
  const remaining = Math.max(0, 2 - usage.videosGenerated);
  const allowed = usage.videosGenerated < 2;

  return {
    allowed,
    remaining,
    maxLimit: 2,
    reason: allowed
      ? undefined
      : 'Free Plan အသုံးပြုသူများအတွက် အခမဲ့ ဗီဒီယို ၂ ပုဒ် ကန့်သတ်ချက် ပြည့်သွားပါပြီ။ ဆက်လက်ဖန်တီးနိုင်ရန် VIP Plan သို့ အဆင့်မြှင့်တင်ပေးပါ။',
  };
}
