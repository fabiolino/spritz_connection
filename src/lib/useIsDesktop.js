import { useEffect, useState } from "react";

// Vrai sur un écran d'ordinateur (au moins 1024 px de large)
export const DESKTOP_QUERY = "(min-width: 1024px)";

export function useIsDesktop() {
  const get = () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches;
  const [desktop, setDesktop] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const on = () => setDesktop(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on));
  }, []);
  return desktop;
}
