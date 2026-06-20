const mojibakeMarks = /(?:Ð|Ñ|Ò|Ó|Â|Ã|\u00d0|\u00d1|\\x[89a-fA-F][0-9a-fA-F])/;

export function looksLikeMojibake(value = "") {
  const text = String(value || "");
  if (!text) return false;
  return mojibakeMarks.test(text) || /\uFFFD/.test(text);
}

export function repairMojibake(value = "") {
  let text = String(value || "");
  if (!text) return text;

  text = text.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));

  if (looksLikeMojibake(text)) {
    try {
      const repaired = Buffer.from(text, "latin1").toString("utf8");
      if (scoreCyrillic(repaired) >= scoreCyrillic(text) && !/\uFFFD/.test(repaired)) text = repaired;
    } catch {}
  }

  return text.normalize("NFC");
}

export function repairTextDeep(value) {
  if (Array.isArray(value)) return value.map(repairTextDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, repairTextDeep(item)]));
  }
  return typeof value === "string" ? repairMojibake(value) : value;
}

export function repairUploadedFilename(originalName = "") {
  const name = String(originalName || "untitled.md").split(/[\\/]/).pop() || "untitled.md";
  return repairMojibake(name).replace(/\0/g, "").trim() || "untitled.md";
}

export function decodeMarkdownBuffer(buffer) {
  if (!buffer) return { content: "", encoding: "utf-8" };
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { content: bytes.subarray(2).toString("utf16le"), encoding: "utf-16le" };
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const swapped = Buffer.alloc(bytes.length - 2);
    for (let index = 2; index + 1 < bytes.length; index += 2) {
      swapped[index - 2] = bytes[index + 1];
      swapped[index - 1] = bytes[index];
    }
    return { content: swapped.toString("utf16le"), encoding: "utf-16be" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return { content: bytes.subarray(3).toString("utf8"), encoding: "utf-8-bom" };
  }

  const utf8 = bytes.toString("utf8");
  if (!/\uFFFD/.test(utf8) && !looksLikeMojibake(utf8)) return { content: utf8, encoding: "utf-8" };

  try {
    const decoded = new TextDecoder("windows-1251", { fatal: false }).decode(bytes);
    if (scoreCyrillic(decoded) > scoreCyrillic(utf8)) return { content: decoded, encoding: "windows-1251" };
  } catch {}

  return { content: repairMojibake(utf8), encoding: looksLikeMojibake(utf8) ? "utf-8-repaired" : "utf-8" };
}

function scoreCyrillic(value = "") {
  const text = String(value || "");
  const cyr = (text.match(/[А-Яа-яЁёІіЇїЄєҐґ]/g) || []).length;
  const bad = (text.match(/(?:Ð|Ñ|Ò|Ó|Â|Ã|\uFFFD)/g) || []).length;
  return cyr * 3 - bad * 5;
}
