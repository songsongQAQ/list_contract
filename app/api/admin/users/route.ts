import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// 获取所有用户
export async function GET(request: NextRequest) {
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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建用户
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user, message: '用户创建成功' });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    );
  }
}

