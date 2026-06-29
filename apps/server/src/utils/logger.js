const levels = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4
};

function currentLevel() {
  const raw = String(process.env.LOG_LEVEL || "info").toLowerCase();
  return Object.prototype.hasOwnProperty.call(levels, raw) ? raw : "info";
}

function serialize(meta) {
  if (!meta || !Object.keys(meta).length) return "";
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return " [unserializable-meta]";
  }
}

function write(level, message, meta) {
  if (levels[currentLevel()] < levels[level]) return;
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}${serialize(meta)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  error: (message, meta) => write("error", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  info: (message, meta) => write("info", message, meta),
  debug: (message, meta) => write("debug", message, meta)
};