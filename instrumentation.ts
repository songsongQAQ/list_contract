/**
 * Next.js Instrumentation Hook
 * 在服务器启动时执行，用于初始化定时任务等后台服务
 */

import { scSend } from 'serverchan-sdk';

/**
 * ServerChan 推送配置
 * 建议：将 SENDKEY 存储在环境变量中，更安全
 */
const SERVERCHAN_SENDKEY = process.env.SERVERCHAN_SENDKEY || 'sctp256tbhquqjqhxiqtviutjfscsq';

/**
 * 价格历史数据存储
 * 结构: Map<币种符号, Array<{timestamp: number, price: number}>>
 * 只保留最近10分钟的数据
 */
const priceHistory = new Map<string, Array<{ timestamp: number; price: number }>>();

/**
 * 清理超过10分钟的历史数据
 */
function cleanOldData() {
  const now = Date.now();
  const tenMinutesAgo = now - 10 * 60 * 1000; // 10分钟前的时间戳

  priceHistory.forEach((history, symbol) => {
    // 过滤掉超过10分钟的数据
    const filtered = history.filter(item => item.timestamp > tenMinutesAgo);
    
    if (filtered.length === 0) {
      // 如果没有数据了，删除这个币种
      priceHistory.delete(symbol);
    } else {
      // 更新历史数据
      priceHistory.set(symbol, filtered);
    }
  });
}

/**
 * 添加价格数据到历史记录
 */
function addPriceData(symbol: string, price: number) {
  const now = Date.now();
  
  if (!priceHistory.has(symbol)) {
    priceHistory.set(symbol, []);
  }
  
  const history = priceHistory.get(symbol)!;
  history.push({ timestamp: now, price });
  
  // 清理超过10分钟的数据
  cleanOldData();
}

/**
 * 计算指定时间前的涨幅
 * @param symbol 币种符号
 * @param currentPrice 当前价格
 * @param minutesAgo 多少分钟前
 * @returns 涨幅百分比，如果没有数据返回 null
 */
function calculateChange(symbol: string, currentPrice: number, minutesAgo: number): number | null {
  const history = priceHistory.get(symbol);
  if (!history || history.length === 0) {
    return null;
  }
  
  const targetTime = Date.now() - minutesAgo * 60 * 1000;
  
  // 找到目标时间之前最接近的价格点
  // 按时间戳排序（从早到晚）
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  // 找到目标时间之前最近的数据点
  let targetPrice: number | null = null;
  
  for (let i = sortedHistory.length - 1; i >= 0; i--) {
    if (sortedHistory[i].timestamp <= targetTime) {
      targetPrice = sortedHistory[i].price;
      break;
    }
  }
  
  // 如果所有数据都晚于目标时间，说明数据不足
  if (targetPrice === null) {
    return null;
  }
  
  if (targetPrice === 0) {
    return null;
  }
  
  // 计算涨幅百分比
  const change = ((currentPrice - targetPrice) / targetPrice) * 100;
  return change;
}

/**
 * 测试推送功能 - 模拟推送第一个币种
 */
async function testPush() {
  try {
    const now = new Date().toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    // 模拟第一个币种的数据，按照1分钟、5分钟、10分钟的顺序
    const testSymbol = 'BTC';
    const testPrice = 43250.50;
    const testAlerts = [
      { period: '1分钟', value: 12.35, order: 1 },
      { period: '5分钟', value: 15.67, order: 2 },
      { period: '10分钟', value: 18.92, order: 3 }
    ];
    
    // 按照1分钟、5分钟、10分钟的顺序排序
    testAlerts.sort((a, b) => a.order - b.order);
    
    // 构建推送标题，按优先级只显示一个涨幅（优先级：1分钟 > 5分钟 > 10分钟）
    const titleChange = `1分钟+${testAlerts[0].value.toFixed(2)}%`; // 测试数据中1分钟总是存在
    const title = `🚨 ${testSymbol} ${titleChange}`;
    
    // 构建推送内容，使用纯 Markdown 格式突出涨幅
    let desp = `## 🚨 涨幅预警通知（测试）\n\n`;
    desp += `**⏰ 时间:** ${now}\n\n`;
    desp += `**💰 币种:** **${testSymbol}**\n\n`;
    desp += `**💵 当前价格:** **$${testPrice.toFixed(4)}**\n\n`;
    desp += `---\n\n`;
    desp += `## 📈 涨幅详情\n\n`;
    
    // 按照1分钟、5分钟、10分钟的顺序显示
    testAlerts.forEach((alert, index) => {
      const changeValue = alert.value.toFixed(2);
      const emoji = index === 0 ? '🔥' : '📊';
      // 使用大标题和代码块来突出涨幅数字
      desp += `### ${emoji} ${alert.period}涨幅\n\n`;
      desp += `\`\`\`\n+${changeValue}%\n\`\`\`\n\n`;
    });
    
    desp += `---\n\n`;
    desp += `### ⚠️ 这是一条测试推送消息`;
    
    console.log('\n🧪 ========== 测试推送 ==========');
    console.log(`⏰ 时间: ${now}`);
    console.log(`💰 币种: ${testSymbol}`);
    console.log(`💵 当前价格: $${testPrice.toFixed(4)}`);
    console.log(`📈 涨幅情况:`);
    testAlerts.forEach((alert, index) => {
      const emoji = index === 0 ? '🔥' : '📊';
      console.log(`   ${emoji} ${alert.period}涨幅: +${alert.value.toFixed(2)}%`);
    });
    console.log('─'.repeat(60));
    
    // 发送 ServerChan 推送
    const response = await scSend(
      SERVERCHAN_SENDKEY,
      title,
      desp,
      { tags: '涨幅预警|币种监控|测试' }
    );
    
    if (response.code === 0) {
      console.log('✅ ServerChan 测试推送成功');
    } else {
      console.error('❌ ServerChan 测试推送失败:', response.message || '未知错误');
    }
    
    console.log('');
  } catch (error: any) {
    console.error('❌ ServerChan 测试推送异常:', error.message);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
  }
}

/**
 * 检查涨跌幅条件并推送
 * @param symbol 币种符号
 * @param currentPrice 当前价格
 * @param threshold 涨跌幅阈值（默认10%）
 */
async function checkAndPushAlerts(symbol: string, currentPrice: number, threshold: number = 10) {
  const change1m = calculateChange(symbol, currentPrice, 1);
  const change5m = calculateChange(symbol, currentPrice, 5);
  const change10m = calculateChange(symbol, currentPrice, 10);
  
  // 分别存储涨幅和跌幅
  const gainAlerts: Array<{ period: string; value: number; order: number }> = [];
  const lossAlerts: Array<{ period: string; value: number; order: number }> = [];
  
  // 检测涨幅（> threshold%）
  if (change1m !== null && change1m > threshold) {
    gainAlerts.push({ period: '1分钟', value: change1m, order: 1 });
  }
  if (change5m !== null && change5m > threshold) {
    gainAlerts.push({ period: '5分钟', value: change5m, order: 2 });
  }
  if (change10m !== null && change10m > threshold) {
    gainAlerts.push({ period: '10分钟', value: change10m, order: 3 });
  }
  
  // 检测跌幅（< -threshold%）
  if (change1m !== null && change1m < -threshold) {
    lossAlerts.push({ period: '1分钟', value: change1m, order: 1 });
  }
  if (change5m !== null && change5m < -threshold) {
    lossAlerts.push({ period: '5分钟', value: change5m, order: 2 });
  }
  if (change10m !== null && change10m < -threshold) {
    lossAlerts.push({ period: '10分钟', value: change10m, order: 3 });
  }
  
  // 分别处理涨幅和跌幅推送
  if (gainAlerts.length > 0) {
    await sendAlert(symbol, currentPrice, gainAlerts, change1m, change5m, change10m, 'gain', threshold);
  }
  
  if (lossAlerts.length > 0) {
    await sendAlert(symbol, currentPrice, lossAlerts, change1m, change5m, change10m, 'loss', threshold);
  }
}

/**
 * 发送涨跌幅预警推送
 */
async function sendAlert(
  symbol: string,
  currentPrice: number,
  alerts: Array<{ period: string; value: number; order: number }>,
  change1m: number | null,
  change5m: number | null,
  change10m: number | null,
  type: 'gain' | 'loss',
  threshold: number
) {
  const now = new Date().toLocaleString('zh-CN', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // 按照1分钟、5分钟、10分钟的顺序排序
  alerts.sort((a, b) => a.order - b.order);
  
  const isGain = type === 'gain';
  const typeText = isGain ? '涨幅' : '跌幅';
  const typeEmoji = isGain ? '📈' : '📉';
  const alertEmoji = isGain ? '🚨' : '⚠️';
  
  // 构建推送标题，按优先级只显示一个（优先级：1分钟 > 5分钟 > 10分钟）
  let titleChange = '';
  if (isGain) {
    if (change1m !== null && change1m > threshold) {
      titleChange = `1分钟+${change1m.toFixed(2)}%`;
    } else if (change5m !== null && change5m > threshold) {
      titleChange = `5分钟+${change5m.toFixed(2)}%`;
    } else if (change10m !== null && change10m > threshold) {
      titleChange = `10分钟+${change10m.toFixed(2)}%`;
    }
  } else {
    if (change1m !== null && change1m < -threshold) {
      titleChange = `1分钟${change1m.toFixed(2)}%`;
    } else if (change5m !== null && change5m < -threshold) {
      titleChange = `5分钟${change5m.toFixed(2)}%`;
    } else if (change10m !== null && change10m < -threshold) {
      titleChange = `10分钟${change10m.toFixed(2)}%`;
    }
  }
  const title = `${alertEmoji} ${symbol} ${titleChange}`;
  
  // 构建推送内容，使用纯 Markdown 格式突出涨跌幅
  let desp = `## ${alertEmoji} ${typeText}预警通知\n\n`;
  desp += `**⏰ 时间:** ${now}\n\n`;
  desp += `**💰 币种:** **${symbol}**\n\n`;
  desp += `**💵 当前价格:** **$${currentPrice.toFixed(4)}**\n\n`;
  desp += `---\n\n`;
  desp += `## ${typeEmoji} ${typeText}详情\n\n`;
  
  // 按照1分钟、5分钟、10分钟的顺序显示
  alerts.forEach((alert, index) => {
    const changeValue = alert.value.toFixed(2);
    const emoji = index === 0 ? '🔥' : '📊';
    const sign = alert.value >= 0 ? '+' : '';
    // 使用大标题和代码块来突出涨跌幅数字
    desp += `### ${emoji} ${alert.period}${typeText}\n\n`;
    desp += `\`\`\`\n${sign}${changeValue}%\n\`\`\`\n\n`;
  });
  
  desp += `---\n\n`;
  const riskText = isGain 
    ? `涨幅超过${threshold}%，请注意风险！` 
    : `跌幅超过${threshold}%，请注意风险！`;
  desp += `### ⚠️ ${riskText}`;
  
  // 控制台打印
  const consoleTitle = isGain ? '涨幅预警推送' : '跌幅预警推送';
  console.log(`\n${alertEmoji} ========== ${consoleTitle} ==========`);
  console.log(`⏰ 时间: ${now}`);
  console.log(`💰 币种: ${symbol}`);
  console.log(`💵 当前价格: $${currentPrice.toFixed(4)}`);
  console.log(`${typeEmoji} ${typeText}情况:`);
  alerts.forEach((alert, index) => {
    const emoji = index === 0 ? '🔥' : '📊';
    const sign = alert.value >= 0 ? '+' : '';
    console.log(`   ${emoji} ${alert.period}${typeText}: ${sign}${alert.value.toFixed(2)}%`);
  });
  console.log('─'.repeat(60));
  
  // 发送 ServerChan 推送
  try {
    const tags = isGain ? '涨幅预警|币种监控' : '跌幅预警|币种监控';
    const response = await scSend(
      SERVERCHAN_SENDKEY,
      title,
      desp,
      { tags }
    );
    
    if (response.code === 0) {
      console.log(`✅ ServerChan ${typeText}推送成功`);
    } else {
      console.error(`❌ ServerChan ${typeText}推送失败:`, response.message || '未知错误');
    }
  } catch (error: any) {
    console.error(`❌ ServerChan ${typeText}推送异常:`, error.message);
  }
  
  console.log('');
}

/**
 * 获取涨幅榜单前20并打印
 */
async function fetchAndPrintTopGainers() {
  try {
    // 获取服务器端口和基础 URL
    const port = process.env.PORT || 3000;
    const baseUrl = process.env.NEXTAUTH_URL || `http://localhost:${port}`;
    
    // 使用 HTTP 请求调用内部 API（避免模块导入导致的 Edge Runtime 问题）
    const apiUrl = `${baseUrl}/api/binance/market?limit=20`;
    
    const response = await fetch(apiUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API 请求失败: ${response.status} ${errorData.error || response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.topGainers || !Array.isArray(data.topGainers)) {
      throw new Error('API 返回数据格式错误');
    }
    
    // 处理涨幅榜单
    const topGainers = data.topGainers.slice(0, 20).map((item: any) => {
      // 提取币种符号（如 BTC/USDT:USDT -> BTC）
      const coinSymbol = item.symbol.split('/')[0];
      return {
        symbol: coinSymbol,
        price: item.price,
        change: item.change,
      };
    });

    // 处理市值榜单
    const topMarket = (data.topMarket || []).slice(0, 20).map((item: any) => {
      // 提取币种符号（如 BTC/USDT:USDT -> BTC）
      const coinSymbol = item.symbol.split('/')[0];
      return {
        symbol: coinSymbol,
        price: item.price,
        change: item.change,
      };
    });

    // 存储价格数据并检查涨幅条件（涨幅榜单，阈值10%）
    for (const coin of topGainers) {
      // 添加价格数据到历史记录
      addPriceData(coin.symbol, coin.price);
      
      // 检查涨幅条件并推送（异步，阈值10%）
      await checkAndPushAlerts(coin.symbol, coin.price, 10);
    }

    // 存储价格数据并检查涨幅条件（市值榜单，阈值5%）
    for (const coin of topMarket) {
      // 添加价格数据到历史记录
      addPriceData(coin.symbol, coin.price);
      
      // 检查涨幅条件并推送（异步，阈值5%）
      await checkAndPushAlerts(coin.symbol, coin.price, 5);
    }

    // 打印当前时间
    const now = new Date().toLocaleString('zh-CN', { 
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    console.log('\n📊 ========== 涨幅榜单 Top 20 ==========');
    console.log(`⏰ 时间: ${now}`);
    console.log('─'.repeat(60));
    
    // 打印每个币种的信息
    topGainers.forEach((coin: { symbol: string; price: number; change: number }, index: number) => {
      const changeStr = coin.change >= 0 
        ? `+${coin.change.toFixed(2)}%` 
        : `${coin.change.toFixed(2)}%`;
      const changeColor = coin.change >= 0 ? '🟢' : '🔴';
      
      console.log(
        `${(index + 1).toString().padStart(2, ' ')}. ${coin.symbol.padEnd(8, ' ')} | ` +
        `价格: $${coin.price.toFixed(4).padStart(10, ' ')} | ` +
        `涨幅: ${changeColor} ${changeStr.padStart(8, ' ')}`
      );
    });
    
    console.log('─'.repeat(60));
    console.log(`✅ 涨幅榜单: ${topGainers.length} 个币种`);
    console.log(`✅ 市值榜单: ${topMarket.length} 个币种`);
    console.log(`💾 当前存储币种数: ${priceHistory.size}\n`);
    
  } catch (error: any) {
    console.error('❌ 获取涨幅榜单失败:', error.message);
    if (error.stack) {
      console.error('错误堆栈:', error.stack);
    }
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron');

    // 每10秒执行一次（使用秒级精度：秒 分 时 日 月 周）
    cron.schedule('*/10 * * * * *', async () => {
      await fetchAndPrintTopGainers();
    });

    console.log('✅ 定时任务已启动：每10秒获取涨幅榜单前20');
    
    // 先测试推送一次
    setTimeout(async () => {
      console.log('🧪 开始测试推送功能...');
      await testPush();
    }, 2000); // 等待 2 秒后测试推送
    
    // 延迟执行第一次，等待服务器启动完成
    setTimeout(async () => {
      await fetchAndPrintTopGainers();
    }, 5000); // 等待 5 秒让服务器启动后再获取数据
  }
}

