const BUILTIN_WORLD_THEMES = {
  archive: {
    key: "archive",
    label: "Архив",
    description: "Нейтральный общий vault: библиотека, поиск, мастерский контроль.",
    accent: "#e3b65f",
    accentRgb: "227, 182, 95",
    glow: "rgba(227, 182, 95, 0.22)",
    shadow: "rgba(8, 7, 13, 0.82)",
    backgroundClass: "world-bg-archive",
    icon: "archive",
    particles: "orbits",
    ambience: { kind: "none", label: "Архив без звука", defaultVolume: 0 }
  },
  fire: {
    key: "fire",
    label: "Огненный мир",
    description: "Лава, угли, пепел, кузни, драконы и война.",
    accent: "#ff7a1a",
    accentRgb: "255, 122, 26",
    glow: "rgba(255, 88, 20, 0.34)",
    shadow: "rgba(24, 5, 2, 0.88)",
    backgroundClass: "world-bg-fire",
    icon: "flame",
    particles: "embers",
    ambience: { kind: "fire", label: "Мягкий огонь", defaultVolume: 0.08 }
  },
  frost: {
    key: "frost",
    label: "Ледяной мир",
    description: "Метель, северное сияние, ледяные крепости и древние руины.",
    accent: "#7dd3fc",
    accentRgb: "125, 211, 252",
    glow: "rgba(125, 211, 252, 0.28)",
    shadow: "rgba(2, 12, 24, 0.88)",
    backgroundClass: "world-bg-frost",
    icon: "snowflake",
    particles: "snow",
    ambience: { kind: "wind", label: "Мягкий ледяной ветер", defaultVolume: 0.07 }
  },
  arcane: {
    key: "arcane",
    label: "Магический мир",
    description: "Астрал, руны, порталы, магические академии и звёздная пыль.",
    accent: "#a78bfa",
    accentRgb: "167, 139, 250",
    glow: "rgba(167, 139, 250, 0.34)",
    shadow: "rgba(10, 5, 28, 0.88)",
    backgroundClass: "world-bg-arcane",
    icon: "sparkles",
    particles: "runes",
    ambience: { kind: "arcane", label: "Мягкий астральный фон", defaultVolume: 0.065 }
  },
  celestial: {
    key: "celestial",
    label: "Райский мир",
    description: "Золотой свет, небесные острова, храмы и божественное спокойствие.",
    accent: "#fde68a",
    accentRgb: "253, 230, 138",
    glow: "rgba(253, 230, 138, 0.3)",
    shadow: "rgba(31, 24, 8, 0.78)",
    backgroundClass: "world-bg-celestial",
    icon: "sun",
    particles: "motes",
    ambience: { kind: "celestial", label: "Небесный фон", defaultVolume: 0.055 }
  },
  infernal: {
    key: "infernal",
    label: "Адский мир",
    description: "Красное небо, пепел, бездна, демоны и поле вечной битвы.",
    accent: "#ef4444",
    accentRgb: "239, 68, 68",
    glow: "rgba(239, 68, 68, 0.34)",
    shadow: "rgba(20, 3, 3, 0.9)",
    backgroundClass: "world-bg-infernal",
    icon: "skull",
    particles: "ash",
    ambience: { kind: "infernal", label: "Низкий адский фон", defaultVolume: 0.06 }
  },
  midgard: {
    key: "midgard",
    label: "Мидгард / живой мир",
    description: "Леса, дороги, королевства, реки, города и классическое фэнтези.",
    accent: "#86efac",
    accentRgb: "134, 239, 172",
    glow: "rgba(134, 239, 172, 0.24)",
    shadow: "rgba(5, 20, 12, 0.84)",
    backgroundClass: "world-bg-midgard",
    icon: "leaf",
    particles: "leaves",
    ambience: { kind: "forest", label: "Лесной фон", defaultVolume: 0.07 }
  },
  death: {
    key: "death",
    label: "Мир смерти",
    description: "Туман, души, некрополи, холодный зелёный свет и забытые могилы.",
    accent: "#6ee7b7",
    accentRgb: "110, 231, 183",
    glow: "rgba(110, 231, 183, 0.24)",
    shadow: "rgba(3, 18, 15, 0.88)",
    backgroundClass: "world-bg-death",
    icon: "ghost",
    particles: "souls",
    ambience: { kind: "death", label: "Тихий туман", defaultVolume: 0.055 }
  }
};

const THEME_KEYWORDS = [
  ["infernal", /(ад|адск|бездна|демон|infernal|hell|abyss|devil|demon|doom)/i],
  ["fire", /(огонь|огнен|пепел|лава|вулкан|кузн|дракон|fire|flame|ember|ash|lava|volcano)/i],
  ["frost", /(л[её]д|ледян|север|метель|снег|frost|ice|snow|glacier|winter)/i],
  ["arcane", /(маг|астрал|руна|портал|aether|arcane|magic|rune|astral|wizard)/i],
  ["celestial", /(рай|небес|свет|божеств|ангел|celestial|heaven|paradise|angel|divine)/i],
  ["death", /(смерт|мертв|некро|душ|могил|туман|death|dead|undead|necro|grave|soul|ghost)/i],
  ["midgard", /(лес|королев|город|земл|равнин|midgard|forest|kingdom|realm|earth|green)/i]
];

function textFromWorld(world = null) {
  if (!world) return "";
  const fm = world.frontmatter || {};
  return [
    world.title,
    world.summary,
    world.content,
    fm.title,
    fm.name,
    fm.summary,
    fm.tone,
    fm.cosmology,
    Array.isArray(fm.tags) ? fm.tags.join(" ") : fm.tags
  ].filter(Boolean).join(" ");
}

export function inferThemeKeyFromWorld(world = null) {
  const text = textFromWorld(world);
  if (!text.trim()) return "midgard";
  return THEME_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] || "midgard";
}

export const WORLD_THEME_KEYS = Object.keys(BUILTIN_WORLD_THEMES);
export const WORLD_THEME_OPTIONS = WORLD_THEME_KEYS.map((key) => ({
  value: key,
  label: BUILTIN_WORLD_THEMES[key].label,
  description: BUILTIN_WORLD_THEMES[key].description
}));

export function normalizeThemeKey(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return BUILTIN_WORLD_THEMES[key] ? key : "midgard";
}

function valueFromWorld(world, key) {
  return world?.[key] ?? world?.frontmatter?.[key] ?? "";
}


function normalizeMusicSource(value = "") {
  const source = String(value || "").trim().toLowerCase();
  if (["youtube", "off"].includes(source)) return source;
  return "off";
}

function normalizeMediaPath(value = "") {
  const path = String(value || "").trim();
  if (!path) return "";
  if (/^(https?:|data:|blob:|\/)/i.test(path)) return path;
  return `/world-themes/${path.replace(/^world-themes\//, "")}`;
}

export function getWorldTheme(world = null) {
  const explicitTheme = valueFromWorld(world, "theme");
  const selectedKey = world ? normalizeThemeKey(explicitTheme || inferThemeKeyFromWorld(world)) : "archive";
  const base = BUILTIN_WORLD_THEMES[selectedKey] || BUILTIN_WORLD_THEMES.midgard;
  const backgroundVideo = normalizeMediaPath(valueFromWorld(world, "backgroundVideo") || valueFromWorld(world, "cinematicVideo") || "");
  const backgroundPoster = normalizeMediaPath(valueFromWorld(world, "backgroundPoster") || valueFromWorld(world, "cinematicPoster") || "");
  const ambienceAudio = normalizeMediaPath(valueFromWorld(world, "ambienceAudio") || valueFromWorld(world, "soundscape") || "");
  const ambienceLabel = valueFromWorld(world, "ambienceLabel") || base.ambience.label;
  const ambienceMode = String(valueFromWorld(world, "ambienceMode") || "auto").trim().toLowerCase();
  const musicSource = normalizeMusicSource(valueFromWorld(world, "musicSource") || (valueFromWorld(world, "musicUrl") ? "youtube" : "off"));
  const musicUrl = valueFromWorld(world, "musicUrl") || valueFromWorld(world, "youtubeMusicUrl") || valueFromWorld(world, "youtubeUrl") || "";
  const musicLabel = valueFromWorld(world, "musicLabel") || valueFromWorld(world, "youtubeMusicLabel") || "Музыка мира";
  const customAccent = valueFromWorld(world, "accent");
  const backgroundOpacity = Number(valueFromWorld(world, "backgroundOpacity"));
  const backgroundBlur = Number(valueFromWorld(world, "backgroundBlur"));
  const backgroundDim = Number(valueFromWorld(world, "backgroundDim"));

  const ambience = {
    ...base.ambience,
    src: ambienceAudio,
    label: ambienceLabel || base.ambience.label,
    mode: ["auto", "file", "synthetic", "off"].includes(ambienceMode) ? ambienceMode : "auto",
    sourceUrl: valueFromWorld(world, "ambienceSourceUrl") || "",
    credits: valueFromWorld(world, "ambienceCredits") || ""
  };
  if (ambience.mode === "off") {
    ambience.kind = "none";
    ambience.src = "";
  }
  if (ambience.mode === "file" && !ambience.src) {
    ambience.kind = "none";
  }

  return {
    ...base,
    inferred: Boolean(world && !explicitTheme),
    accent: customAccent || base.accent,
    backgroundVideo,
    backgroundPoster,
    backgroundOpacity: Number.isFinite(backgroundOpacity) ? backgroundOpacity : undefined,
    backgroundBlur: Number.isFinite(backgroundBlur) ? backgroundBlur : undefined,
    backgroundDim: Number.isFinite(backgroundDim) ? backgroundDim : undefined,
    backgroundSourceUrl: valueFromWorld(world, "backgroundSourceUrl") || "",
    backgroundCredits: valueFromWorld(world, "backgroundCredits") || "",
    ambience,
    music: {
      source: musicSource,
      url: musicSource === "youtube" ? String(musicUrl || "").trim() : "",
      label: musicLabel || "Музыка мира",
      credits: valueFromWorld(world, "musicCredits") || "",
      sourceUrl: valueFromWorld(world, "musicSourceUrl") || musicUrl || ""
    }
  };
}

export function getThemeStyle(theme) {
  return {
    "--world-accent": theme.accent,
    "--world-accent-rgb": theme.accentRgb,
    "--world-glow": theme.glow,
    "--world-shadow": theme.shadow
  };
}

export function getThemeByKey(key = "midgard") {
  return BUILTIN_WORLD_THEMES[normalizeThemeKey(key)] || BUILTIN_WORLD_THEMES.midgard;
}
