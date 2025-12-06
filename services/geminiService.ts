import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { StoryParams, StoryDuration } from "../types";

// Initialize the API client
// Note: Ensure process.env.API_KEY is available in your environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
Sen dünya çapında ünlü bir mitoloji uzmanı ve usta bir hikaye anlatıcısısın (bard/storyteller). 
Görevin, kullanıcının verdiği mitolojik karakter, köken ve özellikleri kullanarak son derece etkileyici, akıcı ve edebi değeri yüksek hikayeler yazmaktır.
Hikayeyi yazarken şu kurallara uy:
1. Hikaye dili Türkçe olmalı.
2. Karakterin mitolojik kökenine uygun atmosferi yansıt (Örn: İskandinav ise soğuk ve sert, Yunan ise destansı ve tutkulu).
3. Kullanıcının belirttiği 'Ton' (Epik, Trajik vb.) hikayenin genel havasına hakim olmalı.
4. Hikayeye mutlaka ilgi çekici bir başlık ekle. Başlığı ilk satıra koy.
5. Markdown formatını kullanarak metni biçimlendir (kalın, italik vb. kullan).
`;

export const generateMythologicalStory = async (params: StoryParams): Promise<{ title: string; content: string }> => {
  try {
    let durationInstruction = "";
    
    switch (params.duration) {
      case StoryDuration.SHORTS:
        durationInstruction = `
          FORMAT: YouTube Shorts (Dikey Video) formatına uygun.
          SÜRE: 30-60 saniye okuma süresi (Yaklaşık 150-250 kelime).
          YAPI: Giriş çok hızlı ve vurucu olmalı. Gereksiz betimlemelerden kaçın. Doğrudan aksiyona veya ana fikre gir. Sonunda şaşırtıcı veya etkileyici bir final cümlesi olsun.
        `;
        break;
      case StoryDuration.VIDEO:
        durationInstruction = `
          FORMAT: YouTube Standart Video formatına uygun.
          SÜRE: 4-10 dakika okuma süresi (Yaklaşık 800-1500 kelime).
          YAPI: Klasik hikaye kurgusu (Giriş, Gelişme, Çatışma, Sonuç). Karakterin iç dünyasına ve çevre betimlemelerine yer ver. Olay örgüsü tatmin edici bir hızda ilerlemeli.
        `;
        break;
      case StoryDuration.EPIC:
        durationInstruction = `
          FORMAT: Uzun soluklu, detaylı anlatı (Podcast veya Belgesel tadında).
          SÜRE: 12 dakika ve üzeri okuma süresi (Yaklaşık 2000+ kelime).
          YAPI: Çok detaylı, derinlemesine ve katmanlı bir anlatım. Yan karakterler, geçmişe dönüşler (flashback) ve felsefi sorgulamalar içerebilir. Hikayeyi mantıklı 'Bölümlere' (Bölüm 1, Bölüm 2 vb.) ayırarak yaz.
        `;
        break;
      default:
        durationInstruction = "Orta uzunlukta, dengeli bir hikaye yaz.";
    }

    const prompt = `
      Lütfen aşağıdaki parametrelere göre bir mitolojik hikaye yaz:
      
      Karakter Adı: ${params.characterName}
      Mitoloji Kökeni: ${params.mythology}
      Karakter Özellikleri: ${params.traits}
      Hikaye Tonu: ${params.tone}
      ${params.customPrompt ? `Ekstra İstekler/Senaryo: ${params.customPrompt}` : ''}

      ÖNEMLİ FORMAT TALİMATLARI:
      ${durationInstruction}

      Hikaye sürükleyici, detaylı ve mitolojik öğelerle zenginleştirilmiş olsun.
    `;

    // Adjust max output tokens based on duration to avoid cut-offs or waste
    // Shorts don't need much thinking, Epics need more budget.
    // Removed thinkingConfig due to potential stability issues in some regions/models.
    
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.85, 
        topK: 40,
        topP: 0.95
      }
    });

    const text = response.text;
    
    if (!text) {
        throw new Error("Yapay zeka boş bir yanıt döndürdü. Lütfen tekrar deneyin.");
    }
    
    const lines = text.split('\n');
    let title = "İsimsiz Efsane";
    
    // Attempt to extract title safely
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // Only treat as title if it's short-ish and looks like a header
      if (firstLine.length < 100) {
         title = firstLine.replace(/^#+\s*/, '').replace(/\*\*/g, ''); 
      }
    }

    return { title, content: text };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Hikaye oluşturulurken tanrıların gazabına uğradık. Lütfen tekrar deneyin.");
  }
};

export const getCharacterDetails = async (characterName: string): Promise<{ mythology: string; traits: string }> => {
  try {
    const prompt = `
      Verilen karakter ismi için mitolojik kökeni ve temel özellikleri belirle.
      Karakter İsmi: "${characterName}"
      
      Eğer karakter bilinen bir mitolojik figürse gerçek bilgilerini kullan.
      Eğer bilinmeyen veya uydurma bir isimse, ismin tınısına uygun mantıklı bir mitoloji ve fantastik özellikler uydur.
      
      Cevabı SADECE şu JSON formatında ver:
      {
        "mythology": "Mitoloji adı (örn: Yunan Mitolojisi)",
        "traits": "Kısa virgülle ayrılmış özellikler (örn: Yıldırımların efendisi, güçlü, sakallı)"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No data returned");
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Auto-fill Error:", error);
    // Fallback if AI fails
    return { 
      mythology: "Bilinmeyen Mitoloji", 
      traits: "Gizemli güçler, antik aura" 
    };
  }
};

export const generateStoryIllustrations = async (storyContent: string, characterName: string, traits: string): Promise<string[]> => {
  try {
    // 1. Analyze story to get scene descriptions
    const analysisPrompt = `
      Aşağıdaki hikayeyi analiz et ve hikayenin akışına uygun tam olarak 10 farklı görsel sahne betimlemesi oluştur.
      
      ANA KARAKTER DETAYLARI (ÖNEMLİ):
      İsim: ${characterName}
      Özellikler: ${traits}

      Hikaye:
      ${storyContent.substring(0, 3000)}... (kısaltıldı)

      Çıktı Kuralları:
      1. Sadece İngilizce görsel promptları (image generation prompts) listesi ver.
      2. HER PROMPT İÇİN ZORUNLULU KURAL: Ana karakter (${characterName}) mutlaka ön planda (foreground), odak noktasında ve belirgin olmalıdır. 
      3. Kompozisyonlar "Medium shot", "Close-up" veya "Low angle heroic shot" gibi karakter odaklı olsun.
      4. Mitolojik fantezi sanat tarzı kullan (cinematic lighting, fantasy art style, high detail, 4k, epic atmosphere).
      5. GÖRSEL FORMATI: YouTube Shorts için DİKEY (9:16) kompozisyona uygun anlatım kullan (Vertical composition, tall format).
      6. Her satırda sadece bir prompt olsun.
      7. Listede numara veya madde işareti kullanma.
      8. Toplam 10 satır olsun.
    `;

    const analysisResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: analysisPrompt
    });
    
    // Get up to 10 prompts
    const prompts = (analysisResponse.text || "").split('\n').filter(line => line.trim().length > 10).slice(0, 10);
    
    // 2. Generate images for each prompt
    const imagePromises = prompts.map(async (p) => {
        try {
            // Append explicit character focus instruction to the prompt to be safe
            const enhancedPrompt = `Vertical 9:16 aspect ratio. ${p}. Masterpiece, best quality, character focus in foreground.`;

            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                  parts: [{ text: enhancedPrompt }]
                },
                config: {
                    imageConfig: {
                        aspectRatio: '9:16' // Force vertical aspect ratio for Shorts
                    }
                }
            });
            
            // Extract image
            for (const part of result.candidates?.[0]?.content?.parts || []) {
                if (part.inlineData && part.inlineData.data) {
                    return `data:image/png;base64,${part.inlineData.data}`;
                }
            }
            return null;
        } catch (e) {
            console.error("Image gen failed for prompt:", p, e);
            return null;
        }
    });

    const results = await Promise.all(imagePromises);
    return results.filter((img): img is string => img !== null);

  } catch (error) {
    console.error("Illustration Error:", error);
    return [];
  }
};

export const generateYouTubeThumbnail = async (title: string, characterName: string, traits: string, orientation: 'landscape' | 'portrait'): Promise<string | null> => {
  try {
    const aspectRatio = orientation === 'landscape' ? '16:9' : '9:16';
    const aspectRatioText = orientation === 'landscape' ? 'Horizontal 16:9' : 'Vertical 9:16';

    const prompt = `
      Create a high-quality, text-free YouTube Thumbnail art.
      
      SUBJECT:
      - Main Character: ${characterName} (${traits}).
      - The character should be the absolute focus, highly detailed, looking epic.
      - Action pose or dramatic stance.

      ENVIRONMENT:
      - Epic mythological background, atmospheric lighting (volumetric fog, god rays).
      - Cinematic composition.

      STYLE:
      - 8k resolution, hyper-realistic digital fantasy art, masterpiece.
      - VIVID COLORS, High Contrast.
      - Aspect Ratio: ${aspectRatioText}.
      
      NEGATIVE PROMPT / IMPORTANT: 
      - NO TEXT, NO LETTERS, NO TYPOGRAPHY, NO WATERMARKS. 
      - The image must be clean art only.
    `;

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
            imageConfig: {
                aspectRatio: aspectRatio
            }
        }
    });
    
    for (const part of result.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    return null;

  } catch (error) {
    console.error("Thumbnail Generation Error:", error);
    return null;
  }
};

// --- AUDIO HELPERS ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Convert AudioBuffer to WAV format for download
export function audioBufferToWav(buffer: AudioBuffer): Blob {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;
  
    // write WAVE header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
  
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint16(numOfChan * 2); // block-align
    setUint16(16); // 16-bit (hardcoded in this example)
  
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length
  
    // write interleaved data
    for (i = 0; i < buffer.numberOfChannels; i++)
      channels.push(buffer.getChannelData(i));
  
    while (pos < buffer.length) {
      for (i = 0; i < numOfChan; i++) {
        // interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][pos])); // clamp
        sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit signed int
        view.setInt16(offset, sample, true); // write 16-bit sample
        offset += 2;
      }
      pos++;
    }
  
    return new Blob([bufferArr], { type: 'audio/wav' });
  
    function setUint16(data: number) {
      view.setUint16(offset, data, true);
      offset += 2;
    }
  
    function setUint32(data: number) {
      view.setUint32(offset, data, true);
      offset += 4;
    }
  }

export const generateStorySpeech = async (text: string, voiceName: string = 'Charon'): Promise<AudioBuffer> => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
  
  // Clean text for speech
  const cleanText = text.replace(/[*#_]/g, '');

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: cleanText }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
          voiceConfig: {
            // Use the selected voice name
            prebuiltVoiceConfig: { voiceName: voiceName }, 
          },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64Audio) {
    throw new Error("Ses verisi oluşturulamadı.");
  }

  const audioBytes = decode(base64Audio);
  const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
  
  return audioBuffer;
};

// --- SRT GENERATOR HELPER ---

function formatSRTTime(seconds: number): string {
  const date = new Date(0);
  date.setMilliseconds(seconds * 1000);
  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss},${ms}`;
}

export const createSRTContent = (text: string, totalDuration: number): string => {
  // 1. Clean Markdown and extra spaces
  const cleanText = text.replace(/[*#_]/g, '').trim();
  
  // 2. Split into sentences (simple regex lookbehind for punctuation)
  // Splits by ., !, ? but keeps them attached to the sentence
  const sentences = cleanText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [cleanText];
  
  const totalLength = cleanText.length;
  let currentTime = 0;
  let srtOutput = '';

  sentences.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) return;

    // Estimate duration based on character count ratio
    const sentenceRatio = trimmedSentence.length / totalLength;
    const sentenceDuration = sentenceRatio * totalDuration;
    
    const startTime = currentTime;
    const endTime = currentTime + sentenceDuration;

    srtOutput += `${index + 1}\n`;
    srtOutput += `${formatSRTTime(startTime)} --> ${formatSRTTime(endTime)}\n`;
    srtOutput += `${trimmedSentence}\n\n`;

    currentTime = endTime;
  });

  return srtOutput;
};