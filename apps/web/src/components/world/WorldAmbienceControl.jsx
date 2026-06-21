import { useEffect, useMemo, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const STORAGE_ENABLED = "codex-ambience-enabled";
const STORAGE_VOLUME = "codex-ambience-volume";

function createNoiseBuffer(context, seconds = 2) {
  const buffer = context.createBuffer(1, Math.max(1, context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function configureNoiseFilter(context, kind) {
  const filter = context.createBiquadFilter();
  if (kind === "fire") {
    filter.type = "bandpass";
    filter.frequency.value = 720;
    filter.Q.value = 0.8;
  } else if (kind === "wind" || kind === "forest") {
    filter.type = "lowpass";
    filter.frequency.value = kind === "forest" ? 980 : 520;
    filter.Q.value = 0.7;
  } else if (kind === "infernal") {
    filter.type = "lowpass";
    filter.frequency.value = 340;
    filter.Q.value = 1.1;
  } else {
    filter.type = "bandpass";
    filter.frequency.value = 360;
    filter.Q.value = 1.4;
  }
  return filter;
}

function startSyntheticAmbience(theme, volume) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  const context = new AudioContextClass();
  const master = context.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume));
  master.connect(context.destination);

  const kind = theme?.ambience?.kind || "arcane";
  const noise = context.createBufferSource();
  noise.buffer = createNoiseBuffer(context, 2);
  noise.loop = true;
  const noiseGain = context.createGain();
  noiseGain.gain.value = kind === "fire" ? 0.42 : kind === "infernal" ? 0.24 : 0.18;
  const filter = configureNoiseFilter(context, kind);
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start();

  const oscillators = [];
  const addOsc = (frequency, gainValue, type = "sine") => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    oscillators.push(osc);
  };

  if (kind === "arcane") {
    addOsc(110, 0.035, "sine");
    addOsc(220, 0.018, "triangle");
  } else if (kind === "celestial") {
    addOsc(196, 0.024, "sine");
    addOsc(392, 0.012, "sine");
  } else if (kind === "death") {
    addOsc(64, 0.032, "sine");
  } else if (kind === "infernal") {
    addOsc(55, 0.028, "sawtooth");
  } else if (kind === "forest") {
    addOsc(132, 0.01, "sine");
  }

  const crackleTimer = kind === "fire" ? window.setInterval(() => {
    const snap = context.createBufferSource();
    snap.buffer = createNoiseBuffer(context, 0.06);
    const snapGain = context.createGain();
    const snapFilter = context.createBiquadFilter();
    snapFilter.type = "highpass";
    snapFilter.frequency.value = 1400 + Math.random() * 1400;
    snapGain.gain.value = 0.04 + Math.random() * 0.08;
    snap.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(master);
    snap.start();
    snap.stop(context.currentTime + 0.08);
  }, 260) : null;

  context.resume?.();

  return {
    setVolume(nextVolume) {
      master.gain.setTargetAtTime(Math.max(0, Math.min(1, nextVolume)), context.currentTime, 0.08);
    },
    stop() {
      if (crackleTimer) window.clearInterval(crackleTimer);
      try { noise.stop(); } catch {}
      oscillators.forEach((osc) => { try { osc.stop(); } catch {} });
      master.gain.setTargetAtTime(0, context.currentTime, 0.05);
      window.setTimeout(() => context.close?.(), 140);
    }
  };
}

function readInitialEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_ENABLED) === "true";
}

function readInitialVolume(theme) {
  if (typeof window === "undefined") return theme?.ambience?.defaultVolume ?? 0.15;
  const stored = Number(window.localStorage.getItem(STORAGE_VOLUME));
  if (Number.isFinite(stored) && stored >= 0) return stored;
  return theme?.ambience?.defaultVolume ?? 0.15;
}

export default function WorldAmbienceControl({ theme }) {
  const playable = Boolean(theme?.ambience?.kind && theme.ambience.kind !== "none");
  const [enabled, setEnabled] = useState(readInitialEnabled);
  const [volume, setVolume] = useState(() => readInitialVolume(theme));
  const playerRef = useRef(null);
  const audioRef = useRef(null);
  const themeKey = theme?.key || "archive";
  const label = useMemo(() => theme?.ambience?.label || "Атмосфера", [theme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_ENABLED, String(enabled));
  }, [enabled]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_VOLUME, String(volume));
    playerRef.current?.setVolume?.(volume);
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    if (!enabled || !playable) return undefined;

    if (theme?.ambience?.src) {
      const audio = new Audio(theme.ambience.src);
      audio.loop = true;
      audio.volume = volume;
      audioRef.current = audio;
      audio.play().catch(() => setEnabled(false));
      return () => {
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      };
    }

    const player = startSyntheticAmbience(theme, volume);
    playerRef.current = player;
    return () => {
      player?.stop?.();
      playerRef.current = null;
    };
  }, [enabled, playable, themeKey, theme?.ambience?.src]);

  if (!playable) {
    return <span className="ambience-static-label">Атмосфера: Архив</span>;
  }

  return (
    <div className={enabled ? "ambience-control ambience-control--on" : "ambience-control"} title={enabled ? label : "Включить атмосферу мира"}>
      <button type="button" className="ambience-toggle" onClick={() => setEnabled((current) => !current)}>
        {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        <span>{enabled ? label : "Атмосфера"}</span>
      </button>
      {enabled && (
        <label className="ambience-volume" aria-label="Громкость атмосферы">
          <input type="range" min="0" max="0.45" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
        </label>
      )}
    </div>
  );
}
