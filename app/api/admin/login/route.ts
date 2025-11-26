import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;
    const adminPassword = process.env.ADMIN_PASSWORD;

    console.log('Admin login attempt:', { password, adminPassword: adminPassword ? 'configured' : 'not configured' });

    if (!adminPassword) {
      console.error('管理员密码未配置');
      return NextResponse.json(
        { error: '管理员密码未配置' },
        { status: 500 }
      );
    }

    if (password !== adminPassword) {
      console.warn('密码错误');
      return NextResponse.json(
        { error: '密码错误' },
        { status: 401 }
      );
    }

    // 登录成功，设置 cookie
    const cookieStore = await cookies();
    
    // 根据协议判断是否使用 secure
    // 如果是 HTTP 环境，secure 必须为 false，否则 cookie 无法被保存
    const isSecure = request.nextUrl.protocol === 'https:' || process.env.NODE_ENV !== 'production';
    
    cookieStore.set('admin-auth', 'true', {
      httpOnly: false, // 允许前端读取，用于前端鉴权检查
      secure: isSecure, // 仅在 HTTPS 或非生产环境使用 secure
      maxAge: 60 * 60 * 24 * 7, // 7天有效期
      path: '/',
      sameSite: 'lax', // 跨站请求时允许发送 cookie
    });

    console.log('Admin login successful, cookie set:', {
      adminAuth: 'true',
      maxAge: 60 * 60 * 24 * 7,
      secure: isSecure,
      protocol: request.nextUrl.protocol,
      nodeEnv: process.env.NODE_ENV,
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: '登录失败' },
      { status: 500 }
    );
  }
}

