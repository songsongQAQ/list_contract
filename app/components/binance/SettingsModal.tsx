'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [saving, setSaving] = useState(false);
  
  const [settings, setSettings] = useState({
    apiKey: '',
    apiSecret: '',
    longLeverage: '50',
    longAmount: '150',
    shortLeverage: '50',
    shortAmount: '150',
    defaultLimit: '10',
    ignoredSymbols: '',
    takeProfit: '',
    stopLoss: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = () => {
    // 从 localStorage 读取设置
    setSettings({
      apiKey: localStorage.getItem('binance_api_key') || '',
      apiSecret: localStorage.getItem('binance_api_secret') || '',
      longLeverage: localStorage.getItem('trading_long_leverage') || '50',
      longAmount: localStorage.getItem('trading_long_amount') || '150',
      shortLeverage: localStorage.getItem('trading_short_leverage') || '50',
      shortAmount: localStorage.getItem('trading_short_amount') || '150',
      defaultLimit: localStorage.getItem('default_limit') || '10',
      ignoredSymbols: localStorage.getItem('ignored_symbols') || '',
      takeProfit: localStorage.getItem('take_profit_percent') || '',
      stopLoss: localStorage.getItem('stop_loss_percent') || '',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 验证 API Key 和 Secret
      if (!settings.apiKey.trim() || !settings.apiSecret.trim()) {
        alert('请输入 API Key 和 API Secret');
        setSaving(false);
        return;
      }

      // 保存到 localStorage
      localStorage.setItem('binance_api_key', settings.apiKey.trim());
      localStorage.setItem('binance_api_secret', settings.apiSecret.trim());
      localStorage.setItem('trading_long_leverage', settings.longLeverage);
      localStorage.setItem('trading_long_amount', settings.longAmount);
      localStorage.setItem('trading_short_leverage', settings.shortLeverage);
      localStorage.setItem('trading_short_amount', settings.shortAmount);
      localStorage.setItem('default_limit', settings.defaultLimit);
      localStorage.setItem('ignored_symbols', settings.ignoredSymbols.trim());
      localStorage.setItem('take_profit_percent', settings.takeProfit);
      localStorage.setItem('stop_loss_percent', settings.stopLoss);
      
      // 验证保存是否成功
      const savedKey = localStorage.getItem('binance_api_key');
      const savedSecret = localStorage.getItem('binance_api_secret');
      
      console.log('✓ Settings saved to localStorage');
      console.log(`✓ Verified: apiKey=${savedKey ? 'saved (' + savedKey.length + ' chars)' : 'NOT saved'}, apiSecret=${savedSecret ? 'saved (' + savedSecret.length + ' chars)' : 'NOT saved'}`);
      
      // 触发页面更新事件
      window.dispatchEvent(new CustomEvent('settingsChanged', {
        detail: {
          defaultLimit: settings.defaultLimit,
          credentialsUpdated: true
        }
      }));
      
      alert('设置已保存！✓');
      
      // 刷新页面以应用新设置
      window.location.reload();
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('保存失败，请重试：' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-black text-gray-900">交易设置</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <>
                  {/* API Settings */}
                  <div className="space-y-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">🔑 API 密钥设置</h3>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">API Key</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={settings.apiKey}
                            onChange={(e) => setSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="输入你的 Binance API Key"
                            className="w-full px-3 py-2 pr-10 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs text-gray-900"
                          />
                          {settings.apiKey && (
                            <button
                              onClick={() => setSettings(prev => ({ ...prev, apiKey: '' }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-amber-600">⚠️ 请将 <button 
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('43.159.227.33');
                            alert('✓ IP地址已复制到剪贴板！');
                          }}
                          className="font-mono font-bold text-amber-800 hover:text-amber-900 underline decoration-dotted cursor-pointer transition-colors"
                        >43.159.227.33</button> 设置白名单</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-600">API Secret</label>
                        <div className="relative">
                          <input
                            type="password"
                            value={settings.apiSecret}
                            onChange={(e) => setSettings(prev => ({ ...prev, apiSecret: e.target.value }))}
                            placeholder="输入你的 Binance API Secret"
                            className="w-full px-3 py-2 pr-10 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs text-gray-900"
                          />
                          {settings.apiSecret && (
                            <button
                              onClick={() => setSettings(prev => ({ ...prev, apiSecret: '' }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-amber-600">⚠️ 请勿分享给任何人。密钥保存在本地浏览器中。</p>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100" />

                  {/* Long Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">做多设置 (Long)</h3>
                      <div className="bg-blue-50 rounded-lg px-3 py-1 border border-blue-200">
                        <p className="text-xs text-blue-700 font-bold">
                          💰 本金: <span className="text-blue-900">${
                            (parseFloat(settings.longAmount || '0') / parseFloat(settings.longLeverage || '1')).toFixed(2)
                          }</span>
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">杠杆倍数</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.longLeverage}
                            onChange={(e) => setSettings(prev => ({ ...prev, longLeverage: e.target.value }))}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                          />
                          <span className="absolute right-4 top-2 text-gray-400 text-sm font-bold">x</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">仓位价值 (USDT)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.longAmount}
                            onChange={(e) => setSettings(prev => ({ ...prev, longAmount: e.target.value }))}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
                          />
                          <span className="absolute right-4 top-2 text-gray-400 text-sm font-bold">$</span>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Short Settings */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-pink-600 uppercase tracking-wider">做空设置 (Short)</h3>
                      <div className="bg-pink-50 rounded-lg px-3 py-1 border border-pink-200">
                        <p className="text-xs text-pink-700 font-bold">
                          💰 本金: <span className="text-pink-900">${
                            (parseFloat(settings.shortAmount || '0') / parseFloat(settings.shortLeverage || '1')).toFixed(2)
                          }</span>
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">杠杆倍数</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.shortLeverage}
                            onChange={(e) => setSettings(prev => ({ ...prev, shortLeverage: e.target.value }))}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-gray-900"
                          />
                          <span className="absolute right-4 top-2 text-gray-400 text-sm font-bold">x</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500">仓位价值 (USDT)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={settings.shortAmount}
                            onChange={(e) => setSettings(prev => ({ ...prev, shortAmount: e.target.value }))}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 font-bold text-gray-900"
                          />
                          <span className="absolute right-4 top-2 text-gray-400 text-sm font-bold">$</span>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Take Profit & Stop Loss Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wider">止盈止损设置</h3>
                  <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">📊 相对于本金的百分比：设置100表示损失/利润为本金的100%</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">止盈百分比 (可选)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={settings.takeProfit}
                          onChange={(e) => setSettings(prev => ({ ...prev, takeProfit: e.target.value }))}
                          placeholder="不填则不设置"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-gray-900"
                        />
                        <span className="absolute right-4 top-2 text-gray-400 text-sm font-bold">%</span>
                      </div>
                      <p className="text-xs text-gray-400">例：100 = 本金翻倍时止盈</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500">止损百分比 (可选)</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={settings.stopLoss}
                          onChange={(e) => setSettings(prev => ({ ...prev, stopLoss: e.target.value }))}
                          placeholder="不填则不设置"
                          className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-gray-900"
                        />
                        <span className="absolute right-4 top-2 text-gray-400 text-sm font-bold">%</span>
                      </div>
                      <p className="text-xs text-gray-400">例：100 = 本金全部亏损时止损</p>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Ignored Symbols Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-purple-600 uppercase tracking-wider">忽略币种</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">忽略的币种 (空格分隔)</label>
                    <textarea
                      value={settings.ignoredSymbols}
                      onChange={(e) => setSettings(prev => ({ ...prev, ignoredSymbols: e.target.value }))}
                      placeholder="例如: BTC ETH SOL (用空格分隔，开仓时自动忽略)"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-xs text-gray-900 resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-gray-400">输入要忽略的币种代码，用空格分隔，开仓时自动跳过这些币种</p>
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Default Limit Settings */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">默认设置</h3>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500">排行榜显示数量</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[5, 10, 20, 30, 40, 50].map((num) => (
                        <button
                          key={num}
                          onClick={() => setSettings(prev => ({ ...prev, defaultLimit: String(num) }))}
                          className={`py-2 px-3 rounded-lg font-bold text-sm transition-all ${
                            settings.defaultLimit === String(num)
                              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">选择排行榜默认显示的币种数量</p>
                  </div>
                </div>
              </>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                保存设置
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

