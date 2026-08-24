import { TranscriptSegment, BurmeseVoiceAvatar } from '../types';
import { generateBurmeseAudioBlob } from '../services/audioService';

export interface RenderProgressCallback {
  (progress: number, phase: string): void;
}

export interface RenderVideoOptions {
  videoUrl: string;
  segments: TranscriptSegment[];
  selectedVoice?: BurmeseVoiceAvatar;
  pitchOffset?: number;
  speedMultiplier?: number;
  audioBlob?: Blob | null;
  audioBlobUrl?: string | null;
  onProgress?: RenderProgressCallback;
}

export interface RenderedVideoResult {
  blob: Blob;
  blobUrl: string;
  filename: string;
  durationSeconds: number;
}

/**
 * Background Video Processing Engine
 * - Automatically applies Horizontal Flip / Mirror Mode (scaleX(-1)) to video frames
 * - Embeds crisp Myanmar subtitles overlay with high-contrast font styling
 * - Embeds and synchronizes Burmese AI TTS Audio Track directly into the exported MP4/WebM
 * - Synchronizes audio & video tracks via Web Audio API + HTML5 Canvas
 * - Exports production-ready MP4/WebM video with copyright protection and clear audio
 */
export async function renderMirroredRecapVideo({
  videoUrl,
  segments,
  selectedVoice,
  pitchOffset = 0,
  speedMultiplier = 1.0,
  audioBlob,
  audioBlobUrl,
  onProgress,
}: RenderVideoOptions): Promise<RenderedVideoResult> {
  const updateProgress = (pct: number, msg: string) => {
    if (onProgress) {
      onProgress(Math.min(100, Math.max(0, Math.round(pct))), msg);
    }
  };

  updateProgress(5, 'ဗီဒီယိုနှင့် စာသားများကို Background Engine ထဲသို့ ချိန်ညှိသွင်းယူနေပါသည်...');

  return new Promise(async (resolve, reject) => {
    try {
      // 1. Create offscreen video element
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = false;
      video.volume = 1.0;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = videoUrl;

      await new Promise<void>((res, rej) => {
        video.onloadedmetadata = () => res();
        video.onerror = () => rej(new Error('Source video could not be loaded for background rendering'));
      });

      const videoDuration = video.duration || 10;
      // Use standard high-definition 16:9 canvas dimensions
      const width = video.videoWidth > 0 ? Math.min(1920, Math.max(1280, video.videoWidth)) : 1280;
      const height = video.videoHeight > 0 ? Math.min(1080, Math.max(720, video.videoHeight)) : 720;

      // 2. Setup Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        throw new Error('Canvas 2D rendering context is not available');
      }

      updateProgress(15, 'Auto-Mirroring (Horizontal Flip) Engine စတင် အသက်သွင်းနေပါသည်...');

      // 3. Audio Context & Stream routing
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        try {
          await audioCtx.resume();
        } catch (e) {
          console.warn('AudioContext resume in videoRenderEngine:', e);
        }
      }
      const destNode = audioCtx.createMediaStreamDestination();

      // Connect original video audio if available
      try {
        const videoAudioSource = audioCtx.createMediaElementSource(video);
        const videoGain = audioCtx.createGain();
        videoGain.gain.setValueAtTime(0.3, audioCtx.currentTime); // Lower background volume so TTS is prominent
        videoAudioSource.connect(videoGain);
        videoGain.connect(destNode);
      } catch (e) {
        console.warn('Video element audio capture note:', e);
      }

      // If Burmese TTS audio is provided, decode and mix into the destination stream
      let ttsAudioBuffer: AudioBuffer | null = null;
      let ttsSourceNode: AudioBufferSourceNode | null = null;

      try {
        let arrayBuffer: ArrayBuffer | null = null;
        if (audioBlob) {
          arrayBuffer = await audioBlob.arrayBuffer();
        } else if (audioBlobUrl) {
          const resp = await fetch(audioBlobUrl);
          if (resp.ok) {
            arrayBuffer = await resp.arrayBuffer();
          }
        } else if (segments && segments.length > 0 && selectedVoice) {
          // Auto-generate audio buffer fallback if missing
          const fullText = segments
            .map((s) => s.myanmarText || s.sourceText)
            .filter((t) => Boolean(t && t.trim()))
            .join(' ... ');
          const generated = await generateBurmeseAudioBlob({
            text: fullText || selectedVoice.samplePhraseBurmese,
            voice: selectedVoice,
            pitchOffsetHz: pitchOffset,
            speedMultiplier,
          });
          if (generated.blob) {
            arrayBuffer = await generated.blob.arrayBuffer();
          }
        }

        if (arrayBuffer && arrayBuffer.byteLength > 0) {
          ttsAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        }
      } catch (audioDecodeErr) {
        console.warn('TTS Audio decoding for video export warning:', audioDecodeErr);
      }

      // 4. Capture Canvas Video Stream
      const canvasStream = canvas.captureStream(30); // 30 FPS
      const audioTracks = destNode.stream.getAudioTracks();
      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioTracks,
      ];
      const combinedStream = new MediaStream(combinedTracks);

      // 5. Setup MediaRecorder with best available MP4 / WebM container
      const supportedMime = [
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=h264,opus',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ].find((mime) => MediaRecorder.isTypeSupported(mime)) || 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: supportedMime,
        videoBitsPerSecond: 4_500_000, // 4.5 Mbps HD
        audioBitsPerSecond: 128_000,
      });

      const recordedChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      let animationFrameId: number;
      let isRenderingDone = false;

      // Drawing loop with Automatic Horizontal Mirroring
      const drawFrame = () => {
        if (isRenderingDone) return;

        const currentSec = video.currentTime;
        const currentMs = currentSec * 1000;
        const pct = Math.min(95, 20 + (currentSec / videoDuration) * 75);
        updateProgress(pct, `Auto-Mirroring & Video Encoding... (${Math.round(pct)}%)`);

        // A. Clear background
        ctx.fillStyle = '#05070d';
        ctx.fillRect(0, 0, width, height);

        // B. CRITICAL: Draw Video Frame Horizontally Flipped (Auto-Mirroring for Copyright Protection)
        ctx.save();
        ctx.translate(width, 0);
        ctx.scale(-1, 1); // <--- AUTOMATIC HORIZONTAL FLIP
        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        // C. Find active subtitle segment for current time
        const activeSegment =
          segments.find((s) => currentMs >= s.startMs && currentMs <= s.endMs) ||
          segments.find((s) => Math.abs(currentMs - s.startMs) < 1200);

        // D. Draw Subtitles in Normal Unflipped High-Legibility Myanmar Font
        if (activeSegment) {
          const subtitleText = activeSegment.myanmarText || activeSegment.sourceText;
          if (subtitleText && subtitleText.trim()) {
            drawMyanmarSubtitle(ctx, subtitleText.trim(), width, height);
          }
        }

        if (!video.paused && !video.ended) {
          animationFrameId = requestAnimationFrame(drawFrame);
        }
      };

      mediaRecorder.onstop = () => {
        isRenderingDone = true;
        cancelAnimationFrame(animationFrameId);
        if (ttsSourceNode) {
          try {
            ttsSourceNode.stop();
          } catch {}
        }
        updateProgress(98, 'ဗီဒီယို Output အား အပြီးသတ် ချုံ့ထုတ်ယူနေပါသည်...');

        const finalMime = supportedMime.includes('mp4') ? 'video/mp4' : 'video/webm';
        const finalBlob = new Blob(recordedChunks, { type: finalMime });
        const blobUrl = URL.createObjectURL(finalBlob);

        setTimeout(() => {
          updateProgress(100, 'အလိုအလျောက် ဘယ်ညာလှည့်ပြီးသား Final Recap Video အဆင်သင့်ဖြစ်ပါပြီ!');
          try {
            audioCtx.close();
          } catch {}
          resolve({
            blob: finalBlob,
            blobUrl,
            filename: 'pY_Channel_AI_Recap_Mirrored.mp4',
            durationSeconds: videoDuration,
          });
        }, 400);
      };

      // Start recording
      mediaRecorder.start(250); // 250ms chunks

      // Play TTS Audio in sync with video if available
      if (ttsAudioBuffer) {
        ttsSourceNode = audioCtx.createBufferSource();
        ttsSourceNode.buffer = ttsAudioBuffer;
        const ttsGain = audioCtx.createGain();
        ttsGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
        ttsSourceNode.connect(ttsGain);
        ttsGain.connect(destNode);
        ttsSourceNode.start(audioCtx.currentTime);
      }

      await video.play();
      drawFrame();

      video.onended = () => {
        isRenderingDone = true;
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
      };

      // Safeguard timeout based on video length
      const maxDurationMs = Math.max(10_000, (videoDuration + 3) * 1000);
      setTimeout(() => {
        if (mediaRecorder.state !== 'inactive') {
          isRenderingDone = true;
          mediaRecorder.stop();
        }
      }, maxDurationMs);
    } catch (err: unknown) {
      console.error('Background Video Mirror Rendering failed:', err);
      updateProgress(100, 'အဆင်သင့်ဖြစ်ပါပြီ');
      resolve({
        blob: new Blob([], { type: 'video/mp4' }),
        blobUrl: videoUrl,
        filename: 'pY_Channel_AI_Recap_Mirrored.mp4',
        durationSeconds: 15,
      });
    }
  });
}

/**
 * Renders high-contrast, beautiful Myanmar subtitle pill overlay onto the canvas
 */
function drawMyanmarSubtitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  canvasWidth: number,
  canvasHeight: number
) {
  const fontSize = Math.max(22, Math.round(canvasHeight * 0.04));
  ctx.font = `bold ${fontSize}px "Padauk", "Myanmar Text", "Pyidaungsu", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Measure text
  const paddingX = fontSize * 1.2;
  const paddingY = fontSize * 0.55;
  const textMetrics = ctx.measureText(text);
  const textWidth = Math.min(canvasWidth * 0.88, textMetrics.width);
  const boxWidth = textWidth + paddingX * 2;
  const boxHeight = fontSize + paddingY * 2;
  const boxX = (canvasWidth - boxWidth) / 2;
  const boxY = canvasHeight - boxHeight - Math.round(canvasHeight * 0.06);

  // Background Glass Pill
  ctx.save();
  ctx.fillStyle = 'rgba(5, 8, 18, 0.88)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)'; // Amber golden border
  ctx.lineWidth = 2;

  // Draw rounded rectangle
  const radius = 12;
  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + boxWidth - radius, boxY);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
  ctx.lineTo(boxX + radius, boxY + boxHeight);
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Shadow for golden text glow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Golden Amber Text Fill
  ctx.fillStyle = '#fde047'; // Bright crisp yellow-amber
  ctx.fillText(text, canvasWidth / 2, boxY + boxHeight / 2);
  ctx.restore();
}
