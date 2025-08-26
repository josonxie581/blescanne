import React from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, RotateCcw } from 'lucide-react';
import { ScanStatus } from '../types/ble';

interface ScanControlsProps {
  scanStatus: ScanStatus;
  onStartScan: () => void;
  onStopScan: () => void;
  onClearDevices: () => void;
  deviceCount: number;
  scanDurationSecs: number;
  onScanDurationChange: (secs: number) => void;
  continuous: boolean;
  onContinuousChange: (v: boolean) => void;
}

const ScanControls: React.FC<ScanControlsProps> = ({
  scanStatus,
  onStartScan,
  onStopScan,
  onClearDevices,
  deviceCount,
  scanDurationSecs,
  onScanDurationChange,
  continuous,
  onContinuousChange,
}) => {
  const { t } = useTranslation('home');
  const isScanning = scanStatus === ScanStatus.Scanning;

  return (
    <div className="relative group">
      {/* 背景光晕 */}
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition duration-500"></div>
      
      <div className="relative bg-white/60 dark:bg-gray-800/80 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-2xl p-7 shadow-2xl shadow-cyan-500/10 dark:shadow-black/20 transition-all duration-500 hover:shadow-3xl hover:shadow-cyan-500/20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-transparent bg-gradient-to-r from-gray-800 via-cyan-700 to-blue-800 dark:from-white dark:via-cyan-200 dark:to-blue-200 bg-clip-text text-xl font-bold transition-all duration-300">{t('scan.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 transition-colors">
            {isScanning ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500 dark:border-blue-400 mr-2 transition-colors"></div>
                {t('scan.scanning')}
              </span>
            ) : (
              t('scan.foundCount', { count: deviceCount })
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 扫描时长设置 */}
          <div className="hidden sm:flex items-center gap-2 bg-white/60 dark:bg-gray-700/60 border border-gray-200/60 dark:border-gray-600/60 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">{t('scan.duration') || 'Duration'}</span>
            <input
              type="range"
              min={1}
              max={180}
              step={1}
              value={scanDurationSecs}
              onChange={(e) => onScanDurationChange(Number(e.target.value))}
              disabled={continuous}
              className="w-28 accent-blue-600"
            />
            <input
              type="number"
              min={1}
              max={180}
              value={scanDurationSecs}
              onChange={(e) => onScanDurationChange(Math.max(1, Math.min(180, Number(e.target.value) || 0)))}
              disabled={continuous}
              className="w-14 text-sm px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white"
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">{t('scan.unitSeconds') || 's'}</span>
          </div>

          {/* 移动端仅数字输入 */}
          <div className="sm:hidden flex items-center gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-300">{t('scan.duration') || 'Duration'}</span>
            <input
              type="number"
              min={1}
              max={180}
              value={scanDurationSecs}
              onChange={(e) => onScanDurationChange(Math.max(1, Math.min(180, Number(e.target.value) || 0)))}
              disabled={continuous}
              className="w-16 text-sm px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-800 dark:text-white"
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">{t('scan.unitSeconds') || 's'}</span>
          </div>

          {/* 连续扫描开关 */}
          <label className="flex items-center gap-2 bg-white/60 dark:bg-gray-700/60 border border-gray-200/60 dark:border-gray-600/60 rounded-xl px-3 py-2 shadow-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={continuous}
              onChange={(e) => onContinuousChange(e.target.checked)}
              className="accent-blue-600"
            />
            <span className="text-xs text-gray-700 dark:text-gray-200 whitespace-nowrap">{t('scan.continuous') || 'Continuous'}</span>
          </label>

          <div className="flex space-x-2">
          <button
            onClick={onClearDevices}
            disabled={isScanning}
            className="px-5 py-3 bg-gradient-to-r from-gray-100/80 to-slate-100/80 dark:from-gray-600/80 dark:to-gray-700/80 hover:from-gray-200/90 hover:to-slate-200/90 dark:hover:from-gray-500/90 dark:hover:to-gray-600/90 text-gray-800 dark:text-white rounded-xl shadow-lg hover:shadow-xl backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 hover:scale-105 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('scan.clear')}</span>
          </button>

          {isScanning ? (
            <button
              onClick={onStopScan}
              className="group relative px-7 py-3 bg-gradient-to-r from-red-500/90 to-rose-600/90 hover:from-red-400 hover:to-rose-500 text-white rounded-xl shadow-2xl shadow-red-500/30 backdrop-blur-sm border border-red-400/50 transition-all duration-500 flex items-center space-x-2 hover:scale-105 active:scale-95 overflow-hidden"
            >
              {/* 动态背景效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <Square className="relative w-4 h-4" />
              <span className="relative">{t('scan.stop')}</span>
            </button>
          ) : (
            <button
              onClick={onStartScan}
              className="group relative px-7 py-3 bg-gradient-to-r from-blue-500/90 to-indigo-600/90 hover:from-blue-400 hover:to-indigo-500 text-white rounded-xl shadow-2xl shadow-blue-500/30 backdrop-blur-sm border border-blue-400/50 transition-all duration-500 flex items-center space-x-2 hover:scale-105 active:scale-95 overflow-hidden"
            >
              {/* 动态背景效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              <Play className="relative w-4 h-4" />
              <span className="relative">{t('scan.start')}</span>
            </button>
          )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default ScanControls;