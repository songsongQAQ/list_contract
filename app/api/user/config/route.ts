import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 获取用户配置
export async function GET() {
  try {
    const user = await requireAuth();
    
    // 使用 upsert 确保配置存在，避免并发创建时的唯一约束冲突
    const config = await prisma.userConfig.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
      },
    });
    
    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to get user config:', error);
    return NextResponse.json(
      { error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 更新用户配置
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const config = await prisma.userConfig.upsert({
      where: { userId: user.id },
      update: {
        apiKey: body.apiKey || null,
        apiSecret: body.apiSecret || null,
        longLeverage: String(body.longLeverage || '50'),
        longMargin: String(body.longMargin || '3'),
        shortLeverage: String(body.shortLeverage || '50'),
        shortMargin: String(body.shortMargin || '3'),
        defaultLimit: String(body.defaultLimit || '10'),
        ignoredSymbols: body.ignoredSymbols || null,
        takeProfit: body.takeProfit || null,
        stopLoss: body.stopLoss || null,
        copytradingMode: body.copytradingMode || false,
        copytradingApiKey: body.copytradingApiKey || null,
        copytradingApiSecret: body.copytradingApiSecret || null,
      },
      create: {
        userId: user.id,
        apiKey: body.apiKey || null,
        apiSecret: body.apiSecret || null,
        longLeverage: String(body.longLeverage || '50'),
        longMargin: String(body.longMargin || '3'),
        shortLeverage: String(body.shortLeverage || '50'),
        shortMargin: String(body.shortMargin || '3'),
        defaultLimit: String(body.defaultLimit || '10'),
        ignoredSymbols: body.ignoredSymbols || null,
        takeProfit: body.takeProfit || null,
        stopLoss: body.stopLoss || null,
        copytradingMode: body.copytradingMode || false,
        copytradingApiKey: body.copytradingApiKey || null,
        copytradingApiSecret: body.copytradingApiSecret || null,
      },
    });
    
    return NextResponse.json({ config, message: '配置已保存' });
  } catch (error) {
    console.error('Failed to save user config:', error);
    return NextResponse.json(
      { error: '保存配置失败' },
      { status: 500 }
    );
  }
}


