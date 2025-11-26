import { NextResponse } from 'next/server';
import { getServerIP } from '@/lib/server-config';

export const dynamic = 'force-dynamic';

/**
 * 获取服务器配置信息
 * 包括服务器 IP 地址等信息
 */
export async function GET() {
  try {
    const serverIP = getServerIP();

    return NextResponse.json({
      serverIP,
    });
  } catch (error) {
    console.error('Failed to get server config:', error);
    return NextResponse.json(
      { error: '获取服务器配置失败' },
      { status: 500 }
    );
  }
}

