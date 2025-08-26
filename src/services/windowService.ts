import { WebviewWindow } from '@tauri-apps/api/window';
import { BleDevice } from '../types/ble';
import i18n from '../i18n';

class WindowService {
  private deviceWindows: Map<string, WebviewWindow> = new Map();

  // 生成智能设备名称
  private generateDeviceName(device: BleDevice): string {
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
  }

  async openDeviceWindow(device: BleDevice): Promise<void> {
    const windowLabel = `device-${device.identifier}`;
    
    // 如果缓存中已有窗口句柄，尝试聚焦；若失败则清理并继续创建
    const existingWindow = this.deviceWindows.get(device.identifier);
    if (existingWindow) {
      try {
        await existingWindow.setFocus();
        return;
      } catch (e) {
        console.warn(`Existing window focus failed for ${device.identifier}, will recreate.`, e);
        this.deviceWindows.delete(device.identifier);
      }
    }

    // 再次通过标签检查系统中是否仍有同名窗口存在，若有则复用并聚焦
    try {
      const byLabel = (WebviewWindow as any).getByLabel
        ? (WebviewWindow as any).getByLabel(windowLabel)
        : null;
      if (byLabel) {
        try {
          await byLabel.setFocus();
        } catch {}
        this.deviceWindows.set(device.identifier, byLabel);
        return;
      }
    } catch {}

    try {
  // 将设备数据编码到URL参数中，并传入当前语言
  const deviceData = encodeURIComponent(JSON.stringify(device));
  const currentLng = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
      
  // 生成智能设备名称
  const smartDeviceName = this.generateDeviceName(device);
      
      // 创建新的设备详情窗口
      const deviceWindow = new WebviewWindow(windowLabel, {
        url: `/device-details?data=${deviceData}&lng=${encodeURIComponent(currentLng)}`,
        title: `BLE设备详情 - ${smartDeviceName}`,
        width: 800,
        height: 850,
        minWidth: 800,
        minHeight: 850,
        resizable: true,
        decorations: true,
        alwaysOnTop: false,
        center: true,
        skipTaskbar: false
      });

      // 监听窗口关闭事件，确保清理缓存
      deviceWindow.once('tauri://close-requested', () => {
        console.log(`Device window close-requested for ${device.identifier}`);
        this.deviceWindows.delete(device.identifier);
      });
      deviceWindow.once('tauri://destroyed', () => {
        console.log(`Device window destroyed for ${device.identifier}`);
        this.deviceWindows.delete(device.identifier);
      });

      // 居中并聚焦，尽量确保弹窗可见
      try {
        if ((deviceWindow as any).center) {
          await (deviceWindow as any).center();
        }
      } catch {}
      try {
        await deviceWindow.setFocus();
      } catch {}

  // 保存窗口引用
  this.deviceWindows.set(device.identifier, deviceWindow);

    } catch (error) {
      console.error('Failed to create device window:', error);
      throw error;
    }
  }

  async closeDeviceWindow(deviceId: string): Promise<void> {
    const window = this.deviceWindows.get(deviceId);
    if (window) {
      await window.close();
      this.deviceWindows.delete(deviceId);
    }
  }

  async closeAllDeviceWindows(): Promise<void> {
    const promises = Array.from(this.deviceWindows.values()).map(window => window.close());
    await Promise.all(promises);
    this.deviceWindows.clear();
  }

  getOpenWindows(): string[] {
    return Array.from(this.deviceWindows.keys());
  }

  isWindowOpen(deviceId: string): boolean {
    return this.deviceWindows.has(deviceId);
  }
}

export default new WindowService();