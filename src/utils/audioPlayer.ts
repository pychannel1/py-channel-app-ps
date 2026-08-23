// src/utils/audioPlayer.ts

let audioCtx: AudioContext | null = null;

export function playInstantVoicePreview(voiceIndex: number) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    
    // User touch ဖြစ်တာနဲ့ AudioContext ကို unlock လုပ်ပေးခြင်း
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // အသံမော်ဒယ် ၄၀ စလုံးအတွက် မတူညီသော အသံကြိမ်နှုန်းများ
    const baseFreq = 160 + ((voiceIndex % 40) * 14);
    osc.type = voiceIndex % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, audioCtx.currentTime + 0.3);

    // Fade-in / Fade-out Envelope (နားမညီးစေရန်)
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.35);
  } catch (err) {
    console.error("Audio playback error:", err);
  }
}
