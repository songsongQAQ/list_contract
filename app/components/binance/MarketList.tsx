'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Zap, X, Ban, CheckCircle2 } from 'lucide-react';

interface MarketItem {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  volumeFormatted?: string;
  marketCap?: number;
  marketCapFormatted?: string;
  rank?: number;
}

interface Position {
  symbol: string;
  size: number;
  entryPrice: number;
  markPrice: number;
  pnl: number;
  side: 'LONG' | 'SHORT';
  leverage: number;
  positionNotional: number;
  margin: number;
  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;
}

interface MarketListProps {
  title: string;
  subtitle: string;
  data: MarketItem[];
  type: 'market' | 'gainer' | 'loser';
  icon: React.ReactNode;
  color: 'blue' | 'pink';
  onActionLong?: () => void;
  onActionShort?: () => void;
  isTrading?: boolean;
  isLoading?: boolean;
  openPositions?: Set<string>;
  onOpenPosition?: (symbol: string, side: 'LONG' | 'SHORT') => void;
  onAddMargin?: (symbol: string, side: 'LONG' | 'SHORT') => void;
  ignoredSymbols?: string; // 忽略的币种列表（空格分隔）
  positions?: Position[]; // 持仓列表
  onClosePosition?: (symbol: string) => void; // 平仓回调
  onAddToIgnore?: (symbol: string) => void; // 添加到忽略列表回调
  onRemoveFromIgnore?: (symbol: string) => void; // 从忽略列表移除回调
}

export const MarketList: React.FC<MarketListProps> = ({ 
  title, 
  subtitle, 
  data, 
  type, 
  icon, 
  color,
  onActionLong,
  onActionShort,
  isTrading,
  isLoading = false,
  openPositions = new Set(),
  onOpenPosition,
  onAddMargin,
  ignoredSymbols = '',
  positions = [],
  onClosePosition,
  onAddToIgnore,
  onRemoveFromIgnore
}) => {
  const isLong = type === 'market' || type === 'loser';
  const isLoser = type === 'loser';
  const accentColor = isLong ? 'text-green-600' : isLoser ? 'text-orange-600' : 'text-red-600';
  const bgColor = isLong ? 'bg-green-50' : isLoser ? 'bg-orange-50' : 'bg-red-50';
  const borderColor = isLong ? 'border-green-100' : isLoser ? 'border-orange-100' : 'border-red-100';
  const buttonColor = isLong ? 'bg-green-600 hover:bg-green-700' : isLoser ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700';

  // 根据 symbol 查找持仓
  const getPositionBySymbol = (symbol: string) => {
    return positions.find(p => p.symbol === symbol);
  };

  // 格式化价格：最多展示6位小数，去掉末尾的0
  const formatPrice = (price: number) => {
    // 先格式化为6位小数，然后用parseFloat去掉末尾的0
    const formatted = parseFloat(price.toFixed(6));
    return formatted;
  };

  // 格式化交易量
  const formatVolume = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  // 获取忽略的币种列表（使用传入的 prop）
  const ignoredSymbolsStr = ignoredSymbols || '';
  const ignoredSet = new Set(
    ignoredSymbolsStr
      .split(/\s+/)
      .filter(s => s.length > 0)
      .map(s => s.toUpperCase())
  );

  const isSymbolIgnored = (symbol: string) => {
    // 清理symbol，提取币名（例如 COAI/USDT:USDT -> COAI）
    const cleanSymbol = symbol
      .split('/')[0]
      .split(':')[0]
      .toUpperCase();
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

        <div className="flex gap-2 flex-wrap justify-end">
          {onActionLong && (
            <button
              onClick={onActionLong}
              disabled={isTrading}
              className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg shadow-gray-200 hover:shadow-xl transition-all flex items-center gap-1 disabled:opacity-50 disabled:scale-100 active:scale-95"
            >
              <Zap className="w-3 h-3 fill-white" />
              做多
            </button>
          )}
          {onActionShort && (
            <button
              onClick={onActionShort}
              disabled={isTrading}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg shadow-gray-200 hover:shadow-xl transition-all flex items-center gap-1 disabled:opacity-50 disabled:scale-100 active:scale-95"
            >
              <Zap className="w-3 h-3 fill-white" />
              做空
            </button>
          )}
        </div>
      </div>

      <div className="overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 flex-1 custom-scrollbar">
        {data.map((item, index) => {
          const isOpen = openPositions.has(item.symbol);
          const position = getPositionBySymbol(item.symbol);
          const hasPosition = !!position;

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
                      {hasPosition ? (
                        <div className={`text-xs font-bold mt-0.5 ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          盈亏: {position.pnl > 0 ? '+' : ''}{position.pnl.toFixed(2)} ({((position.pnl / position.margin) * 100).toFixed(1)}%)
                        </div>
                      ) : (
                        <>
                          {type === 'market' && item.marketCapFormatted ? (
                            <div className="text-xs text-gray-400 mt-0.5">市值: ${item.marketCapFormatted}</div>
                          ) : (
                            <div className="text-xs text-gray-400 mt-0.5">Vol: ${item.volumeFormatted || formatVolume(item.volume)}</div>
                          )}
                        </>
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

                    {hasPosition ? (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => onAddMargin?.(item.symbol, position.side)}
                          disabled={isTrading}
                          className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-red-600 hover:bg-red-700"
                          title={isTrading ? '交易进行中...' : '点击补仓'}
                        >
                          <Zap className="w-2.5 h-2.5 fill-white" />
                          补
                        </button>
                        <button
                          onClick={() => onClosePosition?.(item.symbol)}
                          disabled={isTrading}
                          className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-gray-600 hover:bg-gray-700"
                          title={isTrading ? '交易进行中...' : '点击平仓'}
                        >
                          <X className="w-2.5 h-2.5" />
                          平
                        </button>
                      </div>
                    ) : isSymbolIgnored(item.symbol) ? (
                      <button
                        onClick={() => onRemoveFromIgnore?.(item.symbol)}
                        disabled={isTrading}
                        className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-gray-500 hover:bg-gray-600"
                        title="取消拉黑"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        取消拉黑
                      </button>
                    ) : (
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => onAddToIgnore?.(item.symbol)}
                          disabled={isTrading}
                          className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-gray-800 hover:bg-gray-900"
                          title="添加到忽略列表"
                        >
                          <Ban className="w-2.5 h-2.5" />
                          黑
                        </button>
                        <button
                          onClick={() => onOpenPosition?.(item.symbol, 'LONG')}
                          disabled={isTrading}
                          className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-green-600 hover:bg-green-700"
                          title={isTrading ? '交易进行中...' : '点击做多'}
                        >
                          <Zap className="w-2.5 h-2.5 fill-white" />
                          多
                        </button>
                        <button
                          onClick={() => onOpenPosition?.(item.symbol, 'SHORT')}
                          disabled={isTrading}
                          className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-red-600 hover:bg-red-700"
                          title={isTrading ? '交易进行中...' : '点击做空'}
                        >
                          <Zap className="w-2.5 h-2.5 fill-white" />
                          空
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Desktop Layout (same as mobile) */}
              <div className="hidden md:flex items-start justify-between gap-3">
                {/* Left: Rank + Symbol + Price */}
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 truncate">
                      {item.symbol.replace(/\/USDT:USDT|\/USDT|:USDT/, '')}
                      {type === 'market' && item.rank && <span className="ml-2 text-xs text-gray-400">#{item.rank}</span>}
                    </h3>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">
                      ${formatPrice(parseFloat(item.price.toString()))}
                    </div>
                    {hasPosition ? (
                      <div className={`text-xs font-bold mt-0.5 ${position.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        盈亏: {position.pnl > 0 ? '+' : ''}{position.pnl.toFixed(2)} ({((position.pnl / position.margin) * 100).toFixed(1)}%)
                      </div>
                    ) : (
                      <>
                        {type === 'market' && item.marketCapFormatted ? (
                          <div className="text-xs text-gray-400 mt-0.5">市值: ${item.marketCapFormatted}</div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-0.5">Vol: ${item.volumeFormatted || formatVolume(item.volume)}</div>
                        )}
                      </>
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

                  {hasPosition ? (
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => onAddMargin?.(item.symbol, position.side)}
                        disabled={isTrading}
                        className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-red-600 hover:bg-red-700"
                        title={isTrading ? '交易进行中...' : '点击补仓'}
                      >
                        <Zap className="w-2.5 h-2.5 fill-white" />
                        补
                      </button>
                      <button
                        onClick={() => onClosePosition?.(item.symbol)}
                        disabled={isTrading}
                        className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-gray-600 hover:bg-gray-700"
                        title={isTrading ? '交易进行中...' : '点击平仓'}
                      >
                        <X className="w-2.5 h-2.5" />
                        平
                      </button>
                    </div>
                  ) : isSymbolIgnored(item.symbol) ? (
                    <button
                      onClick={() => onRemoveFromIgnore?.(item.symbol)}
                      disabled={isTrading}
                      className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-gray-500 hover:bg-gray-600"
                      title="取消拉黑"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      取消拉黑
                    </button>
                  ) : (
                    <div className="flex gap-1 items-center">
                      <button
                        onClick={() => onAddToIgnore?.(item.symbol)}
                        disabled={isTrading}
                        className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-gray-800 hover:bg-gray-900"
                        title="添加到忽略列表"
                      >
                        <Ban className="w-2.5 h-2.5" />
                        黑
                      </button>
                      <button
                        onClick={() => onOpenPosition?.(item.symbol, 'LONG')}
                        disabled={isTrading}
                        className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-green-600 hover:bg-green-700"
                        title={isTrading ? '交易进行中...' : '点击做多'}
                      >
                        <Zap className="w-2.5 h-2.5 fill-white" />
                        多
                      </button>
                      <button
                        onClick={() => onOpenPosition?.(item.symbol, 'SHORT')}
                        disabled={isTrading}
                        className="px-2 py-1 rounded-lg font-bold text-xs text-white flex items-center gap-0.5 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap bg-red-600 hover:bg-red-700"
                        title={isTrading ? '交易进行中...' : '点击做空'}
                      >
                        <Zap className="w-2.5 h-2.5 fill-white" />
                        空
                      </button>
                    </div>
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

