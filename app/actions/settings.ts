'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getSiteConfig(key: string) {
  const config = await prisma.siteConfig.findUnique({
    where: { key },
  });
  return config?.value;
}

export async function setSiteConfig(key: string, value: string) {
  await prisma.siteConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  
  // 重新验证所有页面，因为主题是全局的
  revalidatePath('/', 'layout');
}
