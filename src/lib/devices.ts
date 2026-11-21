// Brands and models offered in the Brand and Model boxes. Not a complete
// list: the boxes accept anything typed, and every brand or model a repair is
// saved with joins the suggestions afterwards (see deviceSuggestions in
// src/lib/actions/devices.ts). Newest models first within each brand, so the
// likeliest match sits at the top.

export const DEVICE_CATALOG: Record<string, string[]> = {
  Apple: [
    "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17 Air", "iPhone 17",
    "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16 Plus", "iPhone 16", "iPhone 16e",
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14",
    "iPhone 13 Pro Max", "iPhone 13 Pro", "iPhone 13", "iPhone 13 mini",
    "iPhone 12 Pro Max", "iPhone 12 Pro", "iPhone 12", "iPhone 12 mini",
    "iPhone 11 Pro Max", "iPhone 11 Pro", "iPhone 11",
    "iPhone SE (3rd gen)", "iPhone SE (2nd gen)", "iPhone XS Max", "iPhone XS",
    "iPhone XR", "iPhone X", "iPhone 8 Plus", "iPhone 8", "iPhone 7 Plus", "iPhone 7",
    "iPad Pro", "iPad Air", "iPad mini", "iPad (10th gen)", "iPad (9th gen)",
    "MacBook Air M3", "MacBook Air M2", "MacBook Air M1", "MacBook Pro",
    "Apple Watch",
  ],
  Samsung: [
    "Galaxy S25 Ultra", "Galaxy S25+", "Galaxy S25", "Galaxy S25 FE",
    "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24", "Galaxy S24 FE",
    "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S23 FE",
    "Galaxy S22 Ultra", "Galaxy S22+", "Galaxy S22",
    "Galaxy S21 Ultra", "Galaxy S21+", "Galaxy S21", "Galaxy S21 FE",
    "Galaxy S20 Ultra", "Galaxy S20", "Galaxy S20 FE",
    "Galaxy Z Fold 7", "Galaxy Z Fold 6", "Galaxy Z Fold 5",
    "Galaxy Z Flip 7", "Galaxy Z Flip 6", "Galaxy Z Flip 5",
    "Galaxy Note 20 Ultra", "Galaxy Note 20", "Galaxy Note 10+", "Galaxy Note 10",
    "Galaxy A56", "Galaxy A55", "Galaxy A54", "Galaxy A53", "Galaxy A52",
    "Galaxy A36", "Galaxy A35", "Galaxy A34", "Galaxy A33", "Galaxy A32",
    "Galaxy A26", "Galaxy A25", "Galaxy A24", "Galaxy A23", "Galaxy A22",
    "Galaxy A16", "Galaxy A15", "Galaxy A14", "Galaxy A13", "Galaxy A12",
    "Galaxy A06", "Galaxy A05s", "Galaxy A05", "Galaxy A04", "Galaxy A03",
    "Galaxy M55", "Galaxy M35", "Galaxy M34", "Galaxy M14",
    "Galaxy Tab S9", "Galaxy Tab S8", "Galaxy Tab A9", "Galaxy Tab A8",
  ],
  Xiaomi: [
    "Xiaomi 15 Ultra", "Xiaomi 15", "Xiaomi 14T Pro", "Xiaomi 14T", "Xiaomi 14",
    "Xiaomi 13T Pro", "Xiaomi 13T", "Xiaomi 13", "Xiaomi 12T", "Xiaomi 12",
    "Xiaomi 11T Pro", "Xiaomi 11T", "Mi 11 Lite", "Mi 10T",
    "Redmi Note 14 Pro+", "Redmi Note 14 Pro", "Redmi Note 14",
    "Redmi Note 13 Pro+", "Redmi Note 13 Pro", "Redmi Note 13",
    "Redmi Note 12 Pro", "Redmi Note 12", "Redmi Note 11 Pro", "Redmi Note 11",
    "Redmi Note 10 Pro", "Redmi Note 10", "Redmi Note 9 Pro", "Redmi Note 9",
    "Redmi Note 8", "Redmi 14C", "Redmi 13C", "Redmi 13", "Redmi 12C", "Redmi 12",
    "Redmi 10C", "Redmi 10", "Redmi 9A", "Redmi 9C", "Redmi 9",
    "Redmi A3", "Redmi A2", "Redmi Pad SE",
    "Poco X7 Pro", "Poco X6 Pro", "Poco X6", "Poco X5 Pro", "Poco X3 Pro",
    "Poco F6", "Poco F5", "Poco M6 Pro", "Poco M5", "Poco C65",
  ],
  Huawei: [
    "Pura 70", "P60 Pro", "P50 Pro", "P40 Pro", "P30 Pro", "P30 Lite", "P20 Lite",
    "Mate 60 Pro", "Mate 50 Pro", "Mate 40 Pro", "Mate 20 Pro",
    "Nova 12", "Nova 11", "Nova 10", "Nova 9", "Nova 7i", "Nova 5T", "Nova 3i",
    "Y9 Prime 2019", "Y9 2019", "Y7 Prime", "Y7a", "Y6p", "Y6 2019", "Y5p",
    "MatePad", "MateBook",
  ],
  Honor: [
    "Magic 7 Pro", "Magic 6 Pro", "Honor 400", "Honor 200", "Honor 90",
    "X9c", "X9b", "X9a", "X8b", "X8a", "X7b", "X6b", "X5 Plus",
  ],
  Oppo: [
    "Find X8 Pro", "Find X8", "Reno 13", "Reno 12", "Reno 11", "Reno 10", "Reno 8",
    "Reno 7", "Reno 6", "A98", "A79", "A78", "A60", "A58", "A38", "A18", "A17",
    "A16", "A15", "A12", "A5s", "A3s",
  ],
  Vivo: [
    "X200 Pro", "X100 Pro", "V40", "V30", "V29", "V27", "V25", "V23",
    "Y100", "Y36", "Y28", "Y27", "Y22", "Y21", "Y20", "Y19", "Y17", "Y16", "Y15",
    "Y12", "Y11", "Y03", "Y02",
  ],
  Realme: [
    "GT 7 Pro", "GT 6", "Realme 14 Pro+", "Realme 13 Pro+", "Realme 12 Pro+",
    "Realme 12", "Realme 11 Pro", "Realme 11", "Realme 10", "Realme 9", "Realme 8",
    "C75", "C67", "C65", "C61", "C55", "C53", "C35", "C33", "C31", "C25", "C21", "C11",
    "Narzo 70",
  ],
  OnePlus: [
    "OnePlus 13", "OnePlus 12", "OnePlus 11", "OnePlus 10 Pro", "OnePlus 9 Pro",
    "OnePlus 9", "OnePlus 8T", "OnePlus 8", "OnePlus 7T", "Nord 4", "Nord 3",
    "Nord CE 4", "Nord CE 3", "Nord N30",
  ],
  Google: [
    "Pixel 10 Pro", "Pixel 10", "Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9", "Pixel 9a",
    "Pixel 8 Pro", "Pixel 8", "Pixel 8a", "Pixel 7 Pro", "Pixel 7", "Pixel 7a",
    "Pixel 6 Pro", "Pixel 6", "Pixel 6a",
  ],
  Nokia: ["G42", "G22", "G21", "C32", "C22", "C21", "C12", "105", "110", "3310"],
  Motorola: [
    "Edge 50", "Edge 40", "Moto G85", "Moto G84", "Moto G54", "Moto G34", "Moto G24",
    "Moto E14", "Moto E13",
  ],
  Sony: ["Xperia 1 VI", "Xperia 1 V", "Xperia 5 V", "Xperia 10 VI", "Xperia 10 V"],
  Tecno: [
    "Camon 30", "Camon 20", "Spark 30", "Spark 20", "Spark 10", "Pova 6", "Pova 5",
    "Pop 8", "Pop 7",
  ],
  Infinix: [
    "Note 40", "Note 30", "Hot 50", "Hot 40", "Hot 30", "Smart 9", "Smart 8",
    "Smart 7", "Zero 40",
  ],
  itel: ["A70", "A60", "P55", "S24", "S23"],
  ZTE: ["Blade A75", "Blade A54", "Blade V50", "Nubia Neo 2"],
  Lenovo: ["Tab M10", "Tab M11", "Tab P11", "IdeaPad", "ThinkPad", "Legion"],
  Asus: ["ROG Phone 8", "Zenfone 11", "VivoBook", "ZenBook", "TUF Gaming"],
  HP: ["Pavilion", "EliteBook", "ProBook", "Victus", "Omen"],
  Dell: ["Inspiron", "Latitude", "Vostro", "XPS", "Alienware"],
  Acer: ["Aspire", "Nitro", "Swift", "Predator"],
};

export const CATALOG_BRANDS = Object.keys(DEVICE_CATALOG);

/** Lower-case and squash spaces, for matching "redmi note 13" to "Redmi Note 13". */
export function normaliseDevice(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Items that match what was typed: those starting with it first, then those
 * containing it (any word), so "A" lists Apple and Asus before Huawei,
 * and "13" finds "iPhone 13" and "Redmi Note 13".
 */
export function matchOptions(options: string[], typed: string, limit = 50): string[] {
  const q = normaliseDevice(typed);
  if (!q) return options.slice(0, limit);
  const exact: string[] = [];
  const starts: string[] = [];
  const wordStarts: string[] = [];
  const contains: string[] = [];
  for (const option of options) {
    const o = normaliseDevice(option);
    if (o === q) exact.push(option);
    else if (o.startsWith(q)) starts.push(option);
    else if (o.split(" ").some((w) => w.startsWith(q))) wordStarts.push(option);
    // One letter matches only at the start of a word: "a" is in most names.
    else if (q.length > 1 && o.includes(q)) contains.push(option);
  }
  return [...exact, ...starts, ...wordStarts, ...contains].slice(0, limit);
}

/** Merges the shop's own past entries into the catalogue (no duplicates). */
export function mergeDevices(
  extra: { brand: string; model: string | null }[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const brandKey = new Map<string, string>();
  for (const [brand, models] of Object.entries(DEVICE_CATALOG)) {
    out[brand] = [...models];
    brandKey.set(normaliseDevice(brand), brand);
  }
  for (const { brand, model } of extra) {
    const b = brand.trim();
    if (!b) continue;
    const key = normaliseDevice(b);
    let name = brandKey.get(key);
    if (!name) {
      name = b;
      brandKey.set(key, b);
      out[b] = [];
    }
    const m = model?.trim();
    if (m && !out[name].some((x) => normaliseDevice(x) === normaliseDevice(m))) {
      out[name].push(m);
    }
  }
  return out;
}
