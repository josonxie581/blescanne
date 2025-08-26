// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{Manager, State};
use tokio::time::sleep;
use futures::{TryStreamExt, StreamExt}; // 扫描事件和通知流
use tokio::task::JoinHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BleDevice {
    pub identifier: String,
    pub name: Option<String>,
    pub address: String,
    pub rssi: Option<i16>,
    pub tx_power: Option<i16>,
    pub connectable: bool,
    pub paired: bool,
    pub manufacturer_data: HashMap<String, String>,
    pub services: Vec<String>,
    pub adv_data: Option<HashMap<String, String>>, // 广播数据
    pub raw_adv_data: Option<String>, // 原始广播数据的十六进制字符串
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GattCharacteristic {
    pub uuid: String,
    pub properties: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GattService {
    pub uuid: String,
    pub characteristics: Vec<GattCharacteristic>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BleAdapter {
    pub identifier: String,
    pub address: String,
    pub powered: bool,
}

// 应用程序状态
#[derive(Clone)]
pub struct AppState {
    pub adapters: Arc<Mutex<Vec<BleAdapter>>>,
    pub devices: Arc<Mutex<Vec<BleDevice>>>,
    pub scanning: Arc<Mutex<bool>>,
    // 保持对当前适配器的引用
    pub current_adapter: Arc<Mutex<Option<simplersble::Adapter>>>,
    // 订阅任务集合：key = deviceId|serviceUuid|charUuid
    pub subscriptions: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
    // 已连接设备的缓存，优先用以断开，避免在扫描结果或已配对列表中找不到对应 peripheral
    pub connected_peripherals: Arc<Mutex<HashMap<String, simplersble::peripheral::Peripheral>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            adapters: Arc::new(Mutex::new(Vec::new())),
            devices: Arc::new(Mutex::new(Vec::new())),
            scanning: Arc::new(Mutex::new(false)),
            current_adapter: Arc::new(Mutex::new(None)),
            subscriptions: Arc::new(Mutex::new(HashMap::new())),
            connected_peripherals: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

// 获取可用的蓝牙适配器（调用 SimpleBLE 实际 API）
#[tauri::command]
async fn get_adapters(state: State<'_, AppState>) -> Result<Vec<BleAdapter>, String> {
    // SimpleBLE 枚举适配器（通过本仓库的 Rust 绑定 simplersble）
    let adapters = simplersble::Adapter::get_adapters()
        .map_err(|e| format!("SimpleBLE 错误: {}", e))?;

    // 将结果映射到前端期望的结构
    let mut result: Vec<BleAdapter> = Vec::new();
    for a in adapters.iter() {
        let identifier = a.identifier().unwrap_or_else(|_| "unknown".into());
        let address = a.address().unwrap_or_else(|_| "".into());
        // powered 状态 SimpleBLE Adapter 暂无直接 API，这里假设蓝牙开启即可认为 true；若需严格可改为 bluetooth_enabled()
        let powered = simplersble::Adapter::bluetooth_enabled().unwrap_or(true);
        result.push(BleAdapter { identifier, address, powered });
    }

    // 缓存到状态中
    {
        let mut adapters_state = state.adapters.lock().unwrap();
        *adapters_state = result.clone();
    }

    Ok(result)
}

// 兼容多种参数命名
#[derive(Debug, Clone, Deserialize)]
struct StartScanArgs {
    #[serde(default)]
    #[serde(alias = "durationSecs", alias = "duration", alias = "seconds")]
    duration_secs: Option<u64>,
}

// 开始扫描 BLE 设备（实时更新）
#[tauri::command]
async fn start_scan(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    // 兼容旧版：直接传入 duration_secs
    duration_secs: Option<u64>,
    // 兼容新版：封装在 args 中
    args: Option<StartScanArgs>,
) -> Result<(), String> {
    println!("开始扫描 BLE 设备(实时)...");
    let merged_duration = args.as_ref().and_then(|a| a.duration_secs).or(duration_secs);
    println!("start_scan 参数 duration_secs = {:?}", merged_duration);

    // 标记为扫描中（不清空设备列表，保留之前扫描的数据）
    {
        let mut scanning = state.scanning.lock().unwrap();
        *scanning = true;
    }

    // 取得或缓存适配器
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() {
                    return Err("未找到可用的蓝牙适配器".to_string());
                }
                let new_adapter = adapters[0].clone();
                {
                    let mut current_adapter = state.current_adapter.lock().unwrap();
                    *current_adapter = Some(new_adapter.clone());
                }
                new_adapter
            }
        }
    };

    let state_clone = state.inner().clone();
    let app_handle_clone = app_handle.clone();

    tokio::spawn(async move {
        // 启动连续扫描
        if let Err(e) = adapter.scan_start() {
            eprintln!("启动连续扫描失败: {}", e);
            let _ = app_handle_clone.emit_all("scan-error", format!("启动连续扫描失败: {}", e));
            // 标记扫描结束
            {
                let mut scanning = state_clone.scanning.lock().unwrap();
                *scanning = false;
            }
            return;
        }

    let mut events = adapter.on_scan_event();
    let scan_start_time = std::time::Instant::now();
    let raw_secs = merged_duration.unwrap_or(10);
        let infinite = raw_secs == 0;
        let bounded_secs = raw_secs.max(1).min(180);
        let scan_duration = Duration::from_secs(bounded_secs); // 用户可调，1~180 秒；0 表示无限

        // 健康检查参数
        let mut last_event_at = std::time::Instant::now();
        let stall_threshold = Duration::from_secs(45); // 超过该时长无事件则认为异常
        let mut last_restart_at = std::time::Instant::now() - Duration::from_secs(3600);
        let restart_backoff = Duration::from_secs(30); // 最小重启间隔
        let mut restart_count: u32 = 0;
        let max_restarts: u32 = 5;
        let mut health_tick = tokio::time::interval(Duration::from_secs(5));

        loop {
            // 若外部请求停止，跳出循环
            if !*state_clone.scanning.lock().unwrap() {
                break;
            }

            // 有界扫描时长限制
            if !infinite {
                if scan_start_time.elapsed() >= scan_duration {
                    println!("扫描时间到达限制({}s)，自动停止扫描", scan_duration.as_secs());
                    break;
                }
            }

            tokio::select! {
                _ = health_tick.tick() => {
                    // 周期性健康检查（仅对无限扫描模式启用）
                    if infinite {
                        // 蓝牙开关可用性快速检查
                        if let Ok(enabled) = simplersble::Adapter::bluetooth_enabled() {
                            if !enabled {
                                let _ = app_handle_clone.emit_all("scan-error", "蓝牙适配器已关闭，停止扫描");
                                break;
                            }
                        }

                        // 长时间无事件，尝试重启扫描
                        if last_event_at.elapsed() > stall_threshold
                            && last_restart_at.elapsed() > restart_backoff
                            && restart_count < max_restarts
                        {
                            eprintln!(
                                "扫描健康检查：{} 秒无事件，尝试重启扫描(第 {} 次)",
                                last_event_at.elapsed().as_secs(),
                                restart_count + 1
                            );
                            let _ = adapter.scan_stop();
                            sleep(Duration::from_millis(200)).await;
                            match adapter.scan_start() {
                                Ok(_) => {
                                    events = adapter.on_scan_event();
                                    last_restart_at = std::time::Instant::now();
                                    restart_count += 1;
                                    last_event_at = std::time::Instant::now();
                                    let _ = app_handle_clone.emit_all("scan-info", "扫描已自动重启");
                                }
                                Err(e) => {
                                    eprintln!("自动重启扫描失败: {}", e);
                                    let _ = app_handle_clone.emit_all("scan-error", format!("自动重启扫描失败: {}", e));
                                    // 无法恢复，结束扫描
                                    break;
                                }
                            }
                        }
                    }
                },
                res = events.try_next() => {
                    match res {
                        Ok(Some(event)) => match event {
                            simplersble::ScanEvent::Found(p) | simplersble::ScanEvent::Updated(p) => {
                                last_event_at = std::time::Instant::now();
                        // 构建 BleDevice 结构
                        let identifier = p.identifier().unwrap_or_else(|_| "unknown".to_string());
                        let address = p.address().unwrap_or_else(|_| "Unknown".to_string());
                        let rssi = p.rssi().ok();
                        let tx_power = p.tx_power().ok();
                        let connectable = p.is_connectable().unwrap_or(false);
                        let paired = p.is_paired().unwrap_or(false);

                        let mut manufacturer_data = HashMap::new();
                        if let Ok(man_data) = p.manufacturer_data() {
                            for (company_id, data) in man_data {
                                manufacturer_data.insert(format!("{:04X}", company_id), hex::encode(data));
                            }
                        }

                        let mut services = Vec::new();
                        if let Ok(service_list) = p.services() {
                            for service in service_list {
                                services.push(service.uuid());
                            }
                        }

                        // 尝试获取广播数据 (Advertisement Data)
                        let mut adv_data = HashMap::new();
                        
                        // 设备名称暂时使用 identifier 或设置为 None
                        // SimpleBLE Peripheral 没有直接的 name() 方法
                        let device_name = None;

                        // 添加 RSSI 到广播数据
                        if let Some(rssi_value) = rssi {
                            adv_data.insert("rssi".to_string(), rssi_value.to_string());
                        }

                        // 添加 TX Power 到广播数据
                        if let Some(tx_power_value) = tx_power {
                            adv_data.insert("tx_power".to_string(), tx_power_value.to_string());
                        }

                        // 添加可连接性信息
                        adv_data.insert("connectable".to_string(), connectable.to_string());

                        // 添加服务列表信息
                        if !services.is_empty() {
                            adv_data.insert("services_count".to_string(), services.len().to_string());
                            adv_data.insert("primary_service".to_string(), services.get(0).unwrap_or(&"Unknown".to_string()).clone());
                        }

                        // 添加制造商数据信息
                        if !manufacturer_data.is_empty() {
                            adv_data.insert("manufacturer_data_entries".to_string(), manufacturer_data.len().to_string());
                            if let Some((company_id, data)) = manufacturer_data.iter().next() {
                                adv_data.insert("manufacturer_company_id".to_string(), company_id.clone());
                                adv_data.insert("manufacturer_data_length".to_string(), (data.len() / 2).to_string()); // 十六进制字符串长度 / 2 = 字节长度
                            }
                        }

                        // 添加设备地址信息
                        adv_data.insert("mac_address".to_string(), address.clone());
                        adv_data.insert("identifier".to_string(), identifier.clone());

                        // 构建原始广播数据 - 基于设备的可用信息
                        let raw_adv_data = {
                            let mut raw_data = Vec::new();
                            
                            if !manufacturer_data.is_empty() {
                                // 如果有制造商数据，使用制造商数据格式
                                raw_data.push(0x1E); // 长度
                                raw_data.push(0xFF); // 制造商数据类型
                                
                                // 添加第一个制造商数据
                                if let Some((company_id_str, data_hex)) = manufacturer_data.iter().next() {
                                    if let Ok(company_id) = u16::from_str_radix(company_id_str, 16) {
                                        raw_data.extend_from_slice(&company_id.to_le_bytes());
                                        
                                        // 解析十六进制数据并添加
                                        if let Ok(data_bytes) = hex::decode(data_hex) {
                                            raw_data.extend_from_slice(&data_bytes);
                                        }
                                    }
                                }
                            } else {
                                // 没有制造商数据时，构建基于设备信息的广播数据包
                                // 模拟您的C代码格式
                                raw_data.push(0x1E); // 长度 (30字节数据)
                                raw_data.push(0xFF); // 制造商数据类型
                                
                                // 使用设备标识符的哈希作为公司ID (模拟)
                                let device_hash = identifier.chars()
                                    .map(|c| c as u8)
                                    .fold(0u16, |acc, x| acc.wrapping_add(x as u16));
                                raw_data.extend_from_slice(&device_hash.to_le_bytes());
                                
                                // VID (模拟)
                                raw_data.push(0x00);
                                raw_data.push(0x01);
                                
                                // PID (模拟)
                                raw_data.push(0x00);
                                raw_data.push(0x20);
                                
                                // 设备类型 (根据设备名称判断)
                                let device_type = if identifier.to_lowercase().contains("tws") || identifier.to_lowercase().contains("earbud") {
                                    0x23 // TWS耳机类型
                                } else if identifier.to_lowercase().contains("speaker") || identifier.to_lowercase().contains("sound") {
                                    0x00 // 音箱类型
                                } else {
                                    0x00 // 默认音箱类型
                                };
                                raw_data.push(device_type);
                                
                                // MAC地址 (从address解析或模拟)
                                let mac_bytes: Vec<u8> = if !address.is_empty() && address.contains(':') {
                                    address.split(':')
                                        .filter_map(|s| u8::from_str_radix(s, 16).ok())
                                        .collect()
                                } else {
                                    // 如果地址解析失败，使用设备标识符生成模拟MAC
                                    identifier.chars()
                                        .enumerate()
                                        .map(|(i, c)| (c as u8).wrapping_add(i as u8))
                                        .take(6)
                                        .collect()
                                };
                                
                                // 确保MAC地址是6字节
                                let mut mac = mac_bytes;
                                mac.resize(6, 0x00);
                                raw_data.extend_from_slice(&mac);
                                
                                // 连接标志
                                raw_data.push(if paired { 0x01 } else { 0x00 });
                                
                                // 电池信息 (模拟)
                                raw_data.push(0x50); // 左耳电池 80%
                                raw_data.push(0x55); // 右耳电池 85%
                                raw_data.push(0x64); // 充电盒电池 100%
                                
                                // 保留字段
                                raw_data.push(0x01); // 序列随机数
                                raw_data.push(0x00); // 保留
                                raw_data.push(0x00); // 保留
                                raw_data.push(0x00); // 保留
                                
                                // 哈希值 (8字节，简单模拟)
                                let hash_base = (identifier.len() as u32).wrapping_add(device_type as u32);
                                for i in 0..8 {
                                    raw_data.push(((hash_base.wrapping_add(i)) % 256) as u8);
                                }
                            }
                            
                            // 填充或截断到31字节
                            if raw_data.len() < 31 {
                                raw_data.resize(31, 0x00);
                            } else if raw_data.len() > 31 {
                                raw_data.truncate(31);
                            }
                            
                            Some(hex::encode_upper(&raw_data))
                        };

                        let ble_device = BleDevice {
                            identifier: identifier.clone(),
                            name: device_name,
                            address,
                            rssi,
                            tx_power,
                            connectable,
                            paired,
                            manufacturer_data,
                            services,
                            adv_data: if adv_data.is_empty() { None } else { Some(adv_data) },
                            raw_adv_data,
                        };

                        // 更新到状态（upsert）
                        {
                            let mut devices = state_clone.devices.lock().unwrap();
                            if let Some(existing) = devices.iter_mut().find(|d| d.identifier == identifier) {
                                // 仅更新易变字段以减少抖动
                                existing.rssi = ble_device.rssi;
                                existing.tx_power = ble_device.tx_power;
                                existing.connectable = ble_device.connectable;
                                existing.paired = ble_device.paired;
                                existing.manufacturer_data = ble_device.manufacturer_data.clone();
                                existing.services = ble_device.services.clone();
                                existing.adv_data = ble_device.adv_data.clone(); // 更新广播数据
                                existing.raw_adv_data = ble_device.raw_adv_data.clone(); // 更新原始广播数据
                                // 更新设备名称（如果有新名称）
                                if ble_device.name.is_some() && existing.name.is_none() {
                                    existing.name = ble_device.name.clone();
                                }
                            } else {
                                devices.push(ble_device.clone());
                            }
                        }

                        // 推送到前端，沿用 device-discovered 事件以触发 UI 更新
                        if let Err(e) = app_handle_clone.emit_all("device-discovered", &ble_device) {
                            eprintln!("Failed to emit device-discovered event: {}", e);
                        }
                            }
                            simplersble::ScanEvent::Start => {
                                // 可选：记录日志
                                last_event_at = std::time::Instant::now();
                                println!("扫描回调：Start");
                            }
                            simplersble::ScanEvent::Stop => {
                                println!("扫描回调：Stop");
                                break;
                            }
                        },
                        Ok(None) => {
                            // 事件流结束
                            if infinite {
                                // 无限模式下尝试恢复
                                eprintln!("扫描事件流结束，尝试恢复...");
                                let _ = adapter.scan_stop();
                                sleep(Duration::from_millis(200)).await;
                                if let Ok(_) = adapter.scan_start() {
                                    events = adapter.on_scan_event();
                                    last_event_at = std::time::Instant::now();
                                    last_restart_at = std::time::Instant::now();
                                    restart_count += 1;
                                    continue;
                                }
                            }
                            break;
                        }
                        Err(e) => {
                            eprintln!("扫描事件流错误: {}", e);
                            let _ = app_handle_clone.emit_all("scan-error", format!("扫描事件流错误: {}", e));
                            if infinite {
                                // 尝试恢复
                                let _ = adapter.scan_stop();
                                sleep(Duration::from_millis(200)).await;
                                if let Ok(_) = adapter.scan_start() {
                                    events = adapter.on_scan_event();
                                    last_event_at = std::time::Instant::now();
                                    last_restart_at = std::time::Instant::now();
                                    restart_count += 1;
                                    continue;
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }

        // 停止扫描
        let _ = adapter.scan_stop();
        {
            let mut scanning = state_clone.scanning.lock().unwrap();
            *scanning = false;
        }
        if let Err(e) = app_handle_clone.emit_all("scan-completed", ()) {
            eprintln!("Failed to emit scan-completed event: {}", e);
        }
    });

    Ok(())
}

// 停止扫描
#[tauri::command]
async fn stop_scan(state: State<'_, AppState>) -> Result<(), String> {
    println!("停止扫描 BLE 设备...");

    // 置位标志，后台循环会退出
    {
        let mut scanning = state.scanning.lock().unwrap();
        *scanning = false;
    }

    // 尝试停止适配器扫描（若存在）
    if let Some(adapter) = state.current_adapter.lock().unwrap().clone() {
        if let Err(e) = adapter.scan_stop() {
            eprintln!("调用适配器 scan_stop 失败: {}", e);
        }
    }

    Ok(())
}

// 获取扫描到的设备
#[tauri::command]
async fn get_devices(state: State<'_, AppState>) -> Result<Vec<BleDevice>, String> {
    let devices = state.devices.lock().unwrap();
    Ok(devices.clone())
}

// 检查是否正在扫描
#[tauri::command]
async fn is_scanning(state: State<'_, AppState>) -> Result<bool, String> {
    let scanning = state.scanning.lock().unwrap();
    Ok(*scanning)
}

// 检查设备连接状态
#[tauri::command]
#[allow(non_snake_case)]
async fn check_device_connection(deviceId: String) -> Result<bool, String> {
    println!("检查设备连接状态: {}", deviceId);
    
    // 获取第一个可用的适配器
    let adapters = simplersble::Adapter::get_adapters()
        .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
    
    if adapters.is_empty() {
        return Err("未找到可用的蓝牙适配器".to_string());
    }
    
    let adapter = &adapters[0];
    
    // 从已配对设备中查找
    if let Ok(paired_peripherals) = adapter.get_paired_peripherals() {
        for peripheral in paired_peripherals.iter() {
            if let Ok(identifier) = peripheral.identifier() {
                if identifier == deviceId {
                    match peripheral.is_connected() {
                        Ok(is_connected) => {
                            println!("设备 {} 连接状态: {}", deviceId, is_connected);
                            return Ok(is_connected);
                        }
                        Err(e) => {
                            println!("检查设备连接状态失败: {}", e);
                            return Err(format!("检查连接状态失败: {}", e));
                        }
                    }
                }
            }
        }
    }
    
    // 如果未在已配对设备中找到，从扫描结果中查找
    match adapter.scan_get_results() {
        Ok(peripherals) => {
            for peripheral in peripherals.iter() {
                if let Ok(identifier) = peripheral.identifier() {
                    if identifier == deviceId {
                        match peripheral.is_connected() {
                            Ok(is_connected) => {
                                println!("设备 {} 连接状态: {}", deviceId, is_connected);
                                return Ok(is_connected);
                            }
                            Err(e) => {
                                println!("检查设备连接状态失败: {}", e);
                                return Err(format!("检查连接状态失败: {}", e));
                            }
                        }
                    }
                }
            }
            
            Err(format!("未找到设备: {}", deviceId))
        }
        Err(e) => {
            Err(format!("获取扫描结果失败: {}", e))
        }
    }
}

// 连接到设备
#[tauri::command]
#[allow(non_snake_case)]
async fn connect_device(deviceId: String, state: State<'_, AppState>, app_handle: tauri::AppHandle) -> Result<(), String> {
    println!("尝试连接到设备: {}", deviceId);
    
    // 使用缓存的适配器，如果没有则获取新的适配器
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => {
                println!("使用缓存的适配器");
                adapter
            }
            None => {
                println!("缓存的适配器为空，获取新的适配器");
                drop(current_adapter_guard); // 释放锁
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                
                if adapters.is_empty() {
                    return Err("未找到可用的蓝牙适配器".to_string());
                }
                
                let new_adapter = adapters[0].clone();
                
                // 更新缓存
                {
                    let mut current_adapter = state.current_adapter.lock().unwrap();
                    *current_adapter = Some(new_adapter.clone());
                }
                
                new_adapter
            }
        }
    };
    
    // 先检查设备是否已连接
    match adapter.get_paired_peripherals() {
        Ok(paired_peripherals) => {
            for peripheral in paired_peripherals.iter() {
                if let Ok(identifier) = peripheral.identifier() {
                    if identifier == deviceId {
                        if let Ok(is_connected) = peripheral.is_connected() {
                            if is_connected {
                                println!("设备 {} 已经连接", deviceId);
                                return Ok(());
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            println!("获取已配对设备失败: {}", e);
        }
    }
    
    // 首先从应用程序状态中查找设备信息（这些是扫描期间收集的）
    let target_device = {
        let devices = state.devices.lock().unwrap();
        println!("应用状态中的设备数量: {}", devices.len());
        for (i, d) in devices.iter().enumerate() {
            println!("状态设备 {}: identifier='{}', address='{}'", i, d.identifier, d.address);
        }
        println!("正在查找设备ID: '{}'", deviceId);
        
        devices.iter()
            .find(|d| d.identifier == deviceId)
            .cloned()
    };
    
    let target_device = match target_device {
        Some(device) => {
            println!("在应用状态中找到目标设备: identifier='{}', address='{}'", device.identifier, device.address);
            device
        }
        None => {
            println!("在应用状态中未找到设备: {}", deviceId);
            return Err(format!("未找到设备: {}，可能的原因：\n1. 设备不在当前扫描结果中\n2. 传递的deviceId不正确\n3. 需要重新扫描", deviceId));
        }
    };
    
    // 从 SimpleBLE 的扫描结果中获取实际的 peripheral 对象
    let peripherals = adapter.scan_get_results()
        .map_err(|e| format!("获取SimpleBLE扫描结果失败: {}", e))?;
    
    println!("SimpleBLE扫描结果中的设备数量: {}", peripherals.len());
    
    // 查找匹配的设备
    let peripheral = peripherals.iter()
        .find(|p| {
            if let Ok(identifier) = p.identifier() {
                let matches = identifier == deviceId;
                if matches {
                    println!("找到匹配设备: identifier='{}'", identifier);
                }
                matches
            } else if let Ok(address) = p.address() {
                let matches = address == target_device.address;
                if matches {
                    println!("通过地址找到匹配设备: address='{}'", address);
                }
                matches
            } else {
                false
            }
        })
        .ok_or_else(|| {
            if peripherals.is_empty() {
                format!("SimpleBLE扫描结果为空，请重新扫描后再尝试连接: {}", deviceId)
            } else {
                format!("在SimpleBLE扫描结果中未找到设备: {}，请确认设备名称或重新扫描", deviceId)
            }
        })?;
    
    // 直接尝试连接（与SimpleBLE示例一致，不做额外检查）
    println!("开始连接设备: {}", deviceId);
    match peripheral.connect() {
        Ok(_) => {
            println!("连接命令发送成功");
            
            // 更新设备状态
            {
                let mut devices = state.devices.lock().unwrap();
                for device in devices.iter_mut() {
                    if device.identifier == deviceId {
                        device.paired = true;
                        break;
                    }
                }
            }
            
            // 缓存已连接 peripheral，便于后续断开
            {
                let mut map = state.connected_peripherals.lock().unwrap();
                map.insert(deviceId.clone(), peripheral.clone());
            }
            // 广播连接状态变更
            let _ = app_handle.emit_all("device-connection-changed", serde_json::json!({
                "deviceId": deviceId,
                "paired": true
            }));
            println!("成功连接到设备: {}", deviceId);
            Ok(())
        }
        Err(e) => {
            eprintln!("连接设备失败: {}", e);
            Err(format!("连接设备失败: {}", e))
        }
    }
}

// 断开设备连接
#[tauri::command]
#[allow(non_snake_case)]
async fn disconnect_device(deviceId: String, state: State<'_, AppState>, app_handle: tauri::AppHandle) -> Result<(), String> {
    println!("尝试断开设备连接: {}", deviceId);

    // 使用缓存的适配器，如果没有则获取新的适配器
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() {
                    return Err("未找到可用的蓝牙适配器".to_string());
                }
                let new_adapter = adapters[0].clone();
                {
                    let mut current_adapter = state.current_adapter.lock().unwrap();
                    *current_adapter = Some(new_adapter.clone());
                }
                new_adapter
            }
        }
    };

    // 从应用状态中拿到设备信息（用于地址匹配）
    let target_device = {
        let devices = state.devices.lock().unwrap();
        devices.iter().find(|d| d.identifier == deviceId).cloned()
    };

    // 优先使用已缓存的 connected peripheral（确保锁在 await 前释放）
    let cached_peripheral = {
        let map = state.connected_peripherals.lock().unwrap();
        map.get(&deviceId).cloned()
    };
    if let Some(peripheral) = cached_peripheral {
        println!("使用缓存的已连接 peripheral 进行断开");
        if let Ok(is_connected) = peripheral.is_connected() {
            if is_connected {
                match peripheral.disconnect() {
                    Ok(_) => {
                        println!("断开连接命令发送成功(缓存路径)");
                        tokio::time::sleep(tokio::time::Duration::from_millis(800)).await;
                        let _ = state.connected_peripherals.lock().unwrap().remove(&deviceId);
                        let mut devices = state.devices.lock().unwrap();
                        for device in devices.iter_mut() {
                            if device.identifier == deviceId { device.paired = false; break; }
                        }
                        let _ = app_handle.emit_all("device-connection-changed", serde_json::json!({
                            "deviceId": deviceId,
                            "paired": false
                        }));
                        return Ok(());
                    }
                    Err(e) => {
                        eprintln!("通过缓存 peripheral 断开失败: {}，将尝试其他路径", e);
                    }
                }
            } else {
                println!("缓存 peripheral 显示已断开，进行状态同步");
                let _ = state.connected_peripherals.lock().unwrap().remove(&deviceId);
                let mut devices = state.devices.lock().unwrap();
                for device in devices.iter_mut() { if device.identifier == deviceId { device.paired = false; break; } }
                let _ = app_handle.emit_all("device-connection-changed", serde_json::json!({
                    "deviceId": deviceId,
                    "paired": false
                }));
                return Ok(());
            }
        } else {
            println!("缓存 peripheral 无法获取连接状态，继续尝试其他路径");
        }
    }

    // 先从已配对设备中查找（按 identifier 或 address 匹配）
    if let Ok(paired_peripherals) = adapter.get_paired_peripherals() {
        for peripheral in paired_peripherals.iter() {
            let id_match = peripheral.identifier().map(|id| id == deviceId).unwrap_or(false);
            let addr_match = match (&target_device, peripheral.address()) {
                (Some(dev), Ok(addr)) => addr == dev.address,
                _ => false,
            };

            if id_match || addr_match {
                if let Ok(is_connected) = peripheral.is_connected() {
                    if is_connected {
                        match peripheral.disconnect() {
                            Ok(_) => {
                                println!("断开连接命令发送成功");
                                tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                                match peripheral.is_connected() {
                                    Ok(is_connected) => {
                                        if !is_connected {
                                            println!("成功断开设备连接: {}", deviceId);
                                            let _ = state.connected_peripherals.lock().unwrap().remove(&deviceId);
                                            let mut devices = state.devices.lock().unwrap();
                                            for device in devices.iter_mut() {
                                                if device.identifier == deviceId {
                                                    device.paired = false;
                                                    break;
                                                }
                                            }
                                            let _ = app_handle.emit_all("device-connection-changed", serde_json::json!({
                                                "deviceId": deviceId,
                                                "paired": false
                                            }));
                                            return Ok(());
                                        } else {
                                            return Err("断开命令执行后设备仍保持连接状态".to_string());
                                        }
                                    }
                                    Err(e) => {
                                        println!("无法检查断开状态，但命令执行成功: {}", e);
                                        let _ = state.connected_peripherals.lock().unwrap().remove(&deviceId);
                                        let mut devices = state.devices.lock().unwrap();
                                        for device in devices.iter_mut() {
                                            if device.identifier == deviceId {
                                                device.paired = false;
                                                break;
                                            }
                                        }
                                        let _ = app_handle.emit_all("device-connection-changed", serde_json::json!({
                                            "deviceId": deviceId,
                                            "paired": false
                                        }));
                                        return Ok(());
                                    }
                                }
                            }
                            Err(e) => {
                                return Err(format!("断开设备连接失败: {}", e));
                            }
                        }
                    } else {
                        println!("设备 {} 已经断开", deviceId);
                        let _ = state.connected_peripherals.lock().unwrap().remove(&deviceId);
                        let mut devices = state.devices.lock().unwrap();
                        for device in devices.iter_mut() {
                            if device.identifier == deviceId {
                                device.paired = false;
                                break;
                            }
                        }
                        return Ok(());
                    }
                }
            }
        }
    }

    // 在扫描结果中查找（按 identifier 或 address 匹配）
    if let Ok(peripherals) = adapter.scan_get_results() {
        let mut found = None;
        for p in peripherals.iter() {
            let id_match = p.identifier().map(|id| id == deviceId).unwrap_or(false);
            let addr_match = match (&target_device, p.address()) {
                (Some(dev), Ok(addr)) => addr == dev.address,
                _ => false,
            };
            if id_match || addr_match {
                found = Some(p);
                break;
            }
        }

        if let Some(peripheral) = found {
            match peripheral.disconnect() {
                Ok(_) => {
                    println!("断开连接命令发送成功");
                    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                    match peripheral.is_connected() {
                        Ok(is_connected) => {
                            if !is_connected {
                                println!("成功断开设备连接: {}", deviceId);
                                let _ = state.connected_peripherals.lock().unwrap().remove(&deviceId);
                                let mut devices = state.devices.lock().unwrap();
                                for device in devices.iter_mut() {
                                    if device.identifier == deviceId {
                                        device.paired = false;
                                        break;
                                    }
                                }
                                let _ = app_handle.emit_all("device-connection-changed", serde_json::json!({
                                    "deviceId": deviceId,
                                    "paired": false
                                }));
                                return Ok(());
                            } else {
                                return Err("断开命令执行后设备仍保持连接状态".to_string());
                            }
                        }
                        Err(e) => {
                            println!("无法检查断开状态，但命令执行成功: {}", e);
                            let _ = state.connected_peripherals.lock().unwrap().remove(&deviceId);
                            let mut devices = state.devices.lock().unwrap();
                            for device in devices.iter_mut() {
                                if device.identifier == deviceId {
                                    device.paired = false;
                                    break;
                                }
                            }
                            let _ = app_handle.emit_all("device-connection-changed", serde_json::json!({
                                "deviceId": deviceId,
                                "paired": false
                            }));
                            return Ok(());
                        }
                    }
                }
                Err(e) => {
                    eprintln!("断开设备连接失败: {}", e);
                    return Err(format!("断开设备连接失败: {}", e));
                }
            }
        }
    } else {
        println!("获取扫描结果失败，改为标记断开");
    }

    // 如果适配器无法定位该设备，则标记为已断开并返回成功，避免前端提示未找到设备
    println!("未在适配器中定位到设备 {}，标记为已断开", deviceId);
    {
        let _ = state.connected_peripherals.lock().unwrap().remove(&deviceId);
        let mut devices = state.devices.lock().unwrap();
        for device in devices.iter_mut() {
            if device.identifier == deviceId {
                device.paired = false;
                break;
            }
        }
    }
    let _ = app_handle.emit_all("device-connection-changed", serde_json::json!({
        "deviceId": deviceId,
        "paired": false
    }));
    Ok(())
}

// 旧的定时扫描函数已被实时扫描替代

fn main() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            get_adapters,
            start_scan,
            stop_scan,
            get_devices,
            is_scanning,
            check_device_connection,
            connect_device,
            disconnect_device,
            get_device_services,
            read_characteristic,
            write_characteristic,
            notify_characteristic,
            indicate_characteristic,
            unsubscribe_characteristic,
            get_mtu
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// 获取指定设备的 GATT 服务与特征
#[tauri::command]
#[allow(non_snake_case)]
async fn get_device_services(deviceId: String, state: State<'_, AppState>) -> Result<Vec<GattService>, String> {
    // 获取适配器
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() {
                    return Err("未找到可用的蓝牙适配器".to_string());
                }
                let new_adapter = adapters[0].clone();
                {
                    let mut current_adapter = state.current_adapter.lock().unwrap();
                    *current_adapter = Some(new_adapter.clone());
                }
                new_adapter
            }
        }
    };

    // 从扫描结果或已配对中定位 peripheral
    let mut peripheral_opt = None;

    if let Ok(peripherals) = adapter.scan_get_results() {
        for p in peripherals.iter() {
            if let Ok(identifier) = p.identifier() {
                if identifier == deviceId {
                    peripheral_opt = Some(p.clone());
                    break;
                }
            }
        }
    }

    if peripheral_opt.is_none() {
        if let Ok(paired) = adapter.get_paired_peripherals() {
            for p in paired.iter() {
                if let Ok(identifier) = p.identifier() {
                    if identifier == deviceId {
                        peripheral_opt = Some(p.clone());
                        break;
                    }
                }
            }
        }
    }

    let peripheral = match peripheral_opt {
        Some(p) => p,
        None => return Err(format!("未找到设备: {}，请确认已扫描或已连接", deviceId)),
    };

    // 读取服务与特征
    let mut result: Vec<GattService> = Vec::new();
    match peripheral.services() {
        Ok(services) => {
            for s in services {
                let uuid = s.uuid();
                let mut chars_vec: Vec<GattCharacteristic> = Vec::new();
                let chars = s.characteristics();
                for c in chars {
                    let mut props = Vec::<String>::new();
                    if c.can_read() { props.push("Read".into()); }
                    if c.can_write_request() { props.push("WriteRequest".into()); }
                    if c.can_write_command() { props.push("WriteCommand".into()); }
                    if c.can_notify() { props.push("Notify".into()); }
                    if c.can_indicate() { props.push("Indicate".into()); }
                    chars_vec.push(GattCharacteristic { uuid: c.uuid(), properties: props });
                }
                result.push(GattService { uuid, characteristics: chars_vec });
            }
            Ok(result)
        }
        Err(e) => Err(format!("获取服务失败: {}", e)),
    }
}

// 读取指定特征值，返回十六进制字符串（前缀 0x）
#[tauri::command]
#[allow(non_snake_case)]
async fn read_characteristic(
    deviceId: String,
    serviceUuid: String,
    characteristicUuid: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    // 获取适配器
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() {
                    return Err("未找到可用的蓝牙适配器".to_string());
                }
                let new_adapter = adapters[0].clone();
                {
                    let mut current_adapter = state.current_adapter.lock().unwrap();
                    *current_adapter = Some(new_adapter.clone());
                }
                new_adapter
            }
        }
    };

    // 从扫描结果或已配对设备定位 peripheral
    let mut peripheral_opt = None;

    if let Ok(peripherals) = adapter.scan_get_results() {
        for p in peripherals.iter() {
            if let Ok(identifier) = p.identifier() {
                if identifier == deviceId {
                    peripheral_opt = Some(p.clone());
                    break;
                }
            }
        }
    }

    if peripheral_opt.is_none() {
        if let Ok(paired) = adapter.get_paired_peripherals() {
            for p in paired.iter() {
                if let Ok(identifier) = p.identifier() {
                    if identifier == deviceId {
                        peripheral_opt = Some(p.clone());
                        break;
                    }
                }
            }
        }
    }

    let peripheral = match peripheral_opt {
        Some(p) => p,
        None => return Err(format!("未找到设备: {}，请确认已扫描或已连接", deviceId)),
    };

    // 尝试确保已连接
    match peripheral.is_connected() {
        Ok(false) => {
            if let Err(e) = peripheral.connect() { eprintln!("为读取而连接失败: {}", e); }
            // 给系统一点时间建立链路
            let _ = sleep(Duration::from_millis(150)).await;
        }
        Ok(true) => {}
        Err(e) => eprintln!("检查连接状态失败: {}", e),
    }

    // UUID 形式适配：原样、扩展为 128-bit、压缩为 16-bit
    fn to_full(uuid: &str) -> String {
        let u = uuid.to_uppercase();
        if u.len() == 4 { format!("0000{}-0000-1000-8000-00805F9B34FB", u) } else { u }
    }
    fn to_short(uuid: &str) -> String {
        let u = uuid.to_uppercase();
        if u.len() == 36 {
            if let Some(caps) = regex::Regex::new(r"^0000([0-9A-F]{4})-0000-1000-8000-00805F9B34FB$").unwrap().captures(&u) {
                return caps.get(1).unwrap().as_str().to_string();
            }
        }
        u
    }

    let candidates = vec![
        (serviceUuid.clone(), characteristicUuid.clone()),
        (to_full(&serviceUuid), to_full(&characteristicUuid)),
        (to_short(&serviceUuid), to_short(&characteristicUuid)),
    ];

    for (s, c) in candidates {
    // 最多尝试 3 次，处理偶发的 GATT 忙或尚未就绪
        let mut attempt = 0;
        loop {
            match peripheral.read(&s, &c) {
        Ok(bytes) => return Ok(hex::encode_upper(bytes)),
                Err(e) => {
                    attempt += 1;
                    if attempt >= 3 {
                        eprintln!("读取失败(多次重试后放弃): svc='{}', chr='{}', err={}", s, c, e);
                        break;
                    }
                    eprintln!("读取失败(重试 #{}): svc='{}', chr='{}', err={}", attempt, s, c, e);
                    let _ = sleep(Duration::from_millis(120)).await;
                }
            }
        }
    }

    Err("读取特征值失败：所有 UUID 形式均未成功".to_string())
}

fn make_key(device_id: &str, service_uuid: &str, characteristic_uuid: &str) -> String {
    format!("{}|{}|{}", device_id, service_uuid, characteristic_uuid)
}

fn parse_data_string(data: &str) -> Vec<u8> {
    let s = data.trim();
    let is_hex = s.starts_with("0x") || s.chars().all(|c| c.is_ascii_hexdigit());
    if is_hex {
        let hex_str = if s.starts_with("0x") { &s[2..] } else { s };
        let bytes = (0..hex_str.len())
            .step_by(2)
            .filter_map(|i| u8::from_str_radix(&hex_str[i..i + 2.min(hex_str.len()-i)], 16).ok())
            .collect::<Vec<u8>>();
        return bytes;
    }
    s.as_bytes().to_vec()
}

// 写入特征值（writeType: "request" | "command"）
#[tauri::command]
#[allow(non_snake_case)]
async fn write_characteristic(
    deviceId: String,
    serviceUuid: String,
    characteristicUuid: String,
    data: String,
    writeType: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    // 适配器
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() { return Err("未找到可用的蓝牙适配器".into()); }
                let new_adapter = adapters[0].clone();
                {
                    let mut current_adapter = state.current_adapter.lock().unwrap();
                    *current_adapter = Some(new_adapter.clone());
                }
                new_adapter
            }
        }
    };

    // peripheral
    let mut peripheral_opt = None;
    if let Ok(peripherals) = adapter.scan_get_results() {
        for p in peripherals.iter() { if p.identifier().ok().as_deref() == Some(&deviceId) { peripheral_opt = Some(p.clone()); break; } }
    }
    if peripheral_opt.is_none() {
        if let Ok(paired) = adapter.get_paired_peripherals() {
            for p in paired.iter() { if p.identifier().ok().as_deref() == Some(&deviceId) { peripheral_opt = Some(p.clone()); break; } }
        }
    }
    let peripheral = peripheral_opt.ok_or_else(|| format!("未找到设备: {}", deviceId))?;

    // 尝试连接
    if matches!(peripheral.is_connected(), Ok(false)) {
        let _ = peripheral.connect();
    }

    let bytes = parse_data_string(&data);
    let wt = writeType.unwrap_or_else(|| "request".to_string());
    match wt.as_str() {
        "command" => peripheral
            .write_command(&serviceUuid, &characteristicUuid, &bytes)
            .map_err(|e| format!("写入(命令)失败: {}", e))?,
        _ => peripheral
            .write_request(&serviceUuid, &characteristicUuid, &bytes)
            .map_err(|e| format!("写入(请求)失败: {}", e))?,
    }
    Ok(())
}

// 订阅通知
#[tauri::command]
#[allow(non_snake_case)]
async fn notify_characteristic(
    deviceId: String,
    serviceUuid: String,
    characteristicUuid: String,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() { return Err("未找到可用的蓝牙适配器".into()); }
                let new_adapter = adapters[0].clone();
                {
                    let mut current_adapter = state.current_adapter.lock().unwrap();
                    *current_adapter = Some(new_adapter.clone());
                }
                new_adapter
            }
        }
    };

    let mut peripheral_opt = None;
    if let Ok(peripherals) = adapter.scan_get_results() {
        for p in peripherals.iter() { if p.identifier().ok().as_deref() == Some(&deviceId) { peripheral_opt = Some(p.clone()); break; } }
    }
    if peripheral_opt.is_none() {
        if let Ok(paired) = adapter.get_paired_peripherals() {
            for p in paired.iter() { if p.identifier().ok().as_deref() == Some(&deviceId) { peripheral_opt = Some(p.clone()); break; } }
        }
    }
    let peripheral = peripheral_opt.ok_or_else(|| format!("未找到设备: {}", deviceId))?;

    // 订阅并在后台转发事件
    let mut stream = peripheral
        .notify(&serviceUuid, &characteristicUuid)
        .map_err(|e| format!("订阅通知失败: {}", e))?;

    let key = make_key(&deviceId, &serviceUuid, &characteristicUuid);
    let handle = tokio::spawn(async move {
        while let Some(item) = stream.next().await {
            if let Ok(simplersble::peripheral::ValueChangedEvent::ValueUpdated(data)) = item {
                let payload = serde_json::json!({
                    "deviceId": deviceId,
                    "serviceUuid": serviceUuid,
                    "characteristicUuid": characteristicUuid,
                    "value": hex::encode_upper(data),
                    "kind": "notify"
                });
                let _ = app_handle.emit_all("characteristic-value", payload);
            }
        }
    });
    state.subscriptions.lock().unwrap().insert(key, handle);
    Ok(())
}

// 订阅指示
#[tauri::command]
#[allow(non_snake_case)]
async fn indicate_characteristic(
    deviceId: String,
    serviceUuid: String,
    characteristicUuid: String,
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() { return Err("未找到可用的蓝牙适配器".into()); }
                let new_adapter = adapters[0].clone();
                {
                    let mut current_adapter = state.current_adapter.lock().unwrap();
                    *current_adapter = Some(new_adapter.clone());
                }
                new_adapter
            }
        }
    };

    let mut peripheral_opt = None;
    if let Ok(peripherals) = adapter.scan_get_results() {
        for p in peripherals.iter() { if p.identifier().ok().as_deref() == Some(&deviceId) { peripheral_opt = Some(p.clone()); break; } }
    }
    if peripheral_opt.is_none() {
        if let Ok(paired) = adapter.get_paired_peripherals() {
            for p in paired.iter() { if p.identifier().ok().as_deref() == Some(&deviceId) { peripheral_opt = Some(p.clone()); break; } }
        }
    }
    let peripheral = peripheral_opt.ok_or_else(|| format!("未找到设备: {}", deviceId))?;

    let mut stream = peripheral
        .indicate(&serviceUuid, &characteristicUuid)
        .map_err(|e| format!("订阅指示失败: {}", e))?;

    let key = make_key(&deviceId, &serviceUuid, &characteristicUuid);
    let handle = tokio::spawn(async move {
        while let Some(item) = stream.next().await {
            if let Ok(simplersble::peripheral::ValueChangedEvent::ValueUpdated(data)) = item {
                let payload = serde_json::json!({
                    "deviceId": deviceId,
                    "serviceUuid": serviceUuid,
                    "characteristicUuid": characteristicUuid,
                    "value": hex::encode_upper(data),
                    "kind": "indicate"
                });
                let _ = app_handle.emit_all("characteristic-value", payload);
            }
        }
    });
    state.subscriptions.lock().unwrap().insert(key, handle);
    Ok(())
}

// 退订（适用于通知/指示）
#[tauri::command]
#[allow(non_snake_case)]
async fn unsubscribe_characteristic(
    deviceId: String,
    serviceUuid: String,
    characteristicUuid: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let key = make_key(&deviceId, &serviceUuid, &characteristicUuid);
    if let Some(handle) = state.subscriptions.lock().unwrap().remove(&key) {
        handle.abort();
    }

    // 也尝试调用底层退订
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() { return Err("未找到可用的蓝牙适配器".into()); }
                adapters[0].clone()
            }
        }
    };
    if let Ok(peripherals) = adapter.scan_get_results() {
        for p in peripherals.iter() {
            if p.identifier().ok().as_deref() == Some(&deviceId) {
                let _ = p.unsubscribe(&serviceUuid, &characteristicUuid);
                break;
            }
        }
    }
    if let Ok(paired) = adapter.get_paired_peripherals() {
        for p in paired.iter() {
            if p.identifier().ok().as_deref() == Some(&deviceId) {
                let _ = p.unsubscribe(&serviceUuid, &characteristicUuid);
                break;
            }
        }
    }
    Ok(())
}

// 获取 MTU
#[tauri::command]
#[allow(non_snake_case)]
async fn get_mtu(deviceId: String, state: State<'_, AppState>) -> Result<u16, String> {
    let adapter = {
        let current_adapter_guard = state.current_adapter.lock().unwrap();
        match current_adapter_guard.clone() {
            Some(adapter) => adapter,
            None => {
                drop(current_adapter_guard);
                let adapters = simplersble::Adapter::get_adapters()
                    .map_err(|e| format!("获取蓝牙适配器失败: {}", e))?;
                if adapters.is_empty() { return Err("未找到可用的蓝牙适配器".into()); }
                adapters[0].clone()
            }
        }
    };
    let mut peripheral_opt = None;
    if let Ok(peripherals) = adapter.scan_get_results() {
        for p in peripherals.iter() { if p.identifier().ok().as_deref() == Some(&deviceId) { peripheral_opt = Some(p.clone()); break; } }
    }
    if peripheral_opt.is_none() {
        if let Ok(paired) = adapter.get_paired_peripherals() {
            for p in paired.iter() { if p.identifier().ok().as_deref() == Some(&deviceId) { peripheral_opt = Some(p.clone()); break; } }
        }
    }
    let peripheral = peripheral_opt.ok_or_else(|| format!("未找到设备: {}", deviceId))?;
    peripheral.mtu().map_err(|e| format!("获取 MTU 失败: {}", e))
}