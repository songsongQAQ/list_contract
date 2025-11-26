'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Users, LogOut, Home, Menu, X } from 'lucide-react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 如果是 /admin 根路径或登录页面，不显示 layout
  if (pathname === '/admin' || pathname === '/admin/login') {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      // 调用退出 API 清除 cookie
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    // 跳转到登录页
    router.push('/admin/login');
  };

  const menuItems = [
    {
      href: '/admin/users',
      icon: Users,
      label: '用户管理',
    },
  ];

  return (
    <ConfigProvider locale={zhCN}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* 左侧导航栏 */}
        <aside
          className={`bg-white border-r border-gray-200 transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-20'
          } flex flex-col`}
        >
          {/* Logo 区域 */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            {sidebarOpen && (
              <h1 className="text-lg font-black text-gray-900">后台管理</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.label}</span>}
                </a>
              );
            })}
          </nav>

          {/* 底部操作 */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <a
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>返回首页</span>}
            </a>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>退出</span>}
            </button>
          </div>
        </aside>

        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ConfigProvider>
  );
}

