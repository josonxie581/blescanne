import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import { BleAdapter, BleDevice } from '../types/ble';

export class BleService {
  // 获取蓝牙适配器
  static async getAdapters(): Promise<BleAdapter[]> {
    return await invoke('get_adapters');
  }

  // 获取设备的 GATT 服务与特征
  static async getDeviceServices(deviceId: string): Promise<Array<{ uuid: string; characteristics: Array<{ uuid: string; properties: string[] }> }>> {
    return await invoke('get_device_services', { deviceId });
  }

  static async readCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<string> {
    return await invoke('read_characteristic', { deviceId, serviceUuid, characteristicUuid });
  }

  static async writeCharacteristic(
    deviceId: string,
    serviceUuid: string,
    characteristicUuid: string,
    data: string,
    writeType: 'request' | 'command' = 'request'
  ): Promise<void> {
    return await invoke('write_characteristic', { deviceId, serviceUuid, characteristicUuid, data, writeType });
  }

  static async notifyCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<void> {
    return await invoke('notify_characteristic', { deviceId, serviceUuid, characteristicUuid });
  }

  static async indicateCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<void> {
    return await invoke('indicate_characteristic', { deviceId, serviceUuid, characteristicUuid });
  }

  static async unsubscribeCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<void> {
    return await invoke('unsubscribe_characteristic', { deviceId, serviceUuid, characteristicUuid });
  }

  static async getMtu(deviceId: string): Promise<number> {
    return await invoke('get_mtu', { deviceId });
  }

  static onCharacteristicValue(callback: (payload: { deviceId: string; serviceUuid: string; characteristicUuid: string; value: string; kind: 'notify' | 'indicate' }) => void) {
    return listen('characteristic-value', (event: any) => {
      callback(event.payload);
    });
  }
  // 开始扫描（可传入扫描时长，单位：秒）
  static async startScan(durationSecs?: number): Promise<void> {
    const hasValue = typeof durationSecs === 'number' && !Number.isNaN(durationSecs as number);
    if (!hasValue) {
      return await invoke('start_scan', {} as any);
    }
    const v = Math.max(0, Math.floor(durationSecs as number));
    // 同时传顶层和封装参数，确保后端任一路径都能拿到值
    return await invoke('start_scan', {
      duration_secs: v,
      args: { duration_secs: v },
    } as any);
  }

  // 停止扫描
  static async stopScan(): Promise<void> {
    return await invoke('stop_scan');
  }

  // 获取扫描到的设备
  static async getDevices(): Promise<BleDevice[]> {
    return await invoke('get_devices');
  }

  // 检查是否正在扫描
  static async isScanning(): Promise<boolean> {
    return await invoke('is_scanning');
  }

  // 连接设备
  static async connectDevice(deviceId: string): Promise<void> {
    console.log('BleService.connectDevice 被调用，设备ID:', deviceId);
    
    try {
      // 尝试使用驼峰命名的参数名
  await invoke('connect_device', { deviceId: deviceId });
  console.log('connect_device 调用成功');
  return;
    } catch (error) {
      console.error('connect_device 调用失败:', error);
      throw error;
    }
  }

  // 断开设备连接
  static async disconnectDevice(deviceId: string): Promise<void> {
    console.log('BleService.disconnectDevice 被调用，设备ID:', deviceId);
    if (!deviceId) {
      throw new Error('无效的设备ID');
    }
    try {
      await invoke('disconnect_device', { deviceId });
      console.log('disconnect_device 调用成功');
    } catch (e) {
      console.error('disconnect_device 调用失败:', e);
      throw e;
    }
  }

  // 检查设备连接状态
  static async checkDeviceConnection(deviceId: string): Promise<boolean> {
    return await invoke('check_device_connection', { deviceId: deviceId });
  }

  // 监听设备发现事件
  static onDeviceDiscovered(callback: (device: BleDevice) => void) {
    return listen<BleDevice>('device-discovered', (event) => {
      callback(event.payload);
    });
  }

  // 监听设备连接状态变化（跨窗口同步连接/断开）
  static onDeviceConnectionChanged(callback: (payload: { deviceId: string; paired: boolean }) => void) {
    return listen<{ deviceId: string; paired: boolean }>('device-connection-changed', (event) => {
      callback(event.payload);
    });
  }

  // 监听扫描完成事件
  static onScanCompleted(callback: () => void) {
    return listen('scan-completed', () => {
      callback();
    });
  }

  // 监听扫描错误事件
  static onScanError(callback: (error: string) => void) {
    return listen<string>('scan-error', (event) => {
      callback(event.payload);
    });
  }
}

export default BleService;