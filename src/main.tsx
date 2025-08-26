import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import "./i18n";
import DeviceDetailsPage from "./pages/DeviceDetailsPage";
import AboutPage from "./pages/AboutPage";
import { ThemeProvider } from "./contexts/ThemeContext";
import "./index.css";

// 添加全局错误监听
window.addEventListener('error', (event) => {
  console.error('===== 全局JavaScript错误 =====', event.error);
  console.error('错误消息:', event.message);
  console.error('错误文件:', event.filename);
  console.error('错误行号:', event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('===== 未处理的Promise拒绝 =====', event.reason);
});

console.log('===== React应用开始初始化 =====');

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/device-details" element={<DeviceDetailsPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);