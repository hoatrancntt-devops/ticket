import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName, SRTSegment } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper: Decode Base64 to ArrayBuffer -> AudioBuffer
async function decodeAudioData(
  base64String: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Note: decodeAudioData detaches the buffer in some implementations, 
  // copying it can be safer but usually not required for fresh Uint8Arrays.
  return await audioContext.decodeAudioData(bytes.buffer.slice(0)); 
}

// Single text generation
export const generateSpeech = async (
  text: string,
  voice: VoiceName,
  audioContext: AudioContext
): Promise<AudioBuffer> => {
  if (!text.trim()) throw new Error("Vui lòng nhập nội dung.");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find(p => p.inlineData);

    if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) {
      throw new Error("Không nhận được dữ liệu âm thanh từ mô hình.");
    }

    return await decodeAudioData(audioPart.inlineData.data, audioContext);

  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    throw new Error(error.message || "Đã xảy ra lỗi khi tạo giọng nói.");
  }
};

// SRT Batch Generation
export const generateSRTAudio = async (
  segments: SRTSegment[],
  voice: VoiceName,
  audioContext: AudioContext,
  onProgress: (current: number, total: number) => void
): Promise<AudioBuffer> => {
  if (segments.length === 0) throw new Error("Không tìm thấy nội dung trong SRT.");

  // 1. Generate audio for all segments (with concurrency limit)
  const results: { segment: SRTSegment; buffer: AudioBuffer }[] = [];
  const CONCURRENCY_LIMIT = 3; 
  
  for (let i = 0; i < segments.length; i += CONCURRENCY_LIMIT) {
    const batch = segments.slice(i, i + CONCURRENCY_LIMIT);
    const batchPromises = batch.map(async (seg) => {
      try {
        const buffer = await generateSpeech(seg.text, voice, audioContext);
        return { segment: seg, buffer };
      } catch (err) {
        console.warn(`Failed to generate audio for segment ${seg.id}:`, err);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(res => {
      if (res) results.push(res);
    });

    onProgress(Math.min(i + CONCURRENCY_LIMIT, segments.length), segments.length);
  }

  if (results.length === 0) {
    throw new Error("Không thể tạo âm thanh cho các đoạn phụ đề.");
  }

  // 2. Calculate total duration required
  // Find the max end timestamp across all segments (StartTime + AudioDuration)
  // We use AudioDuration instead of SRT EndTime for the actual audio content length,
  // to prevent cutting off if the TTS reads slower than the subtitle duration.
  let totalDuration = 0;
  results.forEach(({ segment, buffer }) => {
    const end = segment.startTime + buffer.duration;
    if (end > totalDuration) totalDuration = end;
  });
  
  // Add a small buffer at the end just in case
  totalDuration += 0.5;

  // 3. Create master buffer
  const masterBuffer = audioContext.createBuffer(
    1, // Mono output
    Math.ceil(totalDuration * audioContext.sampleRate),
    audioContext.sampleRate
  );

  const channelData = masterBuffer.getChannelData(0);

  // 4. Mix segments into master buffer
  results.forEach(({ segment, buffer }) => {
    const startSample = Math.floor(segment.startTime * audioContext.sampleRate);
    const inputData = buffer.getChannelData(0); 
    
    for (let i = 0; i < inputData.length; i++) {
      const targetIdx = startSample + i;
      if (targetIdx < channelData.length) {
        // Mix (Add) samples
        let sample = channelData[targetIdx] + inputData[i];
        
        // Simple Clipping to avoid distortion if overlaps occur
        if (sample > 1.0) sample = 1.0;
        if (sample < -1.0) sample = -1.0;
        
        channelData[targetIdx] = sample;
      }
    }
  });

  return masterBuffer;
};