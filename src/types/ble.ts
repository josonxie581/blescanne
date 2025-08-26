export interface BleDevice {
  identifier: string;
  name?: string;
  address: string;
  rssi?: number;
  tx_power?: number;
  connectable: boolean;
  paired: boolean;
  manufacturer_data: Record<string, string>;
  services: string[];
  adv_data?: Record<string, string>; // 广播数据，包含完整的 Advertisement Data
  raw_adv_data?: string; // 原始广播数据的十六进制字符串
}

export interface BleAdapter {
  identifier: string;
  address: string;
  powered: boolean;
}

export enum ScanStatus {
  Idle = 'idle',
  Scanning = 'scanning',
  Completed = 'completed'
}