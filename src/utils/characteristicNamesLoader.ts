// 动态加载 GATT Characteristic 名称映射，便于维护与替换数据文件

export type CharMap = Record<string, string>;

export function normalizeCharUuid(id: string): { short?: string; full?: string } {
  if (!id) return {};
  const s = id.trim().toUpperCase();
  // 接受 0x 前缀
  const no0x = s.replace(/^0X/, '');
  if (/^[0-9A-F]{4}$/.test(no0x)) {
    return { short: no0x, full: `0000${no0x}-0000-1000-8000-00805F9B34FB` };
  }
  if (/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/.test(no0x)) {
    const m = no0x.match(/^0000([0-9A-F]{4})-0000-1000-8000-00805F9B34FB$/);
    return { full: no0x, short: m ? m[1] : undefined };
  }
  return {};
}

function parseTxt(text: string): CharMap {
  const map: CharMap = {};
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('UUID') || line.startsWith('//')) continue;
    // 形如：0x2A00<TAB>Device Name 或 2A00<TAB>Device Name
    let m = line.match(/^0x([0-9A-Fa-f]{4})\s+(.+?)\s*$/);
    if (!m) m = line.match(/^([0-9A-Fa-f]{4})\s+(.+?)\s*$/);
    if (m) {
      const code = m[1].toUpperCase();
      const name = m[2].trim();
      map[code] = name;
    }
  }
  return map;
}

let CHAR_MAP: CharMap = {
  // 内置常用种子
  '2A00': 'Device Name',
  '2A01': 'Appearance',
  '2A04': 'Peripheral Preferred Connection Parameters',
  '2A05': 'Service Changed',
  '2A19': 'Battery Level',
  '2A29': 'Manufacturer Name String',
  '2A24': 'Model Number String',
  '2A25': 'Serial Number String',
  '2A26': 'Firmware Revision String',
  '2A27': 'Hardware Revision String',
  '2A28': 'Software Revision String',
  '2A23': 'System ID',
  '2AA6': 'Central Address Resolution',
};

let loadStarted = false;

export async function loadCharacteristicNames(): Promise<CharMap> {
  try {
    const res = await fetch('characteristic_names.json');
    if (res.ok) {
      const data = await res.json();
      const m: CharMap = {};
      if (Array.isArray(data)) {
        for (const [id, name] of data) m[String(id).toUpperCase()] = String(name);
      } else if (data && typeof data === 'object') {
        for (const [id, name] of Object.entries(data)) m[id.toUpperCase()] = String(name);
      }
      CHAR_MAP = { ...CHAR_MAP, ...m };
      return CHAR_MAP;
    }
  } catch {}

  try {
    const resTxt = await fetch('characteristic_names.txt');
    if (resTxt.ok) {
      const txt = await resTxt.text();
      CHAR_MAP = { ...CHAR_MAP, ...parseTxt(txt) };
    }
  } catch {}
  return CHAR_MAP;
}

export function ensurePreloadCharacteristics() {
  if (loadStarted) return;
  loadStarted = true;
  loadCharacteristicNames().catch(() => {});
}

export function getCharNameFromCache(id: string): string | undefined {
  const norm = normalizeCharUuid(id);
  if (norm.short && CHAR_MAP[norm.short]) return CHAR_MAP[norm.short];
  return undefined;
}

// 模块导入即尝试预加载
ensurePreloadCharacteristics();
