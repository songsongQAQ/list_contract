import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ccxt'],
  // 🔐 NextAuth 反向代理配置
  // Next.js 16 已原生支持通过 X-Forwarded-* 头部识别请求 URL
  // 无需额外配置，系统会自动信任反向代理头部
  // 禁用 Turbopack 以修复 Google 字体加载问题（Next.js 16.0.3 构建时默认启用）
  turbo: false,
};

export default nextConfig;
