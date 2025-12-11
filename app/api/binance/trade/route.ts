import { NextResponse, NextRequest } from 'next/server';
import { getBinanceClient } from '@/lib/binance-client';
import { getUserConfigFromDB } from '@/lib/user-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { symbols, side } = body;
    
    // 从数据库获取用户配置（所有交易参数）
    const userConfig = await getUserConfigFromDB();
    
    // 从用户配置中读取所有交易参数
    const leverage = side === 'LONG'
      ? parseFloat((userConfig as any)?.longLeverage || '50')
      : parseFloat((userConfig as any)?.shortLeverage || '50');
    
    const margin = side === 'LONG'
      ? parseFloat((userConfig as any)?.longMargin || '3')
      : parseFloat((userConfig as any)?.shortMargin || '3');
    
    const notional = margin * leverage;
    
    // 解析止盈止损，确保空值被转换为 0
    const takeProfitStr = (userConfig as any)?.takeProfit || '';
    const stopLossStr = (userConfig as any)?.stopLoss || '';
    const takeProfitPercent = takeProfitStr ? parseFloat(takeProfitStr) : 0;
    const stopLossPercent = stopLossStr ? parseFloat(stopLossStr) : 0;
    
    // 检查是否为有效数字
    const takeProfitValid = !isNaN(takeProfitPercent) ? takeProfitPercent : 0;
    const stopLossValid = !isNaN(stopLossPercent) ? stopLossPercent : 0;
    
    console.log(`📊 交易请求参数 - 从数据库读取: leverage=${leverage}x, margin=${margin}U, notional=${notional}U, takeProfit=${takeProfitValid}%, stopLoss=${stopLossValid}%`);
    
    if (!symbols || !Array.isArray(symbols) || !side) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    
    // 检查 API 凭证
    if (!userConfig || !userConfig.apiKey || !userConfig.apiSecret) {
      console.error('No credentials found in database for trade');
      return NextResponse.json(
        { error: '请先在设置中配置 API 密钥' },
        { status: 401 }
      );
    }

    // ⚠️ 检查忽略列表，过滤掉已忽略的币种
    const ignoredSymbolsStr = (userConfig as any)?.ignoredSymbols || '';
    const ignoredSet = new Set(
      ignoredSymbolsStr
        .split(/\s+/)
        .filter((s: string) => s.length > 0)
        .map((s: string) => s.toUpperCase())
    );
    
    const filteredSymbols = symbols.filter(symbol => {
      const coinSymbol = symbol.split('/')[0].toUpperCase();
      if (ignoredSet.has(coinSymbol)) {
        console.log(`⏭️ 跳过已忽略的币种: ${symbol}`);
        return false;
      }
      return true;
    });
    
    if (filteredSymbols.length === 0) {
      console.warn('所有币种都在忽略列表中');
      return NextResponse.json({ 
        results: symbols.map(s => ({ 
          symbol: s, 
          status: 'SKIPPED', 
          message: '币种已忽略' 
        }))
      });
    }
    
    console.log(`📊 交易币种过滤: 原始=${symbols.length}, 过滤后=${filteredSymbols.length}, 忽略列表=${Array.from(ignoredSet).join(',')}`);
    symbols = filteredSymbols;

    const { apiKey, apiSecret } = userConfig;

    console.log('Trade API - Using credentials:', { 
      apiKey: `${apiKey.substring(0, 8)}... (${apiKey.length} chars)`, 
      mode: userConfig.mode
    });
    
    console.log(`Trade request: symbols=${symbols.length}, side=${side}, leverage=${leverage}, notional=${notional}`);

    const client = await getBinanceClient(apiKey, apiSecret, true);
    const results = [];
    
    // 0. Fetch account balance once at the beginning
    // 这个仅用于安全检查，不用于计算每个币种的仓位值
    let initialAccountBalance = 10000; // Default fallback
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
        initialAccountBalance = parseFloat(usdtBalance) || 10000;
      } else if (typeof usdtBalance === 'number') {
        initialAccountBalance = usdtBalance || 10000;
      } else {
        initialAccountBalance = 10000;
      }
      
      // #region agent log - debug: log account balance
      const debugLog = {
        location: 'trade/route.ts:121',
        message: 'Initial account balance fetched',
        data: { initialAccountBalance, margin, leverage, notional, symbolsCount: symbols.length },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        hypothesisId: 'H1-balance-limiting'
      };
      console.log(`Initial account balance: ${initialAccountBalance} USDT, will open ${symbols.length} positions`);
      // #endregion
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
            } catch (tryError: any) {
              console.log(`Leverage ${tryLev}x failed for ${symbol}, trying next...`, tryError.message);
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

        // 使用用户配置的仓位价值 - 每个币种价值完全统一
        // 每个币种都应该有相同的仓位价值，不受其他币种影响
        const baseNotional = notional;
        
        // #region agent log - debug: check notional assignment
        const debugNotionalLog = {
          location: 'trade/route.ts:186',
          message: 'Notional value assignment',
          data: { 
            configuredNotional: notional,
            baseNotional: baseNotional,
            initialAccountBalance: initialAccountBalance,
            symbol: symbol,
            symbolIndex: symbols.indexOf(symbol) + 1,
            totalSymbols: symbols.length
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'H2-notional-consistency'
        };
        console.log(`DEBUG: ${symbol} (#${symbols.indexOf(symbol) + 1}/${symbols.length}) using notional=${baseNotional}U (configured), initial_account=${initialAccountBalance}U`);
        // #endregion
        
        // 只有当单个仓位超过初始账户余额的50%时才降低（极端情况保护）
        // 但通常不应该触发这个限制，因为您已经规划了仓位
        const maxAllowed = initialAccountBalance * 0.5;
        const targetNotional = baseNotional > maxAllowed ? maxAllowed : baseNotional;
        
        // #region agent log - debug: validate target notional
        const debugTargetLog = {
          location: 'trade/route.ts:202',
          message: 'Target notional after validation',
          data: { 
            targetNotional: targetNotional,
            baseNotional: baseNotional,
            maxAllowed: maxAllowed,
            shouldLimitByBalance: baseNotional > maxAllowed,
            symbol: symbol
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'H2-notional-consistency'
        };
        console.log(`DEBUG: ${symbol} targetNotional=${targetNotional}U (base=${baseNotional}U, max=${maxAllowed}U)`);
        // #endregion
        
        let quantity = targetNotional / price;
        
        // Validate quantity
        if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
          throw new Error(`Invalid quantity calculated: ${quantity} (notional: ${targetNotional}, price: ${price})`);
        }
        
        console.log(`${symbol}: price=${price}, configured=${notional}, using=${targetNotional}, quantity=${quantity}`);
        
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
        
        // ⚠️ 计算实际开仓价值（可能因为最小仓位要求而大于配置值）
        const actualNotional = quantity * price;
        
        // #region agent log - debug: track actual notional
        const debugActualNotionalLog = {
          location: 'trade/route.ts:282',
          message: 'Actual notional value before placing order',
          data: { 
            symbol: symbol,
            configuredNotional: notional,
            targetNotional: targetNotional,
            actualNotional: actualNotional.toFixed(2),
            quantity: quantity,
            price: price,
            matchesConfigured: Math.abs(actualNotional - notional) < 1
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'H3-actual-notional-drift'
        };
        console.log(`DEBUG: ${symbol} ORDER CHECK - configured=${notional}U, actual=${actualNotional.toFixed(2)}U, qty=${quantity}, price=${price}`);
        // #endregion
        
        console.log(`Placing ${side} order: ${symbol} qty=${quantity} price=${price} configured=${notional}U, actual=${actualNotional.toFixed(2)}U`);
        
        const order = await client.createMarketOrder(symbol, orderSide, quantity, undefined, { 
          positionSide: side  // IMPORTANT: Specify LONG or SHORT for Binance futures
        });

        // 5. Set Take Profit and Stop Loss if configured
        // ⚠️ 使用实际开仓价值计算实际本金（而不是配置值），确保止损基于实际仓位
        const actualMargin = actualNotional / actualLeverage;  // 实际本金 = 实际仓位价值 / 实际杠杆
        console.log(`📊 准备设置止盈止损: takeProfit=${takeProfitValid}%, stopLoss=${stopLossValid}%, 配置本金=${margin}U, 实际仓位=${actualNotional.toFixed(2)}U, 实际本金=${actualMargin.toFixed(2)}U, 实际杠杆=${actualLeverage}x`);
        
        if (takeProfitValid > 0 || stopLossValid > 0) {
          try {
            // Calculate TP and SL prices based on P&L percentage (not price percentage)
            // 使用实际本金进行计算，因为实际杠杆可能与配置的杠杆不同
            let tpPrice = null;
            let slPrice = null;
            
            if (side === 'LONG') {
              // For LONG: TP is above entry, SL is below entry
              if (takeProfitValid > 0) {
                // 目标利润 = 实际本金 * (1 + takeProfit/100)
                const profitTarget = actualMargin * (1 + takeProfitValid / 100);
                // 每张合约的目标利润 = 总利润 / 数量
                const priceChange = (profitTarget - actualMargin) / quantity;
                tpPrice = price + priceChange;
              }
              if (stopLossValid > 0) {
                // 亏损限额 = 实际本金 * (1 - stopLoss/100)
                const lossLimit = actualMargin * (1 - stopLossValid / 100);
                // 每张合约的亏损 = 实际本金 - 亏损限额 / 数量
                const priceChange = (actualMargin - lossLimit) / quantity;
                slPrice = price - priceChange;
              }
            } else {
              // For SHORT: TP is below entry, SL is above entry
              if (takeProfitValid > 0) {
                const profitTarget = actualMargin * (1 + takeProfitValid / 100);
                const priceChange = (profitTarget - actualMargin) / quantity;
                tpPrice = price - priceChange;
              }
              if (stopLossValid > 0) {
                const lossLimit = actualMargin * (1 - stopLossValid / 100);
                const priceChange = (actualMargin - lossLimit) / quantity;
                slPrice = price + priceChange;
              }
            }

            console.log(`📊 计算出的TP/SL价格: tpPrice=${tpPrice?.toFixed(4)}, slPrice=${slPrice?.toFixed(4)}, side=${side}, entry=${price.toFixed(4)}, 实际本金=${actualMargin.toFixed(2)}U`);

            // Place Take Profit order if configured (Algo Order)
            if (tpPrice) {
              const tpSide = side === 'LONG' ? 'sell' : 'buy';
              try {
                console.log(`正在设置TP订单: ${symbol} ${tpSide} ${quantity} @ ${tpPrice.toFixed(4)}`);
                // 币安 v4.5.26+ 会自动调用 Algo Order API
                const tpParams = {
                  positionSide: side,
                  stopPrice: tpPrice,
                  closePosition: true,
                  type: 'TAKE_PROFIT_MARKET'
                };
                await client.createOrder(symbol, 'TAKE_PROFIT_MARKET', tpSide, quantity, undefined, tpParams);
                console.log(`✓ TP order set for ${symbol}: trigger=${tpPrice.toFixed(4)}`);
              } catch (tpError: any) {
                console.warn(`✗ Failed to set TP for ${symbol}:`, tpError.message);
              }
            } else {
              console.log(`⏭️ 跳过TP订单设置 (takeProfitValid=${takeProfitValid})`);
            }

            // Place Stop Loss order if configured (Algo Order)
            if (slPrice) {
              const slSide = side === 'LONG' ? 'sell' : 'buy';
              try {
                console.log(`正在设置SL订单: ${symbol} ${slSide} ${quantity} @ ${slPrice.toFixed(4)}`);
                // 币安 v4.5.26+ 会自动调用 Algo Order API
                const slParams = {
                  positionSide: side,
                  stopPrice: slPrice,
                  closePosition: true,
                  type: 'STOP_MARKET'
                };
                await client.createOrder(symbol, 'STOP_MARKET', slSide, quantity, undefined, slParams);
                console.log(`✓ SL order set for ${symbol}: trigger=${slPrice.toFixed(4)}`);
              } catch (slError: any) {
                console.warn(`✗ Failed to set SL for ${symbol}:`, slError.message);
              }
            } else {
              console.log(`⏭️ 跳过SL订单设置 (stopLossValid=${stopLossValid})`);
            }
          } catch (tpslError: any) {
            console.warn(`Error setting TP/SL for ${symbol}:`, tpslError.message);
          }
        } else {
          console.log(`⏭️ 跳过TP/SL设置: takeProfit=${takeProfitValid}%, stopLoss=${stopLossValid}%`);
        }

        results.push({ symbol, status: 'SUCCESS', orderId: order.id });
      } catch (error: any) {
        console.error(`Error trading ${symbol}:`, error.message);
        
        // 如果开仓失败且是因为仓位不足，尝试增加 50U 仓位后重试
        if (error.message && (error.message.includes('notional') || error.message.includes('Minimum') || error.message.includes('precision'))) {
          console.log(`⚠️ ${symbol}: 开仓失败，尝试增加 50U 仓位后重试...`);
          
          try {
            // 重新获取价格和计算新的仓位
            const retryTicker = await client.fetchTicker(symbol);
            const retryPrice = retryTicker.last;
            if (!retryPrice) throw new Error('Could not fetch retry price');
            
            // 增加 50U 仓位重试
            const coinSymbol = symbol.split('/')[0];
            const defaultMinNotional = coinSymbol === 'BTC' ? 200 : 100;
            const retryBaseNotional = Math.max(notional + 50, defaultMinNotional); // 增加 50U
            const maxAllowed = initialAccountBalance * 0.5;
            const retryTargetNotional = Math.min(retryBaseNotional, maxAllowed);
            
            // #region agent log - debug: retry notional
            console.log(`DEBUG: ${symbol} RETRY with increased notional: base=${retryBaseNotional}U, target=${retryTargetNotional}U, maxAllowed=${maxAllowed}U`);
            // #endregion
            let retryQuantity = retryTargetNotional / retryPrice;
            
            console.log(`Retry with increased notional: ${retryTargetNotional} USDT`);
            
            // 重新应用市场限制
            try {
              const market = client.market(symbol);
              if (market && market.limits) {
                const { amount, cost } = market.limits;
                
                if (amount && amount.min && retryQuantity < amount.min) {
                  retryQuantity = amount.min;
                }
                if (cost && cost.min && (retryQuantity * retryPrice) < cost.min) {
                  retryQuantity = cost.min / retryPrice;
                }
                
                const amountAny = amount as any;
                if (amountAny && amountAny.precision) {
                  retryQuantity = parseFloat(retryQuantity.toPrecision(amountAny.precision));
                }
              }
            } catch (limitError) {
              console.warn(`Could not fetch market limits for retry ${symbol}:`, limitError);
            }
            
            const retryOrderSide = side === 'LONG' ? 'buy' : 'sell';
            console.log(`Retry order: ${symbol} qty=${retryQuantity} price=${retryPrice}`);
            
            const retryOrder = await client.createMarketOrder(symbol, retryOrderSide, retryQuantity, undefined, {
              positionSide: side
            });
            
            console.log(`✓ Retry successful for ${symbol}`);
            results.push({ symbol, status: 'SUCCESS', orderId: retryOrder.id, message: '增加仓位后成功' });
          } catch (retryError: any) {
            console.error(`Retry also failed for ${symbol}:`, retryError.message);
            results.push({ symbol, status: 'FAILED', message: `首次失败: ${error.message}, 重试也失败: ${retryError.message}` });
          }
        } else {
          results.push({ symbol, status: 'FAILED', message: error.message });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error in batch trade:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
