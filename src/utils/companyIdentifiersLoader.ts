// 动态加载 Bluetooth SIG 厂商编号映射，便于后期维护与替换数据文件。

export type CompanyMap = Record<string, string>;

// 规范化 key：大写，去 0x 前缀，左侧补零至 4 位，并提供去零变体。
export function normalizeCompanyId(id: string): { full: string; short: string } {
  const clean = id.trim().replace(/^0x/i, '').toUpperCase();
  const full = clean.padStart(4, '0');
  const short = full.replace(/^0+/, '') || '0';
  return { full, short };
}

function addToMap(map: CompanyMap, id: string, name: string) {
  const { full, short } = normalizeCompanyId(id);
  map[full] = name;
  map[short] = name;
}

function parseTxt(text: string): CompanyMap {
  const map: CompanyMap = {};
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    // 支持两种格式：
    // 1) 0x004C<TAB>Name
    // 2) 004C<TAB>Name
    let m = line.match(/^0x([0-9A-Fa-f]{4})\s+(.+?)\s*$/);
    if (!m) m = line.match(/^([0-9A-Fa-f]{4})\s+(.+?)\s*$/);
    if (m) {
      const code = m[1];
      const name = m[2].replace(/\s+$/, '');
      addToMap(map, code, name);
    }
  }
  return map;
}

// 全局缓存，模块加载后自动尝试预加载（不阻塞）
function buildSeed(): CompanyMap {
  const seedList: Array<[string, string]> = [
    ['004C', 'Apple, Inc.'],
    ['038F', 'Xiaomi Inc.'],
    ['00E0', 'Google'],
    ['0006', 'Microsoft'],
    ['0059', 'Nordic Semiconductor ASA'],
    ['000F', 'Broadcom Corporation'],
    ['001D', 'Qualcomm'],
    ['0002', 'Intel Corp.'],
    ['000D', 'Texas Instruments Inc.'],
  ];
  const map: CompanyMap = {};
  for (const [id, name] of seedList) addToMap(map, id, name);
  return map;
}

let COMPANY_MAP: CompanyMap = buildSeed();
let loadOnceStarted = false;

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function loadCompanyIdentifiers(): Promise<CompanyMap> {
  // 优先 JSON（可直接是 {"004C":"Apple, Inc."} 映射，或数组 [["004C","Apple, Inc."]]）
  try {
    const res = await fetch('company_identifiers.json');
    if (res.ok) {
      const data = await res.json();
      const map: CompanyMap = {};
      if (Array.isArray(data)) {
        for (const [id, name] of data) addToMap(map, String(id), String(name));
      } else if (data && typeof data === 'object') {
        for (const [id, name] of Object.entries(data)) addToMap(map, id, String(name));
      }
      COMPANY_MAP = map;
      return COMPANY_MAP;
    }
  } catch {
    // 忽略，降级到 txt
  }

  // 退回 TXT（你可直接把 SIG 提供的清单放在 public/company_identifiers.txt）
  const txt = await tryFetch('company_identifiers.txt');
  if (txt) {
    COMPANY_MAP = parseTxt(txt);
  }
  return COMPANY_MAP;
}

export function ensurePreload() {
  if (loadOnceStarted) return;
  loadOnceStarted = true;
  // 后台预加载，不影响首屏
  loadCompanyIdentifiers().catch(() => {});
}

export function getCompanyNameFromCache(id: string): string | undefined {
  if (!id) return undefined;
  const { full, short } = normalizeCompanyId(id);
  return COMPANY_MAP[full] || COMPANY_MAP[short];
}

// 模块导入即尝试预加载（可按需在 App 入口手动调用 ensurePreload）
ensurePreload();
