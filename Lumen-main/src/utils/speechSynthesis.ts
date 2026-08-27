export class AudioRehearsalEngine {
  private static synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static currentUtterance: SpeechSynthesisUtterance | null = null;

  public static speak(
    text: string,
    wpm: number = 135,
    onBoundary?: (charIndex: number) => void,
    onEnd?: () => void
  ) {
    if (!this.synth) return;
    this.stop();

    // Clean bracketed cues
    const cleanText = text.replace(/\[.*?\]/g, ' ').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Standard SpeechSynthesis rate: 1.0 is ~140 WPM. Calculate rate:
    const rate = Math.max(0.5, Math.min(2.5, wpm / 140));
    utterance.rate = rate;

    // Detect language or default to Spanish
    utterance.lang = 'es-ES';

    utterance.onboundary = (event) => {
      if (event.name === 'word' && onBoundary) {
        onBoundary(event.charIndex);
      }
    };

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  public static stop() {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public static isSpeaking(): boolean {
    return this.synth ? this.synth.speaking : false;
  }
}
