import { NextResponse, NextRequest } from 'next/server';
import { getBinanceClient } from '@/lib/binance-client';
import { getUserConfigFromDB } from '@/lib/user-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { symbols, side } = body;
    
    // 从数据库获取用户配置
    const userConfig = await getUserConfigFromDB();
    
    // 从用户配置中读取补仓金额
    const addMarginAmount = side === 'LONG'
      ? parseFloat((userConfig as any)?.longMargin || '3')
      : parseFloat((userConfig as any)?.shortMargin || '3');
    
    // 补仓不改变杠杆，只是再开一单
    // 获取账户当前杠杆（实际上我们直接用配置的杠杆）
    const leverage = side === 'LONG'
      ? parseFloat((userConfig as any)?.longLeverage || '50')
      : parseFloat((userConfig as any)?.shortLeverage || '50');
    
    const notional = addMarginAmount * leverage;
    
    console.log(`📊 补仓请求: symbols=${symbols}, side=${side}, addMarginAmount=${addMarginAmount}U, leverage=${leverage}x, notional=${notional}U`);
    
    if (!symbols || !Array.isArray(symbols) || !side) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    
    // 检查 API 凭证
    if (!userConfig || !userConfig.apiKey || !userConfig.apiSecret) {
      console.error('No credentials found in database for add margin');
      return NextResponse.json(
        { error: '请先在设置中配置 API 密钥' },
        { status: 401 }
      );
    }

    const { apiKey, apiSecret } = userConfig;
    
    const client = await getBinanceClient(apiKey, apiSecret, true);
    const results = [];
    
    // 0. Fetch account balance to determine available margin
    let accountBalance = 10000; // Default fallback
    try {
      const balance = await client.fetchBalance();
      const balanceAny = balance as any;
      let usdtBalance: any = 0;
      
      if (balanceAny.USDT) {
        const usdtObj = balanceAny.USDT;
        usdtBalance = (typeof usdtObj === 'object' && usdtObj.free) ? usdtObj.free : usdtObj;
      } else if (balanceAny.free?.USDT) {
        const freeUsdt = balanceAny.free.USDT;
        usdtBalance = freeUsdt;
      }
      
      if (typeof usdtBalance === 'string') {
        accountBalance = parseFloat(usdtBalance) || 10000;
      } else if (typeof usdtBalance === 'number') {
        accountBalance = usdtBalance || 10000;
      } else {
        accountBalance = 10000;
      }
      
      console.log(`📊 账户余额: ${accountBalance} USDT`);
    } catch (e) {
      console.warn('Could not fetch balance, using default', e);
    }
    
    // 1. Fetch current positions to verify the position exists
    const positions = await client.fetchPositions();
    const positionMap = new Map(
      positions
        .filter((p: any) => parseFloat(p.info.positionAmt) !== 0)
        .map((p: any) => [p.symbol, p])
    );

    for (const symbol of symbols) {
      try {
        // 检查该币种是否已有持仓
        if (!positionMap.has(symbol)) {
          results.push({ symbol, status: 'SKIPPED', message: '该币种没有持仓' });
          continue;
        }

        console.log(`📊 补仓${symbol}: 获取当前价格...`);

        // 2. Fetch current price
        const ticker = await client.fetchTicker(symbol);
        const currentPrice = ticker.last;
        if (!currentPrice) throw new Error('Could not fetch current price');

        console.log(`📊 ${symbol} 当前价格: ${currentPrice}`);

        // 3. Calculate quantity based on margin and leverage
        const baseNotional = notional;
        const maxAllowed = accountBalance * 0.5;
        const targetNotional = Math.min(baseNotional, maxAllowed);
        
        let quantity = targetNotional / currentPrice;
        
        if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
          throw new Error(`Invalid quantity calculated: ${quantity} (notional: ${targetNotional}, price: ${currentPrice})`);
        }
        
        console.log(`📊 ${symbol}: 计算数量=${quantity}, 目标仓位价值=${targetNotional}U`);
        
        // 4. Get market limits to properly format quantity
        try {
          const market = client.market(symbol);
          if (market && market.limits) {
            const { amount, cost } = market.limits;
            
            if (amount && amount.min) {
              if (quantity < amount.min) {
                quantity = amount.min;
                console.log(`  -> 增加数量至最小: ${amount.min}`);
              }
            }
            
            if (cost && cost.min) {
              const actualCost = quantity * currentPrice;
              if (actualCost < cost.min) {
                quantity = cost.min / currentPrice;
                console.log(`  -> 检测到更高的最小仓位价值: ${cost.min}, 重新计算数量=${quantity}`);
              }
            }
            
            const amountAny = amount as any;
            if (amountAny && amountAny.precision) {
              const precision = amountAny.precision;
              quantity = parseFloat(quantity.toPrecision(precision));
              console.log(`  -> 应用精度: ${precision}, 数量=${quantity}`);
            }
          }
        } catch (e) {
          console.warn(`Could not fetch market limits for ${symbol}`, e);
        }
        
        if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
          throw new Error(`Invalid quantity after adjustment: ${quantity}`);
        }

        // 5. Place Order - this is essentially opening another position
        const orderSide = side === 'LONG' ? 'buy' : 'sell';
        console.log(`📊 补仓订单: ${symbol} ${side} qty=${quantity} price=${currentPrice.toFixed(4)} 总计~${(quantity * currentPrice).toFixed(2)}USDT`);
        
        const order = await client.createMarketOrder(symbol, orderSide, quantity, undefined, { 
          positionSide: side  // 继续使用相同的 position side
        });

        console.log(`✓ 补仓成功: ${symbol}, orderId=${order.id}`);
        results.push({ symbol, status: 'SUCCESS', orderId: order.id });
      } catch (error: any) {
        console.error(`❌ 补仓失败 ${symbol}:`, error.message);
        results.push({ symbol, status: 'FAILED', message: error.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Error in add margin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
