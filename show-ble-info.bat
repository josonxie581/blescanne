@echo off
title BLE Scanner - Enhanced Device Information
echo ========================================
echo   BLE Scanner - Enhanced Device Display
echo ========================================
echo.

echo New BLE Information Display Features:
echo.
echo [+] BLE Name Display:
echo     - Clear "BLE Name:" label
echo     - Shows device name or "未知设备 (Unnamed)" 
echo     - Examples: "John's iPhone", "ESP32-BLE-Dev"
echo.
echo [+] Advertised Services:
echo     - Clear "Advertised Services:" header
echo     - Service count badge
echo     - UUID formatting with service names
echo     - Standard (STD) vs Custom (CUSTOM) identification
echo.
echo [+] Enhanced Device Examples:
echo     - iPhone with Apple services
echo     - AirPods with audio services  
echo     - Fitness tracker with health services
echo     - Unnamed device
echo     - ESP32 development board with 8 services
echo.

echo Starting enhanced BLE Scanner...
npm run tauri dev

pause