import { useEffect, useMemo, useState } from "react";

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

function clampPercent(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

export default function CinematicWorldBackground({ theme }) {
  const reducedMotion = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const videoSrc = theme?.backgroundVideo || "";
  const canPlayVideo = Boolean(videoSrc && !reducedMotion && !videoFailed);
  const backgroundStyle = useMemo(() => ({
    "--cinematic-media-opacity": clampPercent(theme?.backgroundOpacity, 0.46),
    "--cinematic-media-blur": `${Math.max(0, Math.min(12, Number(theme?.backgroundBlur) || 0))}px`,
    "--cinematic-dim": clampPercent(theme?.backgroundDim, 0.58)
  }), [theme?.backgroundOpacity, theme?.backgroundBlur, theme?.backgroundDim]);

  useEffect(() => {
    setVideoFailed(false);
  }, [videoSrc]);

  return (
    <div className={`cinematic-world-bg ${theme?.backgroundClass || "world-bg-archive"}`} style={backgroundStyle} aria-hidden="true">
      {canPlayVideo && (
        <video
          key={videoSrc}
          className="cinematic-world-bg__video"
          src={videoSrc}
          poster={theme.backgroundPoster || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setVideoFailed(true)}
        />
      )}
      {(!canPlayVideo && theme?.backgroundPoster) && <img className="cinematic-world-bg__poster" src={theme.backgroundPoster} alt="" />}
      <div className="cinematic-world-bg__gradient" />
      <div className="cinematic-world-bg__particles" />
      <div className="cinematic-world-bg__vignette" />
    </div>
  );
}
