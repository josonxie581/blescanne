import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeSwitcher from './components/ThemeSwitcher';
import { UnlistenFn } from '@tauri-apps/api/event';
import { BleAdapter, BleDevice, ScanStatus } from './types/ble';
import BleService from './services/bleService';
import ScanControls from './components/ScanControls';
import AdapterInfo from './components/AdapterInfo';
import DeviceCard from './components/DeviceCard';
import ScanFilter, { FilterOptions } from './components/ScanFilter';
import DeviceDetails from './components/DeviceDetails';
import WindowService from './services/windowService';

function App() {
  const { t } = useTranslation(['common', 'home']);
  const [adapters, setAdapters] = useState<BleAdapter[]>([]);
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [scanStatus, setScanStatus] = useState<ScanStatus>(ScanStatus.Idle);
  const [adaptersLoading, setAdaptersLoading] = useState(true);
  const [connectingDevices, setConnectingDevices] = useState<Set<string>>(new Set());
  const [scanDurationSecs, setScanDurationSecs] = useState<number>(10);
  const [continuous, setContinuous] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterOptions>({
    name: '',
    minRssi: -100,
    maxRssi: 0,
    macAddress: '',
    connectable: 'all',
  });
  const [selectedDevice, setSelectedDevice] = useState<BleDevice | null>(null);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  // 前端并发保护：防止同一设备在短时间内重复触发连接/断开
  const inFlightRef = useRef<Set<string>>(new Set());
  // 扫描期稳定顺序：记录设备首次出现的顺序，避免实时更新导致卡片跳动
  const firstSeenOrderRef = useRef<Map<string, number>>(new Map());
  const firstSeenCounterRef = useRef<number>(0);
  // 节流刷新：缓冲设备更新，定期合并，降低 RSSI 刷新频率
  const bufferedDevicesRef = useRef<Map<string, BleDevice>>(new Map());
  const flushIntervalRef = useRef<number | null>(null);
  const FLUSH_INTERVAL_MS = 1000; // 可根据体验调整 500~1000ms

  // 初始化适配器
  useEffect(() => {
    const initAdapters = async () => {
      try {
        const adapters = await BleService.getAdapters();
        setAdapters(adapters);
      } catch (error) {
        console.error('Failed to get adapters:', error);
        setAdapters([]);
      } finally {
        setAdaptersLoading(false);
      }
    };

    initAdapters();
    // 恢复本地存储的扫描设置
    try {
      const rawDur = localStorage.getItem('ble-scan-duration-secs');
      if (rawDur != null) {
        const v = Math.max(1, Math.min(180, parseInt(rawDur, 10)));
        if (!Number.isNaN(v)) setScanDurationSecs(v);
      }
      const rawCont = localStorage.getItem('ble-scan-continuous');
      if (rawCont != null) setContinuous(rawCont === '1');
    } catch {}
  }, []);

  // 将扫描设置写入本地存储
  useEffect(() => {
    try {
      localStorage.setItem('ble-scan-duration-secs', String(scanDurationSecs));
    } catch {}
  }, [scanDurationSecs]);
  useEffect(() => {
    try {
      localStorage.setItem('ble-scan-continuous', continuous ? '1' : '0');
    } catch {}
  }, [continuous]);

  // 设置事件监听器
  useEffect(() => {
    let deviceDiscoveredUnlisten: UnlistenFn;
  let scanCompletedUnlisten: UnlistenFn;
    let scanErrorUnlisten: UnlistenFn;
  let connChangedUnlisten: UnlistenFn;

    const setupEventListeners = async () => {
      // 启动定时刷新，将缓冲的设备更新批量合并到状态
      if (flushIntervalRef.current == null) {
        flushIntervalRef.current = window.setInterval(() => {
          if (bufferedDevicesRef.current.size === 0) return;
          const batch = Array.from(bufferedDevicesRef.current.values());
          bufferedDevicesRef.current.clear();
          setDevices((prevDevices) => {
            const map = new Map(prevDevices.map(d => [d.identifier, { ...d }]));
            for (const dev of batch) {
              if (!firstSeenOrderRef.current.has(dev.identifier)) {
                firstSeenOrderRef.current.set(dev.identifier, firstSeenCounterRef.current++);
              }
              const existing = map.get(dev.identifier);
              if (existing) {
                // 仅更新 RSSI，其他字段保持不变，避免卡片重排/抖动
                existing.rssi = dev.rssi;
                // 若初次为空而新数据有值，则一次性补齐，避免“很多时候不显示”
                const existedManuEmpty = !existing.manufacturer_data || Object.keys(existing.manufacturer_data).length === 0;
                const newManuHas = dev.manufacturer_data && Object.keys(dev.manufacturer_data).length > 0;
                if (existedManuEmpty && newManuHas) {
                  existing.manufacturer_data = dev.manufacturer_data;
                }
                const existedSvcEmpty = !existing.services || existing.services.length === 0;
                const newSvcHas = dev.services && dev.services.length > 0;
                if (existedSvcEmpty && newSvcHas) {
                  existing.services = dev.services;
                }
              } else {
                map.set(dev.identifier, dev);
              }
            }
            return Array.from(map.values());
          });
        }, FLUSH_INTERVAL_MS);
      }
      // 监听设备发现事件
      deviceDiscoveredUnlisten = await BleService.onDeviceDiscovered((device) => {
        // 缓存最新一条更新，定时器会批量合并
        bufferedDevicesRef.current.set(device.identifier, device);
      });

      // 监听扫描完成事件
      scanCompletedUnlisten = await BleService.onScanCompleted(() => {
        setScanStatus(ScanStatus.Completed);
        setTimeout(() => {
          setScanStatus(ScanStatus.Idle);
        }, 2000);
      });

      // 监听扫描错误事件
      scanErrorUnlisten = await BleService.onScanError((error) => {
        console.error('扫描错误:', error);
        setScanStatus(ScanStatus.Idle);
        // 可以在这里显示错误通知给用户
        alert(`扫描错误: ${error}`);
      });

      // 监听跨窗口连接状态变化，立即同步设备状态
      connChangedUnlisten = await BleService.onDeviceConnectionChanged(({ deviceId, paired }) => {
        setDevices((prev) => prev.map(d => d.identifier === deviceId ? { ...d, paired } : d));
      });
    };

    setupEventListeners();

    // 清理事件监听器
    return () => {
      if (deviceDiscoveredUnlisten) {
        deviceDiscoveredUnlisten();
      }
      if (scanCompletedUnlisten) {
        scanCompletedUnlisten();
      }
      if (scanErrorUnlisten) {
        scanErrorUnlisten();
      }
      if (connChangedUnlisten) {
        connChangedUnlisten();
      }
      if (flushIntervalRef.current != null) {
        window.clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }
    };
  }, []);

  // 禁用主窗口右键菜单（仅当前窗口生效）
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
    };
    document.addEventListener('contextmenu', handler);
    return () => {
      document.removeEventListener('contextmenu', handler);
    };
  }, []);

  // 开始扫描
  const handleStartScan = useCallback(async () => {
    try {
      setScanStatus(ScanStatus.Scanning);
      // 不重置首次出现顺序和设备缓存，保持之前扫描的数据
    await BleService.startScan(continuous ? 0 : scanDurationSecs);
    } catch (error) {
      console.error('Failed to start scan:', error);
      setScanStatus(ScanStatus.Idle);
    }
  }, [scanDurationSecs, continuous]);

  // 停止扫描
  const handleStopScan = useCallback(async () => {
    try {
      await BleService.stopScan();
      setScanStatus(ScanStatus.Idle);
    } catch (error) {
      console.error('Failed to stop scan:', error);
    }
  }, []);

  // 清空设备列表
  const handleClearDevices = useCallback(() => {
    setDevices([]);
  firstSeenOrderRef.current.clear();
  firstSeenCounterRef.current = 0;
  bufferedDevicesRef.current.clear();
  }, []);

  // 连接设备
  const handleConnectDevice = useCallback(async (deviceId: string) => {
    console.log('===== handleConnectDevice 被调用 =====');
    console.log('设备ID:', deviceId);
    
    try {
      // 并发保护：已在进行中的请求直接忽略
      if (inFlightRef.current.has(deviceId)) {
        console.warn(`连接请求被忽略（进行中）：${deviceId}`);
        return;
      }
      inFlightRef.current.add(deviceId);
      setConnectingDevices((prev) => new Set(prev).add(deviceId));
      
      console.log(`开始连接设备: ${deviceId}`);
      await BleService.connectDevice(deviceId);
      
      // 连接成功后，验证连接状态
      try {
        const isConnected = await BleService.checkDeviceConnection(deviceId);
        console.log(`设备 ${deviceId} 连接状态验证: ${isConnected}`);
        
        // 更新设备状态
        setDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.identifier === deviceId
              ? { ...device, paired: isConnected }
              : device
          )
        );

        if (isConnected) {
          // 打开独立窗口（系统标题栏，可拖动），不再显示页面内弹窗
          const connectedDevice = devices.find(device => device.identifier === deviceId);
          if (connectedDevice) {
            try {
              await WindowService.openDeviceWindow({ ...connectedDevice, paired: true });
            } catch (error) {
              console.error('Failed to open device window:', error);
            }
          }
          alert(`设备连接成功: ${deviceId}`);
        } else {
          alert(`设备连接失败: 连接状态验证失败`);
        }
      } catch (verificationError) {
        console.warn('连接状态验证失败:', verificationError);
        // 即使验证失败，也更新状态为已连接，因为连接命令执行成功
        setDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.identifier === deviceId
              ? { ...device, paired: true }
              : device
          )
        );
        // 尝试直接打开独立窗口，避免页面内弹窗
        const connectedDevice = devices.find(device => device.identifier === deviceId);
        if (connectedDevice) {
          try {
            await WindowService.openDeviceWindow({ ...connectedDevice, paired: true });
          } catch (error) {
            console.error('Failed to open device window:', error);
          }
        }
        // 静默处理：不再弹出验证失败提示，避免干扰用户
      }
      
    } catch (error) {
      console.error('Failed to connect device:', error);
      alert(`连接设备失败: ${error}`);
    } finally {
      setConnectingDevices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
    inFlightRef.current.delete(deviceId);
    }
  }, [devices]);

  // 断开设备连接
  const handleDisconnectDevice = useCallback(async (deviceId: string) => {
    try {
      // 并发保护：已在进行中的请求直接忽略
      if (inFlightRef.current.has(deviceId)) {
        console.warn(`断开请求被忽略（进行中）：${deviceId}`);
        return;
      }
      inFlightRef.current.add(deviceId);
      setConnectingDevices((prev) => new Set(prev).add(deviceId));
      
      console.log(`开始断开设备: ${deviceId}`);
      await BleService.disconnectDevice(deviceId);
      
      // 断开成功后，验证连接状态
      try {
        const isConnected = await BleService.checkDeviceConnection(deviceId);
        console.log(`设备 ${deviceId} 断开后连接状态验证: ${isConnected}`);
        
        // 更新设备状态
        setDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.identifier === deviceId
              ? { ...device, paired: isConnected }
              : device
          )
        );

        if (!isConnected) {
          alert(`设备断开成功: ${deviceId}`);
        } else {
          alert(`设备断开失败: 连接状态验证显示仍然连接`);
        }
      } catch (verificationError) {
        console.warn('断开状态验证失败:', verificationError);
        // 即使验证失败，也更新状态为断开，因为断开命令执行成功
        setDevices((prevDevices) =>
          prevDevices.map((device) =>
            device.identifier === deviceId
              ? { ...device, paired: false }
              : device
          )
        );
  // 静默处理：不再弹出提示，避免干扰用户
      }
      
    } catch (error) {
      console.error('Failed to disconnect device:', error);
      alert(`断开设备失败: ${error}`);
    } finally {
      setConnectingDevices((prev) => {
        const newSet = new Set(prev);
        newSet.delete(deviceId);
        return newSet;
      });
  inFlightRef.current.delete(deviceId);
    }
  }, []);

  // 过滤设备
  const filteredDevices = devices.filter((device) => {
    // 名称过滤
    if (filters.name && !device.name?.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }

    // MAC地址过滤
    if (filters.macAddress && !device.address.toLowerCase().includes(filters.macAddress.toLowerCase())) {
      return false;
    }

    // RSSI过滤
    if (device.rssi !== null && device.rssi !== undefined) {
      if (device.rssi < filters.minRssi || device.rssi > filters.maxRssi) {
        return false;
      }
    }

    // 可连接性过滤
    if (filters.connectable === 'connectable' && !device.connectable) {
      return false;
    }
    if (filters.connectable === 'non-connectable' && device.connectable) {
      return false;
    }

    return true;
  });

  // 按 RSSI 值排序：
  // - RSSI 值越大（越接近0）信号越强，排在前面
  // - 没有 RSSI 值的设备排在后面
  // - RSSI 相同时，按设备名称排序
  const sortedFilteredDevices = [...filteredDevices].sort((a, b) => {
    // 首先按 RSSI 值排序（从高到低）
    const aRssi = a.rssi ?? -Number.MAX_SAFE_INTEGER; // 没有 RSSI 的设备排在最后
    const bRssi = b.rssi ?? -Number.MAX_SAFE_INTEGER;
    
    if (aRssi !== bRssi) {
      return bRssi - aRssi; // RSSI 值从高到低排序
    }
    
    // RSSI 相同时，按设备名称排序
    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    if (aName && bName) {
      const cmp = aName.localeCompare(bName);
      if (cmp !== 0) return cmp;
    } else if (aName && !bName) {
      return -1; // 有名的在前
    } else if (!aName && bName) {
      return 1; // 未命名靠后
    }
    
    // 最后按 identifier 排序作为兜底
    return (a.identifier || '').localeCompare(b.identifier || '');
  });

  const hasValidAdapter = adapters.some((adapter) => adapter.powered);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-slate-900 relative overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100/20 via-transparent to-blue-100/20 dark:from-purple-900/20 dark:to-blue-900/20"></div>
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300/30 dark:bg-purple-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300/30 dark:bg-yellow-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300/30 dark:bg-pink-600/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      
      <div className="relative z-10 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 第一行：标题（居中，带关于按钮） */}
        <section className="flex justify-center mb-6">
          <div className="w-full max-w-3xl flex items-center justify-center gap-4 relative">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 via-gray-900 to-black dark:from-white dark:via-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                  {t('app.title', { ns: 'common' })}
                </h1>
                <Link
                  to="/about"
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200/60 hover:bg-gray-300/80 dark:bg-gray-700/60 dark:hover:bg-gray-600/80 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-all duration-200 hover:scale-110"
                  title={t('about', { ns: 'common' })}
                >
                  <Info className="w-3 h-3" />
                </Link>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Professional BLE Scanner & Device Manager</p>
            </div>
          </div>
        </section>
        
        {/* 第二行：主题和语言切换器（居中等宽） */}
        <section className="flex justify-center mb-6">
          <div className="w-full max-w-3xl flex items-center justify-center gap-3">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </section>

        {/* 第三行：适配器信息（居中等宽） */}
        <section className="flex justify-center mb-6">
          <div className="w-full max-w-2xs">
            <AdapterInfo adapters={adapters} isLoading={adaptersLoading} />
          </div>
        </section>

        {/* 第四行：扫描过滤（居中等宽） */}
        <section className="flex justify-center mb-6">
          <div className="w-full max-w-2xs">
            <ScanFilter
              filters={filters}
              onFiltersChange={setFilters}
              deviceCount={devices.length}
              filteredCount={filteredDevices.length}
            />
          </div>
        </section>

        {/* 第五行：扫描控制（居中等宽） */}
        {hasValidAdapter && (
          <section className="flex justify-center mb-6">
            <div className="w-full max-w-2xs">
              <ScanControls
                scanStatus={scanStatus}
                onStartScan={handleStartScan}
                onStopScan={handleStopScan}
                onClearDevices={handleClearDevices}
                deviceCount={devices.length}
                scanDurationSecs={scanDurationSecs}
                onScanDurationChange={setScanDurationSecs}
                continuous={continuous}
                onContinuousChange={setContinuous}
              />
            </div>
          </section>
        )}

  {/* 设备列表 */}
        {devices.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t('found', { ns: 'home', count: devices.length })}
            </h2>
            
            {/* 过滤后的设备列表 */}
      {sortedFilteredDevices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedFilteredDevices.map((device) => (
                  <DeviceCard
                    key={device.identifier}
                    device={device}
                    onConnect={handleConnectDevice}
                    onDisconnect={handleDisconnectDevice}
                    isConnecting={connectingDevices.has(device.identifier)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg shadow-gray-200/50 dark:shadow-none">
                <div className="text-gray-700 dark:text-gray-400 text-lg font-medium">
                  {t('emptyFiltered', { ns: 'home' })}
                </div>
                <div className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                  {t('emptyHint', { ns: 'home' })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* 空状态 */}
        {!hasValidAdapter && !adaptersLoading && (
          <div className="text-center py-12">
            <div className="text-gray-600 dark:text-gray-400 text-lg">
              {t('enableAdapter', { ns: 'home' })}
            </div>
          </div>
        )}

        {devices.length === 0 && hasValidAdapter && scanStatus === ScanStatus.Idle && (
          <div className="text-center py-12">
            <div className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              {t('startHint', { ns: 'home' })}
            </div>
          </div>
        )}

        {/* 设备详细信息弹窗 */}
        {selectedDevice && (
          <DeviceDetails
            device={selectedDevice}
            isVisible={showDeviceDetails}
            onClose={() => {
              setShowDeviceDetails(false);
              setSelectedDevice(null);
            }}
            onDisconnect={handleDisconnectDevice}
          />
        )}
      </div>
      </div>
    </div>
  );
}

export default App;