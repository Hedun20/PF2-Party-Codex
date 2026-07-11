import os from "node:os";

export function localIpv4Addresses(readNetworkInterfaces = () => os.networkInterfaces()) {
  try {
    return Object.values(readNetworkInterfaces() || {})
      .flat()
      .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
      .map((entry) => entry.address)
      .filter(Boolean);
  } catch {
    return [];
  }
}
