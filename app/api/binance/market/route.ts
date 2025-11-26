import { NextResponse } from 'next/server';
import { getBinanceClient } from '@/lib/binance-client';

export const dynamic = 'force-dynamic';

// 格式化市值
const formatMarketCap = (num: number): string => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + '万亿'; // 万亿（Trillion）
  if (num >= 1e8) return (num / 1e8).toFixed(2) + '亿'; // 亿（1亿 = 1e8）
  if (num >= 1e6) return (num / 1e6).toFixed(2) + '百万'; // 百万（Million）
  return num.toFixed(2);
};

// 格式化交易量
const formatVolume = (num: number) => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};

// 从 CoinGecko 获取市值数据（获取前200名以覆盖更多币种）
async function getMarketCapData() {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false`,
      { 
        cache: 'no-store', // 禁用缓存，每次都获取最新数据
        headers: {
          'Accept': 'application/json',
        }
      }
    );
    
    if (!response.ok) {
      console.error('CoinGecko API error:', response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      console.error('CoinGecko returned invalid data');
      return null;
    }
    
    const marketCapMap = new Map();
    
    data.forEach((coin: any) => {
      if (!coin.market_cap || coin.market_cap <= 0) return;
      
      const symbol = coin.symbol.toUpperCase();
      const existing = marketCapMap.get(symbol);
      
      // 如果该符号已存在，只保留市值排名更高的（排名数字更小的）
      if (existing && existing.rank < coin.market_cap_rank) {
        return; // 跳过排名较低的币种
      }
      
      marketCapMap.set(symbol, {
        marketCap: coin.market_cap,
        marketCapFormatted: formatMarketCap(coin.market_cap),
        rank: coin.market_cap_rank,
      });
    });
    
    console.log(`✓ Loaded market cap data for ${marketCapMap.size} coins from CoinGecko`);
    return marketCapMap;
  } catch (error) {
    console.error('Failed to fetch market cap data:', error);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // market API 不需要认证，使用公开客户端
    const [client, marketCapMap] = await Promise.all([
      getBinanceClient(undefined, undefined, false),
      getMarketCapData()
    ]);
    
    // 如果市值数据获取失败，记录警告
    if (!marketCapMap || marketCapMap.size === 0) {
      console.warn('⚠️ Market cap data unavailable, falling back to volume-based sorting');
    }
    
    const tickers = await client.fetchTickers();
    
    // 稳定币列表（排除这些币种）
    const stablecoins = new Set([
      'USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP', 'USDD', 'GUSD', 
      'FRAX', 'LUSD', 'SUSD', 'USDK', 'USDN', 'FDUSD', 'PYUSD'
    ]);

    // 先加载市场信息以获取合约状态
    await client.loadMarkets();
    
    // Filter for USDT futures only (Linear Perps) and exclude stablecoins
    // 注意：defaultType: 'future' 已经限定了期货市场，fetchTickers返回的都是永续合约
    const usdtTickers = Object.values(tickers).filter((ticker: any) => {
      // 必须是 :USDT 结尾的U本位合约
      if (!ticker.symbol.endsWith(':USDT')) {
        return false;
      }
      
      // 提取币种符号（如 BTC/USDT:USDT -> BTC）
      const coinSymbol = ticker.symbol.split('/')[0];
      
      // 排除稳定币
      if (stablecoins.has(coinSymbol)) {
        return false;
      }
      
      return true;
    });

    // 将市值数据添加到 ticker 中
    const enrichedTickers = usdtTickers.map((ticker: any, index: number) => {
      // 提取币种符号（如 BTC/USDT:USDT -> BTC）
      const coinSymbol = ticker.symbol.split('/')[0];
      const marketCapData = marketCapMap?.get(coinSymbol);
      
      return {
        ...ticker,
        marketCap: marketCapData?.marketCap || 0,
        marketCapFormatted: marketCapData?.marketCapFormatted || 'N/A',
        rank: marketCapData?.rank || null, // 没有市值数据时 rank 为 null
        hasMarketCapData: !!marketCapData, // 标记是否有市值数据
      };
    });

    // Sort by Market Cap (真实市值排序)
    // 只选择有市值数据的币种（排除市值为0或N/A的）
    const withMarketCap = enrichedTickers.filter((t: any) => t.hasMarketCapData);
    
    let topMarket;
    if (withMarketCap.length >= limit) {
      // 如果有足够的市值数据，按市值排序（按 rank 排名排序）
      topMarket = [...withMarketCap]
        .sort((a: any, b: any) => (a.rank || 999999) - (b.rank || 999999))
        .slice(0, limit)
        .map((t: any) => ({
          symbol: t.symbol,
          price: t.last,
          change: t.percentage,
          volume: t.quoteVolume,
          volumeFormatted: formatVolume(t.quoteVolume || 0),
          marketCap: t.marketCap,
          marketCapFormatted: t.marketCapFormatted,
          rank: t.rank,
        }));
    } else {
      // 降级方案：如果市值数据不足，按交易量排序
      console.warn(`⚠️ Insufficient market cap data (${withMarketCap.length}/${limit}), using volume-based sorting`);
      topMarket = [...enrichedTickers]
        .sort((a: any, b: any) => (b.quoteVolume || 0) - (a.quoteVolume || 0))
        .slice(0, limit)
        .map((t: any) => ({
          symbol: t.symbol,
          price: t.last,
          change: t.percentage,
          volume: t.quoteVolume,
          volumeFormatted: formatVolume(t.quoteVolume || 0),
          marketCap: t.marketCap,
          marketCapFormatted: t.marketCapFormatted,
          rank: t.rank,
        }));
    }

    // Sort by 24h Change (Gainers)
    // 排除非活跃/下架合约（与币安官网涨幅榜保持一致）
    // 规则：只显示 active=true 且 status=TRADING 的合约
    const mainZoneTickers = enrichedTickers.filter((t) => {
      try {
        const market = client.market(t.symbol);
        // 必须是活跃且状态为TRADING的合约
        // SETTLING状态表示合约正在下架/结算中，不在涨幅榜显示
        return market.active === true && market.info?.status === 'TRADING';
      } catch {
        return false; // 如果找不到市场信息，排除
      }
    });
    
    const topGainers = [...mainZoneTickers]
      .sort((a: any, b: any) => (b.percentage || 0) - (a.percentage || 0))
      .slice(0, limit)
      .map((t: any) => ({
        symbol: t.symbol,
        price: t.last,
        change: t.percentage,
        volume: t.quoteVolume,
        volumeFormatted: formatVolume(t.quoteVolume || 0),
        marketCap: t.marketCap,
        marketCapFormatted: t.marketCapFormatted,
        rank: t.rank,
      }));

    const topLosers = [...mainZoneTickers]
      .sort((a: any, b: any) => (a.percentage || 0) - (b.percentage || 0))
      .slice(0, limit)
      .map((t: any) => ({
        symbol: t.symbol,
        price: t.last,
        change: t.percentage,
        volume: t.quoteVolume,
        volumeFormatted: formatVolume(t.quoteVolume || 0),
        marketCap: t.marketCap,
        marketCapFormatted: t.marketCapFormatted,
        rank: t.rank,
      }));

    return NextResponse.json({
      topMarket,
      topGainers,
      topLosers,
    });
  } catch (error: any) {
    console.error('Error fetching market data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
