/**
 * 服务器配置工具
 * 用于获取服务器相关的配置信息
 */

/**
 * 获取服务器 IP 地址
 * 从环境变量 SERVER_IP 读取，默认值为 '127.0.0.1'
 */
export function getServerIP(): string {
  return process.env.SERVER_IP || '127.0.0.1';
}

/**
 * 获取服务器配置对象
 */
export const serverConfig = {
  serverIP: getServerIP(),
};

