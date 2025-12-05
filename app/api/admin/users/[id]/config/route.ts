import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// 获取用户配置
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查管理员认证
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get('admin-auth');
    if (!adminAuth || adminAuth.value !== 'true') {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    const config = await prisma.userConfig.findUnique({
      where: { userId },
    });

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Failed to fetch user config:', error);
    return NextResponse.json(
      { error: '获取用户配置失败' },
      { status: 500 }
    );
  }
}

// 更新用户配置
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 检查管理员认证
    const cookieStore = await cookies();
    const adminAuth = cookieStore.get('admin-auth');
    if (!adminAuth || adminAuth.value !== 'true') {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;
    const body = await request.json();

    const config = await prisma.userConfig.upsert({
      where: { userId },
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
        userId,
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

    return NextResponse.json({ config, message: '用户配置更新成功' });
  } catch (error) {
    console.error('Failed to update user config:', error);
    return NextResponse.json(
      { error: '更新用户配置失败' },
      { status: 500 }
    );
  }
}

