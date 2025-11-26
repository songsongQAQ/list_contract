'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Settings, Activity, Layers, TrendingUp, TrendingDown, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { MarketList } from './components/binance/MarketList';
import { PositionsTable } from './components/binance/PositionsTable';
import { TradeModal } from './components/binance/TradeModal';
import { SettingsModal } from './components/binance/SettingsModal';
import { ConfirmModal } from './components/binance/ConfirmModal';
import { ErrorModal } from './components/binance/ErrorModal';
import { LoginModal } from './components/LoginModal';
import { loginStorage, userConfigStorage } from '@/lib/storage';

export default function BinancePage() {
  const { data: session, status } = useSession();
  const isLoggedIn = !!session;
  
  // 从本地缓存读取登录状态，直接在初始化时读取，避免刷新时闪烁
  const getInitialLoginStatus = () => {
    if (typeof window === 'undefined') return null;
    return loginStorage.get();
  };
  
  const [cachedLoginStatus, setCachedLoginStatus] = useState<boolean | null>(getInitialLoginStatus());
  
  // 当 session 状态变化时，更新本地缓存
  // 只有当 session 完全加载后（status !== 'loading'），才处理登录状态
  useEffect(() => {
    if (status === 'loading') return; // session 还在加载，不做任何处理
    
    if (isLoggedIn) {
      loginStorage.set(true);
      setCachedLoginStatus(true);
      // 如果已登录，请求配置接口更新配置，并立即获取持仓和榜单数据
      checkUserConfig();
    } else {
      // session 加载完成且确认未登录
      setCachedLoginStatus(false);
      loginStorage.clear();
    }
  }, [isLoggedIn, status]);
  
  // 使用缓存的登录状态，如果 session 还在加载中就不切换
  // 在 session 加载时，如果没有缓存的登录状态，就显示未登录状态，避免闪烁
  const displayLoggedIn = status === 'loading' ? (cachedLoginStatus ?? false) : (cachedLoginStatus !== null ? cachedLoginStatus : isLoggedIn);
  
  // 从本地缓存初始化用户配置状态
  const getInitialConfigFromCache = () => {
    if (typeof window === 'undefined') return null;
    const cachedConfig = userConfigStorage.get();
    if (cachedConfig) {
      const hasApiKey = !!(cachedConfig.apiKey && cachedConfig.apiSecret && 
                           cachedConfig.apiKey.trim() && cachedConfig.apiSecret.trim());
      return {
        hasCredentials: hasApiKey,
        hasUserConfig: true,
        userConfig: {
          ignoredSymbols: cachedConfig.ignoredSymbols || '',
          longLeverage: cachedConfig.longLeverage || '50',
          longMargin: cachedConfig.longMargin || '3',
          shortLeverage: cachedConfig.shortLeverage || '50',
          shortMargin: cachedConfig.shortMargin || '3',
          takeProfit: cachedConfig.takeProfit || '',
          stopLoss: cachedConfig.stopLoss || '',
          copytradingMode: cachedConfig.copytradingMode || false,
        },
        limit: cachedConfig.defaultLimit ? parseInt(cachedConfig.defaultLimit) : 10,
        copytradingMode: cachedConfig.copytradingMode || false,
      };
    }
    return null;
  };

  const initialConfig = getInitialConfigFromCache();
  
  // 初始化状态标志：如果本地有缓存，直接显示主界面，不显示任何提示
  const [isInitialized, setIsInitialized] = useState(true);
  
  // Hydration 标志：在组件挂载到 DOM 后设置为 true，避免 SSR/客户端不匹配
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  
  // 初始值从缓存读取，如果没有则为默认值
  const [limit, setLimit] = useState(initialConfig?.limit ?? 10);
  const [marketData, setMarketData] = useState<{ topMarket: any[], topGainers: any[], topLosers: any[] }>({ topMarket: [], topGainers: [], topLosers: [] });
  const [positions, setPositions] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [copytradingMode, setCopytradingMode] = useState(initialConfig?.copytradingMode ?? false);

  // 处理 limit 变化
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    console.log(`✓ Top 设置已更新为: ${newLimit}`);
    // 保存到数据库
    fetch('/api/user/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ defaultLimit: String(newLimit) }),
    }).catch(console.error);
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
  
  
  // Mobile Tab State - 根据缓存读取，避免 hydration mismatch，默认 positions
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'positions';
    const saved = localStorage.getItem('active_tab') as 'marketCap' | 'gainers' | 'losers' | 'positions' | null;
    return saved || 'positions';
  };
  
  const [activeTab, setActiveTab] = useState<'marketCap' | 'gainers' | 'losers' | 'positions'>('positions');
  
  // 在客户端挂载后初始化 tab（避免 hydration mismatch）
  useEffect(() => {
    const initialTab = getInitialTab();
    setActiveTab(initialTab);
  }, []);
  
  // 保存 tab 状态到 localStorage
  useEffect(() => {
    localStorage.setItem('active_tab', activeTab);
  }, [activeTab]);
  
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

  // API Credentials State (登录后从数据库检查，初始值从缓存读取)
  const [hasCredentials, setHasCredentials] = useState(initialConfig?.hasCredentials ?? false);
  
  // API Key 错误状态（用于停止自动刷新）
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [stopAutoRefresh, setStopAutoRefresh] = useState(false);
  const errorAlertShown = useRef(false); // 用于跟踪是否已显示错误弹窗
  
  // Login Modal State
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Error Modal State
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // User Config State (从数据库获取，初始值从缓存读取)
  const [hasUserConfig, setHasUserConfig] = useState(initialConfig?.hasUserConfig ?? false);
  const [userConfig, setUserConfig] = useState<{
    ignoredSymbols?: string;
    longLeverage?: string;
    longMargin?: string;
    shortLeverage?: string;
    shortMargin?: string;
    takeProfit?: string;
    stopLoss?: string;
    copytradingMode?: boolean;
  } | null>(initialConfig?.userConfig || null);
  
  // 在浏览器绘制之前从缓存初始化所有数据，避免闪烁
  React.useLayoutEffect(() => {
    try {
      const cachedConfig = userConfigStorage.get();
      if (cachedConfig) {
        const hasApiKey = !!(cachedConfig.apiKey && cachedConfig.apiSecret && 
                             cachedConfig.apiKey.trim() && cachedConfig.apiSecret.trim());
        setHasCredentials(hasApiKey);
        setHasUserConfig(true);
        setUserConfig({
          ignoredSymbols: cachedConfig.ignoredSymbols || '',
          longLeverage: cachedConfig.longLeverage || '50',
          longMargin: cachedConfig.longMargin || '3',
          shortLeverage: cachedConfig.shortLeverage || '50',
          shortMargin: cachedConfig.shortMargin || '3',
          takeProfit: cachedConfig.takeProfit || '',
          stopLoss: cachedConfig.stopLoss || '',
          copytradingMode: cachedConfig.copytradingMode || false,
        });
        if (cachedConfig.defaultLimit) {
          setLimit(parseInt(cachedConfig.defaultLimit));
        }
        if (cachedConfig.copytradingMode !== undefined) {
          setCopytradingMode(cachedConfig.copytradingMode);
        }
      }
    } catch (error) {
      console.error('Failed to initialize from cache:', error);
    } finally {
      // 标记初始化完成，允许显示 UI
      setIsInitialized(true);
    }
  }, []);
  
  
  const checkUserConfig = async () => {
    try {
      const res = await fetch('/api/user/config');
      if (res.ok) {
        const data = await res.json();
        const config = data.config || {};
        
        // 保存到本地缓存
        userConfigStorage.set(config);
        
        // 检查 API Key 和 Secret 是否都存在且非空
        const hasApiKey = !!(config.apiKey && config.apiSecret && 
                             config.apiKey.trim() && config.apiSecret.trim());
        setHasCredentials(hasApiKey);
        setHasUserConfig(true);
        setUserConfig({
          ignoredSymbols: config.ignoredSymbols || '',
          longLeverage: config.longLeverage || '50',
          longMargin: config.longMargin || '3',
          shortLeverage: config.shortLeverage || '50',
          shortMargin: config.shortMargin || '3',
          takeProfit: config.takeProfit || '',
          stopLoss: config.stopLoss || '',
          copytradingMode: config.copytradingMode || false,
        });
        if (config.defaultLimit) {
          setLimit(parseInt(config.defaultLimit));
        }
        if (config.copytradingMode !== undefined) {
          setCopytradingMode(config.copytradingMode);
        }
        
        // 已登录且配置有效，立即获取持仓和榜单数据
        if (hasApiKey) {
          fetchMarketData();
          fetchPositions();
        }
      } else {
        setHasCredentials(false);
        setHasUserConfig(false);
        setUserConfig(null);
        // 不清除缓存，保留之前的配置
      }
    } catch (error) {
      console.error('Failed to check user config:', error);
      setHasCredentials(false);
      setHasUserConfig(false);
      setUserConfig(null);
      // 出错时不清除缓存，保留之前的配置
    }
  };

  // 检查用户是否已登录且有配置密钥
  const hasValidCredentials = () => {
    const config = userConfigStorage.get();
    return !!(config?.apiKey && config?.apiSecret && 
             config.apiKey.trim() && config.apiSecret.trim());
  };

  const fetchMarketData = async () => {
    setMarketLoading(true);
    try {
      // 市场数据不需要密钥，后端是公开 API
      const res = await fetch(`/api/binance/market?limit=${limit}`);
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
      // 检查是否有有效凭证
      if (!hasValidCredentials()) {
        console.log('No valid credentials found for fetching positions');
        setPositions([]);
        setWalletBalance(0);
        setPositionsLoading(false);
        return;
      }

      console.log('Fetching positions - backend will use user credentials from database via Session');

      // 持仓查询由后端通过 Session 识别用户并从数据库获取密钥
      const res = await fetch('/api/binance/positions');
      
      const data = await res.json();
      
      // 如果响应失败，显示错误原因
      if (!res.ok) {
        const errorMsg = data.error || '未知错误';
        console.error(`❌ 获取持仓失败: ${errorMsg}`);
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
          document.title = '榜单合约';
        }
      }
    } catch (error) {
      console.error('Failed to fetch positions', error);
    } finally {
      setPositionsLoading(false);
    }
  };

  useEffect(() => {
    // 检查是否有 API 密钥（从用户配置中读取）
    const checkCredentials = () => {
      const config = userConfigStorage.get();
      const hasKey = !!(config?.apiKey && config?.apiSecret && 
                       config.apiKey.trim() && config.apiSecret.trim());
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
    
    // 简单的同步检查函数用于定时器（从用户配置中读取）
    const checkCredentialsSync = (): boolean => {
      const config = userConfigStorage.get();
      return !!(config?.apiKey && config?.apiSecret && 
               config.apiKey.trim() && config.apiSecret.trim());
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

  const handleTrade = async (side: 'LONG' | 'SHORT', source?: 'market' | 'gainers' | 'losers') => {
    const sideText = side === 'LONG' ? '做多' : '做空';
    
    // 根据来源确定目标榜单和数据
    let sourceData: any[] = [];
    let targetList = '';
    
    // 如果明确指定了来源，使用指定的；否则根据 side 推断
    if (source === 'market' || (side === 'LONG' && !source)) {
      sourceData = marketData.topMarket;
      targetList = '市值前';
    } else if (source === 'gainers' || (side === 'SHORT' && !source)) {
      sourceData = marketData.topGainers;
      targetList = '涨幅前';
    } else if (source === 'losers') {
      sourceData = marketData.topLosers;
      targetList = '跌幅前';
    }
    
    // 获取忽略的币种列表（优先从 userConfig 读取，否则从 localStorage 读取）
    const ignoredSymbolsStr = userConfig?.ignoredSymbols || localStorage.getItem('ignored_symbols') || '';
    const ignoredSet = new Set(
      ignoredSymbolsStr
        .split(/\s+/)
        .filter(s => s.length > 0)
        .map(s => s.toUpperCase())
    );
    
    // 获取已有持仓的币种集合
    const openPositionsSet = new Set(positions.map(p => p.symbol));
    
    // 显示所有币种（包括忽略的和已有持仓的，都在执行时处理）
    let symbols = sourceData.map(m => m.symbol);

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

      // 检查是否有凭证
      if (!hasValidCredentials()) {
        setErrorMessage('请先配置 API 密钥');
        setErrorModalOpen(true);
        return;
      }

      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        // 分离出忽略、已开仓、需要交易的币种
        const ignoredSymbolsList: string[] = [];
        const alreadyOpenSymbols: string[] = [];
        const tradingSymbols: string[] = [];
        
        batch.forEach(symbol => {
          const cleanSymbol = symbol.replace('/USDT:USDT', '').replace('/USDT', '');
          
          // 先检查是否已开仓
          if (openPositionsSet.has(symbol)) {
            alreadyOpenSymbols.push(symbol);
          } 
          // 再检查是否被忽略
          else if (ignoredSet.has(cleanSymbol)) {
            ignoredSymbolsList.push(symbol);
          } 
          // 其他币种才需要交易
          else {
            tradingSymbols.push(symbol);
          }
        });
        
        // 添加被忽略的币种到结果中（显示"已忽略-跳过"）
        ignoredSymbolsList.forEach(symbol => {
          setTradeResults(prev => [...prev, { 
            symbol, 
            status: 'SKIPPED', 
            message: '已忽略-跳过' 
          }]);
        });
        
        // 添加已开仓的币种到结果中（显示"已开仓-跳过"）
        alreadyOpenSymbols.forEach(symbol => {
          setTradeResults(prev => [...prev, { 
            symbol, 
            status: 'SKIPPED', 
            message: '已开仓-跳过' 
          }]);
        });
        
        // 如果有需要交易的币种，发送到后端
        if (tradingSymbols.length > 0) {
          try {
            console.log(`Trading batch: ${tradingSymbols.join(', ')}`);

            // 后端通过 Session 识别用户并从数据库获取密钥
            const res = await fetch('/api/binance/trade', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ symbols: tradingSymbols, side, leverage, notional, takeProfitPercent, stopLossPercent })
            });
            
            const data = await res.json();
            
            // 如果响应失败，显示错误原因
            if (!res.ok) {
              const errorMsg = data.error || '未知错误';
              console.error(`❌ 交易批量失败: ${errorMsg}`);
              
              // 为每个失败的币种创建单独的错误结果
              tradingSymbols.forEach(symbol => {
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
            tradingSymbols.forEach(symbol => {
              setTradeResults(prev => [...prev, { 
                symbol, 
                status: 'FAILED', 
                message: e instanceof Error ? e.message : '网络错误' 
              }]);
            });
          }
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

      // 检查是否有凭证
      if (!hasValidCredentials()) {
        console.error('No valid credentials for trading');
        setTradeResults([{ symbol, status: 'FAILED', message: '请先配置 API 密钥' }]);
        setIsTrading(false);
        return;
      }

      try {
        console.log(`Opening position: ${symbol}`);

        // 后端通过 Session 识别用户并从数据库获取密钥
        const res = await fetch('/api/binance/trade', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbols: [symbol], side, leverage, notional, takeProfitPercent, stopLossPercent })
        });
        
        const data = await res.json();
        
        // 如果响应失败，显示错误原因
        if (!res.ok) {
          const errorMsg = data.error || '未知错误';
          console.error(`❌ 开仓失败: ${errorMsg}`);
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

      // 检查是否有凭证
      if (!hasValidCredentials()) {
        console.error('No valid credentials for closing positions');
        setTradeResults([{ symbol: 'ALL', status: 'FAILED', message: '请先配置 API 密钥' }]);
        setIsTrading(false);
        return;
      }

      try {
        console.log(`Closing positions: ${type}`);

        // 分批平仓以显示进度
        const batchSize = 3;
        const allResults: any[] = [];
        
        for (let i = 0; i < positionsToClose.length; i += batchSize) {
          const batch = positionsToClose.slice(i, i + batchSize);
          
          try {
            // 后端通过 Session 识别用户并从数据库获取密钥
            const res = await fetch(`/api/binance/positions?type=${type}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                symbols: batch.map(p => p.symbol)
              })
            });
            const data = await res.json();
            
            // 如果响应失败，显示错误原因
            if (!res.ok) {
              const errorMsg = data.error || '未知错误';
              console.error(`❌ 平仓失败: ${errorMsg}`);
              
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

  // 在初始化完成前，只显示背景，不渲染任何内容
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-200/30 blur-3xl" />
          <div className="absolute top-[10%] right-[0%] w-[40%] h-[40%] rounded-full bg-purple-200/30 blur-3xl" />
          <div className="absolute bottom-[0%] left-[20%] w-[60%] h-[40%] rounded-full bg-pink-200/30 blur-3xl" />
        </div>
      </div>
    );
  }

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
          {isHydrated && (
            <div className="flex items-center gap-2">
              {displayLoggedIn ? (
                <>
                  {hasUserConfig && (
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
                  )}
                </>
              ) : (
                <button
                  onClick={() => setLoginOpen(true)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  去登录
                </button>
              )}
            </div>
          )}
          
          {/* Desktop Controls */}
          {isHydrated && displayLoggedIn && (
            <div className="hidden md:flex items-center gap-2 bg-gray-100/50 px-2 py-1 rounded-xl border border-gray-200/50">
              <div className="flex items-center gap-2 px-2">
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
              <div className="w-px h-6 bg-gray-200" />
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 bg-white hover:bg-gray-50 rounded-lg shadow-sm text-gray-600 transition-colors border border-gray-100"
                title="交易设置"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  loginStorage.clear();
                  userConfigStorage.clear();
                  signOut();
                }}
                className="p-1.5 bg-white hover:bg-red-50 rounded-lg shadow-sm text-gray-600 hover:text-red-600 transition-colors border border-gray-100"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Mobile Controls */}
          {isHydrated && displayLoggedIn && (
            <div className="md:hidden flex items-center gap-2 bg-gray-100/50 px-2 py-1 rounded-xl border border-gray-200/50">
              <div className="flex items-center gap-2 px-2">
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
              <div className="w-px h-6 bg-gray-200" />
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-1.5 bg-white hover:bg-gray-50 rounded-lg shadow-sm text-gray-600 transition-colors border border-gray-100"
                title="交易设置"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  loginStorage.clear();
                  userConfigStorage.clear();
                  signOut();
                }}
                className="p-1.5 bg-white hover:bg-red-50 rounded-lg shadow-sm text-gray-600 hover:text-red-600 transition-colors border border-gray-100"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.header>

        {/* Desktop Layout */}
        {!isHydrated ? (
          <div className="hidden lg:flex items-center justify-center flex-1 flex-col gap-6" style={{ height: 'calc(100vh - 150px)' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm font-bold text-gray-600">加载中...</span>
            </div>
          </div>
        ) : !displayLoggedIn ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:flex items-center justify-center flex-1 flex-col gap-6"
            style={{ height: 'calc(100vh - 150px)' }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">请先登录</h2>
              <p className="text-gray-600 font-medium mb-6">登录后即可使用榜单合约系统</p>
              <button
                onClick={() => setLoginOpen(true)}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg"
              >
                去登录
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="hidden lg:flex flex-col">
            {/* Module 1: Positions & Stats - Full Screen (minus header) */}
            <div className="w-full" style={{ height: 'calc(100vh - 150px)' }}>
              <PositionsTable positions={positions} onClose={handleClosePositions} loading={positionsLoading} walletBalance={walletBalance} hasCredentials={hasCredentials} onRefresh={fetchPositions} />
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
                  onAction={() => handleTrade('LONG', 'market')}
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
                  onAction={() => handleTrade('SHORT', 'gainers')}
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
                  onAction={() => handleTrade('LONG', 'losers')}
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
        {!isHydrated ? (
          <div className="lg:hidden flex items-center justify-center flex-1 flex-col gap-6 bg-white rounded-3xl shadow-sm border border-gray-100" style={{ height: 'calc(100vh - 150px)' }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm font-bold text-gray-600">加载中...</span>
            </div>
          </div>
        ) : !displayLoggedIn ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:hidden flex items-center justify-center flex-1 flex-col gap-6 bg-white rounded-3xl shadow-sm border border-gray-100"
            style={{ height: 'calc(100vh - 150px)' }}
          >
            <div className="text-center">
              <div className="text-5xl mb-4">🔐</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">请先登录</h2>
              <p className="text-gray-600 font-medium mb-6 text-sm">登录后即可使用榜单合约系统</p>
              <button
                onClick={() => setLoginOpen(true)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors"
              >
                去登录
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="lg:hidden flex flex-col bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 150px)' }} suppressHydrationWarning>
            {/* Tab Headers */}
            <div className="flex bg-white border-b border-gray-200 sticky top-0 z-30 shrink-0 rounded-t-3xl">
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex-1 px-2 py-3 font-bold text-xs transition-all relative ${
                activeTab === 'positions'
                  ? 'text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              suppressHydrationWarning
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
              suppressHydrationWarning
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
              suppressHydrationWarning
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
              suppressHydrationWarning
            >
              跌幅
              {activeTab === 'losers' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden" suppressHydrationWarning>
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
                  onAction={() => handleTrade('LONG', 'market')}
                  actionLabel="一键做多"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                  ignoredSymbols={userConfig?.ignoredSymbols || localStorage.getItem('ignored_symbols') || ''}
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
                  onAction={() => handleTrade('SHORT', 'gainers')}
                  actionLabel="一键做空"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                  ignoredSymbols={userConfig?.ignoredSymbols || localStorage.getItem('ignored_symbols') || ''}
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
                  onAction={() => handleTrade('LONG', 'losers')}
                  actionLabel="一键做多"
                  isTrading={isTrading}
                  isLoading={marketLoading}
                  openPositions={new Set(positions.map(p => p.symbol))}
                  onOpenPosition={handleOpenPosition}
                  ignoredSymbols={userConfig?.ignoredSymbols || localStorage.getItem('ignored_symbols') || ''}
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
                  onRefresh={fetchPositions}
                />
              </div>
            )}
          </div>
          </div>
        )}

        {/* Modals */}
        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={() => {
            loginStorage.set(true);
            setCachedLoginStatus(true);
            checkUserConfig();
          }}
        />
        <SettingsModal 
          isOpen={settingsOpen} 
          onClose={() => {
            setSettingsOpen(false);
            checkUserConfig();
          }} 
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
        <ErrorModal
          isOpen={errorModalOpen}
          message={errorMessage}
          onClose={() => {
            setErrorModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
