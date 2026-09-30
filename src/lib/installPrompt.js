// Capture l'événement "beforeinstallprompt" (Android/Chrome) dès le chargement de l'app :
// le navigateur ne le redéclenche pas à la demande, il faut donc l'écouter avant qu'un
// composant en ait besoin — ce module est importé tout en haut de App.jsx pour ça.

let deferredEvent = null;
const listeners = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredEvent = e;
    listeners.forEach((cb) => cb());
  });
  window.addEventListener("appinstalled", () => {
    deferredEvent = null;
    listeners.forEach((cb) => cb());
  });
}

export function canPromptInstall() {
  return !!deferredEvent;
}

// "accepted" | "dismissed" | "unavailable"
export async function promptInstall() {
  if (!deferredEvent) return "unavailable";
  deferredEvent.prompt();
  const { outcome } = await deferredEvent.userChoice;
  deferredEvent = null;
  return outcome;
}

export function onInstallAvailabilityChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
