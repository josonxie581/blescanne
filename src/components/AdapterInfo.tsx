import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bluetooth, Power, Wifi } from 'lucide-react';
import { BleAdapter } from '../types/ble';

interface AdapterInfoProps {
  adapters: BleAdapter[];
  isLoading: boolean;
}

const AdapterInfo: React.FC<AdapterInfoProps> = ({ adapters, isLoading }) => {
  const { t } = useTranslation('home');
  if (isLoading) {
    return (
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition duration-300"></div>
        <div className="relative bg-white/70 dark:bg-gray-800/80 backdrop-blur-lg border border-white/30 dark:border-gray-700/50 rounded-xl p-5 shadow-xl shadow-blue-500/10 dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 dark:border-blue-400 transition-colors"></div>
          <span className="text-gray-600 dark:text-gray-400 transition-colors">{t('adapter.checking', '正在检测蓝牙适配器...')}</span>
        </div>
        </div>
      </div>
    );
  }

  if (adapters.length === 0) {
    return (
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/20 to-rose-500/20 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition duration-300"></div>
        <div className="relative bg-red-50/70 dark:bg-gray-800/80 backdrop-blur-lg border border-red-300/30 dark:border-red-700/50 rounded-xl p-5 shadow-xl shadow-red-500/10 dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/20">
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 transition-colors">
          <Bluetooth className="w-5 h-5" />
          <span>{t('adapter.none', '未检测到蓝牙适配器')}</span>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mt-2 transition-colors">
          {t('adapter.hint', '请确保您的设备支持蓝牙并已启用。')}
        </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {adapters.map((adapter) => (
        <div
          key={adapter.identifier}
          className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-xl blur-sm opacity-50 group-hover:opacity-75 transition duration-300"></div>
        <div className="relative bg-emerald-50/70 dark:bg-gray-800/80 backdrop-blur-lg border border-emerald-300/30 dark:border-gray-700/50 rounded-xl p-5 shadow-xl shadow-emerald-500/10 dark:shadow-black/20 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-blue-500 dark:text-blue-400 transition-colors">
                <Bluetooth className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-gray-900 dark:text-white font-medium transition-colors">BLE</h3>
                <p className="text-gray-600 dark:text-gray-500 text-xs transition-colors">ID: {adapter.identifier}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm font-mono transition-colors">{adapter.address}</p>

              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-1 transition-colors ${
                adapter.powered ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                <Power className="w-4 h-4" />
                <span className="text-sm">
                  {adapter.powered ? t('adapter.enabled', '已启用') : t('adapter.disabled', '已禁用')}
                </span>
              </div>
              
              {adapter.powered && (
                <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 transition-colors">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">{t('adapter.ready', '就绪')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      ))}
    </div>
  );
};

export default AdapterInfo;