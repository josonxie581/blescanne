import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  Code,
  ExternalLink, 
  Package, 
  Info, 
  Settings,
  ChevronDown,
  ChevronRight,
  Star,
  ArrowLeft,
  Home,
  Heart,
  Github,
  Layers,
  Zap,
  Shield,
  Monitor,
  Palette,
  Globe2,
  Award,
  Sparkles,
  Users,
  Coffee
} from 'lucide-react';

interface DependencyInfo {
  name: string;
  version: string;
  description: string;
  license?: string;
  url?: string;
  category: 'frontend' | 'backend' | 'development' | 'core';
  type: 'npm' | 'cargo' | 'system';
}

const AboutPage: React.FC = () => {
  const { t } = useTranslation(['common', 'about']);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // 项目依赖信息
  const dependencies: DependencyInfo[] = [
    // 核心框架
    {
      name: 'SimpleBLE',
      version: '0.10.4-dev1',
      description: '跨平台蓝牙低功耗（BLE）库，提供简单易用的 BLE 通信 API',
      license: 'MIT',
      url: 'https://github.com/OpenBluetoothToolbox/SimpleBLE',
      category: 'core',
      type: 'system'
    },
    {
      name: 'Tauri',
      version: '1.0',
      description: '跨平台桌面应用框架，提供 Rust 后端和 Web 前端的桥梁',
      license: 'Apache-2.0 / MIT',
      url: 'https://tauri.app/',
      category: 'core',
      type: 'cargo'
    },
    {
      name: 'React',
      version: '18.2.0',
      description: '用于构建用户界面的现代 JavaScript 库',
      license: 'MIT',
      url: 'https://reactjs.org/',
      category: 'frontend',
      type: 'npm'
    },

    // 前端框架和工具
    {
      name: 'TypeScript',
      version: '5.0.2',
      description: '带有类型系统的 JavaScript 超集，提供更好的开发体验',
      license: 'Apache-2.0',
      url: 'https://www.typescriptlang.org/',
      category: 'development',
      type: 'npm'
    },
    {
      name: 'Vite',
      version: '4.4.4',
      description: '现代前端构建工具，提供极速的开发服务器和优化构建',
      license: 'MIT',
      url: 'https://vitejs.dev/',
      category: 'development',
      type: 'npm'
    },
    {
      name: 'Tailwind CSS',
      version: '3.3.3',
      description: '实用优先的 CSS 框架，用于快速构建自定义设计',
      license: 'MIT',
      url: 'https://tailwindcss.com/',
      category: 'frontend',
      type: 'npm'
    },

    // React 生态系统
    {
      name: 'React Router',
      version: '7.8.2',
      description: 'React 应用的声明式路由解决方案',
      license: 'MIT',
      url: 'https://reactrouter.com/',
      category: 'frontend',
      type: 'npm'
    },
    {
      name: 'React i18next',
      version: '13.2.2',
      description: '强大的 React 国际化框架，支持多语言切换',
      license: 'MIT',
      url: 'https://react.i18next.com/',
      category: 'frontend',
      type: 'npm'
    },
    {
      name: 'Lucide React',
      version: '0.263.1',
      description: '精美的开源图标库，提供一致的设计风格',
      license: 'ISC',
      url: 'https://lucide.dev/',
      category: 'frontend',
      type: 'npm'
    },

    // Rust 后端依赖
    {
      name: 'Tokio',
      version: '1.0',
      description: 'Rust 异步运行时，为高性能网络应用提供支持',
      license: 'MIT',
      url: 'https://tokio.rs/',
      category: 'backend',
      type: 'cargo'
    },
    {
      name: 'Serde',
      version: '1.0',
      description: 'Rust 序列化和反序列化框架，JSON 处理的首选',
      license: 'MIT',
      url: 'https://serde.rs/',
      category: 'backend',
      type: 'cargo'
    },
    {
      name: 'UUID',
      version: '1.0',
      description: '通用唯一标识符生成和解析库',
      license: 'Apache-2.0',
      url: 'https://github.com/uuid-rs/uuid',
      category: 'backend',
      type: 'cargo'
    },
    {
      name: 'Anyhow',
      version: '1.0',
      description: 'Rust 错误处理库，提供灵活的错误处理机制',
      license: 'MIT',
      url: 'https://github.com/dtolnay/anyhow',
      category: 'backend',
      type: 'cargo'
    }
  ];

  // 获取分类图标
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'core':
        return <Zap className="w-5 h-5" />;
      case 'frontend':
        return <Monitor className="w-5 h-5" />;
      case 'backend':
        return <Settings className="w-5 h-5" />;
      case 'development':
        return <Code className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'core':
        return 'from-purple-500 to-pink-500';
      case 'frontend':
        return 'from-blue-500 to-cyan-500';
      case 'backend':
        return 'from-green-500 to-emerald-500';
      case 'development':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 relative overflow-hidden">
      {/* 背景动画元素 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* 返回按钮 */}
          <div className="flex items-start">
            <Link
              to="/"
              className="group flex items-center gap-3 px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full transition-all duration-300 shadow-lg border border-white/20 dark:border-gray-700/50 hover:shadow-xl hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <Home className="w-4 h-4" />
              <span className="font-medium">{t('backToHome', { ns: 'common' })}</span>
            </Link>
          </div>

          {/* Hero Section */}
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl shadow-2xl mb-8 animate-pulse">
              <Info className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-800 via-blue-600 to-purple-600 dark:from-white dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
              {t('title', { ns: 'about' })}
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              {t('subtitle', { ns: 'about' })}
            </p>

            {/* 特色标签 */}
            <div className="flex flex-wrap justify-center gap-3 mt-8">
              {[
                { icon: <Zap className="w-4 h-4" />, textKey: 'highPerformance', color: 'from-yellow-400 to-orange-500' },
                { icon: <Shield className="w-4 h-4" />, textKey: 'crossPlatform', color: 'from-green-400 to-emerald-500' },
                { icon: <Palette className="w-4 h-4" />, textKey: 'modernDesign', color: 'from-pink-400 to-purple-500' },
                { icon: <Globe2 className="w-4 h-4" />, textKey: 'multiLanguage', color: 'from-blue-400 to-cyan-500' }
              ].map((tag, index) => (
                <div
                  key={index}
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${tag.color} text-white rounded-full shadow-lg text-sm font-medium hover:shadow-xl transform hover:scale-105 transition-all duration-200`}
                >
                  {tag.icon}
                  <span>{t(tag.textKey, { ns: 'about' })}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 项目信息卡片 */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 hover:shadow-3xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Star className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('projectInfo.title', { ns: 'about' })}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 项目详情 */}
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-500" />
                    {t('projectInfo.name', { ns: 'about' })}
                  </h3>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">BLE Scanner</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Version {t('projectInfo.version', { ns: 'about' })}: 0.1.0
                  </p>
                </div>
                
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border border-purple-100 dark:border-purple-800/50">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-purple-500" />
                    {t('projectInfo.description', { ns: 'about' })}
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {t('projectInfo.descriptionText', { ns: 'about' })}
                  </p>
                </div>
              </div>
              
              {/* 技术栈和特性 */}
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800/50">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-green-500" />
                    {t('projectInfo.techStack', { ns: 'about' })}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {['Tauri', 'React', 'TypeScript', 'Rust', 'Tailwind CSS'].map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1.5 bg-white dark:bg-gray-700 text-green-700 dark:text-green-300 rounded-lg text-sm font-medium border border-green-200 dark:border-green-600 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 rounded-2xl border border-orange-100 dark:border-orange-800/50">
                  <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    {t('projectInfo.features', { ns: 'about' })}
                  </h3>
                  <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{t('projectInfo.feature1', { ns: 'about' })}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{t('projectInfo.feature2', { ns: 'about' })}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{t('projectInfo.feature3', { ns: 'about' })}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{t('projectInfo.feature4', { ns: 'about' })}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* SimpleBLE 特别致谢卡片（整块可点击） */}
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl p-1">
            <div
              className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl p-8 cursor-pointer hover:shadow-xl transition-shadow"
              role="link"
              tabIndex={0}
              onClick={() => window.open('https://github.com/OpenBluetoothToolbox/SimpleBLE', '_blank', 'noopener,noreferrer')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open('https://github.com/OpenBluetoothToolbox/SimpleBLE', '_blank', 'noopener,noreferrer'); } }}
            >
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-6">
                  <Award className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  {t('poweredBySimpleBLE', { ns: 'about' })}
                </h3>
                
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto leading-relaxed">
                  {t('simpleBleDescription', { ns: 'about' })}
                </p>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <a
                    href="https://github.com/OpenBluetoothToolbox/SimpleBLE"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="group inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 text-white rounded-full hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                  >
                    <Github className="w-4 h-4" />
                    <span>GitHub Repository</span>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>MIT License</span>
                  </div>
                  
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                    <Package className="w-4 h-4" />
                    <span>v0.10.4-dev1</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 依赖库列表 */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('dependencies.title', { ns: 'about' })}
              </h2>
            </div>
            
            <div className="space-y-6">
              {['core', 'frontend', 'backend', 'development'].map((category) => {
                const categoryDeps = dependencies.filter(dep => dep.category === category);
                if (categoryDeps.length === 0) return null;
                
                return (
                  <div key={category} className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => toggleSection(`deps-${category}`)}
                      className={`flex items-center gap-4 w-full text-left p-6 bg-gradient-to-r ${getCategoryColor(category)} text-white hover:shadow-lg transition-all duration-200`}
                    >
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        {getCategoryIcon(category)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold">
                          {t(`dependencies.categories.${category}`, { ns: 'about' })}
                        </h3>
                        <p className="text-white/80 text-sm">
                          {categoryDeps.length} {t('dependencyCount', { ns: 'about' })}
                        </p>
                      </div>
                      <div className="text-white/80">
                        {expandedSection === `deps-${category}` ? (
                          <ChevronDown className="w-6 h-6" />
                        ) : (
                          <ChevronRight className="w-6 h-6" />
                        )}
                      </div>
                    </button>
                    
                    {expandedSection === `deps-${category}` && (
                      <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {categoryDeps.map((dep) => (
                            <div
                              key={dep.name}
                              role={dep.url ? 'link' : undefined}
                              tabIndex={dep.url ? 0 : -1}
                              onClick={() => { if (dep.url) window.open(dep.url, '_blank', 'noopener,noreferrer'); }}
                              onKeyDown={(e) => { if (dep.url && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); window.open(dep.url, '_blank', 'noopener,noreferrer'); } }}
                              className={`p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 transition-shadow ${dep.url ? 'hover:shadow-md cursor-pointer' : ''}`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h4 className="font-bold text-gray-900 dark:text-white">
                                      {dep.name}
                                    </h4>
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      dep.type === 'npm' 
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                        : dep.type === 'cargo'
                                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                    }`}>
                                      {dep.type}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">
                                    {dep.description}
                                  </p>
                                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                                    <span className="font-mono">v{dep.version}</span>
                                    {dep.license && (
                                      <span className="flex items-center gap-1">
                                        <Shield className="w-3 h-3" />
                                        {dep.license}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {dep.url && (
                                  <span
                                    className="text-blue-500 dark:text-blue-400 p-2 rounded-lg"
                                    aria-hidden
                                    title={dep.url}
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 致谢部分 */}
          <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 rounded-3xl shadow-2xl p-1">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-3xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg mb-6">
                <Heart className="w-8 h-8 text-white" />
              </div>
              
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
                {t('acknowledgments.title', { ns: 'about' })}
              </h2>
              
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-3xl mx-auto mb-8 text-lg">
                {t('acknowledgments.text', { ns: 'about' })}
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-6 text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="font-medium">Made with Love</span>
                </div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Coffee className="w-5 h-5 text-amber-500" />
                  <span>Powered by Coffee</span>
                </div>
                <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <span>Open Source Community</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

  <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default AboutPage;