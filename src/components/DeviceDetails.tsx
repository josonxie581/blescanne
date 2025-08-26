import React, { useState, useEffect } from 'react';
import { 
  X, 
  Bluetooth, 
  Download, 
  Upload, 
  RefreshCw, 
  Copy, 
  Eye, 
  EyeOff, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Settings,
  Activity,
  Bell,
  BellOff,
  Radio,
  Shield,
  CheckCircle,
  AlertCircle,
  Info,
  Trash2,
  Wifi,
  Link2Off,
  Binary,
  Zap,
  Battery
} from 'lucide-react';
import { BleDevice } from '../types/ble';
import { formatUuidForDisplay, getCharacteristicName } from '../utils/bleUtils';
import { getManufacturerName, formatManufacturerData } from '../utils/manufacturerUtils';
import { parseAdvData, formatHexData } from '../utils/advDataParser';
import BleService from '../services/bleService';
import { useTranslation } from 'react-i18next';

interface DeviceDetailsProps {
  device: BleDevice;
  isVisible: boolean;
  onClose: () => void;
  onDisconnect?: (deviceId: string) => void;
  isStandaloneWindow?: boolean;
}

interface CopyState {
  [key: string]: boolean;
}

interface Characteristic {
  uuid: string;
  name: string;
  properties: string[];
  value?: string;
  isReading?: boolean;
  isWriting?: boolean;
  isNotifying?: boolean;
  isIndicating?: boolean;
  notifications: string[];
}

interface Service {
  uuid: string;
  name: string;
  characteristics: Characteristic[];
  isExpanded?: boolean;
}

// 生成智能设备名称
const generateDeviceName = (device: BleDevice): string => {
  if (device.name && device.name.trim()) {
    return device.name;
  }

  // 尝试从制造商数据推断设备类型
  if (device.manufacturer_data && Object.keys(device.manufacturer_data).length > 0) {
    const companyIds = Object.keys(device.manufacturer_data);
    const firstCompanyId = companyIds[0];
    
    // 一些常见的制造商ID映射
    const knownManufacturers: { [key: string]: string } = {
      '004C': 'Apple 设备',
      '0006': 'Microsoft 设备', 
      '00E0': 'Google 设备',
      '0075': 'Samsung 设备',
      '0087': 'Garmin 设备',
      '02E5': 'Xiaomi 设备',
      '038F': 'OnePlus 设备'
    };
    
    if (knownManufacturers[firstCompanyId]) {
      return knownManufacturers[firstCompanyId];
    }
    
    return `BLE设备 (${firstCompanyId})`;
  }

  // 如果有服务信息，使用服务来命名
  if (device.services && device.services.length > 0) {
    const serviceCount = device.services.length;
    return `BLE设备 (${serviceCount}个服务)`;
  }

  // 使用MAC地址的后6位
  if (device.address && device.address.includes(':')) {
    const macParts = device.address.split(':');
    if (macParts.length >= 3) {
      const lastThree = macParts.slice(-3).join(':');
      return `BLE设备 (${lastThree})`;
    }
  }

  // 最后使用identifier的一部分
  if (device.identifier && device.identifier.length > 8) {
    const shortId = device.identifier.slice(-8);
    return `BLE设备 (${shortId})`;
  }

  return 'BLE设备';
};

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ device, isVisible, onClose, onDisconnect, isStandaloneWindow = false }) => {
  const { t } = useTranslation('device');
  const [services, setServices] = useState<Service[]>([]);
  const [writeValue, setWriteValue] = useState<string>('');
  const [selectedCharacteristic, setSelectedCharacteristic] = useState<string>('');
  // 每个特征值单独的 HEX/TEXT 视图控制
  const [hexViewByChar, setHexViewByChar] = useState<Record<string, boolean>>({});
  // 复制状态管理
  const [copyStates, setCopyStates] = useState<CopyState>({});
  const [disconnecting, setDisconnecting] = useState<boolean>(false);
  // 广告数据展开状态
  const [advDataExpanded, setAdvDataExpanded] = useState<boolean>(false);
  const [manufacturerExpanded, setManufacturerExpanded] = useState<boolean>(false);
  const [servicesExpanded, setServicesExpanded] = useState<boolean>(false);
  const [rawAdvExpanded, setRawAdvExpanded] = useState<boolean>(false);

  const unsubscribeAll = async () => {
    try {
      const current = services;
      const tasks: Promise<any>[] = [];
      for (const s of current) {
        for (const c of s.characteristics) {
          if (c.isNotifying || c.isIndicating) {
            tasks.push(BleService.unsubscribeCharacteristic(device.identifier, s.uuid, c.uuid).catch(() => {}));
          }
        }
      }
      if (tasks.length) await Promise.allSettled(tasks);
    } catch {}
  };

  // 当从可见变为不可见时，主动退订所有订阅，避免资源泄漏
  useEffect(() => {
    if (!isVisible) {
      unsubscribeAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      // 重置本地状态
      setServices([]);
      setHexViewByChar({});
      setWriteValue('');
      setSelectedCharacteristic('');

      // 监听通知/指示事件
      const unlistenPromise = BleService.onCharacteristicValue((p) => {
        if (p.deviceId !== device.identifier) return;
        setServices(prev => prev.map(s => s.uuid === p.serviceUuid ? {
          ...s,
          characteristics: s.characteristics.map(c => c.uuid === p.characteristicUuid ? {
            ...c,
            notifications: [p.value, ...(c.notifications || [])].slice(0, 100),
            isNotifying: p.kind === 'notify' ? true : c.isNotifying,
            isIndicating: p.kind === 'indicate' ? true : c.isIndicating,
          } : c)
        } : s));
      });

      // 拉取真实 GATT 服务数据
      (async () => {
        try {
          const raw = await BleService.getDeviceServices(device.identifier);
          // 组装服务与特征，并优先将 Generic Access (0x1800) 置顶
          const mapped: Service[] = raw.map(s => ({
            uuid: s.uuid,
            // 使用可读的服务名称
            name: formatUuidForDisplay(s.uuid).name,
            isExpanded: true,
            characteristics: s.characteristics.map(c => ({
              uuid: c.uuid,
              // 使用可读的特征名称
              name: getCharacteristicName(c.uuid),
              properties: c.properties.map(p => {
                // 映射属性文案
                switch (p) {
                  case 'Read': return 'Read';
                  case 'WriteRequest': return 'Write';
                  case 'WriteCommand': return 'Write (Cmd)';
                  case 'Notify': return 'Notify';
                  case 'Indicate': return 'Indicate';
                  default: return p;
                }
              }),
              notifications: [],
            }))
          }));

          // 判断是否为 Generic Access 服务（0x1800 或其标准 128-bit 形式）
          const isGenericAccess = (uuid: string) => {
            const u = uuid.toUpperCase();
            if (u.length === 4) return u === '1800';
            const m = u.match(/^0000([0-9A-F]{4})-0000-1000-8000-00805F9B34FB$/);
            return !!(m && m[1] === '1800');
          };

          // 将 Generic Access 放到最前，其他保持原始顺序
          const ga = mapped.filter(s => isGenericAccess(s.uuid));
          const others = mapped.filter(s => !isGenericAccess(s.uuid));
          const ordered = [...ga, ...others];
          setServices(ordered);
        } catch (e) {
          console.error('获取 GATT 服务失败:', e);
        }
      })();

      return () => { unlistenPromise.then(unlisten => unlisten()); };
    }
  }, [isVisible, device]);
  
  // 以下操作留作占位，待后端真实读写/订阅 API 接入后实现
  const handleRead = async (serviceUuid: string, charUuid: string) => {
    setServices(prev => prev.map(s => s.uuid === serviceUuid ? {
      ...s,
      characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, isReading: true } : c)
    } : s));
    try {
      const hex = await BleService.readCharacteristic(device.identifier, serviceUuid, charUuid);
      setServices(prev => prev.map(s => s.uuid === serviceUuid ? {
        ...s,
        characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, value: hex } : c)
      } : s));
    } catch (e) {
      console.error('读取特征值失败:', e);
    } finally {
      setServices(prev => prev.map(s => s.uuid === serviceUuid ? {
        ...s,
        characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, isReading: false } : c)
      } : s));
    }
  };

  const handleWrite = async (serviceUuid: string, charUuid: string, value: string) => {
    if (!value.trim()) return;
    setServices(prev => prev.map(s => s.uuid === serviceUuid ? {
      ...s,
      characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, isWriting: true } : c)
    } : s));
    try {
      // 依据输入是否以 0x 开头选择 hex，否则视为文本，后端已兼容
      await BleService.writeCharacteristic(device.identifier, serviceUuid, charUuid, value, 'request');
    } catch (e) {
      console.error('写入失败:', e);
    } finally {
      setServices(prev => prev.map(s => s.uuid === serviceUuid ? {
        ...s,
        characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, isWriting: false } : c)
      } : s));
    }
  };

  const toggleService = (serviceUuid: string) => {
    setServices(prev => prev.map(service => {
      if (service.uuid === serviceUuid) {
        return { ...service, isExpanded: !service.isExpanded };
      }
      return service;
    }));
  };

  // 格式化制造商数据
  const getManufacturerInfo = () => {
    if (!device.manufacturer_data || Object.keys(device.manufacturer_data).length === 0) {
      return null;
    }

    const entries = Object.entries(device.manufacturer_data);
    const firstEntry = entries[0];
    
    if (!firstEntry) return null;

    const [companyIdRaw, dataHexRaw] = firstEntry;
    const formatted = formatManufacturerData(companyIdRaw, dataHexRaw);
    const pillId = formatted.companyId.replace(/^0x/i, ''); // 显示为 4 位大写，不带 0x

    return {
      companyId: pillId,
      companyName: formatted.companyName || getManufacturerName(companyIdRaw),
      data: formatted.dataHex,
      dataType: formatted.interpretation || 'Manufacturer Data',
      totalEntries: entries.length,
      dataLength: formatted.dataLength,
    };
  };

  // 格式化服务信息
  const getServiceInfo = () => {
    if (!device.services || device.services.length === 0) {
      return [];
    }

    return device.services.map(service => {
      const uuid = service.toUpperCase();
      
      // 识别标准服务
      const getServiceName = (uuid: string) => {
        if (uuid.includes('1800') || uuid.includes('0000-1000-8000-00805F9B34FB')) {
          return 'Generic Access';
        }
        if (uuid.includes('1801')) {
          return 'Generic Attribute';
        }
        if (uuid.startsWith('0000')) {
          return 'Standard Service';
        }
        return 'Custom Service';
      };

      return {
        uuid,
        name: getServiceName(uuid),
        shortId: uuid.substring(0, 4)
      };
    });
  };

  // 格式化广播数据
  const getAdvDataInfo = () => {
    if (!device.adv_data || Object.keys(device.adv_data).length === 0) {
      return null;
    }

    const entries = Object.entries(device.adv_data);
    return {
      entries,
      totalEntries: entries.length,
    };
  };

  // 获取原始广播数据解析
  const getRawAdvDataParsed = () => {
    return device.raw_adv_data ? parseAdvData(device.raw_adv_data) : null;
  };

  const manufacturerInfo = getManufacturerInfo();
  const serviceInfo = getServiceInfo();
  const advDataInfo = getAdvDataInfo();
  const parsedRawAdvData = getRawAdvDataParsed();

  const copyValue = async (value: string, key: string = 'default') => {
    try {
      if (navigator && 'clipboard' in navigator && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const mod = await import('@tauri-apps/api/clipboard');
        await mod.writeText(value);
      }
      
      // 显示复制成功反馈
      setCopyStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (e) {
      console.error('复制失败:', e);
    }
  };

  // 复制按钮组件
  const CopyButton = ({ value, keyId, className = "", children }: {
    value: string;
    keyId: string;
    className?: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => copyValue(value, keyId)}
      className={`inline-flex items-center gap-1 transition-all duration-200 ${
        copyStates[keyId]
          ? 'bg-green-600 text-white'
          : 'bg-slate-600 hover:bg-slate-500 text-white'
      } ${className}`}
    title={copyStates[keyId] ? t('copied') : t('copy')}
    >
      {copyStates[keyId] ? (
        <>
          <CheckCircle className="w-3 h-3" />
      {t('copied')}
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
      {children}
        </>
      )}
    </button>
  );

  const handleNotify = async (serviceUuid: string, charUuid: string) => {
    setServices(prev => prev.map(s => s.uuid === serviceUuid ? {
      ...s,
      characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, isNotifying: !c.isNotifying } : c)
    } : s));
    try {
      const target = services.find(s => s.uuid === serviceUuid)?.characteristics.find(c => c.uuid === charUuid);
      if (target?.isNotifying) {
        await BleService.unsubscribeCharacteristic(device.identifier, serviceUuid, charUuid);
      } else {
        await BleService.notifyCharacteristic(device.identifier, serviceUuid, charUuid);
      }
    } catch (e) { console.error('通知订阅切换失败:', e); }
  };

  const handleIndicate = async (serviceUuid: string, charUuid: string) => {
    setServices(prev => prev.map(s => s.uuid === serviceUuid ? {
      ...s,
      characteristics: s.characteristics.map(c => c.uuid === charUuid ? { ...c, isIndicating: !c.isIndicating } : c)
    } : s));
    try {
      const target = services.find(s => s.uuid === serviceUuid)?.characteristics.find(c => c.uuid === charUuid);
      if (target?.isIndicating) {
        await BleService.unsubscribeCharacteristic(device.identifier, serviceUuid, charUuid);
      } else {
        await BleService.indicateCharacteristic(device.identifier, serviceUuid, charUuid);
      }
    } catch (e) { console.error('指示订阅切换失败:', e); }
  };

  // 已移除模拟通知/指示逻辑

  const clearNotifications = (serviceUuid: string, charUuid: string) => {
    setServices(prev => prev.map(service => {
      if (service.uuid === serviceUuid) {
        return {
          ...service,
          characteristics: service.characteristics.map(char => {
            if (char.uuid === charUuid) {
              return { ...char, notifications: [] };
            }
            return char;
          })
        };
      }
      return service;
    }));
  };

  const isHexView = (charUuid: string): boolean => {
    return hexViewByChar[charUuid] ?? false; // 默认 HEX
  };

  const toggleHexView = (charUuid: string) => {
    setHexViewByChar(prev => ({ ...prev, [charUuid]: !isHexView(charUuid) }));
  };

  const formatValue = (value: string, hexMode: boolean): string => {
    if (!value) return '';
    const isHexLike = (s: string) => /^0x[0-9a-fA-F]+$/.test(s) || /^[0-9a-fA-F]+$/.test(s);

    if (hexMode) {
      // 统一以大写、不带 0x 显示
      if (isHexLike(value)) {
        const v = value.startsWith('0x') ? value.slice(2) : value;
        return v.toUpperCase();
      }
      // 非 hex 文本转为 hex 显示
      try {
        const bytes = new TextEncoder().encode(value);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      } catch {
        return value;
      }
    } else {
      // 显示原始值或尝试解码十六进制（支持带/不带0x）
      if (isHexLike(value)) {
        try {
          const hex = value.startsWith('0x') ? value.slice(2) : value;
          const bytes = hex.match(/.{2}/g)?.map(b => parseInt(b, 16)) || [];
          return new TextDecoder().decode(new Uint8Array(bytes));
        } catch {
          return value;
        }
      }
      return value;
    }
  };

  if (!isVisible) return null;

  const containerClass = isStandaloneWindow
    ? "w-full h-full bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors"
    : "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4";

  const contentClass = isStandaloneWindow
    ? "w-full h-full flex flex-col"
    : "bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 border border-gray-200 dark:border-slate-600/50 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden backdrop-blur-sm transition-colors";

  return (
    <div className={containerClass}>
      <div className={contentClass}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-600/30 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-700/50 dark:to-slate-600/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl border border-blue-200 dark:border-blue-500/30 flex items-center justify-center transition-colors">
              <Bluetooth className="w-6 h-6 text-blue-600 dark:text-blue-400 transition-colors" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">
                {generateDeviceName(device)}
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 transition-colors">
                  <Shield className="w-4 h-4" />
                  <span className="font-mono text-gray-800 dark:text-gray-200 transition-colors">{device.address}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wifi className={`w-4 h-4 ${
                    (device.rssi || 0) >= -50 ? 'text-green-400' : 
                    (device.rssi || 0) >= -70 ? 'text-yellow-400' : 'text-red-400'
                  }`} />
                  <span className={`font-medium ${
                    (device.rssi || 0) >= -50 ? 'text-green-400' : 
                    (device.rssi || 0) >= -70 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {device.rssi || 'N/A'} dBm
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className={`w-4 h-4 ${
                    device.paired ? 'text-green-400' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm transition-colors ${
                    device.paired ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {device.paired ? t('connected') : t('disconnected')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* 顶部小型断开按钮：总是显示（若提供 onDisconnect） */}
            {onDisconnect && (
              <button
                onClick={async () => {
                  if (disconnecting) return;
                  setDisconnecting(true);
                  try {
                    await unsubscribeAll();
                  } catch {}
                  try {
                    await onDisconnect(device.identifier);
                  } finally {
                    setDisconnecting(false);
                  }
                }}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  device.paired
                    ? 'text-red-600 dark:text-red-300 hover:text-white bg-red-100 dark:bg-red-600/20 hover:bg-red-200 dark:hover:bg-red-600/30 border-red-300 dark:border-red-500/30'
                    : 'text-gray-600 dark:text-slate-300 hover:text-white bg-gray-100 dark:bg-slate-600/30 hover:bg-gray-200 dark:hover:bg-slate-600/40 border-gray-300 dark:border-slate-500/30'
                } ${disconnecting ? 'opacity-60 cursor-not-allowed' : ''}`}
                title={t('details.disconnect')}
              >
                <Link2Off className="w-5 h-5" />
              </button>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={async () => { await unsubscribeAll(); onClose(); }}
              className="p-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-600/50 border border-transparent hover:border-gray-300 dark:hover:border-slate-500/50 rounded-xl transition-all duration-200"
              title={t('details.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={`p-6 overflow-y-auto ${isStandaloneWindow ? 'flex-1' : 'max-h-[calc(90vh-200px)]'} bg-gradient-to-b from-transparent to-gray-50 dark:to-slate-800/30 transition-colors`}>
          <div className="space-y-6">
            {/* 广告数据区域 */}
            <div className="bg-gradient-to-r from-slate-700/40 to-slate-600/40 rounded-2xl border border-slate-600/30 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="p-5 border-b border-slate-600/30">
                <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-indigo-400" />
                  {t('details.advertisementData')}
                </h3>
                <p className="text-slate-300 text-sm">
                  {t('details.advertisementDataDesc')}
                </p>
              </div>
              <div className="p-5 space-y-6">
                {/* 制造商数据 */}
                {manufacturerInfo && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-orange-400" />
                        <span className="text-white font-medium">{t('manufacturer.title')}</span>
                        <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs px-2 py-1 rounded-full border border-orange-200 dark:border-orange-500/30">
                          {t('manufacturer.entries', { count: manufacturerInfo.totalEntries })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyButton
                          value={manufacturerInfo ? `Company ID: 0x${manufacturerInfo.companyId}\nCompany: ${manufacturerInfo.companyName}\nType: ${manufacturerInfo.dataType}\nData (${manufacturerInfo.dataLength} bytes): ${manufacturerInfo.data}` : ''}
                          keyId="manufacturer-all"
                          className="text-xs px-3 py-1.5 rounded-lg"
                        >
                          {t('manufacturer.all')}
                        </CopyButton>
                        <button
                          onClick={() => setManufacturerExpanded(!manufacturerExpanded)}
                          className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs px-3 py-1.5 rounded-lg hover:from-orange-400 hover:to-orange-500 flex items-center gap-1 transition-all duration-200 shadow"
                        >
                          {manufacturerExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {manufacturerExpanded ? t('collapse') : t('expand')}
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-4 border border-slate-600/20">
                      <div className="text-center mb-4">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm px-3 py-1.5 rounded-lg font-mono font-semibold shadow-lg inline-block mb-2">
                          0x{manufacturerInfo.companyId}
                        </div>
                        <h4 className="text-white font-bold text-lg">{manufacturerInfo.companyName}</h4>
                        <p className="text-slate-300 text-sm">{manufacturerInfo.dataType}</p>
                      </div>
                      
                      {manufacturerExpanded && (
                        <div className="space-y-3">
                          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-300 text-sm">{t('manufacturer.hex')}</span>
                              <span className="text-slate-300 text-xs bg-slate-700 px-2 py-1 rounded">
                                {t('manufacturer.bytes', { count: manufacturerInfo.dataLength })}
                              </span>
                            </div>
                            <div className="text-slate-100 font-mono text-sm break-all">
                              {manufacturerInfo.data}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 广告服务 */}
                {serviceInfo.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Bluetooth className="w-5 h-5 text-blue-400" />
                        <span className="text-white font-medium">{t('services.title')}</span>
                        <span className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs px-2 py-1 rounded-full border border-blue-200 dark:border-blue-500/30">
                          {t('services.count', { count: serviceInfo.length })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyButton
                          value={serviceInfo.map(s => `Name: ${s.name} | UUID: ${s.uuid}`).join('\n')}
                          keyId="services-all"
                          className="text-xs px-3 py-1.5 rounded-lg"
                        >
                          {t('services.all')}
                        </CopyButton>
                        <button
                          onClick={() => setServicesExpanded(!servicesExpanded)}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:from-blue-400 hover:to-blue-500 flex items-center gap-1 transition-all duration-200 shadow"
                        >
                          {servicesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {servicesExpanded ? t('collapse') : t('expand')}
                        </button>
                      </div>
                    </div>

                    {servicesExpanded && (
                      <div className="space-y-3">
                        {serviceInfo.map((service, index) => (
                          <div key={index} className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-4 border border-slate-600/20">
                            <div className="flex items-center justify-between mb-3">
                              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs px-3 py-1 rounded-lg font-semibold shadow">
                                {service.name.includes('Standard') || service.name.includes('Generic') ? t('services.std') : t('services.custom')}
                              </div>
                              <CopyButton
                                value={service.uuid}
                                keyId={`service-${index}`}
                                className="text-xs px-3 py-1.5 rounded-lg"
                              >
                                {t('services.uuid')}
                              </CopyButton>
                            </div>
                            
                            <div className="text-center mb-3">
                              <h4 className="text-white font-semibold text-base">
                                {service.name}
                              </h4>
                            </div>
                            
                            <div className="bg-slate-800/60 rounded-lg p-2 border border-slate-600/20">
                              <div className="text-slate-300 text-xs mb-1">UUID:</div>
                              <div className="text-slate-100 font-mono text-sm break-all">
                                {service.uuid}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 广播数据 (Advertisement Data) */}
                {advDataInfo && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-purple-400" />
                        <span className="text-white font-medium">{t('adv.title')}</span>
                        <span className="bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 text-xs px-2 py-1 rounded-full border border-purple-200 dark:border-purple-500/30">
                          {t('adv.fields', { count: advDataInfo.totalEntries })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyButton
                          value={advDataInfo.entries.map(([key, value]) => `${key}: ${value}`).join('\n')}
                          keyId="adv-data-all"
                          className="text-xs px-3 py-1.5 rounded-lg"
                        >
                          {t('adv.all')}
                        </CopyButton>
                        <button
                          onClick={() => setAdvDataExpanded(!advDataExpanded)}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-3 py-1.5 rounded-lg hover:from-purple-400 hover:to-purple-500 flex items-center gap-1 transition-all duration-200 shadow"
                        >
                          {advDataExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {advDataExpanded ? t('adv.collapse') : t('adv.expand')}
                        </button>
                      </div>
                    </div>

                    {advDataExpanded && (
                      <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-4 space-y-3 border border-slate-600/20">
                        {advDataInfo.entries.map(([key, value], index) => (
                          <div key={index} className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/20">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-purple-300 text-xs uppercase tracking-wider font-medium bg-purple-500/20 px-2 py-1 rounded">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <CopyButton
                                value={`${key}: ${value}`}
                                keyId={`adv-${index}`}
                                className="text-xs px-3 py-1.5 rounded-lg"
                              >
                                {t('adv.copy')}
                              </CopyButton>
                            </div>
                            <div className="text-white font-mono text-sm break-all">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 原始广播数据 */}
                {(parsedRawAdvData || device.raw_adv_data) && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Binary className="w-5 h-5 text-indigo-400" />
                        <span className="text-white font-medium">{t('raw.title')}</span>
                        <span className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-xs px-2 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/30">
                          {t('raw.bytes', { count: parsedRawAdvData?.length || 0 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CopyButton
                          value={`Raw Data: ${parsedRawAdvData?.raw || device.raw_adv_data}\nFormatted:\n${formatHexData(parsedRawAdvData?.raw || device.raw_adv_data || '')}`}
                          keyId="raw-data-all"
                          className="text-xs px-3 py-1.5 rounded-lg"
                        >
                          {t('raw.raw')}
                        </CopyButton>
                        <button
                          onClick={() => setRawAdvExpanded(!rawAdvExpanded)}
                          className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:from-indigo-400 hover:to-indigo-500 flex items-center gap-1 transition-all duration-200 shadow"
                        >
                          {rawAdvExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {t('raw.details')}
                        </button>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-xl p-4 border border-slate-600/20">
                      {/* 结构化信息摘要 */}
                      {parsedRawAdvData && parsedRawAdvData.structured && (
                        <div className="mb-4">
                          <h4 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            {t('raw.parse.title')}
                          </h4>
                          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/20">
                            <div className="grid grid-cols-1 gap-3 text-sm">
                              {parsedRawAdvData.structured.deviceTypeCode !== undefined && (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-300">{t('raw.parse.deviceType')}</span>
                                  <span className="text-white bg-slate-700/50 px-2 py-1 rounded font-medium">
                                    {(() => {
                                      const code = parsedRawAdvData.structured.deviceTypeCode;
                                      if (code === 'speaker') return t('raw.parse.deviceType_speaker');
                                      if (code === 'tws') return t('raw.parse.deviceType_tws');
                                      if (code === 'soundcard') return t('raw.parse.deviceType_soundcard');
                                      if (code === 'watch') return t('raw.parse.deviceType_watch');
                                      const raw = parsedRawAdvData.structured.deviceTypeRaw;
                                      return `${t('raw.parse.deviceType_unknown')} (0x${(raw ?? 0).toString(16)})`;
                                    })()}
                                  </span>
                                </div>
                              )}
                              {parsedRawAdvData.structured.companyId && (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-300">{t('raw.parse.companyId')}</span>
                                  <span className="text-white bg-slate-700/50 px-2 py-1 rounded font-mono">
                                    0x{parsedRawAdvData.structured.companyId}
                                  </span>
                                </div>
                              )}
                              {parsedRawAdvData.structured.batteryInfo && (
                                <div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Battery className="w-4 h-4 text-green-400" />
                                    <span className="text-slate-300">{t('raw.parse.batteryStatus')}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-slate-900/50 rounded p-2 text-center border border-slate-600/50">
                                      <div className="text-xs text-slate-400 mb-1">{t('raw.parse.ear.left')}</div>
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="text-white font-semibold">
                                          {parsedRawAdvData.structured.batteryInfo.leftPercent}%
                                        </span>
                                        {parsedRawAdvData.structured.batteryInfo.leftCharging && (
                                          <Zap className="w-3 h-3 text-yellow-400" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded p-2 text-center border border-slate-600/50">
                                      <div className="text-xs text-slate-400 mb-1">{t('raw.parse.ear.right')}</div>
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="text-white font-semibold">
                                          {parsedRawAdvData.structured.batteryInfo.rightPercent}%
                                        </span>
                                        {parsedRawAdvData.structured.batteryInfo.rightCharging && (
                                          <Zap className="w-3 h-3 text-yellow-400" />
                                        )}
                                      </div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded p-2 text-center border border-slate-600/50">
                                      <div className="text-xs text-slate-400 mb-1">{t('raw.parse.ear.case')}</div>
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="text-white font-semibold">
                                          {parsedRawAdvData.structured.batteryInfo.casePercent}%
                                        </span>
                                        {parsedRawAdvData.structured.batteryInfo.caseCharging && (
                                          <Zap className="w-3 h-3 text-yellow-400" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 原始数据十六进制显示 */}
                      <div className="mb-4">
                        <h4 className="text-slate-200 font-medium mb-2 flex items-center gap-2">
                          <Binary className="w-4 h-4" />
                          {t('raw.hexData')}
                        </h4>
                        <div className="bg-slate-900/50 rounded-lg p-3 font-mono text-xs text-slate-200 border border-slate-600/20 overflow-x-auto">
                          <pre className="whitespace-pre-wrap">
                            {parsedRawAdvData ? formatHexData(parsedRawAdvData.raw) : formatHexData(device.raw_adv_data || '')}
                          </pre>
                        </div>
                      </div>

                      {/* 详细字段解析（可展开） */}
                      {rawAdvExpanded && parsedRawAdvData && (
                        <div className="border-t border-slate-600/30 pt-4">
                          <h4 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            {t('field.title')}
                          </h4>
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {parsedRawAdvData.fields.map((field, index) => (
                              <div key={index} className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/20">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2 py-1 rounded font-medium">
                                      {field.name}
                                    </span>
                                    <span className="text-slate-400 text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                                      @{field.offset}
                                    </span>
                                  </div>
                                  <CopyButton
                                    value={`${field.name}: ${field.value} (${field.interpretation})`}
                                    keyId={`field-${index}`}
                                    className="text-xs px-3 py-1.5 rounded-lg"
                                  >
                                    {t('adv.copy')}
                                  </CopyButton>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  <div>
                                    <div className="text-slate-400 text-xs mb-1">{t('field.value')}</div>
                                    <div className="text-white font-mono text-sm bg-slate-900/50 p-1.5 rounded border border-slate-600/50">
                                      {field.value}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-slate-400 text-xs mb-1">{t('field.interpretation')}</div>
                                    <div className="text-slate-200 text-sm">
                                      {field.interpretation}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* GATT 服务区域 */}
            <div className="bg-gradient-to-r from-slate-700/40 to-slate-600/40 rounded-2xl border border-slate-600/30 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="p-5 border-b border-slate-600/30">
                <h3 className="text-white font-semibold text-lg mb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-400" />
                  {t('details.gattServices')}
                </h3>
                <p className="text-slate-300 text-sm">
                  {t('details.gattServicesDesc')}
                </p>
              </div>
              <div className="p-5">
                {services.length === 0 && (
                  <div className="text-center py-8">
                    <div className="mb-4">
                      <Settings className="w-12 h-12 text-slate-400 mx-auto" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{t('details.loading')}</h3>
                    <p className="text-slate-400">{t('details.loadingHint')}</p>
                  </div>
                )}
              </div>
            </div>
            {services.map((service) => {
              const { display } = formatUuidForDisplay(service.uuid);
              return (
                <div key={service.uuid} className="bg-gradient-to-r from-slate-700/40 to-slate-600/40 rounded-2xl border border-slate-600/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  {/* Service Header */}
                  <div
                    className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-600/30 rounded-t-2xl transition-all duration-200"
                    onClick={() => toggleService(service.uuid)}
                  >
                    <div className="flex items-center gap-4">
                      {/* <div className="w-12 h-12 bg-blue-500/20 rounded-xl border border-blue-500/30 flex items-center justify-center"> */}
                        {/* <Radio className="w-5 h-5 text-blue-400" /> */}
                      {/* </div> */}
                      <div className="flex-1">
                        <h3 className="text-white font-semibold text-lg">{service.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="bg-blue-500/20 text-blue-300 font-mono text-sm px-2 py-1 rounded border border-blue-500/30">
                            {display}
                          </span>
                          <CopyButton
                            value={service.uuid}
                            keyId={`service-uuid-${service.uuid}`}
                            className="text-xs px-2 py-1 rounded"
                          >
                            UUID
                          </CopyButton>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-500/20 text-slate-300 text-sm px-3 py-1 rounded-full border border-slate-500/30">
                        {t('details.characteristicsCount', { count: service.characteristics.length })}
                      </span>
                      <div className={`p-2 rounded-lg transition-transform duration-200 ${
                        service.isExpanded ? 'rotate-90 bg-blue-500/20' : 'bg-slate-500/20'
                      }`}>
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </div>
                  </div>

                  {/* Service Characteristics */}
                  {service.isExpanded && (
                    <div className="border-t border-slate-600/30">
                      {service.characteristics.map((char) => (
                        <div key={char.uuid} className="p-5 border-b border-slate-600/20 last:border-b-0 hover:bg-slate-600/10 transition-all duration-200">
                          <div className="space-y-4">
                            {/* Characteristic Info */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {/* <div className="w-12 h-12 bg-purple-500/20 rounded-xl border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                                    <Radio className="w-5 h-5 text-purple-400" />
                                  </div> */}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-lg">
                                      {char.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <span className="bg-purple-500/20 text-purple-300 font-mono text-sm px-3 py-1 rounded-lg border border-purple-500/30 font-semibold">
                                        {formatUuidForDisplay(char.uuid).display}
                                      </span>
                                      <CopyButton
                                        value={char.uuid}
                                        keyId={`char-uuid-${char.uuid}`}
                                        className="text-xs px-2 py-1 rounded flex-shrink-0"
                                      >
                                        UUID
                                      </CopyButton>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {char.properties.map((prop) => {
                                    const getPropertyStyle = (property: string) => {
                                      switch (property.toLowerCase()) {
                                        case 'read': return 'bg-green-500/20 text-green-300 border-green-500/30';
                                        case 'write': 
                                        case 'write (cmd)': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                                        case 'notify': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
                                        case 'indicate': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
                                        default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
                                      }
                                    };
                                    return (
                                      <span
                                        key={prop}
                                        className={`text-sm px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap ${getPropertyStyle(prop)}`}
                                      >
                                        {prop}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Characteristic Value */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Info className="w-4 h-4 text-indigo-400" />
                                  <span className="text-indigo-300 font-medium">{t('details.currentValue')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleHexView(char.uuid)}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-all duration-200 ${
                                      isHexView(char.uuid) 
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                                        : 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                    }`}
                                    title={t('details.toggleFormat')}
                                  >
                                    {isHexView(char.uuid) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    <span>{isHexView(char.uuid) ? 'HEX' : 'TEXT'}</span>
                                  </button>
                                  <CopyButton
                                    value={char.value || ''}
                                    keyId={`char-value-${char.uuid}`}
                                    className="text-xs px-3 py-1.5 rounded-lg"
                                  >
                                    {t('details.copyValue')}
                                  </CopyButton>
                                </div>
                              </div>
                              <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-lg p-4 border border-slate-600/20">
                                <div className="font-mono text-sm break-all">
                                  {(() => {
                                    const v = char.value || '';
                                    const hexMode = isHexView(char.uuid);
                                    const fv = formatValue(v, hexMode);
                                    const displayValue = hexMode && fv ? `0x${fv}` : fv;
                                    return (
                                      <span className={`${
                                        displayValue ? 'text-green-400' : 'text-gray-500'
                                      }`}>
                                        {displayValue || t('details.noData')}
                                      </span>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>

                            {/* Notifications Display */}
                            {char.notifications && char.notifications.length > 0 && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Bell className={`w-4 h-4 flex-shrink-0 ${
                                      char.isNotifying ? 'text-yellow-400' : char.isIndicating ? 'text-orange-400' : 'text-gray-400'
                                    }`} />
                                    <span className="text-yellow-300 font-medium">
                                      {char.isNotifying ? t('details.notifications') : char.isIndicating ? t('details.indications') : t('details.messages')}
                                    </span>
                                    <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-1 rounded-full border border-yellow-500/30 flex-shrink-0">
                                      {char.notifications.length}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => clearNotifications(service.uuid, char.uuid)}
                                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30 transition-all duration-200"
                                    title={t('details.clear')}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    {t('details.clear')}
                                  </button>
                                </div>
                                <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 rounded-lg border border-slate-600/20 max-h-40 overflow-y-auto">
                                  {char.notifications.map((notification, index) => (
                                    <div
                                      key={index}
                                      className="p-3 text-sm text-yellow-300 border-b border-slate-600/20 last:border-b-0 hover:bg-slate-600/20 transition-colors"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono break-all">{notification}</span>
                                        <CopyButton
                                          value={notification}
                                          keyId={`notification-${char.uuid}-${index}`}
                                          className="text-xs px-2 py-1 rounded ml-2 flex-shrink-0"
                                        >
                                          {t('copy')}
                                        </CopyButton>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                {char.properties.includes('Read') && (
                                <button
                                  onClick={() => handleRead(service.uuid, char.uuid)}
                                  disabled={char.isReading}
                                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all duration-200 shadow-lg ${
                                    char.isReading
                                      ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white shadow-green-500/25 hover:shadow-xl hover:-translate-y-0.5'
                                  }`}
                                >
                                  {char.isReading ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                  <span>{char.isReading ? t('details.reading') : t('details.read')}</span>
                                </button>
                              )}

                              {char.properties.some(p => p.startsWith('Write')) && (
                                <div className="flex items-stretch gap-2 w-full max-w-lg">
                                  <input
                                    type="text"
                                    value={selectedCharacteristic === `${service.uuid}-${char.uuid}` ? writeValue : ''}
                                    onChange={(e) => {
                                      setWriteValue(e.target.value);
                                      setSelectedCharacteristic(`${service.uuid}-${char.uuid}`);
                                    }}
                                    onFocus={() => setSelectedCharacteristic(`${service.uuid}-${char.uuid}`)}
                                    placeholder={t('details.writePlaceholder')}
                                    className="flex-1 px-4 py-2 text-sm bg-slate-800/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                                  />
                                  <button
                                    onClick={() => handleWrite(service.uuid, char.uuid, writeValue)}
                                    disabled={char.isWriting || !writeValue.trim()}
                                    className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all duration-200 shadow-lg ${
                                      char.isWriting || !writeValue.trim()
                                        ? 'bg-slate-600 text-slate-300 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5'
                                    }`}
                                  >
                                    {char.isWriting ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Upload className="w-4 h-4" />
                                    )}
                                    <span>{char.isWriting ? t('details.writing') : t('details.write')}</span>
                                  </button>
                                </div>
                              )}

                {char.properties.includes('Notify') && (
                                <button
                                  onClick={() => handleNotify(service.uuid, char.uuid)}
                                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all duration-200 shadow-lg ${
                                    char.isNotifying 
                                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-500/25 hover:shadow-xl hover:-translate-y-0.5' 
                                      : 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white shadow-yellow-500/25 hover:shadow-xl hover:-translate-y-0.5'
                                  }`}
                                >
                                  {char.isNotifying ? (
                                    <BellOff className="w-4 h-4" />
                                  ) : (
                                    <Bell className="w-4 h-4" />
                                  )}
                  <span>{char.isNotifying ? t('details.stopNotify') : t('details.subscribeNotify')}</span>
                                </button>
                              )}

                {char.properties.includes('Indicate') && (
                                <button
                                  onClick={() => handleIndicate(service.uuid, char.uuid)}
                                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium transition-all duration-200 shadow-lg ${
                                    char.isIndicating 
                                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-red-500/25 hover:shadow-xl hover:-translate-y-0.5' 
                                      : 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5'
                                  }`}
                                >
                                  {char.isIndicating ? (
                                    <AlertCircle className="w-4 h-4" />
                                  ) : (
                                    <Radio className="w-4 h-4" />
                                  )}
                  <span>{char.isIndicating ? t('details.stopIndicate') : t('details.subscribeIndicate')}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
  <div className="border-t border-slate-600/30 p-6 bg-gradient-to-r from-slate-700/30 to-slate-600/30">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-400 flex-shrink-0" />
    <span className="text-green-400 font-medium">{t('footer.connected')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-400 flex-shrink-0" />
    <span className="text-slate-300">{t('footer.services', { count: services.length })}</span>
              </div>
            </div>
            <div className="text-slate-400">
              {isStandaloneWindow && (
    <span className="text-purple-400">{t('footer.standalone')} • </span>
              )}
        <span>{t('footer.hint')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetails;