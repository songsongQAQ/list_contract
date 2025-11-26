import { requireAuth } from './auth';
import { prisma } from './prisma';

export async function getUserConfigFromDB() {
  try {
    const user = await requireAuth();
    console.log('[getUserConfigFromDB] 用户ID:', user.id);
    
    let config = await prisma.userConfig.findUnique({
      where: { userId: user.id },
    });
    
    console.log('[getUserConfigFromDB] 配置查询结果:', {
      hasConfig: !!config,
      hasApiKey: !!(config?.apiKey),
      hasApiSecret: !!(config?.apiSecret),
      copytradingMode: config?.copytradingMode,
      hasCopytradingApiKey: !!(config?.copytradingApiKey),
      hasCopytradingApiSecret: !!(config?.copytradingApiSecret),
    });
    
    // 如果配置不存在，返回 null
    if (!config) {
      console.log('[getUserConfigFromDB] 配置不存在，返回 null');
      return null;
    }
    
    // 检查是否启用了带单模式
    const isCopytradingMode = config.copytradingMode;
    
    if (isCopytradingMode && config.copytradingApiKey && config.copytradingApiSecret) {
      // 检查带单 API Key 和 Secret 是否为空字符串
      const trimmedCopytradingKey = config.copytradingApiKey.trim();
      const trimmedCopytradingSecret = config.copytradingApiSecret.trim();
      
      if (trimmedCopytradingKey && trimmedCopytradingSecret) {
        console.log('[getUserConfigFromDB] 使用带单账户凭证', {
          keyLength: trimmedCopytradingKey.length,
          secretLength: trimmedCopytradingSecret.length,
          keyPrefix: trimmedCopytradingKey.substring(0, 8) + '...',
          hasLeadingTrailingSpaces: 
            config.copytradingApiKey !== trimmedCopytradingKey || 
            config.copytradingApiSecret !== trimmedCopytradingSecret
        });
        return {
          apiKey: trimmedCopytradingKey,
          apiSecret: trimmedCopytradingSecret,
          mode: 'copytrading' as const,
        };
      } else {
        console.log('[getUserConfigFromDB] 带单模式已启用但 API Key/Secret 为空');
      }
    }
    
    // 使用主账户凭证
    if (config.apiKey && config.apiSecret) {
      // 检查主账户 API Key 和 Secret 是否为空字符串
      const trimmedKey = config.apiKey.trim();
      const trimmedSecret = config.apiSecret.trim();
      
      if (trimmedKey && trimmedSecret) {
        console.log('[getUserConfigFromDB] 使用主账户凭证', {
          keyLength: trimmedKey.length,
          secretLength: trimmedSecret.length,
          keyPrefix: trimmedKey.substring(0, 8) + '...',
          hasLeadingTrailingSpaces: 
            config.apiKey !== trimmedKey || 
            config.apiSecret !== trimmedSecret
        });
        return {
          apiKey: trimmedKey,
          apiSecret: trimmedSecret,
          mode: 'main' as const,
        };
      } else {
        console.log('[getUserConfigFromDB] 主账户 API Key/Secret 为空字符串');
      }
    }
    
    console.log('[getUserConfigFromDB] 未找到有效凭证，返回 null');
    return null;
  } catch (error) {
    console.error('[getUserConfigFromDB] 获取用户配置失败:', error);
    return null;
  }
}

