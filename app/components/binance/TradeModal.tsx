'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface TradeResult {
  symbol: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  message?: string;
  orderId?: string;
}

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: TradeResult[];
  isTrading: boolean;
  total: number;
  progress: number;
  side?: 'LONG' | 'SHORT' | 'CLOSE_LONG' | 'CLOSE_SHORT' | 'CLOSE_ALL';
}

export const TradeModal: React.FC<TradeModalProps> = ({ isOpen, onClose, results, isTrading, total, progress, side = 'LONG' }) => {
  const getSideText = () => {
    switch (side) {
      case 'LONG': return '做多';
      case 'SHORT': return '做空';
      case 'CLOSE_LONG': return '平多';
      case 'CLOSE_SHORT': return '平空';
      case 'CLOSE_ALL': return '全部平仓';
      default: return '做多';
    }
  };
  
  const getSideColor = () => {
    return 'text-red-600';
  };
  
  const sideText = getSideText();
  const sideColor = getSideColor();
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={isTrading ? undefined : onClose}
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col relative z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-gray-50 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                {isTrading ? (
                  <>
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    正在执行策略...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                    执行完成
                  </>
                )}
              </h2>
            </div>

            {/* Progress */}
            {(isTrading || progress > 0) && total > 0 && (
              <div className="px-6 pt-6">
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span>Progress</span>
                    <span className={`font-bold ${sideColor}`}>[{sideText}]</span>
                  </div>
                  <span>{progress}/{total} - {Math.round((progress / total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                  <motion.div 
                    className="bg-indigo-600 h-full rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress / total) * 100}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  />
                </div>
              </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {results.map((res, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <span className="font-bold text-gray-700">{res.symbol}</span>
                  <div className="flex items-center gap-2">
                    {res.status === 'SUCCESS' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" /> 成功
                      </span>
                    )}
                    {res.status === 'SKIPPED' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-lg" title={res.message}>
                        <AlertCircle className="w-3 h-3" /> {res.message || '跳过'}
                      </span>
                    )}
                    {res.status === 'FAILED' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-lg" title={res.message}>
                        <XCircle className="w-3 h-3" /> {res.message || '失败'}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
              {results.length === 0 && isTrading && (
                <div className="text-center text-gray-400 py-8 text-sm font-medium">
                  准备就绪，开始请求交易所...
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <button
                onClick={onClose}
                disabled={isTrading}
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
              >
                {isTrading ? '请稍候...' : '完成并关闭'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

