import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BleDevice } from '../types/ble';
import { 
  Smartphone, 
  ChevronDown, 
  ChevronUp, 
  Binary, 
  Copy, 
  Link2, 
  Bluetooth, 
  Zap, 
  Info,
  Radio,
  Settings,
  Check
} from 'lucide-react';
import { formatMacAddress } from '../utils/bleUtils';
import { formatHexData } from '../utils/advDataParser';

interface DeviceCardProps {
  device: BleDevice;
  onConnect: (deviceId: string) => void;
  onDisconnect: (deviceId: string) => void;
  isConnecting?: boolean;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onConnect,
  onDisconnect,
  isConnecting = false,
}) => {
  const { t } = useTranslation('device');
  // 复制反馈状态
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // 设备显示名称（用于限制长度与 tooltip 显示）
  const fullName: string = (device.name?.trim() || device.identifier || t('unknownDevice')) as string;

  // 获取设备图标
  const getDeviceIcon = () => {
    const deviceName = device.name?.toLowerCase() || '';
    if (deviceName.includes('iphone') || deviceName.includes('phone')) {
      return <Smartphone className="w-7 h-7 text-blue-400" />;
    }
    if (deviceName.includes('watch') || deviceName.includes('band')) {
      return <Settings className="w-7 h-7 text-green-400" />;
    }
    if (deviceName.includes('headphone') || deviceName.includes('airpods') || deviceName.includes('buds')) {
      return <Radio className="w-7 h-7 text-purple-400" />;
    }
    return <Bluetooth className="w-7 h-7 text-blue-400" />;
  };

  // 获取信号强度显示（带进度条效果）
  const getSignalDisplay = () => {
    if (device.rssi === null || device.rssi === undefined) return null;
    
    const strength = device.rssi;
    let color = 'text-red-400';
    let fillColor = 'bg-red-400';
    let signalBars = 1;
    
    if (strength >= -50) {
      color = 'text-green-400';
      fillColor = 'bg-green-400';
      signalBars = 4;
    } else if (strength >= -60) {
      color = 'text-green-400';
      fillColor = 'bg-green-400';
      signalBars = 3;
    } else if (strength >= -70) {
      color = 'text-yellow-400';
      fillColor = 'bg-yellow-400';
      signalBars = 2;
    }
    
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <span className={`text-xs font-semibold ${color}`}>
            {strength} dBm
          </span>
        </div>
        <div className="flex items-end gap-0.5">
          {[1, 2, 3, 4].map((bar) => (
            <div
              key={bar}
              className={`w-1 rounded-sm ${
                bar <= signalBars ? fillColor : 'bg-gray-600'
              }`}
              style={{ height: `${bar * 3 + 2}px` }}
            />
          ))}
        </div>
      </div>
    );
  };

  // 获取原始广播数据（仅16进制显示）
  const getRawAdvData = () => {
    return device.raw_adv_data || null;
  };

  const rawAdvData = getRawAdvData();
  
  
  // 展开状态管理 - 只保留原始数据展开状态
  const [rawDataExpanded, setRawDataExpanded] = useState(false);

  // 复制工具：带有反馈效果
  const copyText = async (text: string, field?: string) => {
    try {
      if (navigator && 'clipboard' in navigator && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const mod = await import('@tauri-apps/api/clipboard');
        await mod.writeText(text);
      }
      
      // 显示复制成功反馈
      if (field) {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      }
    } catch (e) {
      console.error('复制失败:', e);
    }
  };

  // 复制按钮组件
  const CopyButton = ({ text, field, className = "", children, variant = 'solid', iconOnly = false, title }: {
    text: string;
    field: string;
    className?: string;
    variant?: 'solid' | 'ghost';
    iconOnly?: boolean;
    title?: string;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => copyText(text, field)}
      title={title}
      aria-label={title || (typeof children === 'string' ? (children as string) : undefined)}
      className={`inline-flex items-center ${iconOnly ? 'justify-center' : ''} gap-1 transition-all duration-200 ${
        variant === 'ghost'
          ? (copiedField === field
              ? 'bg-green-500 text-white hover:bg-green-500'
              : 'bg-transparent hover:bg-gray-200/60 dark:hover:bg-slate-600/60 text-gray-500 dark:text-gray-200 ring-1 ring-transparent hover:ring-gray-300/70')
          : (copiedField === field
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-white shadow-md hover:shadow-lg')
      } ${className}`}
    >
      {copiedField === field ? (
        iconOnly ? <Check className="w-3.5 h-3.5" /> : <>
          <Check className="w-3.5 h-3.5" /> {t('copied')}
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          {iconOnly ? null : children}
        </>
      )}
    </button>
  );

  return (
    <div className="relative group max-w-lg">
      {/* 背景光晕效果 */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
      
      <div className="relative bg-white/70 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-2xl p-7 shadow-2xl shadow-black/10 dark:shadow-black/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl hover:shadow-purple-500/20">
      {/* 头部 - 设备名称和信号 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative p-4 bg-gradient-to-br from-indigo-500/10 via-blue-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:via-blue-500/20 dark:to-purple-500/20 rounded-2xl border border-indigo-200/30 dark:border-indigo-400/20 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:rotate-3">
            {getDeviceIcon()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide font-medium">{t('header.name')}</span>
              {device.connectable && (
                <span className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-1 rounded-full border border-emerald-300/50 dark:border-emerald-500/30 backdrop-blur-sm shadow-sm transition-all duration-300 hover:scale-105">
                  <span className="inline-flex items-center gap-1">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    {t('header.connectable')}
                  </span>
                </span>
              )}
            </div>
            <div
              className="text-transparent bg-gradient-to-r from-gray-800 via-gray-900 to-black dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text font-bold text-lg sm:text-xl leading-tight transition-all duration-300 max-w-[220px] sm:max-w-[280px] md:max-w-[320px] whitespace-normal"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}
              title={fullName}
              aria-label={fullName}
              dir="auto"
            >
              {fullName}
            </div>
            <div className="text-gray-600 dark:text-gray-400 text-sm mt-1 transition-colors">
        {t('id')}: {device.identifier?.substring(0, 8) || 'N/A'}...
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {getSignalDisplay()}
        </div>
      </div>

      {/* 设备基本信息卡片 */}
      <div className="bg-gradient-to-r from-slate-50/60 via-white/40 to-blue-50/60 dark:from-slate-800/40 dark:via-slate-700/40 dark:to-slate-600/40 rounded-2xl p-5 mb-6 border border-white/50 dark:border-slate-600/30 shadow-xl backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:bg-gradient-to-r hover:from-slate-50/80 hover:via-white/60 hover:to-blue-50/80 dark:hover:from-slate-800/60 dark:hover:via-slate-700/60 dark:hover:to-slate-600/60">
        <div className="grid grid-cols-1 gap-3">
          {/* 地址 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-400" />
              <span className="text-gray-600 dark:text-gray-400 text-sm transition-colors">{t('mac')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-800 dark:text-white font-mono text-sm bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-slate-700/80 dark:to-slate-600/80 px-4 py-2 rounded-xl border border-gray-200/60 dark:border-slate-500/40 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:scale-105">
                {formatMacAddress(device.address)}
              </span>
              <CopyButton 
                text={formatMacAddress(device.address)} 
                field="address" 
                variant="ghost"
                iconOnly
                title={t('copy')}
                className="p-1.5 rounded-full -ml-2"
              >
                {t('copy')}
              </CopyButton>
            </div>
          </div>
          
          {/* TX Power */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-gray-600 dark:text-gray-400 text-sm transition-colors">{t('txPower')}</span>
            </div>
            <span className="text-gray-900 dark:text-white text-sm transition-colors">
              {(device.tx_power !== undefined && device.tx_power !== null && device.tx_power !== -32768 && device.tx_power > -127) 
                ? `${device.tx_power} dBm` 
                : t('noData')}
            </span>
          </div>

          {/* 连接状态 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              <span className="text-gray-600 dark:text-gray-400 text-sm transition-colors">{t('connection')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                device.paired ? 'bg-green-400' : 'bg-gray-500'
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


      {/* 原始广播数据 (仅16进制显示) */}
      {rawAdvData && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Binary className="w-5 h-5 text-indigo-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium transition-colors">{t('raw.title')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CopyButton
                text={rawAdvData}
                field="raw-data-all"
                className="text-xs px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {t('raw.raw')}
              </CopyButton>
              <button
                onClick={() => setRawDataExpanded(!rawDataExpanded)}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-600 dark:to-indigo-700 text-white text-xs px-3 py-1.5 rounded-lg hover:from-indigo-400 hover:to-indigo-500 dark:hover:from-indigo-500 dark:hover:to-indigo-600 flex items-center gap-1 transition-all duration-200 shadow"
              >
                {rawDataExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {t('raw.details')}
              </button>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700/40 dark:to-slate-600/40 rounded-xl p-4 border border-gray-200 dark:border-slate-600/30 transition-colors">
            {/* 原始数据十六进制显示 */}
            <div className="mb-4">
              <h4 className="text-gray-700 dark:text-gray-300 font-medium mb-2 flex items-center gap-2">
                <Binary className="w-4 h-4" />
                {t('raw.hexData')}
              </h4>
              <div className="bg-gray-100 dark:bg-slate-900/50 rounded-lg p-3 font-mono text-xs text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-slate-600/20 overflow-x-auto">
                <pre className="whitespace-pre-wrap">
                  {rawDataExpanded ? formatHexData(rawAdvData) : rawAdvData}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 连接按钮 */}
      <button
        onClick={() => {
          if (device.paired) {
            onDisconnect(device.identifier);
          } else {
            onConnect(device.identifier);
          }
        }}
        disabled={isConnecting || !device.connectable}
        className={`group relative w-full py-5 px-7 rounded-2xl font-bold text-lg transition-all duration-500 overflow-hidden ${
          isConnecting
            ? 'bg-gradient-to-r from-gray-300/80 to-gray-400/80 text-gray-600 cursor-not-allowed backdrop-blur-sm border border-gray-300/50'
            : !device.connectable
            ? 'bg-gradient-to-r from-gray-200/60 to-gray-300/60 dark:from-gray-700/60 dark:to-gray-600/60 text-gray-500 dark:text-gray-400 cursor-not-allowed border border-gray-300/50 dark:border-gray-600/50 backdrop-blur-sm'
            : device.paired
            ? 'bg-gradient-to-r from-red-500/90 to-rose-600/90 hover:from-red-400 hover:to-rose-500 text-white shadow-2xl shadow-red-500/30 backdrop-blur-sm border border-red-400/50'
            : 'bg-gradient-to-r from-blue-500/90 to-indigo-600/90 hover:from-blue-400 hover:to-indigo-500 text-white shadow-2xl shadow-blue-500/30 backdrop-blur-sm border border-blue-400/50'
        } ${
          !isConnecting && device.connectable ? 'hover:shadow-3xl hover:scale-105 active:scale-95' : ''
        }`}
      >
        {/* 动态背景效果 */}
        {!isConnecting && device.connectable && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        )}
        
        <div className="relative flex items-center justify-center gap-2">
          {isConnecting ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              {t('actions.processing')}
            </>
          ) : !device.connectable ? (
            <>
              <Link2 className="w-5 h-5 opacity-50" />
              {t('actions.notConnectable')}
            </>
          ) : device.paired ? (
            <>
              <Link2 className="w-5 h-5" />
              {t('actions.disconnect')}
            </>
          ) : (
            <>
              <Bluetooth className="w-5 h-5" />
              {t('actions.connect')}
            </>
          )}
        </div>
      </button>
      </div>
    </div>
  );
};

export default DeviceCard;