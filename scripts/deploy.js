const SftpClient = require('ssh2-sftp-client');
const { Client } = require('ssh2');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 服务器配置
const serverConfig = {
  host: '35.241.124.131',
  username: 'root',
  password: 'ze123345',
  port: 22,
};

// 本地和远程路径配置
const config = {
  localNextDir: path.join(process.cwd(), '.next'),
  remoteDir: '/www/wwwroot/list_contract',
  remoteNextDir: '/www/wwwroot/list_contract/.next',
};

/**
 * 检查本地 .next 目录是否存在
 */
function checkLocalBuild() {
  if (!fs.existsSync(config.localNextDir)) {
    console.error(`❌ 错误: 本地 .next 目录不存在: ${config.localNextDir}`);
    console.log('💡 提示: 请先运行 npm run build 构建项目');
    return false;
  }
  console.log(`✅ 找到本地构建目录: ${config.localNextDir}`);
  return true;
}

/**
 * 通过 SSH 执行远程命令（比 SFTP 删除文件快得多）
 */
function execSSHCommand(sshConfig, command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          reject(err);
          return;
        }
        
        let stdout = '';
        let stderr = '';
        
        stream.on('close', (code, _signal) => {
          conn.end();
          if (code === 0) {
            resolve({ stdout, stderr, code });
          } else {
            reject(new Error(`命令执行失败，退出码: ${code}\n${stderr}`));
          }
        });
        
        stream.on('data', (data) => {
          stdout += data.toString();
        });
        
        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
    
    conn.on('error', (err) => {
      reject(err);
    });
    
    conn.connect(sshConfig);
  });
}

/**
 * 使用 tar + SSH 管道快速上传目录（比 SFTP 逐个文件上传快得多）
 * 原理：本地压缩 -> SSH 管道传输 -> 服务器端解压
 */
function uploadDirViaSSH(sshConfig, localDir, remoteDir) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let hasError = false;
    let isResolved = false;
    
    // 设置超时（30分钟）
    const timeout = setTimeout(() => {
      if (!isResolved) {
        hasError = true;
        isResolved = true;
        conn.end();
        reject(new Error('上传超时：超过30分钟未完成'));
      }
    }, 30 * 60 * 1000);
    
    let heartbeatInterval = null;
    
    const cleanup = () => {
      clearTimeout(timeout);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      isResolved = true;
    };
    
    conn.on('ready', () => {
      console.log('🔧 准备在服务器端执行解压命令...');
      // 在服务器端执行解压命令
      const remoteCommand = `cd "${path.dirname(remoteDir)}" && tar -xzf -`;
      console.log(`📝 远程命令: ${remoteCommand}`);
      conn.exec(remoteCommand, (err, stream) => {
        if (err) {
          cleanup();
          conn.end();
          reject(err);
          return;
        }
        
        let stderr = '';
        let stdout = '';
        let uploadedBytes = 0;
        let lastProgressTime = Date.now();
        let lastUploadBytes = 0;
        let tarEnded = false;
        let isPaused = false;
        const startTime = Date.now();
        
        // 心跳检测：如果 30 秒没有进度更新，显示警告
        heartbeatInterval = setInterval(() => {
          const now = Date.now();
          const timeSinceLastProgress = now - lastProgressTime;
          const bytesSinceLastProgress = uploadedBytes - lastUploadBytes;
          
          if (timeSinceLastProgress > 30000 && bytesSinceLastProgress === 0 && !tarEnded) {
            console.log(`\n⚠️  警告: 已 ${(timeSinceLastProgress / 1000).toFixed(0)} 秒没有传输进度`);
            console.log(`   当前状态: 已上传 ${(uploadedBytes / 1024 / 1024).toFixed(1)} MB, 流暂停: ${isPaused}, tar 结束: ${tarEnded}`);
          }
        }, 10000); // 每 10 秒检查一次
        
        // 监听服务器端的输出
        stream.stderr.on('data', (data) => {
          const msg = data.toString();
          stderr += msg;
          // 如果有错误输出，立即显示
          if (msg.trim()) {
            console.error(`\n⚠️  服务器端错误: ${msg}`);
          }
        });
        
        stream.on('data', (data) => {
          stdout += data.toString();
        });
        
        stream.on('close', (code, _signal) => {
          cleanup();
          console.log(`\n🔍 服务器端命令执行完成，退出码: ${code}`);
          if (stderr) {
            console.log(`📋 服务器端错误输出: ${stderr}`);
          }
          if (stdout) {
            console.log(`📋 服务器端标准输出: ${stdout}`);
          }
          conn.end();
          if (hasError) return;
          
          if (code === 0) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const sizeMB = (uploadedBytes / 1024 / 1024).toFixed(2);
            console.log(`📊 传输完成: ${sizeMB} MB，耗时 ${duration} 秒`);
            if (!isResolved) {
              resolve();
            }
          } else {
            if (!isResolved) {
              reject(new Error(`解压失败，退出码: ${code}\n标准输出: ${stdout}\n错误输出: ${stderr}`));
            }
          }
        });
        
        // 在本地执行 tar 压缩并传输到 SSH 流
        const parentDir = path.dirname(localDir);
        const dirName = path.basename(localDir);
        
        const tarProcess = spawn('tar', ['-czf', '-', '-C', parentDir, dirName], {
          cwd: process.cwd(),
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        
        // 处理背压：当流缓冲区满时暂停读取
        let isEnded = false;
        const dataQueue = [];
        
        const finishStream = () => {
          if (!isEnded) {
            isEnded = true;
            stream.end();
            process.stdout.write('\n'); // 换行，避免覆盖进度信息
          }
        };
        
        const writeToStream = (chunk) => {
          uploadedBytes += chunk.length;
          const now = Date.now();
          
          // 显示进度（每 1MB 或每 3 秒显示一次）
          const lastUpdate = Math.floor((uploadedBytes - chunk.length) / (1 * 1024 * 1024));
          const currentUpdate = Math.floor(uploadedBytes / (1 * 1024 * 1024));
          const timeSinceLastProgress = now - lastProgressTime;
          
          if (currentUpdate > lastUpdate || timeSinceLastProgress > 3000) {
            const mb = (uploadedBytes / 1024 / 1024).toFixed(1);
            const elapsed = ((now - startTime) / 1000).toFixed(1);
            process.stdout.write(`\r📤 已上传: ${mb} MB (${elapsed}s)`);
            lastProgressTime = now;
            lastUploadBytes = uploadedBytes;
          }
          
          if (isPaused) {
            // 流已暂停，将数据加入队列
            dataQueue.push(chunk);
          } else {
            try {
              const canContinue = stream.write(chunk);
              if (!canContinue) {
                // 流缓冲区满，暂停读取
                isPaused = true;
                tarProcess.stdout.pause();
                console.log('\n⏸️  流缓冲区满，暂停传输...');
              }
            } catch (writeErr) {
              hasError = true;
              cleanup();
              tarProcess.kill();
              conn.end();
              reject(new Error(`写入流失败: ${writeErr.message}`));
            }
          }
        };
        
        // 当流可以继续写入时恢复读取
        stream.on('drain', () => {
          if (isPaused) {
            console.log('\n▶️  流缓冲区已清空，恢复传输...');
            isPaused = false;
            tarProcess.stdout.resume();
          }
          
          // 处理队列中的数据
          while (dataQueue.length > 0 && !isPaused) {
            const chunk = dataQueue.shift();
            try {
              const canContinue = stream.write(chunk);
              if (!canContinue) {
                isPaused = true;
                tarProcess.stdout.pause();
                break;
              }
            } catch (writeErr) {
              hasError = true;
              cleanup();
              tarProcess.kill();
              conn.end();
              reject(new Error(`写入队列数据失败: ${writeErr.message}`));
              return;
            }
          }
          
          // 如果队列已空且 tar 进程已结束，关闭流
          if (dataQueue.length === 0 && tarEnded) {
            finishStream();
          }
        });
        
        // 将 tar 输出管道到 SSH 输入
        tarProcess.stdout.on('data', writeToStream);
        
        tarProcess.stdout.on('end', () => {
          tarEnded = true;
          // 如果队列为空且流未暂停，直接关闭
          if (dataQueue.length === 0 && !isPaused) {
            finishStream();
          }
          // 否则等待 drain 事件处理
        });
        
        tarProcess.stderr.on('data', (data) => {
          console.error(`tar 错误: ${data.toString()}`);
        });
        
        tarProcess.on('error', (err) => {
          if (!isResolved) {
            hasError = true;
            cleanup();
            conn.end();
            reject(new Error(`tar 命令执行失败: ${err.message}`));
          }
        });
        
        tarProcess.on('close', (code) => {
          if (code !== 0 && !hasError && !isResolved) {
            hasError = true;
            cleanup();
            // 尝试关闭流，忽略可能的错误
            try {
              stream.end();
            } catch {
              // 流可能已关闭，忽略错误
            }
            conn.end();
            reject(new Error(`tar 压缩失败，退出码: ${code}`));
          }
        });
      });
    });
    
    conn.on('error', (err) => {
      if (!isResolved) {
        hasError = true;
        cleanup();
        reject(err);
      }
    });
    
    conn.connect(sshConfig);
  });
}

/**
 * 连接服务器并上传文件
 */
async function deploy() {
  const sftp = new SftpClient();
  
  try {
    console.log('\n🚀 开始部署流程...\n');
    console.log('='.repeat(50));
    
    // 步骤 1: 检查本地构建
    console.log('\n📋 步骤 1: 检查本地构建');
    if (!checkLocalBuild()) {
      process.exit(1);
    }
    
    // 步骤 2: 连接服务器
    console.log('\n📋 步骤 2: 连接服务器');
    console.log(`🔗 正在连接到 ${serverConfig.host}...`);
    await sftp.connect(serverConfig);
    console.log('✅ 服务器连接成功');
    
    // 步骤 3: 检查并创建远程目录
    console.log('\n📋 步骤 3: 检查远程目录');
    try {
      const remoteDirExists = await sftp.exists(config.remoteDir);
      if (!remoteDirExists) {
        console.log(`📁 创建远程目录: ${config.remoteDir}`);
        await sftp.mkdir(config.remoteDir, true);
        console.log('✅ 远程目录创建成功');
      } else {
        console.log(`✅ 远程目录已存在: ${config.remoteDir}`);
      }
    } catch (error) {
      console.error('❌ 检查/创建远程目录失败:', error);
      throw error;
    }
    
    // 步骤 4: 删除旧的 .next 目录（如果存在）
    // 使用 SSH 命令删除，比 SFTP 逐个删除文件快得多
    console.log('\n📋 步骤 4: 清理旧的构建文件');
    try {
      const oldNextExists = await sftp.exists(config.remoteNextDir);
      if (oldNextExists) {
        console.log(`🗑️  删除旧的 .next 目录...`);
        // 使用 SSH 命令快速删除，避免 SFTP 逐个删除文件的慢速问题
        await execSSHCommand(serverConfig, `rm -rf "${config.remoteNextDir}"`);
        console.log('✅ 旧文件清理完成');
      } else {
        console.log('ℹ️  没有找到旧的 .next 目录，跳过清理');
      }
    } catch (error) {
      console.warn('⚠️  清理旧文件时出现警告（可能目录不存在）:', error.message);
    }
    
    // 步骤 5: 上传 .next 目录
    // 使用 tar + SSH 管道传输，比 SFTP 逐个文件上传快得多
    console.log('\n📋 步骤 5: 上传构建文件');
    console.log(`📤 正在上传 ${config.localNextDir} 到 ${config.remoteNextDir}...`);
    console.log('⚡ 使用 tar + SSH 管道传输（快速模式）...');
    
    // 确保远程父目录存在
    const remoteParentDir = path.dirname(config.remoteNextDir);
    try {
      const parentExists = await sftp.exists(remoteParentDir);
      if (!parentExists) {
        await sftp.mkdir(remoteParentDir, true);
      }
    } catch (error) {
      console.warn('⚠️  创建父目录时出现警告:', error.message);
    }
    
    // 关闭 SFTP 连接，使用 SSH 管道传输
    await sftp.end();
    
    // 使用 SSH 管道快速上传
    await uploadDirViaSSH(serverConfig, config.localNextDir, config.remoteNextDir);
    console.log('\n✅ 文件上传成功');
    
    // 重新连接 SFTP 用于验证
    await sftp.connect(serverConfig);
    
    // 步骤 6: 验证上传
    console.log('\n📋 步骤 6: 验证上传结果');
    const uploadedExists = await sftp.exists(config.remoteNextDir);
    if (uploadedExists) {
      const stats = await sftp.stat(config.remoteNextDir);
      console.log(`✅ 验证成功: ${config.remoteNextDir} 已存在`);
      console.log(`📊 目录类型: ${stats.type}`);
    } else {
      throw new Error('上传验证失败：远程目录不存在');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 部署完成！');
    console.log(`📁 文件已上传到: ${config.remoteNextDir}`);
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ 部署失败:', error);
    if (error instanceof Error) {
      console.error('错误详情:', error.message);
    }
    process.exit(1);
  } finally {
    // 确保关闭连接
    await sftp.end();
    console.log('\n🔌 已断开服务器连接');
  }
}

// 执行部署
deploy().catch((error) => {
  console.error('未处理的错误:', error);
  process.exit(1);
});

