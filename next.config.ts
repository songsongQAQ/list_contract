import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ccxt'],
  // 🔐 NextAuth 反向代理配置
  // Next.js 16 已原生支持通过 X-Forwarded-* 头部识别请求 URL
  // 无需额外配置，系统会自动信任反向代理头部
};

export default nextConfig;
