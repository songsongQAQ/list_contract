import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * 生成可信任的主机列表
 * 支持开发环境和生产环境的多种配置
 */
function getTrustedHosts(): string[] {
  const hosts: Set<string> = new Set();
  
  // 总是信任本地地址
  hosts.add('localhost');
  hosts.add('localhost:3000');
  hosts.add('127.0.0.1');
  hosts.add('127.0.0.1:3000');
  
  // 从环境变量获取 NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl) {
    try {
      const url = new URL(nextAuthUrl);
      hosts.add(url.hostname);
      hosts.add(url.host); // 包含端口
    } catch (error) {
      console.warn('Invalid NEXTAUTH_URL:', nextAuthUrl);
    }
  }
  
  // 如果环境变量中包含公网 IP，也添加到信任列表
  if (process.env.SERVER_IP) {
    hosts.add(process.env.SERVER_IP);
    hosts.add(`${process.env.SERVER_IP}:3000`);
  }
  
  return Array.from(hosts);
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true, // ✅ 关键：信任 X-Forwarded-For 等代理头
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { username: credentials.username as string },
          });

          if (!user) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            username: user.username,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});

