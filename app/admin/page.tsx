'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // 检查管理员登录状态
    const checkAdminAuth = async () => {
      try {
        // 通过 API 检查认证状态（更可靠）
        const res = await fetch('/api/admin/users', {
          method: 'GET',
          credentials: 'include', // 确保发送 cookie
        });

        if (res.ok) {
          // 已登录，跳转到用户管理页面
          router.replace('/admin/users');
        } else {
          // 未登录，跳转到登录页面
          router.replace('/admin/login');
        }
      } catch (error) {
        // 出错时跳转到登录页面
        router.replace('/admin/login');
      } finally {
        setChecking(false);
      }
    };

    checkAdminAuth();
  }, [router]);

  // 显示加载状态
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在跳转...</p>
      </div>
    </div>
  );
}

