'use client';

import { SessionProvider } from 'next-auth/react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={zhCN}>
      <SessionProvider>{children}</SessionProvider>
    </ConfigProvider>
  );
}

