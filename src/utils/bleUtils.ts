// BLE 工具函数
import { getCharNameFromCache } from './characteristicNamesLoader';

// 常见的 BLE 服务 UUID 映射
const WELL_KNOWN_SERVICES: Record<string, string> = {
  // GATT 标准服务
  '1800': 'Generic Access',
  '1801': 'Generic Attribute',
  '1802': 'Immediate Alert',
  '1803': 'Link Loss',
  '1804': 'Tx Power',
  '1805': 'Current Time',
  '1806': 'Reference Time Update',
  '1807': 'Next DST Change',
  '1808': 'Glucose',
  '1809': 'Health Thermometer',
  '180A': 'Device Information',
  '180D': 'Heart Rate',
  '180E': 'Phone Alert Status',
  '180F': 'Battery Service',
  '1810': 'Blood Pressure',
  '1811': 'Alert Notification',
  '1812': 'Human Interface Device',
  '1813': 'Scan Parameters',
  '1814': 'Running Speed and Cadence',
  '1815': 'Automation IO',
  '1816': 'Cycling Speed and Cadence',
  '1818': 'Cycling Power',
  '1819': 'Location and Navigation',
  '181A': 'Environmental Sensing',
  '181B': 'Body Composition',
  '181C': 'User Data',
  '181D': 'Weight Scale',
  '181E': 'Bond Management',
  '181F': 'Continuous Glucose Monitoring',
  '1820': 'Internet Protocol Support',
  '1821': 'Indoor Positioning',
  '1822': 'Pulse Oximeter',
  '1823': 'HTTP Proxy',
  '1824': 'Transport Discovery',
  '1825': 'Object Transfer',
  '1826': 'Fitness Machine',
  '1827': 'Mesh Provisioning',
  '1828': 'Mesh Proxy',
  '1829': 'Reconnection Configuration',
  
  // Apple 服务
  'FE59': 'Apple Continuity',
  'FE2C': 'Apple Notification Center Service',
  'FE26': 'Apple Media Service',
  
  // Nordic 服务
  '6E400001-B5A3-F393-E0A9-E50E24DCCA9E': 'Nordic UART Service',
  
  // 其他常见厂商服务
  'FFF0': 'Simple Key Service',
  'FFE0': 'HM-10 Serial',
};

// 常见的 BLE 特征 UUID 映射（节选常用）
const WELL_KNOWN_CHARACTERISTICS: Record<string, string> = {
  '2A00': 'Device Name',
  '2A01': 'Appearance',
  '2A04': 'Peripheral Preferred Connection Parameters',
  '2AA6': 'Central Address Resolution',
  '2A05': 'Service Changed',
  '2A19': 'Battery Level',
  '2A29': 'Manufacturer Name String',
  '2A24': 'Model Number String',
  '2A25': 'Serial Number String',
  '2A26': 'Firmware Revision String',
  '2A27': 'Hardware Revision String',
  '2A28': 'Software Revision String',
  '2A23': 'System ID',
};

/**
 * 获取服务 UUID 的描述名称
 */
export function getServiceName(uuid: string): string {
  const upperUuid = uuid.toUpperCase();
  
  // 检查是否是 4 位短格式的标准服务
  if (upperUuid.length === 4) {
    return WELL_KNOWN_SERVICES[upperUuid] || `Unknown Service (${upperUuid})`;
  }
  
  // 检查是否是完整 UUID 格式
  if (upperUuid.length === 36) {
    // 尝试匹配完整 UUID
    if (WELL_KNOWN_SERVICES[upperUuid]) {
      return WELL_KNOWN_SERVICES[upperUuid];
    }
    
    // 检查是否是基于标准 UUID 的变体 (0000XXXX-0000-1000-8000-00805F9B34FB)
    const match = upperUuid.match(/^0000([0-9A-F]{4})-0000-1000-8000-00805F9B34FB$/);
    if (match) {
      const shortUuid = match[1];
      return WELL_KNOWN_SERVICES[shortUuid] || `Standard Service (${shortUuid})`;
    }
    
    return `Custom Service (${upperUuid.substring(0, 8)}...)`;
  }
  
  return `Unknown Format (${uuid})`;
}

/**
 * 将 4 位短格式 UUID 扩展为完整的 128 位 UUID
 */
export function expandShortUuid(shortUuid: string): string {
  if (shortUuid.length === 4) {
    return `0000${shortUuid.toUpperCase()}-0000-1000-8000-00805F9B34FB`;
  }
  return shortUuid;
}

/**
 * 格式化 UUID 显示
 */
export function formatUuidForDisplay(uuid: string): { 
  display: string; 
  full: string; 
  name: string; 
  isStandard: boolean 
} {
  const upperUuid = uuid.toUpperCase();
  const name = getServiceName(uuid);
  
  if (upperUuid.length === 4) {
    return {
      display: upperUuid,
      full: expandShortUuid(upperUuid),
      name,
      isStandard: true
    };
  }
  
  if (upperUuid.length === 36) {
    const isStandardBased = upperUuid.match(/^0000[0-9A-F]{4}-0000-1000-8000-00805F9B34FB$/);
    return {
      display: isStandardBased ? upperUuid.substring(4, 8) : `${upperUuid.substring(0, 8)}...`,
      full: upperUuid,
      name,
      isStandard: !!isStandardBased
    };
  }
  
  return {
    display: uuid,
    full: uuid,
    name,
    isStandard: false
  };
}

/**
 * 获取设备类型基于服务 UUID
 */
export function getDeviceTypeFromServices(services: string[]): string {
  const serviceNames = services.map(s => getServiceName(s).toLowerCase());
  
  if (serviceNames.some(name => name.includes('heart rate') || name.includes('fitness'))) {
    return 'fitness';
  }
  if (serviceNames.some(name => name.includes('audio') || name.includes('media'))) {
    return 'audio';
  }
  if (serviceNames.some(name => name.includes('apple') || name.includes('continuity'))) {
    return 'apple';
  }
  if (serviceNames.some(name => name.includes('uart') || name.includes('serial'))) {
    return 'development';
  }
  if (serviceNames.some(name => name.includes('glucose') || name.includes('health'))) {
    return 'health';
  }
  
  return 'generic';
}

/**
 * 将任意形式的 MAC 地址格式化为标准的 XX:XX:XX:XX:XX:XX 显示
 * - 会移除非十六进制字符
 * - 自动大写
 * - 若不足 12 位则返回原始输入避免误导
 */
export function formatMacAddress(address: string): string {
  if (!address) return '';
  const hex = address.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (hex.length !== 12) {
    // 长度异常，回退到原始值（仅做大写）
    return address.toUpperCase();
  }
  const pairs = hex.match(/.{2}/g) || [];
  return pairs.join(':');
}

/**
 * 获取特征 UUID 的描述名称
 */
export function getCharacteristicName(uuid: string): string {
  const upperUuid = uuid.toUpperCase();
  // 4位短UUID
  if (upperUuid.length === 4) {
    return getCharNameFromCache(upperUuid) || WELL_KNOWN_CHARACTERISTICS[upperUuid] || `Characteristic ${upperUuid}`;
  }
  // 完整UUID尝试提取短码
  if (upperUuid.length === 36) {
    const match = upperUuid.match(/^0000([0-9A-F]{4})-0000-1000-8000-00805F9B34FB$/);
    if (match) {
      const shortUuid = match[1];
      return getCharNameFromCache(shortUuid) || WELL_KNOWN_CHARACTERISTICS[shortUuid] || `Characteristic ${shortUuid}`;
    }
    return `Characteristic ${upperUuid.substring(0, 8)}...`;
  }
  return `Characteristic ${uuid}`;
}