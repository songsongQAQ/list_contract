import { NextResponse, NextRequest } from 'next/server';
import { getBinanceClient } from '@/lib/binance-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')?.trim();
    const apiSecret = request.headers.get('x-api-secret')?.trim();

    console.log('Positions API - Received credentials:', { 
      apiKey: apiKey ? `${apiKey.substring(0, 8)}... (${apiKey.length} chars)` : 'empty', 
      apiSecret: apiSecret ? `${apiSecret.substring(0, 8)}... (${apiSecret.length} chars)` : 'empty' 
    });

    if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
      console.error('Invalid credentials in headers');
      return NextResponse.json(
        { error: 'Missing API credentials in request headers. Please configure them in Settings.' },
        { status: 401 }
      );
    }

    const client = await getBinanceClient(apiKey, apiSecret, true);
    // fetchPositions usually returns all symbols, need to filter
    const positions = await client.fetchPositions();
    const balance = await client.fetchBalance();
    
    // Get USDT wallet balance - try multiple paths
    let usdtBalance = 0;
    const balanceAny = balance as any;
    
    if (balanceAny.USDT) {
      const usdtObj = balanceAny.USDT;
      if (typeof usdtObj === 'object' && usdtObj.free) {
        usdtBalance = typeof usdtObj.free === 'string' ? parseFloat(usdtObj.free) : usdtObj.free;
      } else if (typeof usdtObj === 'object' && usdtObj.total) {
        usdtBalance = typeof usdtObj.total === 'string' ? parseFloat(usdtObj.total) : usdtObj.total;
      } else if (typeof usdtObj === 'number') {
        usdtBalance = usdtObj;
      } else if (typeof usdtObj === 'string') {
        usdtBalance = parseFloat(usdtObj);
      }
    } else if (balanceAny.free?.USDT) {
      const usdt = balanceAny.free.USDT;
      usdtBalance = typeof usdt === 'string' ? parseFloat(usdt) : (typeof usdt === 'number' ? usdt : 0);
    }
    
    usdtBalance = usdtBalance || 0;
    
    console.log(`Fetching positions - wallet balance: ${usdtBalance} USDT, positions count: ${positions.length}`);
    
    const activePositions = await Promise.all(
      positions
        .filter((p: any) => parseFloat(p.info.positionAmt) !== 0)
        .map(async (p: any) => {
          const size = Math.abs(parseFloat(p.info.positionAmt));
          const entryPrice = parseFloat(p.entryPrice);
          const markPrice = parseFloat(p.markPrice || p.last || entryPrice);
          
          // Get leverage - calculate from notional and initialMargin
          let leverage = 1;
          const notionalValue = Math.abs(parseFloat(p.info.notional));
          const initialMarginValue = parseFloat(p.info.initialMargin);
          
          if (notionalValue && initialMarginValue && initialMarginValue > 0) {
            leverage = notionalValue / initialMarginValue;
          } else if (p.info?.leverage) {
            leverage = parseFloat(p.info.leverage);
          } else if (p.leverage) {
            leverage = parseFloat(p.leverage);
          }
          
          const positionNotional = size * entryPrice; // Entry notional
          const margin = initialMarginValue || (positionNotional / leverage); // Use initialMargin from info if available
          const side = parseFloat(p.info.positionAmt) > 0 ? 'LONG' : 'SHORT';
          
          // Fetch open orders for this symbol to get TP/SL
          let takeProfitPrice = null;
          let stopLossPrice = null;
          
          try {
            const openOrders = await client.fetchOpenOrders(p.symbol);
            for (const order of openOrders) {
              const orderInfo = order.info || {};
              // Check if order matches this position side
              if (orderInfo.positionSide === side) {
                if (orderInfo.type === 'TAKE_PROFIT_MARKET' || orderInfo.type === 'TAKE_PROFIT') {
                  takeProfitPrice = parseFloat(orderInfo.stopPrice);
                } else if (orderInfo.type === 'STOP_MARKET' || orderInfo.type === 'STOP') {
                  stopLossPrice = parseFloat(orderInfo.stopPrice);
                }
              }
            }
          } catch (error) {
            console.warn(`Failed to fetch open orders for ${p.symbol}:`, error);
          }
          
          console.log(`${p.symbol}: size=${size}, leverage=${leverage.toFixed(2)}, notional=${positionNotional.toFixed(2)}, margin=${margin.toFixed(2)}, TP=${takeProfitPrice}, SL=${stopLossPrice}`);
          
          return {
            symbol: p.symbol,
            size: size,
            entryPrice: entryPrice,
            markPrice: markPrice,
            pnl: parseFloat(p.unrealizedPnl),
            side: side,
            leverage: leverage,
            positionNotional: positionNotional,
            margin: margin,
            takeProfitPrice: takeProfitPrice,
            stopLossPrice: stopLossPrice,
          };
        })
    );

    return NextResponse.json({ positions: activePositions, walletBalance: usdtBalance });
  } catch (error: any) {
    console.error('Error fetching positions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'LONG', 'SHORT', or 'ALL'
    
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // 如果没有body，继续处理
    }

    const apiKey = request.headers.get('x-api-key')?.trim();
    const apiSecret = request.headers.get('x-api-secret')?.trim();

    if (!apiKey || !apiSecret || apiKey.length === 0 || apiSecret.length === 0) {
      console.error('Missing credentials in headers for DELETE:', { apiKey: apiKey ? `${apiKey.length} chars` : 'empty', apiSecret: apiSecret ? `${apiSecret.length} chars` : 'empty' });
      return NextResponse.json(
        { error: 'Missing API credentials in request headers. Please configure them in Settings.' },
        { status: 401 }
      );
    }

    const client = await getBinanceClient(apiKey, apiSecret, true);
    const positions = await client.fetchPositions();
    const activePositions = positions.filter((p: any) => parseFloat(p.info.positionAmt) !== 0);

    const results = [];
    
    // 如果指定了symbols列表，只平仓这些币种
    const targetSymbols = body.symbols ? new Set(body.symbols) : null;

    for (const p of activePositions) {
      // 如果指定了目标币种列表，检查是否包含该币种
      if (targetSymbols && !targetSymbols.has(p.symbol)) {
        continue;
      }
      
      const size = parseFloat(p.info.positionAmt);
      const side = size > 0 ? 'LONG' : 'SHORT';

      if (type === 'ALL' || type === side) {
        try {
          // Close by sending opposite order with positionSide parameter
          const orderSide = size > 0 ? 'sell' : 'buy';
          // Use Math.abs for size because createMarketOrder expects positive quantity
          // positionSide is required for Binance to know which position to close (LONG or SHORT)
          await client.createMarketOrder(p.symbol, orderSide, Math.abs(size), undefined, { 
            positionSide: side
          });
          results.push({ symbol: p.symbol, status: 'CLOSED' });
        } catch (e: any) {
          results.push({ symbol: p.symbol, status: 'FAILED', message: e.message });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
