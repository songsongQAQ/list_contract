import ccxt from 'ccxt';

type BinanceClient = InstanceType<typeof ccxt.binance>;

// 公开客户端缓存（用于市场数据等不需要认证的接口）
let publicClient: BinanceClient | null = null;

/**
 * 使用凭证创建或获取 Binance 客户端
 * 如果不提供凭证，则返回公开API客户端（用于市场数据等公开接口）
 */
export const getBinanceClient = async (apiKey?: string, apiSecret?: string, requireAuth: boolean = false): Promise<BinanceClient> => {
  // 严格验证凭证：必须是非空字符串
  const hasValidKey = apiKey && apiKey.trim().length > 0;
  const hasValidSecret = apiSecret && apiSecret.trim().length > 0;
  
  // 如果需要认证但凭证无效，抛出错误
  if (requireAuth && (!hasValidKey || !hasValidSecret)) {
    throw new Error('Authentication required: API Key and Secret must be provided');
  }
  
  // 如果没有提供有效凭证，返回公开客户端
  if (!hasValidKey || !hasValidSecret) {
    if (!publicClient) {
      console.log('Creating public CCXT client (no authentication)');
      publicClient = new ccxt.binance({
        enableRateLimit: true,
        sandbox: false,  // 确保使用生产环境
        options: {
          defaultType: 'future',
        },
      });
    }
    return publicClient;
  }
  
  // 使用 trim 后的值
  const trimmedKey = apiKey.trim();
  const trimmedSecret = apiSecret.trim();
  
  console.log(`Validating credentials: key=${trimmedKey.substring(0, 8)}..., secret=${trimmedSecret.substring(0, 8)}...`);
  console.log(`Creating NEW authenticated CCXT client (no caching)`);

  // 每次都创建新的客户端，不使用缓存（避免凭证问题）
  // 注意：ccxt 使用 'secret' 而不是 'apiSecret'
  const newClient = new ccxt.binance({
    apiKey: trimmedKey,
    secret: trimmedSecret,  // ccxt 使用 'secret' 属性名
    enableRateLimit: true,
    sandbox: false,  // 确保使用生产环境
    options: {
      defaultType: 'future',
      recvWindow: 60000,
    },
  });

  // 验证客户端是否正确设置了凭证
  console.log(`✓ Client created with apiKey: ${newClient.apiKey?.substring(0, 8)}..., has secret: ${!!newClient.secret}`);

  // 同步服务器时间
  try {
    await newClient.loadTimeDifference();
    console.log(`✓ Binance time synchronized`);
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.log(`⚠ Time sync failed:`, errorMessage);
  }

  return newClient;
};
