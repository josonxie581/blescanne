// 制造商数据工具函数（基于可维护的动态厂商表）
import { getCompanyNameFromCache, normalizeCompanyId } from './companyIdentifiersLoader';

/**
 * 获取制造商名称
 */
export function getManufacturerName(companyId: string): string {
  const { full, short } = normalizeCompanyId(companyId);
  const name = getCompanyNameFromCache(full) || getCompanyNameFromCache(short);
  return name || `Unknown Manufacturer (0x${full})`;
}

/**
 * 格式化制造商数据显示
 */
export function formatManufacturerData(companyId: string, data: string): {
  companyId: string;
  companyName: string;
  dataHex: string;
  dataLength: number;
  interpretation?: string;
} {
  const upperCompanyId = companyId.toUpperCase();
  const companyName = getManufacturerName(upperCompanyId);
  const dataLength = Math.ceil(data.length / 2);
  
  let interpretation: string | undefined;
  
  // Apple specific data interpretation
  if (upperCompanyId === '004C' || upperCompanyId === '4C') {
    interpretation = interpretAppleManufacturerData(data);
  }
  // Google specific data interpretation
  else if (upperCompanyId === '00E0' || upperCompanyId === 'E0') {
    interpretation = interpretGoogleManufacturerData(data);
  }
  // Microsoft specific data interpretation
  else if (upperCompanyId === '0006' || upperCompanyId === '6') {
    interpretation = interpretMicrosoftManufacturerData(data);
  }
  
  return {
    companyId: `0x${upperCompanyId.padStart(4, '0')}`,
    companyName,
    dataHex: data.toUpperCase(),
    dataLength,
    interpretation
  };
}

/**
 * Apple制造商数据解释
 */
function interpretAppleManufacturerData(data: string): string {
  if (data.length < 4) return 'Invalid Apple data';
  
  const type = data.substring(0, 2).toUpperCase();
  
  switch (type) {
    case '02':
      return 'iBeacon Advertisement';
    case '05':
      return 'AirDrop Advertisement';
    case '07':
      return 'AirPods Advertisement';
    case '09':
      return 'AirPlay Advertisement';
    case '10':
      return 'Nearby Info Advertisement';
    case '0C':
      return 'Handoff Advertisement';
    default:
      return `Apple Type 0x${type}`;
  }
}

/**
 * Google制造商数据解释
 */
function interpretGoogleManufacturerData(data: string): string {
  if (data.length < 4) return 'Invalid Google data';
  
  const type = data.substring(0, 2).toUpperCase();
  
  switch (type) {
    case '00':
      return 'Eddystone Beacon';
    case '01':
      return 'UriBeacon';
    case '02':
      return 'Eddystone-URL';
    case '03':
      return 'Eddystone-UID';
    case '04':
      return 'Eddystone-TLM';
    case '05':
      return 'Eddystone-EID';
    default:
      return `Google Type 0x${type}`;
  }
}

/**
 * Microsoft制造商数据解释
 */
function interpretMicrosoftManufacturerData(data: string): string {
  if (data.length < 4) return 'Invalid Microsoft data';
  
  const type = data.substring(0, 2).toUpperCase();
  
  switch (type) {
    case '01':
      return 'Microsoft Beacon';
    case '03':
      return 'Microsoft Advertisement';
    default:
      return `Microsoft Type 0x${type}`;
  }
}

/**
 * 验证制造商数据格式
 */
export function isValidManufacturerData(data: string): boolean {
  // 检查是否为有效的十六进制字符串
  return /^[0-9A-Fa-f]*$/.test(data) && data.length % 2 === 0;
}

/**
 * 格式化十六进制数据为可读格式
 */
export function formatHexData(data: string, bytesPerLine: number = 8): string {
  const cleanData = data.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  const bytes = cleanData.match(/.{2}/g) || [];
  
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += bytesPerLine) {
    const lineBytes = bytes.slice(i, i + bytesPerLine);
    lines.push(lineBytes.join(' '));
  }
  
  return lines.join('\n');
}