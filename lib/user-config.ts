import { requireAuth } from './auth';
import { prisma } from './prisma';

export async function getUserConfigFromDB() {
  try {
    const user = await requireAuth();
    
    let config = await prisma.userConfig.findUnique({
      where: { userId: user.id },
    });
    
    // 如果配置不存在，返回 null
    if (!config) {
      return null;
    }
    
    // 检查是否启用了带单模式
    const isCopytradingMode = config.copytradingMode;
    
    // 确定使用哪个账户的凭证
    let selectedMode: 'main' | 'copytrading' = 'main';
    let apiKey = config.apiKey?.trim() || '';
    let apiSecret = config.apiSecret?.trim() || '';
    
    if (isCopytradingMode && config.copytradingApiKey && config.copytradingApiSecret) {
      const trimmedCopytradingKey = config.copytradingApiKey.trim();
      const trimmedCopytradingSecret = config.copytradingApiSecret.trim();
      
      if (trimmedCopytradingKey && trimmedCopytradingSecret) {
        console.log('[getUserConfigFromDB] 使用带单账户凭证', {
          keyLength: trimmedCopytradingKey.length,
          secretLength: trimmedCopytradingSecret.length,
          keyPrefix: trimmedCopytradingKey.substring(0, 8) + '...',
        });
        apiKey = trimmedCopytradingKey;
        apiSecret = trimmedCopytradingSecret;
        selectedMode = 'copytrading';
      } else {
        console.log('[getUserConfigFromDB] 带单模式已启用但 API Key/Secret 为空，切换到主账户');
      }
    }
    
    // 如果主账户凭证也为空，返回 null
    if (!apiKey || !apiSecret) {
      console.log('[getUserConfigFromDB] 未找到有效凭证，返回 null');
      return null;
    }
    
    console.log('[getUserConfigFromDB] 使用账户凭证', {
      mode: selectedMode,
      keyLength: apiKey.length,
      secretLength: apiSecret.length,
      keyPrefix: apiKey.substring(0, 8) + '...',
    });
    
    // ✅ 返回完整的配置对象
    return {
      apiKey,
      apiSecret,
      mode: selectedMode,
      // 交易配置
      longLeverage: config.longLeverage || '50',
      longMargin: config.longMargin || '3',
      shortLeverage: config.shortLeverage || '50',
      shortMargin: config.shortMargin || '3',
      // 止盈止损
      takeProfit: config.takeProfit || '',
      stopLoss: config.stopLoss || '',
      // 其他配置
      defaultLimit: config.defaultLimit || '10',
      ignoredSymbols: config.ignoredSymbols || '',
      copytradingMode: config.copytradingMode || false,
    };
  } catch (error) {
    console.error('[getUserConfigFromDB] 获取用户配置失败:', error);
    return null;
  }
}

