const SftpClient = require('ssh2-sftp-client');
const { execSync } = require('child_process');
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
 * 执行命令并显示输出
 */
function execCommand(command, description) {
  console.log(`\n📦 ${description}...`);
  try {
    const output = execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log(`✅ ${description} 完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} 失败:`, error);
    return false;
  }
}

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
    console.log('\n📋 步骤 4: 清理旧的构建文件');
    try {
      const oldNextExists = await sftp.exists(config.remoteNextDir);
      if (oldNextExists) {
        console.log(`🗑️  删除旧的 .next 目录...`);
        await sftp.rmdir(config.remoteNextDir, true);
        console.log('✅ 旧文件清理完成');
      } else {
        console.log('ℹ️  没有找到旧的 .next 目录，跳过清理');
      }
    } catch (error) {
      console.warn('⚠️  清理旧文件时出现警告（可能目录不存在）:', error);
    }
    
    // 步骤 5: 上传 .next 目录
    console.log('\n📋 步骤 5: 上传构建文件');
    console.log(`📤 正在上传 ${config.localNextDir} 到 ${config.remoteNextDir}...`);
    console.log('⏳ 这可能需要几分钟，请耐心等待...');
    
    await sftp.uploadDir(config.localNextDir, config.remoteNextDir);
    console.log('✅ 文件上传成功');
    
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

