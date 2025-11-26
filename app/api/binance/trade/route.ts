import { NextResponse, NextRequest } from 'next/server';
import { getBinanceClient } from '@/lib/binance-client';
import { getUserConfigFromDB } from '@/lib/user-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { symbols, side, leverage = 50, notional = 150, takeProfitPercent = 0, stopLossPercent = 0 } = body;
    
    // Ensure all numeric values are actually numbers
    leverage = parseFloat(leverage) || 50;
    notional = parseFloat(notional) || 150;
    takeProfitPercent = parseFloat(takeProfitPercent) || 0;
    stopLossPercent = parseFloat(stopLossPercent) || 0;
    
    if (!symbols || !Array.isArray(symbols) || !side) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    
    const credentials = await getUserConfigFromDB();

    if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
      console.error('No credentials found in database for trade');
      return NextResponse.json(
        { error: '请先在设置中配置 API 密钥' },
        { status: 401 }
      );
    }

    const { apiKey, apiSecret } = credentials;

    console.log('Trade API - Using credentials:', { 
      apiKey: `${apiKey.substring(0, 8)}... (${apiKey.length} chars)`, 
      mode: credentials.mode
    });
    
    console.log(`Trade request: symbols=${symbols.length}, side=${side}, leverage=${leverage}, notional=${notional}`);

    const client = await getBinanceClient(apiKey, apiSecret, true);
    const results = [];
    
    // 0. Fetch account balance to determine available margin
    let accountBalance = 10000; // Default fallback
    try {
      const balance = await client.fetchBalance();
      const balanceAny = balance as any;
      let usdtBalance: any = 0;
      
      // Try to get USDT balance from different possible structures
      if (balanceAny.USDT) {
        const usdtObj = balanceAny.USDT;
        usdtBalance = (typeof usdtObj === 'object' && usdtObj.free) ? usdtObj.free : usdtObj;
      } else if (balanceAny.free?.USDT) {
        const freeUsdt = balanceAny.free.USDT;
        usdtBalance = freeUsdt;
      }
      
      // Convert to number if string
      if (typeof usdtBalance === 'string') {
        accountBalance = parseFloat(usdtBalance) || 10000;
      } else if (typeof usdtBalance === 'number') {
        accountBalance = usdtBalance || 10000;
      } else {
        accountBalance = 10000;
      }
      
      console.log(`Account balance: ${accountBalance} USDT`);
    } catch (e) {
      console.warn('Could not fetch balance, using default', e);
    }
    
    // 1. Fetch current positions to check for existing ones
    const positions = await client.fetchPositions();
    const existingPositions = new Set(
      positions
        .filter((p: any) => parseFloat(p.info.positionAmt) !== 0)
        .map((p: any) => p.symbol)
    );

    for (const symbol of symbols) {
      try {
        // 检查该币种是否已有任何持仓
        if (existingPositions.has(symbol)) {
          results.push({ symbol, status: 'SKIPPED', message: '已有仓位' });
          continue;
        }

        // 2. Set Leverage - start from 40x and decrease by 10 each time if failed
        let actualLeverage = leverage;
        try {
          await client.setLeverage(leverage, symbol);
          console.log(`Set leverage ${leverage}x for ${symbol}`);
        } catch (e: any) {
          console.warn(`Failed to set leverage ${leverage}x for ${symbol}, trying lower values`, e.message);
          // Try leverage starting from 40x, decreasing by 10 each time: 40, 30, 20, 10
          const leverageOptions = [40, 30, 20, 10];
          let leverageSet = false;
          
          for (const tryLev of leverageOptions) {
            try {
              await client.setLeverage(tryLev, symbol);
              actualLeverage = tryLev;
              console.log(`Successfully set leverage to ${tryLev}x for ${symbol}`);
              leverageSet = true;
              break;
            } catch (tryError) {
              console.log(`Leverage ${tryLev}x failed for ${symbol}, trying next...`);
              continue;
            }
          }
          
          if (!leverageSet) {
            console.warn(`Could not set leverage for ${symbol}, proceeding with current account leverage`);
            actualLeverage = 1; // Mark as 1x if no leverage could be set
          }
        }
        
        console.log(`${symbol}: Using leverage ${actualLeverage}x (requested: ${leverage}x), but maintaining position value at ${notional} USDT`);

        // 3. Calculate Quantity
        // Target Notional from settings
        const ticker = await client.fetchTicker(symbol);
        const price = ticker.last;
        if (!price) throw new Error('Could not fetch price');

        // Get minimum notional requirement for this coin
        // BTC default is 200, others default to 100
        const coinSymbol = symbol.split('/')[0];
        const defaultMinNotional = coinSymbol === 'BTC' ? 200 : 100;
        
        // Use the larger of: user configured notional or system default minimum
        const baseNotional = Math.max(notional, defaultMinNotional);
        
        // But don't exceed 50% of account balance for safety
        const maxAllowed = accountBalance * 0.5;
        const targetNotional = Math.min(baseNotional, maxAllowed);
        
        let quantity = targetNotional / price;
        
        // Validate quantity
        if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
          throw new Error(`Invalid quantity calculated: ${quantity} (notional: ${targetNotional}, price: ${price})`);
        }
        
        console.log(`${symbol}: price=${price}, defaultMin=${defaultMinNotional}, configured=${notional}, using=${targetNotional}, quantity=${quantity}`);
        
        // Get market limits to properly format quantity
        try {
          const market = client.market(symbol);
          if (market && market.limits) {
            const { amount, cost } = market.limits;
            
            // Check minimum amount
            if (amount && amount.min) {
              if (quantity < amount.min) {
                quantity = amount.min;
                console.log(`  -> Increased quantity to min amount: ${amount.min}`);
              }
            }
            
            // Check minimum cost (notional)
            if (cost && cost.min) {
              const actualCost = quantity * price;
              if (actualCost < cost.min) {
                quantity = cost.min / price;
                console.log(`  -> Detected higher min cost: ${cost.min}, recalculating quantity to ${quantity}`);
              }
            }
            
            // Check precision
            const amountAny = amount as any;
            if (amountAny && amountAny.precision) {
              const precision = amountAny.precision;
              quantity = parseFloat(quantity.toPrecision(precision));
              console.log(`  -> Applied precision: ${precision}, quantity: ${quantity}`);
            }
          }
        } catch (e) {
          console.warn(`Could not fetch market limits for ${symbol}`, e);
        }
        
        // Final validation
        if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
          throw new Error(`Invalid quantity after adjustment: ${quantity}`);
        }

        // 4. Place Order with correct positionSide
        const orderSide = side === 'LONG' ? 'buy' : 'sell';
        console.log(`Placing ${side} order: ${symbol} qty=${quantity} price=${price} total~${(quantity * price).toFixed(2)}USDT`);
        
        const order = await client.createMarketOrder(symbol, orderSide, quantity, undefined, { 
          positionSide: side  // IMPORTANT: Specify LONG or SHORT for Binance futures
        });

        // 5. Set Take Profit and Stop Loss if configured
        if (takeProfitPercent > 0 || stopLossPercent > 0) {
          try {
            // Calculate TP and SL prices based on entry price
            let tpPrice = null;
            let slPrice = null;
            
            if (side === 'LONG') {
              // For LONG: TP is above entry, SL is below entry
              if (takeProfitPercent > 0) {
                tpPrice = price * (1 + takeProfitPercent / 100);
              }
              if (stopLossPercent > 0) {
                slPrice = price * (1 - stopLossPercent / 100);
              }
            } else {
              // For SHORT: TP is below entry, SL is above entry
              if (takeProfitPercent > 0) {
                tpPrice = price * (1 - takeProfitPercent / 100);
              }
              if (stopLossPercent > 0) {
                slPrice = price * (1 + stopLossPercent / 100);
              }
            }

            // Place Take Profit order if configured
            if (tpPrice) {
              const tpSide = side === 'LONG' ? 'sell' : 'buy';
              try {
                await client.createOrder(symbol, 'TAKE_PROFIT_MARKET', tpSide, quantity, undefined, {
                  positionSide: side,
                  stopPrice: tpPrice,
                  closePosition: 'true'
                });
                console.log(`✓ TP order set for ${symbol}: trigger=${tpPrice.toFixed(4)}`);
              } catch (tpError: any) {
                console.warn(`✗ Failed to set TP for ${symbol}:`, tpError.message);
              }
            }

            // Place Stop Loss order if configured
            if (slPrice) {
              const slSide = side === 'LONG' ? 'sell' : 'buy';
              try {
                await client.createOrder(symbol, 'STOP_MARKET', slSide, quantity, undefined, {
                  positionSide: side,
                  stopPrice: slPrice,
                  closePosition: 'true'
                });
                console.log(`✓ SL order set for ${symbol}: trigger=${slPrice.toFixed(4)}`);
              } catch (slError: any) {
                console.warn(`✗ Failed to set SL for ${symbol}:`, slError.message);
              }
            }
          } catch (tpslError: any) {
            console.warn(`Error setting TP/SL for ${symbol}:`, tpslError.message);
          }
        }

        results.push({ symbol, status: 'SUCCESS', orderId: order.id });
      } catch (error: any) {
        console.error(`Error trading ${symbol}:`, error);
        results.push({ symbol, status: 'FAILED', message: error.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error in batch trade:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
