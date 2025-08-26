// 广播数据解析工具

export interface ParsedAdvData {
  raw: string;
  length: number;
  fields: AdvDataField[];
  structured: {
  // 标准化后的设备类型代码，供 UI 层做 i18n
  deviceTypeCode?: 'speaker' | 'tws' | 'soundcard' | 'watch' | 'unknown';
  // 原始设备类型数值（0x0、0x2 等），用于未知类型时显示编码
  deviceTypeRaw?: number;
    companyId?: string;
    batteryInfo?: {
      leftPercent?: number;
      rightPercent?: number;
      casePercent?: number;
      leftCharging?: boolean;
      rightCharging?: boolean;
      caseCharging?: boolean;
    };
    macAddress?: string;
    connectionFlag?: number;
    protocolVersion?: string;
  };
}

export interface AdvDataField {
  name: string;
  offset: number;
  length: number;
  value: string;
  interpretation?: string;
}

/**
 * 解析原始广播数据（基于您提供的C代码格式）
 * @param rawHexData 原始广播数据的十六进制字符串
 */
export function parseAdvData(rawHexData: string): ParsedAdvData {
  if (!rawHexData || rawHexData.length === 0) {
    return {
      raw: '',
      length: 0,
      fields: [],
      structured: {}
    };
  }

  // 移除空格并转换为大写
  const cleanHex = rawHexData.replace(/\s+/g, '').toUpperCase();
  const dataBytes = hexToBytes(cleanHex);
  
  const fields: AdvDataField[] = [];
  const structured: ParsedAdvData['structured'] = {};

  if (dataBytes.length >= 31) {
    // 解析基于您的C代码的数据结构
    fields.push({
      name: '数据长度',
      offset: 0,
      length: 1,
      value: dataBytes[0].toString(16).padStart(2, '0').toUpperCase(),
      interpretation: `${dataBytes[0]} 字节`
    });

    fields.push({
      name: '数据类型',
      offset: 1,
      length: 1,
      value: dataBytes[1].toString(16).padStart(2, '0').toUpperCase(),
      interpretation: dataBytes[1] === 0xFF ? 'Manufacturer Specific Data' : '未知类型'
    });

    // 公司ID (小端字节序)
    const companyId = (dataBytes[3] << 8) | dataBytes[2];
    structured.companyId = companyId.toString(16).padStart(4, '0').toUpperCase();
    fields.push({
      name: '公司ID',
      offset: 2,
      length: 2,
      value: `${dataBytes[2].toString(16).padStart(2, '0')}${dataBytes[3].toString(16).padStart(2, '0')}`.toUpperCase(),
      interpretation: `0x${structured.companyId} ${getCompanyName(companyId)}`
    });

    // VID
    const vid = (dataBytes[5] << 8) | dataBytes[4];
    fields.push({
      name: 'VID',
      offset: 4,
      length: 2,
      value: `${dataBytes[4].toString(16).padStart(2, '0')}${dataBytes[5].toString(16).padStart(2, '0')}`.toUpperCase(),
      interpretation: `0x${vid.toString(16).padStart(4, '0').toUpperCase()}`
    });

    // PID
    const pid = (dataBytes[7] << 8) | dataBytes[6];
    fields.push({
      name: 'PID',
      offset: 6,
      length: 2,
      value: `${dataBytes[6].toString(16).padStart(2, '0')}${dataBytes[7].toString(16).padStart(2, '0')}`.toUpperCase(),
      interpretation: `0x${pid.toString(16).padStart(4, '0').toUpperCase()}`
    });

    // 设备类型和协议版本
    const deviceTypeByte = dataBytes[8];
    const deviceType = (deviceTypeByte & 0xF0) >> 4;
    const protocolVersion = deviceTypeByte & 0x0F;
  
    // 标准化 code，避免在解析层引入中文
    let deviceTypeCode: 'speaker' | 'tws' | 'soundcard' | 'watch' | 'unknown' = 'unknown';
    switch (deviceType) {
      case 0x0: deviceTypeCode = 'speaker'; break;
      case 0x2: deviceTypeCode = 'tws'; break;
      case 0x4: deviceTypeCode = 'soundcard'; break;
      case 0x5: deviceTypeCode = 'watch'; break;
      default: deviceTypeCode = 'unknown';
    }

    structured.deviceTypeCode = deviceTypeCode;
    structured.deviceTypeRaw = deviceType;
    structured.protocolVersion = `v${protocolVersion}`;
    
    fields.push({
      name: '设备类型/协议版本',
      offset: 8,
      length: 1,
      value: dataBytes[8].toString(16).padStart(2, '0').toUpperCase(),
      interpretation: `${
        deviceTypeCode === 'speaker' ? '音箱类型' :
        deviceTypeCode === 'tws' ? 'TWS耳机类型' :
        deviceTypeCode === 'soundcard' ? '声卡类型' :
        deviceTypeCode === 'watch' ? '手表类型' : `未知类型 (0x${deviceType.toString(16)})`
      }, 协议版本 v${protocolVersion}`
    });

    // MAC地址 (6字节)
    const macBytes = dataBytes.slice(9, 15);
    const macAddress = macBytes.map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
    structured.macAddress = macAddress;
    fields.push({
      name: 'MAC地址',
      offset: 9,
      length: 6,
      value: macBytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
      interpretation: macAddress
    });

    // 连接标志
    if (dataBytes.length > 15) {
      structured.connectionFlag = dataBytes[15];
      fields.push({
        name: '连接标志',
        offset: 15,
        length: 1,
        value: dataBytes[15].toString(16).padStart(2, '0').toUpperCase(),
        interpretation: dataBytes[15] === 1 ? '已连接' : '未连接'
      });
    }

    // 电池信息 (左耳、右耳、充电盒)
    if (dataBytes.length > 18) {
      const leftBat = dataBytes[16];
      const rightBat = dataBytes[17];
      const caseBat = dataBytes[18];

      structured.batteryInfo = {
        leftPercent: leftBat & 0x7F,
        leftCharging: (leftBat & 0x80) !== 0,
        rightPercent: rightBat & 0x7F,
        rightCharging: (rightBat & 0x80) !== 0,
        casePercent: caseBat & 0x7F,
        caseCharging: (caseBat & 0x80) !== 0,
      };

      fields.push({
        name: '左耳电池',
        offset: 16,
        length: 1,
        value: dataBytes[16].toString(16).padStart(2, '0').toUpperCase(),
        interpretation: `${structured.batteryInfo.leftPercent}% ${structured.batteryInfo.leftCharging ? '(充电中)' : ''}`
      });

      fields.push({
        name: '右耳电池',
        offset: 17,
        length: 1,
        value: dataBytes[17].toString(16).padStart(2, '0').toUpperCase(),
        interpretation: `${structured.batteryInfo.rightPercent}% ${structured.batteryInfo.rightCharging ? '(充电中)' : ''}`
      });

      fields.push({
        name: '充电盒电池',
        offset: 18,
        length: 1,
        value: dataBytes[18].toString(16).padStart(2, '0').toUpperCase(),
        interpretation: `${structured.batteryInfo.casePercent}% ${structured.batteryInfo.caseCharging ? '(充电中)' : ''}`
      });
    }

    // 保留字段和序列号
    if (dataBytes.length > 19) {
      fields.push({
        name: '序列随机数',
        offset: 19,
        length: 1,
        value: dataBytes[19].toString(16).padStart(2, '0').toUpperCase(),
        interpretation: `序列号: ${dataBytes[19]}`
      });
    }

    // 哈希值 (8字节)
    if (dataBytes.length >= 31) {
      const hashBytes = dataBytes.slice(23, 31);
      fields.push({
        name: '哈希值',
        offset: 23,
        length: 8,
        value: hashBytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
        interpretation: '数据完整性校验'
      });
    }

    // 剩余字节
    if (dataBytes.length > 31) {
      const remainingBytes = dataBytes.slice(31);
      fields.push({
        name: '额外数据',
        offset: 31,
        length: remainingBytes.length,
        value: remainingBytes.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase(),
        interpretation: `${remainingBytes.length} 字节额外数据`
      });
    }
  } else {
    // 数据长度不足，进行基础解析
    for (let i = 0; i < dataBytes.length; i++) {
      fields.push({
        name: `字节 ${i}`,
        offset: i,
        length: 1,
        value: dataBytes[i].toString(16).padStart(2, '0').toUpperCase(),
        interpretation: `值: ${dataBytes[i]}`
      });
    }
  }

  return {
    raw: cleanHex,
    length: dataBytes.length,
    fields,
    structured
  };
}

/**
 * 将十六进制字符串转换为字节数组
 */
function hexToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16);
    if (!isNaN(byte)) {
      bytes.push(byte);
    }
  }
  return bytes;
}

/**
 * 获取公司名称（简化版本）
 */
function getCompanyName(companyId: number): string {
  const companies: Record<number, string> = {
    0x5583: 'JL (杰理科技)', // 您示例中的公司ID
    0x004C: 'Apple Inc.',
    0x0006: 'Microsoft',
    0x00E0: 'Google',
    0x0075: 'Samsung Electronics',
    // 可以添加更多公司ID
  };
  
  return companies[companyId] || '未知公司';
}

/**
 * 将字节数组转换为格式化的十六进制字符串
 */
export function formatHexData(data: string, bytesPerLine: number = 16): string {
  if (!data) return '';
  
  const cleanData = data.replace(/\s+/g, '').toUpperCase();
  const lines: string[] = [];
  
  for (let i = 0; i < cleanData.length; i += bytesPerLine * 2) {
    const line = cleanData.substr(i, bytesPerLine * 2);
    const formattedLine = line.replace(/(.{2})/g, '$1 ').trim();
    const offset = (i / 2).toString(16).padStart(4, '0').toUpperCase();
    lines.push(`${offset}: ${formattedLine}`);
  }
  
  return lines.join('\n');
}