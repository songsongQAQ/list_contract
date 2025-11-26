'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getUserConfig() {
  try {
    const user = await requireAuth();
    
    let config = await prisma.userConfig.findUnique({
      where: { userId: user.id },
    });
    
    // 如果配置不存在，创建一个默认配置
    if (!config) {
      config = await prisma.userConfig.create({
        data: {
          userId: user.id,
        },
      });
    }
    
    return config;
  } catch (error) {
    console.error('Failed to get user config:', error);
    return null;
  }
}

export async function getSiteConfig(key: string) {
  try {
    const config = await getUserConfig();
    if (!config) return null;
    
    // 根据 key 返回对应的配置值
    const configMap: Record<string, string | null> = {
      'binance_api_key': config.apiKey || null,
      'binance_api_secret': config.apiSecret || null,
      'trading_long_leverage': config.longLeverage || null,
      'trading_long_margin': config.longMargin || null,
      'trading_short_leverage': config.shortLeverage || null,
      'trading_short_margin': config.shortMargin || null,
      'default_limit': config.defaultLimit || null,
      'ignored_symbols': config.ignoredSymbols || null,
      'take_profit_percent': config.takeProfit || null,
      'stop_loss_percent': config.stopLoss || null,
      'copytrading_mode': config.copytradingMode ? 'true' : 'false',
      'copytrading_api_key': config.copytradingApiKey || null,
      'copytrading_api_secret': config.copytradingApiSecret || null,
    };
    
    return configMap[key] || null;
  } catch (error) {
    console.error('Failed to get site config:', error);
    return null;
  }
}

export async function setSiteConfig(key: string, value: string) {
  try {
    const user = await requireAuth();
    const config = await getUserConfig();
    
    if (!config) {
      throw new Error('用户配置不存在');
    }
    
    // 根据 key 更新对应的配置字段
    const updateData: any = {};
    
    switch (key) {
      case 'binance_api_key':
        updateData.apiKey = value;
        break;
      case 'binance_api_secret':
        updateData.apiSecret = value;
        break;
      case 'trading_long_leverage':
        updateData.longLeverage = value;
        break;
      case 'trading_long_margin':
        updateData.longMargin = value;
        break;
      case 'trading_short_leverage':
        updateData.shortLeverage = value;
        break;
      case 'trading_short_margin':
        updateData.shortMargin = value;
        break;
      case 'default_limit':
        updateData.defaultLimit = value;
        break;
      case 'ignored_symbols':
        updateData.ignoredSymbols = value;
        break;
      case 'take_profit_percent':
        updateData.takeProfit = value;
        break;
      case 'stop_loss_percent':
        updateData.stopLoss = value;
        break;
      case 'copytrading_mode':
        updateData.copytradingMode = value === 'true';
        break;
      case 'copytrading_api_key':
        updateData.copytradingApiKey = value;
        break;
      case 'copytrading_api_secret':
        updateData.copytradingApiSecret = value;
        break;
    }
    
    await prisma.userConfig.update({
      where: { userId: user.id },
      data: updateData,
    });
    
    // 重新验证所有页面，因为主题是全局的
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('Failed to set site config:', error);
    throw error;
  }
}

export async function saveUserConfig(configData: {
  apiKey?: string;
  apiSecret?: string;
  longLeverage?: string;
  longMargin?: string;
  shortLeverage?: string;
  shortMargin?: string;
  defaultLimit?: string;
  ignoredSymbols?: string;
  takeProfit?: string;
  stopLoss?: string;
  copytradingMode?: boolean;
  copytradingApiKey?: string;
  copytradingApiSecret?: string;
}) {
  try {
    const user = await requireAuth();
    
    await prisma.userConfig.upsert({
      where: { userId: user.id },
      update: {
        apiKey: configData.apiKey || null,
        apiSecret: configData.apiSecret || null,
        longLeverage: configData.longLeverage || '50',
        longMargin: configData.longMargin || '3',
        shortLeverage: configData.shortLeverage || '50',
        shortMargin: configData.shortMargin || '3',
        defaultLimit: configData.defaultLimit || '10',
        ignoredSymbols: configData.ignoredSymbols || null,
        takeProfit: configData.takeProfit || null,
        stopLoss: configData.stopLoss || null,
        copytradingMode: configData.copytradingMode || false,
        copytradingApiKey: configData.copytradingApiKey || null,
        copytradingApiSecret: configData.copytradingApiSecret || null,
      },
      create: {
        userId: user.id,
        apiKey: configData.apiKey || null,
        apiSecret: configData.apiSecret || null,
        longLeverage: configData.longLeverage || '50',
        longMargin: configData.longMargin || '3',
        shortLeverage: configData.shortLeverage || '50',
        shortMargin: configData.shortMargin || '3',
        defaultLimit: configData.defaultLimit || '10',
        ignoredSymbols: configData.ignoredSymbols || null,
        takeProfit: configData.takeProfit || null,
        stopLoss: configData.stopLoss || null,
        copytradingMode: configData.copytradingMode || false,
        copytradingApiKey: configData.copytradingApiKey || null,
        copytradingApiSecret: configData.copytradingApiSecret || null,
      },
    });
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Failed to save user config:', error);
    throw error;
  }
}
