import fs from "fs/promises";
import path from "path";
import { config } from "../config.js";

export function dataFile(name) {
  return path.join(config.dataDir, name);
}

export async function readJson(name, fallback) {
  try {
    return JSON.parse(await fs.readFile(dataFile(name), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function writeJson(name, value) {
  await fs.mkdir(config.dataDir, { recursive: true });
  const target = dataFile(name);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await fs.rename(temp, target);
}