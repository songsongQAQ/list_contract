/**
 * PM2 生态系统配置文件
 * 
 * 使用方法：
 * 1. 启动应用：
 *    pm2 start ecosystem.config.js --env production
 *    pm2 start ecosystem.config.js --env development
 * 
 * 2. 查看应用状态：
 *    pm2 status
 *    pm2 logs garson
 * 
 * 3. 停止/重启应用：
 *    pm2 stop garson
 *    pm2 restart garson
 * 
 * 4. 删除应用：
 *    pm2 delete garson
 * 
 * 5. 保存当前配置并使其在系统启动时自动运行：
 *    pm2 save
 *    pm2 startup
 * 
 * 配置说明：
 * - name: 应用名称
 * - script: 启动脚本（对于 Next.js 使用 npm start）
 * - instances: 实例数量（可设为 'max' 自动检测 CPU 核数）
 * - exec_mode: 执行模式（cluster 集群模式、fork 单进程模式）
 * - env: 环境变量
 * - error_file: 错误日志文件路径
 * - out_file: 标准输出日志文件路径
 * - log_date_format: 日志时间格式
 * - autorestart: 发生错误是否自动重启
 * - max_memory_restart: 内存超过此值自动重启（单位 MB）
 * - watch: 是否监听文件变化（开发环境为 true，生产环境为 false）
 * - ignore_watch: 忽略的文件/目录
 * - env_production: 生产环境变量
 * - env_development: 开发环境变量
 */

module.exports = {
  apps: [
    {
      // ==================== 基础配置 ====================
      name: 'garson',
      script: 'npm',
      args: 'start',
      cwd: '.',

      // ==================== 执行方式 ====================
      instances: 2,                    // 实例数量：2 个进程（根据你的 CPU 核数调整）
      exec_mode: 'cluster',            // 集群模式：多个进程负载均衡

      // ==================== 进程管理 ====================
      autorestart: true,               // 崩溃自动重启
      watch: false,                    // 生产环境不监听文件变化
      max_memory_restart: '1024M',     // 内存超过 1GB 自动重启
      
      // ==================== 日志配置 ====================
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ==================== 环境变量 ====================
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },

      // ==================== 启动延迟 ====================
      wait_ready: false,
      listen_timeout: 3000,            // 启动超时时间（毫秒）
      kill_timeout: 5000,              // 关闭超时时间（毫秒）

      // ==================== 监控和告警 ====================
      max_restarts: 10,                // 最大重启次数
      min_uptime: 10000,               // 最小运行时间（毫秒），低于此值视为启动失败

      // ==================== 其他配置 ====================
      merge_logs: false,               // 不合并日志
      autorestart: true,
      watch: ['app', 'lib', 'next.config.ts'],  // 监听这些文件变化（可选）
      ignore_watch: ['node_modules', '.next', 'logs', '.git'],
    }
  ]
};

