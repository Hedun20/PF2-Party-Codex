import { useMemo } from "react";

function clampPercent(value, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

export default function CinematicWorldBackground({ theme }) {
  const backgroundMode = theme?.backgroundMode || "theme";
  const imageSrc = backgroundMode === "image"
    ? (theme?.backgroundImage || theme?.backgroundPoster || "")
    : (backgroundMode === "video" ? (theme?.backgroundPoster || "") : "");
  const backgroundStyle = useMemo(() => ({
    "--cinematic-media-opacity": clampPercent(theme?.backgroundOpacity, 0.46),
    "--cinematic-media-blur": `${Math.max(0, Math.min(12, Number(theme?.backgroundBlur) || 0))}px`,
    "--cinematic-dim": clampPercent(theme?.backgroundDim, 0.58)
  }), [theme?.backgroundOpacity, theme?.backgroundBlur, theme?.backgroundDim]);

  return (
    <div className={`cinematic-world-bg ${theme?.backgroundClass || "world-bg-archive"}`} style={backgroundStyle} aria-hidden="true">
      {imageSrc && <img className="cinematic-world-bg__poster" src={imageSrc} alt="" />}
      <div className="cinematic-world-bg__gradient" />
      <div className="cinematic-world-bg__particles" />
      <div className="cinematic-world-bg__effect cinematic-world-bg__effect--primary" />
      <div className="cinematic-world-bg__effect cinematic-world-bg__effect--secondary" />
      <div className="cinematic-world-bg__vignette" />
    </div>
  );
}
