export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

const STABLE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const MONGO_URI = /^mongodb(?:\+srv)?:\/\//;

export function requireEnvironmentValue(
  source: EnvironmentSource,
  key: string,
  minimumLength = 1
): string {
  const value = source[key];
  if (typeof value !== "string" || value.trim().length < minimumLength) {
    throw new Error(`${key} is missing or invalid`);
  }
  return value;
}

export function parseStableEnvironmentId(value: string, key: string): string {
  if (!STABLE_IDENTIFIER.test(value)) throw new Error(`${key} is invalid`);
  return value;
}

export function parsePublicOrigin(value: string, key: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} must be an HTTPS origin or an explicit loopback development origin`);
  }
  const isHttps = parsed.protocol === "https:";
  const isLoopbackHttp =
    parsed.protocol === "http:" &&
    (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  const port = parsed.port === "" ? null : Number(parsed.port);
  const hasValidPort = port === null || (Number.isInteger(port) && port >= 1 && port <= 65_535);
  const isExactOrigin =
    value === parsed.origin &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.pathname === "/" &&
    parsed.search === "" &&
    parsed.hash === "";
  if ((!isHttps && !isLoopbackHttp) || !hasValidPort || !isExactOrigin) {
    throw new Error(`${key} must be an HTTPS origin or an explicit loopback development origin`);
  }
  return parsed.origin;
}

export function parseMongoUri(value: string, key: string): string {
  if (!MONGO_URI.test(value)) throw new Error(`${key} must use a MongoDB URI scheme`);
  return value;
}

export function parsePositiveInteger(value: string, key: string, maximum: number): number {
  if (!/^\d+$/.test(value)) throw new Error(`${key} must be a positive integer`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error(`${key} must be between 1 and ${maximum}`);
  }
  return parsed;
}
