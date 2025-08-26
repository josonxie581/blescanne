import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { appWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';
import DeviceDetails from '../components/DeviceDetails';
import { BleDevice } from '../types/ble';
import BleService from '../services/bleService';
import { ThemeProvider } from '../contexts/ThemeContext';
import i18n from '../i18n';

const DeviceDetailsPage: React.FC = () => {
  const { t } = useTranslation('device');
  const [device, setDevice] = useState<BleDevice | null>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // 从URL参数获取设备数据
    const loadDeviceData = () => {
      try {
        const deviceDataParam = searchParams.get('data');
        const lngParam = searchParams.get('lng');
        if (deviceDataParam) {
          const deviceData = JSON.parse(decodeURIComponent(deviceDataParam)) as BleDevice;
          console.log('Loaded device data from URL:', deviceData);
          setDevice(deviceData);
        } else {
          console.error('No device data found in URL parameters');
        }
        if (lngParam) {
          // 初始化时根据 URL 指定语言
          i18n.changeLanguage(lngParam);
        }
      } catch (error) {
        console.error('Failed to parse device data from URL:', error);
      }
    };

    loadDeviceData();
  }, [searchParams]);

  useEffect(() => {
    // 监听主窗口语言变化事件，实现跨窗口同步
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await listen('i18n-language-changed', (event: any) => {
          const lng = event?.payload?.lng as string | undefined;
          if (lng) {
            i18n.changeLanguage(lng);
          }
        });
      } catch (e) {
        console.warn('Failed to listen language change event in device window:', e);
      }
    })();
    return () => {
      try { unlisten && unlisten(); } catch {}
    };
  }, []);

  const handleClose = async () => {
    await appWindow.close();
  };

  const handleDisconnect = async (deviceId: string) => {
    try {
      await BleService.disconnectDevice(deviceId);
    } catch (e) {
      console.error('Failed to disconnect device from standalone window:', e);
    } finally {
      // 独立窗口断开后直接关闭窗口，避免误解仍在连接中
      try {
        // 给系统一点时间处理断开，避免偶发资源未释放
        await new Promise((r) => setTimeout(r, 200));
        await appWindow.close();
      } catch {}
    }
  };

  if (!device) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center transition-colors">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{t('details.loading')}</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
              {t('details.loadingHint')}
            </p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
        <DeviceDetails
          device={device}
          isVisible={true}
    onClose={handleClose}
    onDisconnect={handleDisconnect}
          isStandaloneWindow={true}
        />
      </div>
    </ThemeProvider>
  );
};

export default DeviceDetailsPage;