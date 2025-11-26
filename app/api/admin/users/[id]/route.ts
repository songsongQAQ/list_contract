import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// 更新用户
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

    const body = await request.json();
    const { username, password } = body;
    const { id: userId } = await params;

    if (!username) {
      return NextResponse.json(
        { error: '用户名不能为空' },
        { status: 400 }
      );
    }

    // 检查用户名是否已被其他用户使用
    const existingUser = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已被使用' },
        { status: 400 }
      );
    }

    // 构建更新数据
    const updateData: any = { username };
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // 更新用户
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user, message: '用户更新成功' });
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json(
      { error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
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

    // 删除用户（会级联删除用户配置）
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
}

