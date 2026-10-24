// CS3483 addition: short audio cues generated with the Web Audio API (no audio files).
// Add new cues (e.g. "move", "illegal") to CUES for future move-recorded / warning sounds.

export type SoundCue = "start" | "end" | "warning";

interface Tone {
  frequency: number; // Hz
  duration: number;  // seconds
}

const VOLUME = 0.2;

const CUES: Record<SoundCue, { tones: Tone[], wave: OscillatorType }> = {
  // Rising C5 -> G5
  start: { tones: [{ frequency: 523.25, duration: 0.15 }, { frequency: 783.99, duration: 0.2 }], wave: "sine" },
  // Falling G5 -> C5
  end: { tones: [{ frequency: 783.99, duration: 0.15 }, { frequency: 523.25, duration: 0.3 }], wave: "sine" },
  // Two low buzzes
  warning: { tones: [{ frequency: 220, duration: 0.12 }, { frequency: 0, duration: 0.06 }, { frequency: 220, duration: 0.12 }], wave: "square" }
};

let context: AudioContext | null = null;

const getContext = (): AudioContext => {
  if (context === null) {
    context = new AudioContext();
  }
  if (context.state === "suspended") {
    // Browsers only allow audio after the user has interacted with the page (any click).
    context.resume().catch((error: unknown) => console.warn("Unable to resume audio", error));
  }
  return context;
};

export const playCue = (cue: SoundCue) => {
  try {
    const ctx = getContext();
    const { tones, wave } = CUES[cue];
    let t = ctx.currentTime;
    for (const tone of tones) {
      if (tone.frequency > 0) {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = wave;
        oscillator.frequency.value = tone.frequency;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(VOLUME, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.duration);
        oscillator.connect(gain).connect(ctx.destination);
        oscillator.start(t);
        oscillator.stop(t + tone.duration + 0.02);
      }
      t += tone.duration;
    }
  } catch (error) {
    console.warn("Unable to play sound", error);
  }
};
