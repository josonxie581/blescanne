import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export interface FilterOptions {
  name: string;
  minRssi: number;
  maxRssi: number;
  macAddress: string;
  connectable: 'all' | 'connectable' | 'non-connectable';
}

interface ScanFilterProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  deviceCount: number;
  filteredCount: number;
}

const ScanFilter: React.FC<ScanFilterProps> = ({
  filters,
  onFiltersChange,
  deviceCount,
  filteredCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation('home');

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      name: '',
      minRssi: -100,
      maxRssi: 0,
      macAddress: '',
      connectable: 'all',
    });
  };

  const hasActiveFilters = 
    filters.name !== '' ||
    filters.minRssi !== -100 ||
    filters.maxRssi !== 0 ||
    filters.macAddress !== '' ||
    filters.connectable !== 'all';

  return (
    <div className="relative group">
      {/* 背景光晕 */}
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-purple-500/20 to-fuchsia-500/20 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition duration-500"></div>
      
      <div className="relative bg-white/60 dark:bg-gray-800/80 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-2xl shadow-2xl shadow-violet-500/10 dark:shadow-black/20 transition-all duration-500 hover:shadow-3xl hover:shadow-violet-500/20">
      {/* Filter Header */}
      <div 
        className="flex items-center justify-between p-7 cursor-pointer hover:bg-violet-50/40 dark:hover:bg-gray-700/40 rounded-t-2xl transition-all duration-300 backdrop-blur-sm"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <Filter className="w-5 h-5 text-blue-500 dark:text-blue-400 transition-colors" />
          <h3 className="text-transparent bg-gradient-to-r from-gray-800 via-violet-700 to-purple-800 dark:from-white dark:via-violet-200 dark:to-purple-200 bg-clip-text text-lg font-bold transition-all duration-300">{t('filter.title')}</h3>
          {hasActiveFilters && (
            <span className="px-3 py-1.5 text-xs bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full shadow-lg shadow-violet-500/30 backdrop-blur-sm border border-violet-400/50 transition-all duration-300 animate-pulse">
              {t('filter.enabled')}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
            {t('filter.showing', { filtered: filteredCount, total: deviceCount })}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Filter Controls */}
      {isExpanded && (
        <div className="p-7 border-t border-violet-200/30 dark:border-gray-700/50 space-y-6 bg-gradient-to-r from-violet-50/20 via-purple-50/20 to-fuchsia-50/20 dark:bg-gradient-to-r dark:from-gray-800/20 dark:via-gray-700/20 dark:to-gray-600/20 rounded-b-2xl backdrop-blur-sm transition-all duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Name Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                {t('filter.name')}
              </label>
              <input
                type="text"
                value={filters.name}
                onChange={(e) => updateFilter('name', e.target.value)}
                placeholder={t('filter.namePlaceholder') || ''}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm hover:shadow-md transition-all duration-200"
              />
            </div>

            {/* MAC Address Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                {t('filter.mac')}
              </label>
              <input
                type="text"
                value={filters.macAddress}
                onChange={(e) => updateFilter('macAddress', e.target.value.toUpperCase())}
                placeholder="AA:BB:CC:DD:EE:FF"
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-mono shadow-sm hover:shadow-md transition-all duration-200"
              />
            </div>

            {/* RSSI Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                {t('filter.rssi')}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={filters.minRssi}
                  onChange={(e) => updateFilter('minRssi', parseInt(e.target.value) || -100)}
                  min="-100"
                  max="0"
                  className="w-20 px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm hover:shadow-md transition-all duration-200"
                />
                <span className="text-gray-600 dark:text-gray-400 transition-colors">{t('filter.to')}</span>
                <input
                  type="number"
                  value={filters.maxRssi}
                  onChange={(e) => updateFilter('maxRssi', parseInt(e.target.value) || 0)}
                  min="-100"
                  max="0"
                  className="w-20 px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>
            </div>

            {/* Connectable Filter */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                {t('filter.connectable')}
              </label>
              <select
                value={filters.connectable}
                onChange={(e) => updateFilter('connectable', e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <option value="all">{t('filter.connectable_all')}</option>
                <option value="connectable">{t('filter.connectable_only')}</option>
                <option value="non-connectable">{t('filter.connectable_none')}</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-2 border-t border-purple-200/30 dark:border-gray-700">
              <button
                onClick={clearFilters}
                className="flex items-center space-x-2 px-4 py-2 text-sm bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
              >
                <X className="w-4 h-4" />
                <span>{t('filter.clearFilters')}</span>
              </button>
            </div>
          )}

          {/* Quick Filter Presets */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-purple-200/30 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{t('filter.quick')}</span>
            <button
              onClick={() => updateFilter('minRssi', -60)}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              {t('filter.quickStrong')}
            </button>
            <button
              onClick={() => updateFilter('connectable', 'connectable')}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              {t('filter.quickConnectable')}
            </button>
            <button
              onClick={() => updateFilter('name', 'iPhone')}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              {t('filter.quickIPhone')}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ScanFilter;