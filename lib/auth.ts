import { auth } from '@/lib/auth-config';

// NextAuth v5 beta 使用 auth() 函数
export async function getCurrentUser() {
  try {
    const session = await auth();
    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id as string,
      username: session.user.username as string,
    };
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('未登录');
  }
  return user;
}

