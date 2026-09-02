/**
 * Lightweight Text-To-Speech (TTS) Service using Web Speech API
 */
class TTSService {
  private isEnabled: boolean = false;
  private rate: number = 1.0;
  private pitch: number = 1.1; // Slightly higher pitch for anime character voice

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  public setRate(rate: number) {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  public setPitch(pitch: number) {
    this.pitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  public speak(text: string) {
    if (!this.isEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;

    this.stop();

    // Clean markdown and code blocks for speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '代码块已生成')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/[#*_~]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;
    utterance.lang = 'zh-CN';

    // Find best Chinese voice if available
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => (v.lang === 'zh-CN' || v.lang === 'zh') && (v.name.includes('Xiaoxiao') || v.name.includes('Huihui') || v.name.includes('Yaoyao') || v.name.includes('Natural') || v.name.includes('Female')));
    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const ttsService = new TTSService();
