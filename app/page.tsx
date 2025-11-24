'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Activity, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { MarketList } from './components/binance/MarketList';
import { PositionsTable } from './components/binance/PositionsTable';
import { TradeModal } from './components/binance/TradeModal';
import { SettingsModal } from './components/binance/SettingsModal';
import { ConfirmModal } from './components/binance/ConfirmModal';

export default function BinancePage() {
  // 初始值始终为 10，避免 hydration 错误
  const [limit, setLimit] = useState(10);
  const [marketData, setMarketData] = useState<{ topMarket: any[], topGainers: any[], topLosers: any[] }>({ topMarket: [], topGainers: [], topLosers: [] });
  const [positions, setPositions] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [copytradingMode, setCopytradingMode] = useState(false);

  // 处理 limit 变化并同步到 localStorage
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    localStorage.setItem('default_limit', String(newLimit));
    console.log(`✓ Top 设置已更新为: ${newLimit}`);
  };

  // 在客户端挂载后从 localStorage 读取 limit 和带单模式
  useEffect(() => {
    const saved = localStorage.getItem('default_limit');
    if (saved) {
      setLimit(parseInt(saved));
    }
    const copytrading = localStorage.getItem('copytrading_mode');
    if (copytrading) {
      setCopytradingMode(copytrading === 'true');
    }
  }, []);
  
  // Loading States for Lists
  const [marketLoading, setMarketLoading] = useState(false);
  const [positionsLoading, setPositionsLoading] = useState(false);
  
  
  // Mobile Tab State - 根据 UA 判断移动端，移动端默认显示持仓
  const [activeTab, setActiveTab] = useState<'marketCap' | 'gainers' | 'losers' | 'positions'>('marketCap');
  
  // 在客户端挂载后检测 UA 并更新 tab
  useEffect(() => {
    const ua = navigator.userAgent;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (isMobileDevice) {
      setActiveTab('positions');
    }
  }, []);
  
  // Settings State
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Confirm Modal State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  }>({
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Trading State
  const [isTrading, setIsTrading] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [tradeResults, setTradeResults] = useState<any[]>([]);
  const [tradeProgress, setTradeProgress] = useState(0);
  const [currentTradeTotal, setCurrentTradeTotal] = useState(0);
  const [tradeSide, setTradeSide] = useState<'LONG' | 'SHORT' | 'CLOSE_LONG' | 'CLOSE_SHORT' | 'CLOSE_ALL'>('LONG');

  // API Credentials State
  const [hasCredentials, setHasCredentials] = useState(true);

  const getActiveCredentials = () => {
    // 检查跟单模式
    const isCopytradingMode = localStorage.getItem('copytrading_mode') === 'true';
    
    if (isCopytradingMode) {
      // 跟单模式：使用跟单账户凭证
      const copytradingApiKey = localStorage.getItem('copytrading_api_key')?.trim();
      const copytradingApiSecret = localStorage.getItem('copytrading_api_secret')?.trim();
      if (copytradingApiKey && copytradingApiSecret) {
        console.log(`✅ Using COPYTRADING account (${copytradingApiKey.substring(0, 8)}...)`);
        return { apiKey: copytradingApiKey, apiSecret: copytradingApiSecret, mode: 'copytrading' };
      } else {
        console.warn('⚠️ Copytrading mode enabled but credentials not found');
      }
    }
    
    // 默认模式：使用主账户凭证
    const apiKey = localStorage.getItem('binance_api_key')?.trim();
    const apiSecret = localStorage.getItem('binance_api_secret')?.trim();
    console.log(`✅ Using MAIN account (${apiKey?.substring(0, 8)}...)`);
    return { apiKey, apiSecret, mode: 'main' };
  };

  const fetchMarketData = async () => {
    setMarketLoading(true);
    try {
      const apiKey = localStorage.getItem('binance_api_key')?.trim();
      const apiSecret = localStorage.getItem('binance_api_secret')?.trim();
      
      // 只有在有有效凭证时才添加 headers
      const headers: Record<string, string> = {};
      if (apiKey && apiSecret) {
        headers['x-api-key'] = apiKey;
        headers['x-api-secret'] = apiSecret;
      }
      
      const res = await fetch(`/api/binance/market?limit=${limit}`, {
        headers,
      });
      const data = await res.json();
      if (data.topMarket) {
        setMarketData(data);
      }
    } catch (error) {
      console.error('Failed to fetch market data', error);
    } finally {
      setMarketLoading(false);
    }
  };

  const fetchPositions = async () => {
    setPositionsLoading(true);
    try {
      const credentials = getActiveCredentials();

      // 如果没有有效凭证，直接返回
      if (!credentials.apiKey || !credentials.apiSecret) {
        console.log(`No valid credentials for fetching positions (mode: ${credentials.mode})`);
        setPositions([]);
        setWalletBalance(0);
        setPositionsLoading(false);
        return;
      }

      console.log(`Fetching positions using ${credentials.mode} account`);

      const res = await fetch('/api/binance/positions', {
        headers: {
          'x-api-key': credentials.apiKey,
          'x-api-secret': credentials.apiSecret,
        },
      });
      
      const data = await res.json();
      
      // 如果响应失败，显示错误原因
      if (!res.ok) {
        const errorMsg = data.error || '未知错误';
        console.error(`❌ ${credentials.mode} account error: ${errorMsg}`);
        
        if (credentials.mode === 'copytrading') {
          console.error(`📋 错误详情: ${errorMsg}`);
          console.error('💡 请检查:');
          console.error('  1. API Key 和 Secret 是否正确');
          console.error('  2. IP 地址是否在白名单中 (43.159.227.33)');
          console.error('  3. API 权限是否包含期货交易权限');
        }
        
        setPositions([]);
        setWalletBalance(0);
        return;
      }
      
      if (data.positions) {
        setPositions(data.positions);
        setWalletBalance(data.walletBalance || 0);
        
        // 当持仓有数据时，计算总盈亏并设置为网页标题
        if (data.positions.length > 0) {
          const totalPnl = data.positions.reduce((sum: number, pos: any) => sum + (pos.pnl || 0), 0);
          const pnlText = totalPnl > 0 ? `+${totalPnl.toFixed(2)}` : totalPnl.toFixed(2);
          document.title = pnlText;
        } else {
          document.title = '榜单合约系统';
        }
      }
    } catch (error) {
      console.error('Failed to fetch positions', error);
    } finally {
      setPositionsLoading(false);
    }
  };

  useEffect(() => {
    // 检查是否有 API 密钥
    const checkCredentials = () => {
      const apiKey = localStorage.getItem('binance_api_key');
      const apiSecret = localStorage.getItem('binance_api_secret');
      const hasKey = !!(apiKey && apiSecret && apiKey.trim() && apiSecret.trim());
      setHasCredentials(hasKey);
      return hasKey;
    };

    // 检查凭证并加载数据
    const credentialsExist = checkCredentials();

    // 仅在有凭证时才加载数据
    if (credentialsExist) {
      fetchMarketData();
      fetchPositions();
    }
    
    // 简单的同步检查函数用于定时器
    const checkCredentialsSync = (): boolean => {
      const apiKey = localStorage.getItem('binance_api_key');
      const apiSecret = localStorage.getItem('binance_api_secret');
      return !!(apiKey && apiSecret && apiKey.trim() && apiSecret.trim());
    };
    
    let marketInterval: NodeJS.Timeout;
    let positionsInterval: NodeJS.Timeout;
    
    // 启动定时刷新
    if (credentialsExist) {
      // 市场数据每60秒刷新一次
      marketInterval = setInterval(() => {
        if (checkCredentialsSync()) {
          console.log(`[${new Date().toLocaleTimeString()}] 自动刷新市场数据`);
          fetchMarketData();
        }
      }, 60000);
      
      // 持仓每10秒刷新一次
      positionsInterval = setInterval(() => {
        if (checkCredentialsSync()) {
          console.log(`[${new Date().toLocaleTimeString()}] 自动刷新持仓数据`);
          fetchPositions();
        }
      }, 10000);
    }
    
    // 监听设置变化事件
    const handleSettingsChanged = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && customEvent.detail.defaultLimit) {
        setLimit(parseInt(customEvent.detail.defaultLimit));
      }
      if (customEvent.detail && customEvent.detail.copytradingMode !== undefined) {
        setCopytradingMode(customEvent.detail.copytradingMode);
      }
      // 页面重新加载会自动检查凭证
    };

    window.addEventListener('settingsChanged', handleSettingsChanged);
    
    return () => {
      clearInterval(marketInterval);
      clearInterval(positionsInterval);
      window.removeEventListener('settingsChanged', handleSettingsChanged);
    };
  }, [limit]);

  const handleTrade = async (side: 'LONG' | 'SHORT') => {
    const sideText = side === 'LONG' ? '做多' : '做空';
    const targetList = side === 'LONG' ? '市值前' : '涨幅前';
    
    // 获取忽略的币种列表
    const ignoredSymbolsStr = localStorage.getItem('ignored_symbols') || '';
    const ignoredSet = new Set(
      ignoredSymbolsStr
        .split(/\s+/)
        .filter(s => s.length > 0)
        .map(s => s.toUpperCase())
    );
    
    // 获取已有持仓的币种集合
    const openPositionsSet = new Set(positions.map(p => p.symbol));
    
    // 过滤出不在忽略列表中且没有持仓的币种
    let symbols = side === 'LONG' 
      ? marketData.topMarket.map(m => m.symbol)
      : marketData.topGainers.map(m => m.symbol);
    
    symbols = symbols.filter(symbol => {
      const cleanSymbol = symbol.replace('/USDT:USDT', '').replace('/USDT', '');
      // 同时过滤出不在忽略列表且没有持仓的币种
      return !ignoredSet.has(cleanSymbol) && !openPositionsSet.has(symbol);
    });

    const executeTrading = async () => {
      setIsTrading(true);
      setTradeModalOpen(true);
      setTradeResults([]);
      setTradeProgress(0);
      setCurrentTradeTotal(symbols.length);
      setTradeSide(side);

      // 从 localStorage 读取交易设置
      const leverage = side === 'LONG'
        ? parseFloat(localStorage.getItem('trading_long_leverage') || '50')
        : parseFloat(localStorage.getItem('trading_short_leverage') || '50');
      
      const margin = side === 'LONG'
        ? parseFloat(localStorage.getItem('trading_long_margin') || '3')
        : parseFloat(localStorage.getItem('trading_short_margin') || '3');
      
      // 计算仓位价值 = 本金 × 杠杆倍数
      const notional = margin * leverage;
      
      // 从 localStorage 读取止盈止损设置（相对于本金的倍数）
      const takeProfitMultiple = parseFloat(localStorage.getItem('take_profit_percent') || '0');
      const stopLossMultiple = parseFloat(localStorage.getItem('stop_loss_percent') || '0');
      
      // 转换为相对于仓位价值的百分比
      // 止盈/止损金额 = 本金 × (倍数 / 100)
      // 百分比 = 金额 / 仓位价值 × 100
      const takeProfitPercent = takeProfitMultiple > 0 ? (margin * takeProfitMultiple / 100) / notional * 100 : 0;
      const stopLossPercent = stopLossMultiple > 0 ? (margin * stopLossMultiple / 100) / notional * 100 : 0;

      // 获取活跃账户凭证（主账户或跟单账户）
      const credentials = getActiveCredentials();

      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        try {
          if (!credentials.apiKey || !credentials.apiSecret) {
            console.error(`No valid credentials for trading (mode: ${credentials.mode})`);
            continue;
          }

          console.log(`Trading using ${credentials.mode} account: ${batch.join(', ')}`);

          const res = await fetch('/api/binance/trade', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-api-key': credentials.apiKey,
              'x-api-secret': credentials.apiSecret,
            },
            body: JSON.stringify({ symbols: batch, side, leverage, notional, takeProfitPercent, stopLossPercent })
          });
          
          const data = await res.json();
          
          // 如果响应失败，显示错误原因
          if (!res.ok) {
            const errorMsg = data.error || '未知错误';
            console.error(`❌ ${credentials.mode} account trade error: ${errorMsg}`);
            
            if (credentials.mode === 'copytrading') {
              console.error(`📋 错误详情: ${errorMsg}`);
              console.error('💡 请检查:');
              console.error('  1. API Key 和 Secret 是否正确');
              console.error('  2. IP 地址是否在白名单中 (43.159.227.33)');
              console.error('  3. API 权限是否包含期货交易权限');
              console.error('  4. 账户余额是否充足');
            }
            
            // 为每个失败的币种创建单独的错误结果
            batch.forEach(symbol => {
              setTradeResults(prev => [...prev, { 
                symbol, 
                status: 'FAILED', 
                message: errorMsg 
              }]);
            });
          } else {
            setTradeResults(prev => [...prev, ...(data.results || [])]);
          }
        } catch (e) {
          console.error(e);
          // 为每个币种创建单独的错误结果
          batch.forEach(symbol => {
            setTradeResults(prev => [...prev, { 
              symbol, 
              status: 'FAILED', 
              message: e instanceof Error ? e.message : '网络错误' 
            }]);
          });
        }

        setTradeProgress(Math.min(i + batchSize, symbols.length));
      }

      setIsTrading(false);
      fetchPositions();
    };

    setConfirmData({
      title: '确认交易',
      message: `确定要一键${sideText}吗？\n\n目标：${targetList} ${limit} 名\n\n这将对目前没有持仓的币种进行开单。`,
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: executeTrading,
    });
    setConfirmOpen(true);
  };

  const handleOpenPosition = async (symbol: string, side: 'LONG' | 'SHORT') => {
    const sideText = side === 'LONG' ? '做多' : '做空';
    
    // 检查是否已有该币种的持仓
    const hasExistingPosition = positions.some(p => p.symbol === symbol);
    if (hasExistingPosition) {
      setTradeResults([{ symbol, status: 'SKIPPED', message: '已有仓位' }]);
      return;
    }
    
    const executeOpen = async () => {
      setIsTrading(true);
      setTradeModalOpen(true);
      setTradeResults([]);
      setTradeProgress(0);
      setCurrentTradeTotal(1);
      setTradeSide(side);

      // 从 localStorage 读取交易设置
      const leverage = side === 'LONG'
        ? parseFloat(localStorage.getItem('trading_long_leverage') || '50')
        : parseFloat(localStorage.getItem('trading_short_leverage') || '50');
      
      const margin = side === 'LONG'
        ? parseFloat(localStorage.getItem('trading_long_margin') || '3')
        : parseFloat(localStorage.getItem('trading_short_margin') || '3');
      
      // 计算仓位价值 = 本金 × 杠杆倍数
      const notional = margin * leverage;
      
      // 从 localStorage 读取止盈止损设置（相对于本金的倍数）
      const takeProfitMultiple = parseFloat(localStorage.getItem('take_profit_percent') || '0');
      const stopLossMultiple = parseFloat(localStorage.getItem('stop_loss_percent') || '0');
      
      // 转换为相对于仓位价值的百分比
      // 止盈/止损金额 = 本金 × (倍数 / 100)
      // 百分比 = 金额 / 仓位价值 × 100
      const takeProfitPercent = takeProfitMultiple > 0 ? (margin * takeProfitMultiple / 100) / notional * 100 : 0;
      const stopLossPercent = stopLossMultiple > 0 ? (margin * stopLossMultiple / 100) / notional * 100 : 0;

      // 获取活跃账户凭证（主账户或跟单账户）
      const credentials = getActiveCredentials();

      try {
        if (!credentials.apiKey || !credentials.apiSecret) {
          console.error(`No valid credentials for trading (mode: ${credentials.mode})`);
          setTradeResults([{ symbol, status: 'FAILED', message: 'No valid API credentials' }]);
          setIsTrading(false);
          return;
        }

        console.log(`Opening position using ${credentials.mode} account: ${symbol}`);

        const res = await fetch('/api/binance/trade', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': credentials.apiKey,
            'x-api-secret': credentials.apiSecret,
          },
          body: JSON.stringify({ symbols: [symbol], side, leverage, notional, takeProfitPercent, stopLossPercent })
        });
        
        const data = await res.json();
        
        // 如果响应失败，显示错误原因
        if (!res.ok) {
          const errorMsg = data.error || '未知错误';
          console.error(`❌ ${credentials.mode} account open position error: ${errorMsg}`);
          
          if (credentials.mode === 'copytrading') {
            console.error(`📋 错误详情: ${errorMsg}`);
            console.error('💡 请检查:');
            console.error('  1. API Key 和 Secret 是否正确');
            console.error('  2. IP 地址是否在白名单中 (43.159.227.33)');
            console.error('  3. API 权限是否包含期货交易权限');
            console.error('  4. 账户余额是否充足');
          }
          
          setTradeResults([{ symbol, status: 'FAILED', message: errorMsg }]);
        } else {
          setTradeResults(data.results || []);
        }
        
        setTradeProgress(1);
      } catch (e) {
        console.error(e);
        setTradeResults([{ 
          symbol, 
          status: 'FAILED', 
          message: e instanceof Error ? e.message : '网络错误' 
        }]);
        setTradeProgress(1);
      }

      setIsTrading(false);
      fetchPositions();
    };

    setConfirmData({
      title: '确认开仓',
      message: `确定要对 ${symbol} 进行 ${sideText} 开仓吗？`,
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: executeOpen,
    });
    setConfirmOpen(true);
  };

  const handleClosePositions = async (type: 'LONG' | 'SHORT' | 'ALL') => {
    const typeText = type === 'LONG' ? '多单' : type === 'SHORT' ? '空单' : '所有持仓';
    
    const executeClose = async () => {
      setIsTrading(true);
      setTradeModalOpen(true);
      setTradeResults([]);
      setTradeProgress(0);
      if (type === 'ALL') {
        setTradeSide('CLOSE_ALL');
      } else if (type === 'LONG') {
        setTradeSide('CLOSE_LONG');
      } else {
        setTradeSide('CLOSE_SHORT');
      }
      
      // 计算需要平仓的仓位
      const positionsToClose = positions.filter((p: any) => {
        if (type === 'ALL') return true;
        const side = parseFloat(p.size) > 0 ? 'LONG' : 'SHORT';
        return type === side;
      });
      setCurrentTradeTotal(positionsToClose.length);

      // 获取活跃账户凭证（主账户或跟单账户）
      const credentials = getActiveCredentials();

      try {
        if (!credentials.apiKey || !credentials.apiSecret) {
          console.error(`No valid credentials for closing positions (mode: ${credentials.mode})`);
          setTradeResults([{ symbol: 'ALL', status: 'FAILED', message: 'No valid API credentials' }]);
          setIsTrading(false);
          return;
        }

        console.log(`Closing positions using ${credentials.mode} account: ${type}`);

        // 分批平仓以显示进度
        const batchSize = 3;
        const allResults: any[] = [];
        
        for (let i = 0; i < positionsToClose.length; i += batchSize) {
          const batch = positionsToClose.slice(i, i + batchSize);
          
          try {
            const res = await fetch(`/api/binance/positions?type=${type}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': credentials.apiKey,
                'x-api-secret': credentials.apiSecret,
              },
              body: JSON.stringify({
                symbols: batch.map(p => p.symbol)
              })
            });
            const data = await res.json();
            
            // 如果响应失败，显示错误原因
            if (!res.ok) {
              const errorMsg = data.error || '未知错误';
              console.error(`❌ ${credentials.mode} account close error: ${errorMsg}`);
              
              if (credentials.mode === 'copytrading') {
                console.error(`📋 错误详情: ${errorMsg}`);
                console.error('💡 请检查:');
                console.error('  1. API Key 和 Secret 是否正确');
                console.error('  2. IP 地址是否在白名单中 (43.159.227.33)');
                console.error('  3. API 权限是否包含期货交易权限');
              }
              
              allResults.push({ 
                symbol: batch.map((p: any) => p.symbol).join(','), 
                status: 'FAILED', 
                message: errorMsg 
              });
            } else if (data.results) {
              allResults.push(...data.results);
            }
            
            setTradeResults(allResults);
            setTradeProgress(Math.min(i + batchSize, positionsToClose.length));
          } catch (e) {
            console.error('Batch close failed:', e);
            allResults.push({ 
              symbol: batch.map((p: any) => p.symbol).join(','), 
              status: 'FAILED', 
              message: e instanceof Error ? e.message : '网络错误' 
            });
            setTradeResults(allResults);
            setTradeProgress(Math.min(i + batchSize, positionsToClose.length));
          }
        }
        
        fetchPositions();
      } catch (error) {
        console.error('Failed to close positions', error);
        setTradeResults([{
          symbol: 'Error',
          status: 'FAILED',
          message: error instanceof Error ? error.message : '平仓操作失败，请检查网络连接后重试。'
        }]);
      } finally {
        setIsTrading(false);
      }
    };

    setConfirmData({
      title: '确认平仓',
      message: `确定要平仓 ${typeText} 吗？`,
      confirmText: '确定',
      cancelText: '取消',
      onConfirm: executeClose,
      isDangerous: true,
    });
    setConfirmOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute top-[10%] right-[0%] w-[40%] h-[40%] rounded-full bg-purple-200/30 blur-3xl" />
        <div className="absolute bottom-[0%] left-[20%] w-[60%] h-[40%] rounded-full bg-pink-200/30 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-[1920px] mx-auto p-6 space-y-3 md:space-y-8">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex justify-between items-center bg-white/70 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-sm border border-white/50 sticky top-4 z-40"
        >
          {/* Desktop: Show Title */}
          <div className="hidden md:flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">
                榜单合约系统
              </h1>
              <p className="text-gray-400 font-medium text-xs">智能量化交易终端</p>
            </div>
          </div>

          {/* Mobile: Show Icon Only */}
          <div className="md:hidden">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>

          {/* Account Status Display - Center of Header */}
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border shadow-sm text-xs font-bold ${
                copytradingMode
                  ? 'bg-green-50 text-green-700 border-green-200/50'
                  : 'bg-blue-50 text-blue-700 border-blue-200/50'
              }`}
              title={copytradingMode ? '正在使用带单账户' : '正在使用主账户'}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600"></span>
              </span>
              <span>{copytradingMode ? '带单账户' : '主账户'}</span>
            </motion.div>
          </div>
          
          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-2 bg-gray-100/50 px-2 py-1 rounded-xl border border-gray-200/50">
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 bg-white hover:bg-gray-50 rounded-lg shadow-sm text-gray-600 transition-colors border border-gray-100"
              title="交易设置"
            >
              <Settings className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 px-2 border-l border-gray-200">
              <span className="text-gray-600 font-bold text-xs">Top:</span>
              <select 
                value={limit} 
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="bg-white border-none rounded-lg px-2 py-1 text-xs font-bold text-gray-800 shadow-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {[5, 10, 20, 30, 40, 50].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="md:hidden flex items-center gap-1.5">
            <select 
              value={limit} 
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              {[5, 10, 20, 30, 40, 50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 bg-white hover:bg-gray-50 rounded-lg shadow-sm text-gray-600 transition-colors border border-gray-100"
              title="交易设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </motion.header>

        {/* Desktop Layout */}
        {!hasCredentials ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:flex items-center justify-center flex-1 flex-col gap-6"
            style={{ height: 'calc(100vh - 150px)' }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🔑</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">请配置 API 密钥</h2>
              <p className="text-gray-600 font-medium mb-6">在设置中配置你的 Binance API Key 和 Secret 以开始使用</p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                立即配置
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="hidden lg:flex flex-col">
            {/* Module 1: Positions & Stats - Full Screen (minus header) */}
            <div className="w-full" style={{ height: 'calc(100vh - 150px)' }}>
              <PositionsTable positions={positions} onClose={handleClosePositions} loading={positionsLoading} walletBalance={walletBalance} hasCredentials={hasCredentials} />
            </div>

            {/* Module 2: Market Data - 3 Columns - Full Screen (minus header) */}
            <div className="w-full flex gap-6 p-6" style={{ height: 'calc(100vh - 100px)' }}>
              <div className="flex-1 min-h-0 overflow-hidden">
                <MarketList 
                  title="市值 Top" 
                  subtitle={`市值前 ${limit} 名`}
                  data={marketData.topMarket} 
                  type="market"
                  icon={<Layers className="w-5 h-5 text-blue-500" />}
                  color="blue"
                  onAction={() => handleTrade('LONG')}
                  actionLabel="一键做多"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <MarketList 
                  title="涨幅 Top" 
                  subtitle={`24h 涨幅前 ${limit} 名`}
                  data={marketData.topGainers} 
                  type="gainer"
                  icon={<Activity className="w-5 h-5 text-pink-500" />}
                  color="pink"
                  onAction={() => handleTrade('SHORT')}
                  actionLabel="一键做空"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <MarketList 
                  title="跌幅 Top" 
                  subtitle={`24h 跌幅前 ${limit} 名`}
                  data={marketData.topLosers} 
                  type="loser"
                  icon={<TrendingDown className="w-5 h-5 text-orange-500" />}
                  color="pink"
                  onAction={() => handleTrade('LONG')}
                  actionLabel="一键做多"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Layout with Tabs */}
        {!hasCredentials ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex items-center justify-center flex-1 flex-col gap-6 bg-white rounded-3xl shadow-sm border border-gray-100"
            style={{ height: 'calc(100vh - 150px)' }}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🔑</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">请配置 API 密钥</h2>
              <p className="text-gray-600 font-medium mb-6 text-sm">在设置中配置你的 Binance API Key 和 Secret</p>
              <button
                onClick={() => setSettingsOpen(true)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
              >
                去设置
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="lg:hidden flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 150px)' }}>
            {/* Tab Headers */}
            <div className="flex bg-white border-b border-gray-200 sticky top-0 z-30 shrink-0 rounded-t-3xl">
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex-1 px-2 py-3 font-bold text-xs transition-all relative ${
                activeTab === 'positions'
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              持仓
              {activeTab === 'positions' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('marketCap')}
              className={`flex-1 px-2 py-3 font-bold text-xs transition-all relative ${
                activeTab === 'marketCap'
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              市值
              {activeTab === 'marketCap' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('gainers')}
              className={`flex-1 px-2 py-3 font-bold text-xs transition-all relative ${
                activeTab === 'gainers'
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              涨幅
              {activeTab === 'gainers' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('losers')}
              className={`flex-1 px-2 py-3 font-bold text-xs transition-all relative ${
                activeTab === 'losers'
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              跌幅
              {activeTab === 'losers' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {/* 市值Top Tab */}
            {activeTab === 'marketCap' && (
              <div className="h-full w-full overflow-y-auto [&>div]:rounded-none! [&>div]:border-0! [&>div]:shadow-none! [&>div>div:first-child]:p-4! [&>div>div:last-child]:p-2!">
                <MarketList 
                  title="市值 Top" 
                  subtitle={`市值前 ${limit} 名`}
                  data={marketData.topMarket} 
                  type="market"
                  icon={<Layers className="w-5 h-5 text-blue-500" />}
                  color="blue"
                  onAction={() => handleTrade('LONG')}
                  actionLabel="一键做多"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                />
              </div>
            )}

            {/* 涨幅Top Tab */}
            {activeTab === 'gainers' && (
              <div className="h-full w-full overflow-y-auto [&>div]:rounded-none! [&>div]:border-0! [&>div]:shadow-none! [&>div>div:first-child]:p-4! [&>div>div:last-child]:p-2!">
                <MarketList 
                  title="涨幅 Top" 
                  subtitle={`24h 涨幅前 ${limit} 名`}
                  data={marketData.topGainers} 
                  type="gainer"
                  icon={<TrendingUp className="w-5 h-5 text-pink-500" />}
                  color="pink"
                  onAction={() => handleTrade('SHORT')}
                  actionLabel="一键做空"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                />
              </div>
            )}

            {/* 跌幅Top Tab */}
            {activeTab === 'losers' && (
              <div className="h-full w-full overflow-y-auto [&>div]:rounded-none! [&>div]:border-0! [&>div]:shadow-none! [&>div>div:first-child]:p-4! [&>div>div:last-child]:p-2!">
                <MarketList 
                  title="跌幅 Top" 
                  subtitle={`24h 跌幅前 ${limit} 名`}
                  data={marketData.topLosers} 
                  type="loser"
                  icon={<TrendingDown className="w-5 h-5 text-orange-500" />}
                  color="pink"
                  onAction={() => handleTrade('LONG')}
                  actionLabel="一键做多"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                />
              </div>
            )}

            {/* 持仓 Tab */}
            {activeTab === 'positions' && !hasCredentials && (
              <div className="h-full w-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl mb-3">🔑</div>
                  <p className="text-gray-600 font-medium mb-4">请先配置 API 密钥</p>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    去设置
                  </button>
                </div>
              </div>
            )}

            {/* 持仓 Tab */}
            {activeTab === 'positions' && hasCredentials && (
              <div className="h-full w-full overflow-y-auto">
                <PositionsTable 
                  positions={positions} 
                  onClose={handleClosePositions} 
                  loading={positionsLoading} 
                  walletBalance={walletBalance} 
                  hasCredentials={hasCredentials}
                />
              </div>
            )}
          </div>
          </div>
        )}

        {/* Modals */}
        <SettingsModal 
          isOpen={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
        />
        <TradeModal 
          isOpen={tradeModalOpen} 
          onClose={() => setTradeModalOpen(false)} 
          results={tradeResults} 
          isTrading={isTrading}
          total={currentTradeTotal} 
          progress={tradeProgress}
          side={tradeSide}
        />
        <ConfirmModal
          isOpen={confirmOpen}
          title={confirmData.title}
          message={confirmData.message}
          confirmText={confirmData.confirmText}
          cancelText={confirmData.cancelText}
          onConfirm={() => {
            confirmData.onConfirm();
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
          isDangerous={confirmData.isDangerous}
        />
      </div>
    </div>
  );
}
