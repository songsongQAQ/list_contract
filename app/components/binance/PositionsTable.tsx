'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, ArrowUpRight, ArrowDownRight, X, Trash2, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

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

interface PositionsTableProps {
  positions: Position[];
  onClose: (type: 'LONG' | 'SHORT' | 'ALL') => void;
  loading: boolean;
  walletBalance?: number;
  hasCredentials?: boolean;
  onRefresh?: () => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ positions, onClose, loading, walletBalance = 0, hasCredentials = true, onRefresh }) => {
  // 通过 UA 检测移动端
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // 格式化价格：最多展示四位小数，去掉末尾的0
  const formatPrice = (price: number | null | undefined) => {
    if (!price) return '—';
    // 先格式化为4位小数，然后用parseFloat去掉末尾的0
    const formatted = parseFloat(price.toFixed(4));
    return `$${formatted}`;
  };
  
  // 通过 User Agent 检测移动端
  React.useEffect(() => {
    const checkMobileUA = () => {
      const ua = navigator.userAgent;
      // 检测常见的移动端 UA
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      setIsMobile(isMobileDevice);
    };
    
    checkMobileUA();
  }, []);
  
  
  const totalLongPnl = positions.filter(p => p.side === 'LONG').reduce((acc, p) => acc + p.pnl, 0);
  const totalShortPnl = positions.filter(p => p.side === 'SHORT').reduce((acc, p) => acc + p.pnl, 0);
  const totalPnl = totalLongPnl + totalShortPnl;
  
  // Calculate total margin used
  const totalMarginUsed = positions.reduce((acc, p) => acc + p.margin, 0);
  
  // Filter positions based on active tab and sort by PnL
  const filteredPositions = (activeTab === 'ALL'
    ? positions
    : positions.filter(p => p.side === activeTab)
  ).sort((a, b) => sortOrder === 'desc' ? b.pnl - a.pnl : a.pnl - b.pnl);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-xl shadow-indigo-100/50 border border-white/60 overflow-hidden flex flex-col h-full w-full"
    >
      {/* Header & Stats */}
      <div className="p-3 md:p-6 border-b border-gray-200 space-y-3 md:space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="hidden md:block text-lg font-bold text-gray-900">持仓管理</h2>
              <p className="text-xs text-gray-600 font-medium space-x-3 mt-1">
                <span>多: <span className="font-bold text-green-600">{positions.filter(p => p.side === 'LONG').length}</span></span>
                <span>空: <span className="font-bold text-red-600">{positions.filter(p => p.side === 'SHORT').length}</span></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 rounded-lg transition-all disabled:opacity-50 bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600"
                title="刷新持仓"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
              {(['ALL', 'LONG', 'SHORT'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === tab
                      ? 'bg-white text-indigo-700 shadow-sm border border-gray-100'
                      : 'text-gray-600 hover:text-gray-900'
                    }`}
                >
                  {tab === 'ALL' ? '全部' : tab === 'LONG' ? '多单' : '空单'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
            <p className="text-gray-500 text-[11px] font-bold uppercase tracking-wider mb-1">总盈亏</p>
            <p className={`text-base font-black tracking-tight ${totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnl > 0 ? '+' : ''}{totalPnl.toFixed(2)}
            </p>
          </div>
          <div className="bg-green-50/50 rounded-2xl p-3 border border-green-200/60">
            <p className="text-green-700/70 text-[11px] font-bold uppercase tracking-wider mb-1">多单盈亏</p>
            <p className={`text-base font-black tracking-tight ${totalLongPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalLongPnl > 0 ? '+' : ''}{totalLongPnl.toFixed(2)}
            </p>
          </div>
          <div className="bg-red-50/50 rounded-2xl p-3 border border-red-200/60">
            <p className="text-red-700/70 text-[11px] font-bold uppercase tracking-wider mb-1">空单盈亏</p>
            <p className={`text-base font-black tracking-tight ${totalShortPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalShortPnl > 0 ? '+' : ''}{totalShortPnl.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Desktop: Table View */}
        <div className="hidden md:flex flex-col flex-1 overflow-hidden">
          <div className="overflow-auto flex-1">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[16%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
                <tr className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 whitespace-nowrap">币种 / 杠杆</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">数量 / 价值</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">开仓 / 标记</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">止盈 / 止损</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 transition-colors whitespace-nowrap"
                      title={sortOrder === 'desc' ? '从大到小' : '从小到大'}
                    >
                      <span>盈亏</span>
                      {sortOrder === 'desc' ? (
                        <TrendingDown className="w-3 h-3" />
                      ) : (
                        <TrendingUp className="w-3 h-3" />
                      )}
                    </button>
                  </th>
                  <th className="text-center px-4 py-3 whitespace-nowrap">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-3">
                        <div className="p-4 bg-gray-100 rounded-full">
                          <Wallet className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium">暂无持仓</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((p) => (
                    <motion.tr
                      key={p.symbol}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="hover:bg-gray-50 transition-colors border-b border-gray-100 hover:border-gray-200 group"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${p.side === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{p.symbol.replace(/\/USDT:USDT|\/USDT|:USDT/, '')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${p.side === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {p.side === 'LONG' ? '做多' : '做空'}
                          </span>
                          <span className="text-[10px] text-gray-600 font-bold bg-gray-100 px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                            {Math.round(p.leverage)}x
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-bold text-gray-900 tabular-nums text-sm whitespace-nowrap">{parseFloat(p.size.toFixed(4))}</p>
                        <p className="text-xs text-gray-500 tabular-nums font-medium mt-0.5 whitespace-nowrap">${p.positionNotional.toFixed(0)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-bold text-gray-900 tabular-nums text-sm whitespace-nowrap">${parseFloat(p.entryPrice.toFixed(4))}</p>
                        <p className="text-xs text-gray-500 tabular-nums font-medium mt-0.5 whitespace-nowrap">${parseFloat(p.markPrice.toFixed(4))}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className="font-bold text-green-700 tabular-nums text-sm whitespace-nowrap">{formatPrice(p.takeProfitPrice)}</p>
                        <p className="text-xs text-red-600 tabular-nums font-bold mt-0.5 whitespace-nowrap">{formatPrice(p.stopLossPrice)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <p className={`font-bold tabular-nums text-sm whitespace-nowrap ${p.pnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {p.pnl > 0 ? '+' : ''}{p.pnl.toFixed(2)}
                        </p>
                        <p className={`text-xs font-bold tabular-nums mt-0.5 whitespace-nowrap ${p.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {((p.pnl / p.margin) * 100).toFixed(1)}%
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => onClose(p.side)}
                          disabled={loading}
                          className="p-2 rounded-lg transition-all disabled:opacity-50 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 inline-flex items-center justify-center"
                          title={`平${p.side === 'LONG' ? '多' : '空'}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile: List View */}
        <div className="md:hidden flex-1 overflow-y-auto">
          {filteredPositions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
              <div className="p-4 bg-gray-100 rounded-full">
                <Wallet className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">暂无持仓</p>
            </div>
          ) : (
            <div className="p-2 md:p-3 space-y-2">
              {filteredPositions.map((p) => (
                <motion.div
                  key={p.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white border border-gray-100 rounded-xl p-3 space-y-2"
                >
                  {/* Header: Symbol + Side */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      <span className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${p.side === 'LONG' ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div>
                        <h3 className="font-bold text-sm text-gray-900">{p.symbol.replace(/\/USDT:USDT|\/USDT|:USDT/, '')}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.side === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {p.side === 'LONG' ? '做多' : '做空'}
                          </span>
                          <span className="text-[10px] text-gray-600 font-bold bg-gray-100 px-1.5 py-0.5 rounded">
                            {Math.round(p.leverage)}x
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onClose(p.side)}
                      disabled={loading}
                      className="p-1.5 rounded-lg transition-all disabled:opacity-50 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 flex-shrink-0"
                      title={`平${p.side === 'LONG' ? '多' : '空'}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Grid: Details */}
                  <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-2">
                    <div>
                      <p className="text-[11px] text-gray-500 font-medium mb-0.5">数量</p>
                      <p className="text-sm font-bold text-gray-900">{parseFloat(p.size.toFixed(4))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 font-medium mb-0.5">仓位价值</p>
                      <p className="text-sm font-bold text-gray-900">${p.positionNotional.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 font-medium mb-0.5">开仓价</p>
                      <p className="text-sm font-bold text-gray-900">${parseFloat(p.entryPrice.toFixed(4))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-gray-500 font-medium mb-0.5">标记价</p>
                      <p className="text-sm font-bold text-gray-900">${parseFloat(p.markPrice.toFixed(4))}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-green-600 font-medium mb-0.5">止盈价</p>
                      <p className="text-sm font-bold text-green-700">{formatPrice(p.takeProfitPrice)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-red-600 font-medium mb-0.5">止损价</p>
                      <p className="text-sm font-bold text-red-700">{formatPrice(p.stopLossPrice)}</p>
                    </div>
                  </div>

                  {/* Profit/Loss */}
                  <div className={`flex items-center justify-between p-2 rounded-lg ${p.pnl >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div>
                      <p className="text-[11px] font-medium mb-0.5">盈亏</p>
                      <p className={`text-sm font-bold tabular-nums ${p.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {p.pnl > 0 ? '+' : ''}{p.pnl.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium mb-0.5">收益率</p>
                      <p className={`text-sm font-bold tabular-nums ${p.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {((p.pnl / p.margin) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-2 md:p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-1.5 md:gap-2">
          <button
            onClick={() => onClose('LONG')}
            disabled={loading || !positions.some(p => p.side === 'LONG')}
            className="flex-1 bg-white hover:bg-green-50 border border-gray-300 hover:border-green-300 text-gray-700 hover:text-green-700 text-xs font-bold py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-1 md:gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <ArrowUpRight className="w-3 md:w-3.5 h-3 md:h-3.5" /> 平多
          </button>
          <button
            onClick={() => onClose('SHORT')}
            disabled={loading || !positions.some(p => p.side === 'SHORT')}
            className="flex-1 bg-white hover:bg-red-50 border border-gray-300 hover:border-red-300 text-gray-700 hover:text-red-700 text-xs font-bold py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-1 md:gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <ArrowDownRight className="w-3 md:w-3.5 h-3 md:h-3.5" /> 平空
          </button>
          <button
            onClick={() => onClose('ALL')}
            disabled={loading || positions.length === 0}
            className="flex-1 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-1 md:gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
          >
            <Trash2 className="w-3 md:w-3.5 h-3 md:h-3.5" /> 全平
          </button>
        </div>
      </div>
    </motion.div>
  );
};

