'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Zap } from 'lucide-react';

interface MarketItem {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  marketCap?: number;
  marketCapFormatted?: string;
  rank?: number;
}

interface MarketListProps {
  title: string;
  subtitle: string;
  data: MarketItem[];
  type: 'market' | 'gainer' | 'loser';
  icon: React.ReactNode;
  color: 'blue' | 'pink';
  onAction?: () => void;
  actionLabel?: string;
  isTrading?: boolean;
  isLoading?: boolean;
  openPositions?: Set<string>;
  onOpenPosition?: (symbol: string, side: 'LONG' | 'SHORT') => void;
  ignoredSymbols?: string; // 忽略的币种列表（空格分隔）
}

export const MarketList: React.FC<MarketListProps> = ({ 
  title, 
  subtitle, 
  data, 
  type, 
  icon, 
  color,
  onAction,
  actionLabel,
  isTrading,
  isLoading = false,
  openPositions = new Set(),
  onOpenPosition,
  ignoredSymbols = ''
}) => {
  const isLong = type === 'market' || type === 'loser';
  const isLoser = type === 'loser';
  const accentColor = isLong ? 'text-green-600' : isLoser ? 'text-orange-600' : 'text-red-600';
  const bgColor = isLong ? 'bg-green-50' : isLoser ? 'bg-orange-50' : 'bg-red-50';
  const borderColor = isLong ? 'border-green-100' : isLoser ? 'border-orange-100' : 'border-red-100';
  const buttonColor = isLong ? 'bg-green-600 hover:bg-green-700' : isLoser ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700';

  // 格式化价格：最多展示四位小数，去掉末尾的0
  const formatPrice = (price: number) => {
    // 先格式化为4位小数，然后用parseFloat去掉末尾的0
    const formatted = parseFloat(price.toFixed(4));
    return formatted;
  };

  // 获取忽略的币种列表（优先使用传入的 prop，否则从 localStorage 读取）
  const ignoredSymbolsStr = ignoredSymbols || (typeof window !== 'undefined' ? localStorage.getItem('ignored_symbols') || '' : '');
  const ignoredSet = new Set(
    ignoredSymbolsStr
      .split(/\s+/)
      .filter(s => s.length > 0)
      .map(s => s.toUpperCase())
  );

  const isSymbolIgnored = (symbol: string) => {
    const cleanSymbol = symbol.replace('/USDT:USDT', '').replace('/USDT', '');
    return ignoredSet.has(cleanSymbol);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full relative"
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-20 rounded-3xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-sm font-bold text-gray-600">加载中...</span>
          </div>
        </div>
      )}
      <div className={`p-6 border-b ${borderColor} ${bgColor} backdrop-blur-sm sticky top-0 z-10 flex justify-between items-start`}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`p-2 rounded-xl bg-white shadow-sm ${accentColor}`}>
              {icon}
            </div>
            <h2 className="text-lg font-black text-gray-900">{title}</h2>
          </div>
          <p className="text-gray-500 text-sm font-medium ml-12">{subtitle}</p>
        </div>

        {onAction && (
          <button
            onClick={onAction}
            disabled={isTrading}
            className={`${buttonColor} text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg shadow-gray-200 hover:shadow-xl transition-all flex items-center gap-1 disabled:opacity-50 disabled:scale-100 active:scale-95`}
          >
            <Zap className="w-3 h-3 fill-white" />
            {actionLabel}
          </button>
        )}
      </div>

      <div className="overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 flex-1 custom-scrollbar">
        {data.map((item, index) => {
          const isOpen = openPositions.has(item.symbol);
          return (
            <motion.div
              key={item.symbol}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="group bg-white border border-gray-100 rounded-xl md:rounded-2xl p-3 md:p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300"
            >
              {/* Mobile Layout */}
              <div className="md:hidden">
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Rank + Symbol + Price */}
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 truncate">
                        {item.symbol.replace(/\/USDT:USDT|\/USDT|:USDT/, '')}
                      </h3>
                      <div className="text-xs text-gray-500 font-medium mt-0.5">
                        ${formatPrice(parseFloat(item.price.toString()))}
                      </div>
                      {type === 'market' && item.marketCapFormatted ? (
                        <div className="text-xs text-gray-400 mt-0.5">市值: ${item.marketCapFormatted}</div>
                      ) : (
                        <div className="text-xs text-gray-400 mt-0.5">Vol: ${(item as any).volumeFormatted}</div>
                      )}
                    </div>
                  </div>

                  {/* Right: Change + Action */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className={`flex items-center gap-0.5 px-2 py-1 rounded-lg font-bold text-xs whitespace-nowrap ${
                      item.change >= 0 
                        ? 'bg-green-50 text-green-600' 
                        : 'bg-red-50 text-red-600'
                    }`}>
                      {item.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(parseFloat(item.change.toString())).toFixed(2)}%
                    </div>

                    {isOpen ? (
                      <span className="px-2 py-1 rounded-lg font-bold text-xs bg-green-50 text-green-600 whitespace-nowrap" title="已开仓">
                        已开仓
                      </span>
                    ) : isSymbolIgnored(item.symbol) ? (
                      <span className="px-2 py-1 rounded-lg font-bold text-xs bg-gray-100 text-gray-500 whitespace-nowrap" title="已被添加到忽略列表">
                        已忽略
                      </span>
                    ) : (
                      <button
                        onClick={() => onOpenPosition?.(item.symbol, isLong ? 'LONG' : 'SHORT')}
                        disabled={isTrading}
                        className={`px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap ${buttonColor}`}
                        title={isTrading ? '交易进行中...' : '点击开仓'}
                      >
                        <Zap className="w-2.5 h-2.5 fill-white" />
                        {isLong ? '做多' : '做空'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">
                      {item.symbol.replace(/\/USDT:USDT|\/USDT|:USDT/, '')}
                      {type === 'market' && item.rank && <span className="ml-2 text-xs text-gray-400">#{item.rank}</span>}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium mt-0.5">
                      <span className="flex items-center">
                        <DollarSign className="w-3 h-3" />
                        {formatPrice(parseFloat(item.price.toString()))}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      {type === 'market' && item.marketCapFormatted ? (
                        <span className="text-gray-500 font-bold">市值: ${item.marketCapFormatted}</span>
                      ) : (
                        <span className="text-gray-500">Vol: ${(item as any).volumeFormatted}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-sm ${
                    item.change >= 0 
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-red-50 text-red-600'
                  }`}>
                    {item.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    {Math.abs(parseFloat(item.change.toString())).toFixed(2)}%
                  </div>

                  {isOpen ? (
                    <span className="px-3 py-1.5 rounded-lg font-bold text-sm bg-green-50 text-green-600" title="已开仓，不能重复开仓">
                      已开仓
                    </span>
                  ) : isSymbolIgnored(item.symbol) ? (
                    <span className="px-3 py-1.5 rounded-lg font-bold text-sm bg-gray-100 text-gray-500" title="已被添加到忽略列表">
                      已忽略
                    </span>
                  ) : (
                    <button
                      onClick={() => onOpenPosition?.(item.symbol, isLong ? 'LONG' : 'SHORT')}
                      disabled={isTrading}
                      className={`px-3 py-1.5 rounded-lg font-bold text-sm text-white flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50 ${buttonColor}`}
                      title={isTrading ? '交易进行中...' : '点击开仓'}
                    >
                      <Zap className="w-3 h-3 fill-white" />
                      {isLong ? '做多' : '做空'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

