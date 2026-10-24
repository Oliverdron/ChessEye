// CS3483 addition: spoken feedback with the browser's speechSynthesis.
// Reusable later for spoken moves ("Knight to f3").

export const speak = (text: string, delayMs: number = 0) => {
  if (!("speechSynthesis" in window)) {
    return;
  }
  window.setTimeout(() => {
    // Drop anything still queued so feedback is never stale.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }, delayMs);
};
