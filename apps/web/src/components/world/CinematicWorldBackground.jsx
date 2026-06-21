import { useEffect, useState } from "react";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(Boolean(query.matches));
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);
  return reduced;
}

export default function CinematicWorldBackground({ theme }) {
  const reducedMotion = useReducedMotion();
  const canPlayVideo = Boolean(theme?.backgroundVideo && !reducedMotion);

  return (
    <div className={`cinematic-world-bg ${theme?.backgroundClass || "world-bg-archive"}`} aria-hidden="true">
      {canPlayVideo && (
        <video
          key={theme.backgroundVideo}
          className="cinematic-world-bg__video"
          src={theme.backgroundVideo}
          poster={theme.backgroundPoster || undefined}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {!canPlayVideo && theme?.backgroundPoster && <img className="cinematic-world-bg__poster" src={theme.backgroundPoster} alt="" />}
      <div className="cinematic-world-bg__gradient" />
      <div className="cinematic-world-bg__particles" />
      <div className="cinematic-world-bg__vignette" />
    </div>
  );
}
