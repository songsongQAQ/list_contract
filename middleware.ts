import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保护 /admin/* 路由（除了 /admin 和 /admin/login）
  if (pathname.startsWith('/admin')) {
    // /admin 根路径和登录页面不需要认证（由页面组件处理）
    if (pathname === '/admin' || pathname === '/admin/login') {
      return NextResponse.next();
    }

    // 其他后台页面需要认证 - 检查 admin-auth cookie
    const adminAuthCookie = request.cookies.get('admin-auth');

    if (!adminAuthCookie || adminAuthCookie.value !== 'true') {
      // 未登录，重定向到登录页
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // 其他路由不需要认证
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
