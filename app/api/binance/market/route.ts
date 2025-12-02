import { NextResponse } from 'next/server';
import { getBinanceClient } from '@/lib/binance-client';

export const dynamic = 'force-dynamic';

// CoinGecko API Key
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || 'CG-XCQVejpEcFBGg96nRcw2mkTH';

// 格式化市值
const formatMarketCap = (num: number): string => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + '万亿';
  if (num >= 1e8) return (num / 1e8).toFixed(2) + '亿';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + '百万';
  return num.toFixed(2);
};

// 格式化交易量
const formatVolume = (num: number) => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
};

// 清理币种符号，处理 Binance 的特殊格式（如 1000PEPE -> PEPE）
function normalizeSymbol(symbol: string): string[] {
  const upper = symbol.toUpperCase();
  const variants: string[] = [upper];
  
  const withoutPrefix = upper.replace(/^\d+/, '');
  if (withoutPrefix !== upper && withoutPrefix.length > 0) {
    variants.push(withoutPrefix);
  }
  
  const withoutSuffix = upper.split('/')[0].split(':')[0];
  if (withoutSuffix !== upper) {
    variants.push(withoutSuffix);
  }
  
  return [...new Set(variants)];
}

// 从 CoinGecko 获取市值数据
async function getMarketCapData(): Promise<Map<string, { marketCap: number; marketCapFormatted: string; rank: number }> | null> {
  try {
    const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&sparkline=false&x_cg_demo_api_key=${COINGECKO_API_KEY}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(apiUrl, { 
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    
    const marketCapMap = new Map<string, { marketCap: number; marketCapFormatted: string; rank: number }>();
    
    data.forEach((coin: any) => {
      if (!coin.market_cap || coin.market_cap <= 0 || !coin.symbol || !coin.market_cap_rank) {
        return;
      }
      
      const symbol = coin.symbol.toUpperCase();
      const existing = marketCapMap.get(symbol);
      
      if (existing && existing.rank < coin.market_cap_rank) {
        return;
      }
      
      marketCapMap.set(symbol, {
        marketCap: coin.market_cap,
        marketCapFormatted: formatMarketCap(coin.market_cap),
        rank: coin.market_cap_rank,
      });
    });
    
    return marketCapMap;
  } catch (error: any) {
    console.error('Failed to fetch market cap data:', error.message || error);
    return null;
  }
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skipMarketCap = searchParams.get('skipMarketCap') === 'true';
    
    // market API 不需要认证，使用公开客户端
    const client = await getBinanceClient(undefined, undefined, false);
    
    // 只有在不跳过市值查询时才调用 CoinGecko API
    const marketCapMap = skipMarketCap ? null : await getMarketCapData();
    
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
    const enrichedTickers = usdtTickers.map((ticker: any) => {
      const coinSymbol = ticker.symbol.split('/')[0];
      let marketCapData = marketCapMap?.get(coinSymbol);
      
      if (!marketCapData) {
        const normalizedSymbols = normalizeSymbol(coinSymbol);
        for (const normalized of normalizedSymbols) {
          marketCapData = marketCapMap?.get(normalized);
          if (marketCapData) break;
        }
      }
      
      return {
        ...ticker,
        marketCap: marketCapData?.marketCap || 0,
        marketCapFormatted: marketCapData?.marketCapFormatted || 'N/A',
        rank: marketCapData?.rank || null,
        hasMarketCapData: !!marketCapData,
      };
    });

    // Sort by Market Cap (按市值排序)
    const withMarketCap = enrichedTickers.filter((t: any) => t.hasMarketCapData);
    
    let topMarket;
    if (withMarketCap.length >= limit) {
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
