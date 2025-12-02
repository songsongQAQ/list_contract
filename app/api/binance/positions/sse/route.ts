import { NextRequest } from 'next/server';
import { getBinanceClient } from '@/lib/binance-client';
import { getUserConfigFromDB } from '@/lib/user-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // 创建 SSE 响应流
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(data));
      };

      // 发送初始连接消息
      send('data: {"type":"connected"}\n\n');

      let intervalId: NodeJS.Timeout | null = null;
      let isActive = true;

      const fetchAndSendPositions = async () => {
        if (!isActive) return;

        try {
          const credentials = await getUserConfigFromDB();

          if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
            send('data: {"type":"error","error":"请先在设置中配置 API 密钥","code":"NO_CREDENTIALS"}\n\n');
            return;
          }

          const { apiKey, apiSecret } = credentials;

          if (!apiKey.trim() || !apiSecret.trim()) {
            send('data: {"type":"error","error":"请先在设置中配置 API 密钥","code":"EMPTY_CREDENTIALS"}\n\n');
            return;
          }

          // 创建 Binance 客户端
          const client = await getBinanceClient(apiKey, apiSecret, true);
          
          // 验证 API Key
          try {
            await client.fetchBalance();
          } catch (authError: any) {
            let errorMessage = 'API Key 验证失败';
            const binanceMatch = authError.message?.match(/binance\s+({.+})/);
            if (binanceMatch) {
              try {
                const binanceError = JSON.parse(binanceMatch[1]);
                if (binanceError.code === -2008) {
                  errorMessage = 'API Key 无效，请检查您的 API 密钥配置';
                } else if (binanceError.code === -2015) {
                  errorMessage = 'API Secret 无效，请检查您的 API 密钥配置';
                } else if (binanceError.msg) {
                  errorMessage = `Binance API 错误: ${binanceError.msg}`;
                }
              } catch (e) {
                // 解析失败，使用默认错误消息
              }
            }
            send(`data: ${JSON.stringify({ type: 'error', error: errorMessage, code: authError.code })}\n\n`);
            return;
          }

          // 获取持仓数据
          const positions = await client.fetchPositions();
          const balance = await client.fetchBalance();

          // 获取 USDT 余额 - 优先使用 total（总余额），包括已占用的保证金
          let usdtBalance = 0;
          const balanceAny = balance as any;
          if (balanceAny.USDT) {
            const usdtObj = balanceAny.USDT;
            // 优先使用 total（总余额），如果没有则使用 free（可用余额）
            if (typeof usdtObj === 'object' && usdtObj.total !== undefined) {
              usdtBalance = typeof usdtObj.total === 'string' ? parseFloat(usdtObj.total) : usdtObj.total;
            } else if (typeof usdtObj === 'object' && usdtObj.free !== undefined) {
              usdtBalance = typeof usdtObj.free === 'string' ? parseFloat(usdtObj.free) : usdtObj.free;
            } else if (typeof usdtObj === 'number') {
              usdtBalance = usdtObj;
            } else if (typeof usdtObj === 'string') {
              usdtBalance = parseFloat(usdtObj);
            }
          } else if (balanceAny.total?.USDT) {
            // 尝试从 total.USDT 获取
            const usdt = balanceAny.total.USDT;
            usdtBalance = typeof usdt === 'string' ? parseFloat(usdt) : (typeof usdt === 'number' ? usdt : 0);
          } else if (balanceAny.free?.USDT) {
            // 最后尝试从 free.USDT 获取
            const usdt = balanceAny.free.USDT;
            usdtBalance = typeof usdt === 'string' ? parseFloat(usdt) : (typeof usdt === 'number' ? usdt : 0);
          }
          usdtBalance = usdtBalance || 0;

          // 处理持仓数据
          const activePositions = await Promise.all(
            positions
              .filter((p: any) => parseFloat(p.info.positionAmt) !== 0)
              .map(async (p: any) => {
                const size = Math.abs(parseFloat(p.info.positionAmt));
                const entryPrice = parseFloat(p.entryPrice);
                const markPrice = parseFloat(p.markPrice || p.last || entryPrice);
                
                // 计算杠杆
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
                
                const positionNotional = size * entryPrice;
                const margin = initialMarginValue || (positionNotional / leverage);
                const side = parseFloat(p.info.positionAmt) > 0 ? 'LONG' : 'SHORT';
                
                // 获取止盈止损价格
                let takeProfitPrice = null;
                let stopLossPrice = null;
                
                try {
                  const openOrders = await client.fetchOpenOrders(p.symbol);
                  for (const order of openOrders) {
                    const orderInfo = order.info || {};
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

          // 发送持仓数据
          send(`data: ${JSON.stringify({ 
            type: 'positions', 
            positions: activePositions, 
            walletBalance: usdtBalance 
          })}\n\n`);
        } catch (error: any) {
          console.error('[Positions SSE] 错误:', error);
          send(`data: ${JSON.stringify({ 
            type: 'error', 
            error: error.message || '获取持仓失败' 
          })}\n\n`);
        }
      };

      // 立即发送一次
      await fetchAndSendPositions();

      // 每5秒推送一次
      intervalId = setInterval(async () => {
        await fetchAndSendPositions();
      }, 5000);

      // 监听客户端断开连接
      request.signal.addEventListener('abort', () => {
        isActive = false;
        if (intervalId) {
          clearInterval(intervalId);
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 nginx 缓冲
    },
  });
}

