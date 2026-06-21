import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Music2, Volume2, VolumeX, X } from "lucide-react";

const STORAGE_ENABLED = "codex-ambience-enabled";
const STORAGE_VOLUME = "codex-ambience-volume";
const STORAGE_SOURCE = "codex-ambience-source";

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function createNoiseBuffer(context, seconds = 4) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let previous = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    previous = previous * 0.985 + white * 0.015;
    data[i] = previous;
  }
  return buffer;
}

function makeFilter(context, type, frequency, q = 0.7) {
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  return filter;
}

function addOscillator(context, destination, frequency, gainValue, type = "sine") {
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.value = gainValue;
  osc.connect(gain);
  gain.connect(destination);
  osc.start();
  return { osc, gain };
}

function ambienceProfile(kind = "arcane") {
  switch (kind) {
    case "fire":
      return { noiseGain: 0.1, filterType: "lowpass", filterFrequency: 820, q: 0.55, lfoRate: 0.08, lfoDepth: 0.018, tones: [] };
    case "wind":
      return { noiseGain: 0.085, filterType: "lowpass", filterFrequency: 430, q: 0.45, lfoRate: 0.045, lfoDepth: 0.025, tones: [] };
    case "forest":
      return { noiseGain: 0.07, filterType: "lowpass", filterFrequency: 780, q: 0.45, lfoRate: 0.035, lfoDepth: 0.015, tones: [{ frequency: 146.83, gain: 0.008, type: "sine" }] };
    case "infernal":
      return { noiseGain: 0.055, filterType: "lowpass", filterFrequency: 260, q: 0.7, lfoRate: 0.04, lfoDepth: 0.016, tones: [{ frequency: 55, gain: 0.011, type: "sine" }, { frequency: 82.41, gain: 0.006, type: "sine" }] };
    case "celestial":
      return { noiseGain: 0.035, filterType: "lowpass", filterFrequency: 960, q: 0.42, lfoRate: 0.025, lfoDepth: 0.01, tones: [{ frequency: 196, gain: 0.012, type: "sine" }, { frequency: 392, gain: 0.006, type: "sine" }] };
    case "death":
      return { noiseGain: 0.045, filterType: "lowpass", filterFrequency: 320, q: 0.62, lfoRate: 0.035, lfoDepth: 0.014, tones: [{ frequency: 61.74, gain: 0.01, type: "sine" }] };
    case "arcane":
    default:
      return { noiseGain: 0.04, filterType: "bandpass", filterFrequency: 310, q: 0.65, lfoRate: 0.03, lfoDepth: 0.012, tones: [{ frequency: 110, gain: 0.012, type: "sine" }, { frequency: 220, gain: 0.006, type: "triangle" }] };
  }
}

function startSyntheticAmbience(theme, volume) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -30;
  compressor.knee.value = 24;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.05;
  compressor.release.value = 0.35;
  compressor.connect(master);

  const kind = theme?.ambience?.kind || "arcane";
  const profile = ambienceProfile(kind);

  const noise = context.createBufferSource();
  noise.buffer = createNoiseBuffer(context, 5);
  noise.loop = true;
  const noiseGain = context.createGain();
  noiseGain.gain.value = profile.noiseGain;
  const filter = makeFilter(context, profile.filterType, profile.filterFrequency, profile.q);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(compressor);
  noise.start();

  const lfo = context.createOscillator();
  const lfoGain = context.createGain();
  lfo.type = "sine";
  lfo.frequency.value = profile.lfoRate;
  lfoGain.gain.value = profile.lfoDepth;
  lfo.connect(lfoGain);
  lfoGain.connect(noiseGain.gain);
  lfo.start();

  const oscillators = profile.tones.map((tone) => addOscillator(context, compressor, tone.frequency, tone.gain, tone.type));

  const emberTimer = kind === "fire" ? window.setInterval(() => {
    const snap = context.createBufferSource();
    snap.buffer = createNoiseBuffer(context, 0.08);
    const snapGain = context.createGain();
    const snapFilter = makeFilter(context, "bandpass", 1200 + Math.random() * 460, 0.6);
    snapGain.gain.value = 0.004 + Math.random() * 0.008;
    snap.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(compressor);
    snap.start();
    snap.stop(context.currentTime + 0.08);
  }, 1400 + Math.random() * 500) : null;

  context.resume?.();
  master.gain.setTargetAtTime(clamp(volume, 0, 0.3), context.currentTime + 0.02, 0.35);

  return {
    setVolume(nextVolume) {
      master.gain.setTargetAtTime(clamp(nextVolume, 0, 0.3), context.currentTime, 0.18);
    },
    stop() {
      if (emberTimer) window.clearInterval(emberTimer);
      master.gain.setTargetAtTime(0, context.currentTime, 0.08);
      window.setTimeout(() => {
        try { noise.stop(); } catch {}
        try { lfo.stop(); } catch {}
        oscillators.forEach(({ osc }) => { try { osc.stop(); } catch {} });
        context.close?.();
      }, 220);
    }
  };
}

function createFilePlayer(src, volume, onError) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.volume = 0;
  audio.preload = "auto";
  const target = clamp(volume, 0, 0.3);
  let frame = null;
  let stopped = false;

  const fadeTo = (nextVolume, speed = 0.012) => {
    if (frame) window.cancelAnimationFrame(frame);
    const tick = () => {
      if (stopped) return;
      const diff = nextVolume - audio.volume;
      if (Math.abs(diff) < 0.006) {
        audio.volume = nextVolume;
        frame = null;
        return;
      }
      audio.volume = clamp(audio.volume + Math.sign(diff) * speed, 0, 0.3);
      frame = window.requestAnimationFrame(tick);
    };
    tick();
  };

  audio.addEventListener("error", onError);
  audio.play().then(() => fadeTo(target, 0.008)).catch(onError);

  return {
    setVolume(nextVolume) {
      fadeTo(clamp(nextVolume, 0, 0.3), 0.012);
    },
    stop() {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      const current = audio.volume;
      const steps = 12;
      let step = 0;
      const fade = window.setInterval(() => {
        step += 1;
        audio.volume = clamp(current * (1 - step / steps), 0, 0.3);
        if (step >= steps) {
          window.clearInterval(fade);
          audio.pause();
          audio.src = "";
          audio.removeEventListener("error", onError);
        }
      }, 18);
    }
  };
}

function readInitialEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_ENABLED) === "true";
}

function readInitialVolume(theme) {
  if (typeof window === "undefined") return theme?.ambience?.defaultVolume ?? 0.08;
  const stored = Number(window.localStorage.getItem(STORAGE_VOLUME));
  if (Number.isFinite(stored) && stored >= 0) return clamp(stored, 0, 0.3);
  return theme?.ambience?.defaultVolume ?? 0.08;
}


function parseYouTubeUrl(rawUrl = "") {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "").toLowerCase();
    const isYouTube = host === "youtube.com" || host === "music.youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com";
    if (!isYouTube) return null;

    const list = url.searchParams.get("list") || "";
    let videoId = "";

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v") || "";
    } else {
      const parts = url.pathname.split("/").filter(Boolean);
      const marker = ["embed", "shorts", "live"].find((item) => parts.includes(item));
      if (marker) videoId = parts[parts.indexOf(marker) + 1] || "";
    }

    const safeId = videoId.match(/^[A-Za-z0-9_-]{6,}$/)?.[0] || "";
    const safeList = list.match(/^[A-Za-z0-9_-]{6,}$/)?.[0] || "";
    if (!safeId && !safeList) return null;

    const params = new URLSearchParams({ rel: "0", modestbranding: "1", playsinline: "1" });
    let embedUrl = "";
    if (safeId) {
      if (safeList) params.set("list", safeList);
      embedUrl = `https://www.youtube-nocookie.com/embed/${safeId}?${params.toString()}`;
    } else {
      params.set("list", safeList);
      embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
    }

    return { embedUrl, videoId: safeId, listId: safeList, originalUrl: value };
  } catch {
    return null;
  }
}

function readInitialSource() {
  if (typeof window === "undefined") return "auto";
  return window.localStorage.getItem(STORAGE_SOURCE) || "auto";
}

export default function WorldAmbienceControl({ theme }) {
  const hasFile = Boolean(theme?.ambience?.src);
  const hasSynthetic = Boolean(theme?.ambience?.kind && theme.ambience.kind !== "none");
  const youtube = useMemo(() => parseYouTubeUrl(theme?.music?.url), [theme?.music?.url]);
  const hasYouTube = Boolean(theme?.music?.source === "youtube" && youtube);
  const playable = hasFile || hasSynthetic;
  const [enabled, setEnabled] = useState(readInitialEnabled);
  const [volume, setVolume] = useState(() => readInitialVolume(theme));
  const [sourceMode, setSourceMode] = useState(readInitialSource);
  const [mediaError, setMediaError] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);
  const playerRef = useRef(null);
  const themeKey = theme?.key || "archive";
  const label = useMemo(() => theme?.ambience?.label || "Атмосфера", [theme]);
  const musicLabel = useMemo(() => theme?.music?.label || "Музыка мира", [theme?.music?.label]);
  const effectiveMode = sourceMode === "file" && !hasFile ? "auto" : sourceMode;
  const shouldUseFile = hasFile && effectiveMode !== "synthetic";
  const shouldUseSynthetic = hasSynthetic && (!hasFile || effectiveMode === "synthetic" || mediaError);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_ENABLED, String(enabled));
  }, [enabled]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_SOURCE, sourceMode);
  }, [sourceMode]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_VOLUME, String(volume));
    playerRef.current?.setVolume?.(volume);
  }, [volume]);

  useEffect(() => {
    setMediaError(false);
    setYoutubeOpen(false);
  }, [themeKey, theme?.ambience?.src, theme?.music?.url]);

  useEffect(() => {
    if (!enabled || !playable) return undefined;

    const handleMediaError = () => setMediaError(true);
    let player = null;
    if (shouldUseFile && theme?.ambience?.src) {
      player = createFilePlayer(theme.ambience.src, volume, handleMediaError);
    } else if (shouldUseSynthetic) {
      player = startSyntheticAmbience(theme, volume);
    }
    playerRef.current = player;
    return () => {
      player?.stop?.();
      if (playerRef.current === player) playerRef.current = null;
    };
  }, [enabled, playable, themeKey, theme?.ambience?.src, shouldUseFile, shouldUseSynthetic]);

  if (!playable && !hasYouTube) {
    return <span className="ambience-static-label">Атмосфера: Архив</span>;
  }

  return (
    <div className={enabled ? "ambience-control ambience-control--on" : "ambience-control"} title={enabled ? label : "Включить атмосферу мира"}>
      {playable && (
        <button type="button" className="ambience-toggle" onClick={() => setEnabled((current) => !current)}>
          {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span>{enabled ? label : "Атмосфера"}</span>
        </button>
      )}
      {enabled && playable && (
        <>
          <label className="ambience-volume" aria-label="Громкость атмосферы">
            <input type="range" min="0" max="0.3" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
          </label>
          {hasFile && hasSynthetic && (
            <button type="button" className="ambience-source" onClick={() => setSourceMode((current) => (current === "synthetic" ? "auto" : "synthetic"))}>
              <Music2 size={14} />
              <span>{effectiveMode === "synthetic" ? "мягкий preview" : "MP3"}</span>
            </button>
          )}
          {mediaError && <span className="ambience-error">файл не найден · включён preview</span>}
        </>
      )}
      {hasYouTube && (
        <div className="youtube-music-control">
          <button type="button" className={youtubeOpen ? "youtube-music-toggle active" : "youtube-music-toggle"} onClick={() => setYoutubeOpen((current) => !current)}>
            <Music2 size={14} />
            <span>{musicLabel}</span>
          </button>
          {youtubeOpen && (
            <div className="youtube-music-popover">
              <div className="youtube-music-popover-head">
                <strong>{musicLabel}</strong>
                <button type="button" onClick={() => setYoutubeOpen(false)} aria-label="Закрыть YouTube-плеер"><X size={14} /></button>
              </div>
              <iframe
                title={musicLabel}
                src={youtube.embedUrl}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
              <a href={youtube.originalUrl} target="_blank" rel="noreferrer" className="youtube-music-open-link">
                <ExternalLink size={13} /> Открыть в YouTube
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
