import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Music2, Pause, Play, Settings2, Volume2, VolumeX, X } from "lucide-react";

const STORAGE_AUDIO_ALLOWED = "codex-world-audio-allowed";
const STORAGE_SOUND_ENABLED = "codex-world-sound-enabled";
const STORAGE_SOUND_VOLUME = "codex-world-sound-volume";

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
    case "desert":
      return { noiseGain: 0.062, filterType: "bandpass", filterFrequency: 520, q: 0.52, lfoRate: 0.035, lfoDepth: 0.018, tones: [{ frequency: 92.5, gain: 0.006, type: "sine" }] };
    case "dungeon":
      return { noiseGain: 0.044, filterType: "lowpass", filterFrequency: 240, q: 0.72, lfoRate: 0.028, lfoDepth: 0.012, tones: [{ frequency: 49, gain: 0.009, type: "sine" }] };
    case "storm":
      return { noiseGain: 0.092, filterType: "lowpass", filterFrequency: 360, q: 0.5, lfoRate: 0.055, lfoDepth: 0.024, tones: [{ frequency: 73.42, gain: 0.007, type: "triangle" }] };
    case "city":
      return { noiseGain: 0.048, filterType: "bandpass", filterFrequency: 680, q: 0.5, lfoRate: 0.032, lfoDepth: 0.012, tones: [{ frequency: 130.81, gain: 0.005, type: "sine" }] };
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
  master.gain.setTargetAtTime(clamp(volume, 0, 0.45), context.currentTime + 0.02, 0.35);

  return {
    setVolume(nextVolume) {
      master.gain.setTargetAtTime(clamp(nextVolume, 0, 0.45), context.currentTime, 0.18);
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

function createFilePlayer(src, volume, onError, { loop = true, maxVolume = 0.45 } = {}) {
  const audio = new Audio(src);
  audio.loop = loop;
  audio.volume = 0;
  audio.preload = "auto";
  const target = clamp(volume, 0, maxVolume);
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
      audio.volume = clamp(audio.volume + Math.sign(diff) * speed, 0, maxVolume);
      frame = window.requestAnimationFrame(tick);
    };
    tick();
  };

  audio.addEventListener("error", onError);
  audio.play().then(() => fadeTo(target, 0.008)).catch(onError);

  return {
    setVolume(nextVolume) {
      fadeTo(clamp(nextVolume, 0, maxVolume), 0.012);
    },
    stop() {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      const current = audio.volume;
      const steps = 12;
      let step = 0;
      const fade = window.setInterval(() => {
        step += 1;
        audio.volume = clamp(current * (1 - step / steps), 0, maxVolume);
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

function readBool(key, fallback = false) {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

function readVolume(key, fallback, maxVolume = 0.45) {
  if (typeof window === "undefined") return fallback;
  const stored = Number(window.localStorage.getItem(key));
  if (Number.isFinite(stored) && stored >= 0) return clamp(stored, 0, maxVolume);
  return fallback;
}

function safeOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function withYouTubeApiParams(embedUrl = "") {
  if (!embedUrl) return "";
  const url = new URL(embedUrl);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("origin", safeOrigin());
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("controls", "0");
  return url.toString();
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

    return { embedUrl: withYouTubeApiParams(embedUrl), videoId: safeId, listId: safeList, originalUrl: value };
  } catch {
    return null;
  }
}

function parseExternalProvider(rawUrl = "", source = "embed") {
  const value = String(rawUrl || "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (source === "soundcloud" || host === "soundcloud.com") {
      return {
        type: "embed",
        provider: "SoundCloud",
        label: "SoundCloud",
        originalUrl: value,
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(value)}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`
      };
    }
    if (host === "music.yandex.ru" && url.pathname.startsWith("/iframe/")) {
      return { type: "embed", provider: "Yandex Music", label: "Yandex Music", originalUrl: value, embedUrl: value };
    }
    return { type: "external", provider: "External", label: "Внешний источник", originalUrl: value, embedUrl: "" };
  } catch {
    return null;
  }
}

function postYouTubeCommand(iframe, func, args = []) {
  const contentWindow = iframe?.contentWindow;
  if (!contentWindow) return;
  contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

function resolveSoundSource(theme) {
  const music = theme?.music || {};
  const ambience = theme?.ambience || {};
  const source = music.source || "off";

  if (source === "youtube") {
    const youtube = parseYouTubeUrl(music.url);
    if (youtube) return { type: "youtube", label: music.label || "World Sound", provider: "YouTube", ...youtube };
  }

  if (source === "soundcloud" || source === "embed") {
    const provider = parseExternalProvider(music.url, source);
    if (provider) return { ...provider, label: music.label || provider.label || "World Sound" };
  }

  if (source === "local" && music.audio) {
    return { type: "local", label: music.label || "Музыка мира", src: music.audio, loop: music.loop !== false, provider: "Local audio", maxVolume: 0.45 };
  }

  if (ambience.mode !== "off" && ambience.src) {
    return { type: "local", label: ambience.label || "Атмосфера мира", src: ambience.src, loop: true, provider: "Local ambience", maxVolume: 0.34 };
  }

  if (ambience.mode !== "off" && ambience.kind && ambience.kind !== "none") {
    return { type: "synthetic", label: ambience.label || "Атмосфера мира", provider: "Soft preview", maxVolume: 0.34 };
  }

  return null;
}

export default function WorldAmbienceControl({ theme }) {
  const soundSource = useMemo(() => resolveSoundSource(theme), [theme]);
  const [audioAllowed, setAudioAllowed] = useState(() => readBool(STORAGE_AUDIO_ALLOWED, false));
  const [enabled, setEnabled] = useState(() => readBool(STORAGE_SOUND_ENABLED, false));
  const [volume, setVolume] = useState(() => readVolume(STORAGE_SOUND_VOLUME, theme?.ambience?.defaultVolume ?? 0.16, 0.45));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [providerMounted, setProviderMounted] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const localPlayerRef = useRef(null);
  const iframeRef = useRef(null);
  const sourceKey = `${theme?.key || "archive"}:${soundSource?.type || "none"}:${soundSource?.src || soundSource?.embedUrl || soundSource?.originalUrl || ""}`;
  const canControlPlayback = soundSource && ["youtube", "local", "synthetic"].includes(soundSource.type);

  function allowWorldAudio() {
    window.localStorage.setItem(STORAGE_AUDIO_ALLOWED, "true");
    setAudioAllowed(true);
  }

  function sendYouTubePlayback(play) {
    if (!soundSource || soundSource.type !== "youtube") return;
    setProviderMounted(true);
    const run = () => {
      postYouTubeCommand(iframeRef.current, "setVolume", [Math.round(clamp(volume, 0, 0.45) * 220)]);
      postYouTubeCommand(iframeRef.current, play ? "playVideo" : "pauseVideo");
    };
    run();
    window.setTimeout(run, 320);
    window.setTimeout(run, 900);
  }

  function toggleSound() {
    if (!soundSource) return;
    if (!audioAllowed) allowWorldAudio();

    if (soundSource.type === "external" || soundSource.type === "embed") {
      setProviderMounted(true);
      setProviderOpen(true);
      setSettingsOpen(true);
      setEnabled(true);
      return;
    }

    setEnabled((current) => {
      const next = !current;
      if (soundSource.type === "youtube") sendYouTubePlayback(next);
      return next;
    });
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_SOUND_ENABLED, String(enabled));
  }, [enabled]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_SOUND_VOLUME, String(volume));
    localPlayerRef.current?.setVolume?.(volume);
    if (soundSource?.type === "youtube") {
      postYouTubeCommand(iframeRef.current, "setVolume", [Math.round(clamp(volume, 0, 0.45) * 220)]);
    }
  }, [volume, soundSource?.type]);

  useEffect(() => {
    setMediaError(false);
    setSettingsOpen(false);
    setProviderOpen(false);
    setProviderMounted(false);
    localPlayerRef.current?.stop?.();
    localPlayerRef.current = null;
  }, [sourceKey]);

  useEffect(() => {
    if (!audioAllowed || !soundSource) return;
    if (theme?.music?.autoplay && ["local", "youtube"].includes(soundSource.type)) setEnabled(true);
    if (!theme?.music?.source || theme?.music?.source === "off") {
      if (theme?.ambience?.autoplay && ["local", "synthetic"].includes(soundSource.type)) setEnabled(true);
    }
  }, [audioAllowed, sourceKey, theme?.music?.autoplay, theme?.music?.source, theme?.ambience?.autoplay]);

  useEffect(() => {
    if (!enabled || !soundSource || !["local", "synthetic"].includes(soundSource.type)) return undefined;

    const handleMediaError = () => setMediaError(true);
    const player = soundSource.type === "local"
      ? createFilePlayer(soundSource.src, volume, handleMediaError, { loop: soundSource.loop !== false, maxVolume: soundSource.maxVolume || 0.45 })
      : startSyntheticAmbience(theme, volume);

    localPlayerRef.current = player;
    return () => {
      player?.stop?.();
      if (localPlayerRef.current === player) localPlayerRef.current = null;
    };
  }, [enabled, sourceKey]);

  useEffect(() => {
    if (!soundSource || soundSource.type !== "youtube") return;
    if (enabled) {
      setProviderMounted(true);
      sendYouTubePlayback(true);
    } else {
      sendYouTubePlayback(false);
    }
  }, [enabled, sourceKey]);

  if (!soundSource) {
    return <span className="world-sound-static-label">World Sound: нет источника</span>;
  }

  const buttonTitle = enabled ? `Выключить: ${soundSource.label}` : `Включить: ${soundSource.label}`;
  const hasProviderFrame = ["youtube", "embed"].includes(soundSource.type) && soundSource.embedUrl;
  const shouldRenderProvider = hasProviderFrame && (providerMounted || providerOpen || settingsOpen);

  return (
    <div className={enabled ? "world-sound-control world-sound-control--on" : "world-sound-control"}>
      <button type="button" className="world-sound-main" onClick={toggleSound} title={buttonTitle}>
        {enabled ? <Pause size={15} /> : <Play size={15} />}
        <span>{soundSource.label || "World Sound"}</span>
      </button>

      {canControlPlayback && (
        <label className="world-sound-volume" title="Громкость World Sound">
          {volume > 0 ? <Volume2 size={14} /> : <VolumeX size={14} />}
          <input type="range" min="0" max="0.45" step="0.01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} />
        </label>
      )}

      <button type="button" className="world-sound-settings" onClick={() => setSettingsOpen((current) => !current)} title="Настройки World Sound">
        <Settings2 size={14} />
      </button>

      {settingsOpen && (
        <div className="world-sound-popover">
          <div className="world-sound-popover-head">
            <div>
              <strong>{soundSource.label || "World Sound"}</strong>
              <span>{soundSource.provider || soundSource.type}</span>
            </div>
            <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Закрыть музыку"><X size={14} /></button>
          </div>
          <p className="world-sound-copy">
            Один мир — один звук. Если задан YouTube, local music или embed, тихая ambient-атмосфера не запускается отдельно и не спорит с музыкой.
          </p>
          <div className="world-sound-actions">
            {hasProviderFrame && (
              <button type="button" className="world-sound-provider-toggle" onClick={() => {
                setProviderMounted(true);
                setProviderOpen((current) => !current);
              }}>
                {providerOpen ? "Свернуть источник" : "Открыть источник"}
              </button>
            )}
            {soundSource.originalUrl && (
              <a href={soundSource.originalUrl} target="_blank" rel="noreferrer" className="world-sound-open-link">
                <ExternalLink size={13} /> Открыть снаружи
              </a>
            )}
          </div>
          {mediaError && <span className="world-sound-error">Источник не загрузился. Проверь путь/URL.</span>}
          {!audioAllowed && <span className="world-sound-note">Первый запуск звука требует клика в браузере.</span>}
        </div>
      )}

      {shouldRenderProvider && (
        <div className={providerOpen ? "world-sound-provider" : "world-sound-provider world-sound-provider--collapsed"}>
          {providerOpen && (
            <div className="world-sound-provider-head">
              <span>{soundSource.provider || "Источник"}</span>
              <button type="button" onClick={() => setProviderOpen(false)} aria-label="Свернуть источник"><X size={13} /></button>
            </div>
          )}
          <iframe
            ref={iframeRef}
            title={soundSource.label || "World Sound source"}
            src={soundSource.embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
