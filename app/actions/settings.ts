'use server';

import { revalidatePath } from 'next/cache';

// 临时实现 - 使用内存存储替代 Prisma 数据库
const configStore = new Map<string, string>();

export async function getSiteConfig(key: string) {
  // 从内存存储中获取配置
  const value = configStore.get(key);
  return value || null;
}

export async function setSiteConfig(key: string, value: string) {
  // 在内存中存储配置
  configStore.set(key, value);
  
  // 重新验证所有页面，因为主题是全局的
  revalidatePath('/', 'layout');
}
