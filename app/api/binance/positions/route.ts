import { NextResponse, NextRequest } from 'next/server';
import { getBinanceClient } from '@/lib/binance-client';
import { getUserConfigFromDB } from '@/lib/user-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const credentials = await getUserConfigFromDB();

    if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
      console.error('[Positions API] 未找到凭证:', {
        credentials: credentials ? 'exists' : 'null',
        apiKey: credentials?.apiKey ? 'exists' : 'missing',
        apiSecret: credentials?.apiSecret ? 'exists' : 'missing',
      });
      return NextResponse.json(
        { error: '请先在设置中配置 API 密钥', code: 'NO_CREDENTIALS' },
        { status: 401 }
      );
    }

    const { apiKey, apiSecret } = credentials;

    // 检查 API Key 和 Secret 是否为空字符串
    if (!apiKey.trim() || !apiSecret.trim()) {
      console.error('[Positions API] API Key 或 Secret 为空字符串:', {
        apiKeyLength: apiKey.length,
        apiSecretLength: apiSecret.length,
        apiKeyTrimmed: apiKey.trim().length,
        apiSecretTrimmed: apiSecret.trim().length,
      });
      return NextResponse.json(
        { error: '请先在设置中配置 API 密钥', code: 'EMPTY_CREDENTIALS' },
        { status: 401 }
      );
    }

    // 验证 API Key 格式（Binance API Key 通常是 64 个字符）
    const keyLength = apiKey.length;
    const secretLength = apiSecret.length;
    // 创建 Binance 客户端并验证 API Key
    const client = await getBinanceClient(apiKey, apiSecret, true);
    
    try {
      await client.fetchBalance();
    } catch (authError: any) {
      console.error('[Positions API] API Key 验证失败:', {
        message: authError.message,
        code: authError.code,
      });
      
      // 解析 Binance 错误 - 从错误消息中提取错误代码
      let binanceErrorCode: number | undefined = authError.code;
      let binanceErrorMsg: string | undefined;
      
      // 尝试从错误消息中解析 Binance 错误格式：binance {"code":-2008,"msg":"Invalid Api-Key ID."}
      if (authError.message && typeof authError.message === 'string') {
        const binanceMatch = authError.message.match(/binance\s+({.+})/);
        if (binanceMatch) {
          try {
            const binanceError = JSON.parse(binanceMatch[1]);
            binanceErrorCode = binanceError.code;
            binanceErrorMsg = binanceError.msg;
            console.log('[Positions API] 解析到的 Binance 错误:', binanceError);
          } catch (e) {
            console.warn('[Positions API] 解析 Binance 错误 JSON 失败:', e);
          }
        }
      }
      
      // 解析错误并生成友好的错误消息
      let errorMessage = 'API Key 验证失败';
      let statusCode = 401;
      
      if (binanceErrorCode === -2008 || (authError.message && authError.message.includes('Invalid Api-Key'))) {
        const modeHint = credentials.mode === 'copytrading' 
          ? '\n⚠️ 检测到您使用的是带单账户 API Key。带单账户可能不支持 Futures API，请尝试使用主账户的 API Key。'
          : '';
        errorMessage = `API Key 无效。请检查：\n1. API Key 是否正确\n2. API Key 是否已启用 Futures 交易权限\n3. API Key 是否被禁用或删除${modeHint}`;
        statusCode = 401;
      } else if (binanceErrorCode === -2015 || (authError.message && authError.message.includes('Invalid signature'))) {
        errorMessage = 'API Secret 无效，请检查您的 API Secret 配置';
        statusCode = 401;
      } else if (binanceErrorCode === -1022) {
        errorMessage = 'API 签名错误，请检查您的 API 密钥配置';
        statusCode = 401;
      } else if (binanceErrorMsg) {
        errorMessage = `Binance API 错误: ${binanceErrorMsg}`;
        // 如果是认证相关错误（-2000 到 -2100 之间），返回 401
        if (binanceErrorCode && binanceErrorCode < -2000 && binanceErrorCode > -2100) {
          statusCode = 401;
        }
      } else if (authError.message) {
        errorMessage = `API 验证失败: ${authError.message}`;
      }
      
      return NextResponse.json(
        { error: errorMessage, code: binanceErrorCode || authError.code },
        { status: statusCode }
      );
    }
    
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
    console.error('[Positions API] 错误详情:', {
      error: error,
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    
    // 处理 Binance API 错误
    let errorMessage = error.message || '获取持仓失败';
    let statusCode = 500;
    
    // 检查错误对象中的 code（CCXT 可能直接提供）
    if (error.code === -2008) {
      errorMessage = 'API Key 无效，请检查您的 API 密钥配置';
      statusCode = 401;
    } else if (error.code === -2015) {
      errorMessage = 'API Secret 无效，请检查您的 API 密钥配置';
      statusCode = 401;
    } else if (error.code === -1022) {
      errorMessage = 'API 签名错误，请检查您的 API 密钥配置';
      statusCode = 401;
    } else if (error.message && typeof error.message === 'string') {
      // 尝试解析 Binance 错误格式：binance {"code":-2008,"msg":"Invalid Api-Key ID."}
      const binanceMatch = error.message.match(/binance\s+({.+})/);
      if (binanceMatch) {
        try {
          const binanceError = JSON.parse(binanceMatch[1]);
          console.log('[Positions API] 解析到的 Binance 错误:', binanceError);
          if (binanceError.code === -2008) {
            errorMessage = 'API Key 无效，请检查您的 API 密钥配置';
            statusCode = 401;
          } else if (binanceError.code === -2015) {
            errorMessage = 'API Secret 无效，请检查您的 API 密钥配置';
            statusCode = 401;
          } else if (binanceError.code === -1022) {
            errorMessage = 'API 签名错误，请检查您的 API 密钥配置';
            statusCode = 401;
          } else if (binanceError.msg) {
            errorMessage = `Binance API 错误: ${binanceError.msg}`;
            // 如果是认证相关错误（-2000 到 -2100 之间），返回 401
            if (binanceError.code < -2000 && binanceError.code > -2100) {
              statusCode = 401;
            }
          }
        } catch (e) {
          // 解析失败，继续检查其他格式
          console.warn('[Positions API] 解析 Binance 错误 JSON 失败:', e);
        }
      }
      
      // 检查错误信息中是否包含常见的关键词
      if (error.message.includes('Invalid Api-Key') || error.message.includes('Invalid API-Key')) {
        errorMessage = 'API Key 无效，请检查您的 API 密钥配置';
        statusCode = 401;
      } else if (error.message.includes('Invalid signature')) {
        errorMessage = 'API Secret 无效，请检查您的 API 密钥配置';
        statusCode = 401;
      }
    }
    
    console.error('[Positions API] 最终错误响应:', { errorMessage, statusCode });
    return NextResponse.json({ error: errorMessage, code: error.code }, { status: statusCode });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      // 如果没有body，继续处理
    }

    console.log('📊 平仓请求:', { symbols: body.symbols });

    const credentials = await getUserConfigFromDB();

    if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
      console.error('No credentials found in database for DELETE');
      return NextResponse.json(
        { error: '请先在设置中配置 API 密钥' },
        { status: 401 }
      );
    }

    const { apiKey, apiSecret } = credentials;

    const client = await getBinanceClient(apiKey, apiSecret, true);
    const positions = await client.fetchPositions();
    const activePositions = positions.filter((p: any) => parseFloat(p.info.positionAmt) !== 0);

    const results = [];
    
    // 前端发送的目标币种列表
    const targetSymbols = body.symbols ? new Set(body.symbols) : null;

    console.log(`平仓操作: 目标币种=${JSON.stringify(Array.from(targetSymbols || []))}, 活跃持仓数=${activePositions.length}`);

    for (const p of activePositions) {
      // 如果指定了目标币种列表，只平仓这些币种
      if (targetSymbols && !targetSymbols.has(p.symbol)) {
        continue;
      }
      
      const size = parseFloat(p.info.positionAmt);
      const side = size > 0 ? 'LONG' : 'SHORT';

      try {
        // Close by sending opposite order with positionSide parameter
        const orderSide = size > 0 ? 'sell' : 'buy';
        // Use Math.abs for size because createMarketOrder expects positive quantity
        // positionSide is required for Binance to know which position to close (LONG or SHORT)
        await client.createMarketOrder(p.symbol, orderSide, Math.abs(size), undefined, { 
          positionSide: side
        });
        results.push({ symbol: p.symbol, status: 'SUCCESS' });
      } catch (e: any) {
        console.error(`❌ 平仓失败: ${p.symbol} - ${e.message}`);
        results.push({ symbol: p.symbol, status: 'FAILED', message: e.message });
      }
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
