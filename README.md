# 榜单合约系统

一个基于 Binance 期货的榜单交易系统，专注于市值榜单和涨幅榜单的交易机会，支持一键做多/做空操作，实时市场数据和持仓管理。

## 📋 项目简介

榜单合约系统是一个专注于**榜单交易**的 Binance 期货交易终端。系统通过实时展示市值排行榜和涨幅排行榜，帮助交易者快速发现交易机会，并支持一键执行做多/做空操作。

### 核心概念

- **市值榜单**：展示市值排名前 N 的币种，适合做多操作
- **涨幅榜单**：展示 24h 涨幅前 N 的币种，适合做空操作
- **榜单交易**：基于榜单数据快速执行交易策略

## ✨ 功能特性

### 📊 榜单数据展示

- **市值榜单**：实时显示市值排名前 N 的币种
  - 市值、价格、24h 涨跌幅
  - 交易量、排名信息
  - 支持自定义显示数量（Top 10/20/50）
  
- **涨幅榜单**：实时显示 24h 涨幅前 N 的币种
  - 涨幅、价格、市值
  - 交易量、排名信息
  - 快速识别热门币种

### 💰 交易功能

- **一键做多**：基于市值榜单，快速做多强势币种
- **一键做空**：基于涨幅榜单，快速做空涨幅过高的币种
- **持仓管理**：实时查看和管理当前所有持仓
  - 持仓盈亏、未实现盈亏
  - 持仓数量、开仓价格
  - 快速平仓功能
- **交易配置**：灵活配置交易参数
  - 杠杆倍数（1x-125x）
  - 仓位价值（USDT）
  - API 密钥管理

### 🎨 用户体验

- **响应式设计**：完美适配桌面端和移动端
  - 桌面端：双列布局，榜单和持仓并排显示
  - 移动端：标签页布局，支持切换不同榜单
- **实时刷新**：自动更新市场数据
  - 榜单数据：每 60 秒刷新
  - 持仓数据：每 10 秒刷新
- **现代 UI**：流畅的动画和直观的界面设计

## 🛠️ 技术栈

### 前端技术
- **框架**: [Next.js 16](https://nextjs.org/) (App Router)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **UI 库**: [React 19](https://react.dev/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **动画**: [Framer Motion](https://www.framer.com/motion/)
- **图标**: [Lucide React](https://lucide.dev/)

### 后端技术
- **API**: Next.js API Routes
- **交易库**: [CCXT](https://docs.ccxt.com/) (Binance 期货交易)
- **平台**: Binance Futures API

### 开发工具
- **代码检查**: ESLint
- **字体**: Geist (Next.js 自动优化)
- **环境变量**: dotenv

## 📁 项目结构

```
list-contract/
├── app/
│   ├── components/
│   │   └── binance/          # Binance 交易组件
│   │       ├── MarketList.tsx        # 榜单列表组件
│   │       ├── PositionsTable.tsx   # 持仓表格组件
│   │       ├── TradeModal.tsx        # 交易弹窗组件
│   │       ├── ConfirmModal.tsx      # 确认弹窗组件
│   │       └── SettingsModal.tsx     # 设置弹窗组件
│   │
│   ├── api/
│   │   └── binance/          # Binance API 路由
│   │       ├── credentials/  # API 凭证管理
│   │       ├── market/      # 市场数据（榜单数据）
│   │       ├── positions/    # 持仓查询
│   │       └── trade/       # 交易操作
│   │
│   ├── page.tsx              # 主交易页面（榜单展示）
│   ├── debug/
│   │   └── page.tsx         # 调试页面
│   ├── layout.tsx            # 根布局
│   └── globals.css           # 全局样式
│
├── lib/
│   └── binance-client.ts     # Binance 客户端封装
│
├── next.config.ts            # Next.js 配置
├── tsconfig.json             # TypeScript 配置
└── package.json              # 项目依赖配置
```

## 🚀 开始使用

### 环境要求

- Node.js 18+
- npm/yarn/pnpm/bun

### 安装步骤

1. **克隆项目**
```bash
git clone https://github.com/songsongQAQ/list_contract.git
cd list-contract
```

2. **安装依赖**
```bash
npm install
# 或
yarn install
# 或
pnpm install
```

3. **配置环境变量（可选）**

创建 `.env` 文件并配置以下变量（可选，也可在应用内设置）：

```env
# Binance API（可选，也可在设置中配置）
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
```

4. **启动开发服务器**
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

5. **访问应用**

- 榜单交易终端: [http://localhost:3000](http://localhost:3000)
- 调试页面: [http://localhost:3000/debug](http://localhost:3000/debug)

## 💰 Binance API 配置

### 设置步骤

1. **获取 Binance API 凭证**
   - 访问 [Binance API Management](https://www.binance.com/en/account/api-management)
   - 创建新的 API Key
   - **重要**：启用 **Futures（期货）** 权限
   - 设置 IP 白名单（可选但推荐）

2. **在应用中配置**
   - 打开榜单合约系统
   - 点击右上角的 **⚙️ 设置** 按钮
   - 在 "🔑 API 密钥设置" 部分输入 API Key 和 Secret
   - 配置交易参数：
     - **杠杆倍数**：建议 1x-10x（新手），最高 125x
     - **仓位价值**：每次交易的 USDT 数量
   - 点击 **保存设置**

### 安全建议

- ⚠️ **定期轮换 API Key**：建议每 3-6 个月更换一次
- 📊 **监控 API 使用情况**：定期检查 API 调用记录
- 🔒 **最小权限原则**：仅启用应用需要的权限（Futures）
- 🌐 **设置 IP 白名单**：限制 API 只能从特定 IP 访问
- 🚫 **不要在公共计算机上使用**：避免泄露 API 凭证

## 📊 使用指南

### 榜单交易策略

#### 市值榜单交易（做多策略）

1. **查看市值榜单**：系统默认显示市值排名前 10 的币种
2. **选择目标币种**：选择市值稳定、流动性好的币种
3. **点击"做多"按钮**：一键开仓做多
4. **设置参数**：
   - 杠杆倍数（建议 1x-5x）
   - 仓位价值（建议不超过总资金的 10%）
5. **确认交易**：检查交易信息后确认

#### 涨幅榜单交易（做空策略）

1. **切换到涨幅榜单**：点击"涨幅"标签页
2. **识别高涨幅币种**：关注 24h 涨幅超过 20% 的币种
3. **点击"做空"按钮**：一键开仓做空
4. **设置参数**：
   - 杠杆倍数（建议 1x-3x，做空风险较高）
   - 仓位价值（建议不超过总资金的 5%）
5. **确认交易**：检查交易信息后确认

### 持仓管理

- **查看持仓**：在"持仓"标签页查看所有当前持仓
- **监控盈亏**：实时查看未实现盈亏和已实现盈亏
- **快速平仓**：点击"平仓"按钮快速平掉单个持仓
- **批量管理**：支持同时管理多个持仓

### 自定义榜单数量

- 点击右上角设置按钮
- 调整"Top 数量"设置（10/20/50）
- 榜单会自动更新显示数量

## 🔌 API 接口

### Binance API

**POST `/api/binance/credentials`**
- 保存 Binance API 凭证
- 验证凭证有效性

**GET `/api/binance/market`**
- 获取榜单数据
  - 市值榜单（marketCap）
  - 涨幅榜单（gainers）
- 返回币种价格、涨跌幅、交易量等信息

**GET `/api/binance/positions`**
- 获取当前所有持仓
- 返回持仓数量、开仓价格、未实现盈亏等

**POST `/api/binance/trade`**
- 执行交易操作
  - 开仓（做多/做空）
  - 平仓
- 支持设置杠杆和仓位价值

## 📱 移动端适配

### 响应式布局

- **桌面端（≥1024px）**：
  - 双列布局
  - 左侧：榜单数据（市值/涨幅）
  - 右侧：持仓管理
  - 同时查看榜单和持仓

- **移动端（<1024px）**：
  - 标签页布局
  - 顶部标签切换：市值 / 涨幅 / 持仓
  - 内容区域可滚动
  - 移动端默认显示持仓标签

### 数据刷新策略

- **榜单数据**：每 60 秒自动刷新
- **持仓数据**：每 10 秒自动刷新
- **手动刷新**：点击刷新按钮立即更新

## 📦 构建和部署

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

### 部署到 Vercel

1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量（可选）：
   - `BINANCE_API_KEY`
   - `BINANCE_API_SECRET`
4. 部署完成

### 部署注意事项

- ⚠️ **API 密钥安全**：生产环境建议使用环境变量，不要在前端代码中硬编码
- 🔒 **HTTPS 必需**：确保使用 HTTPS 连接，保护 API 密钥传输安全
- 📊 **API 限制**：注意 Binance API 的调用频率限制

## ⚠️ 风险提示

1. **期货交易风险**：期货交易具有高风险，可能导致本金全部损失
2. **杠杆风险**：使用杠杆会放大盈亏，请谨慎使用
3. **市场风险**：加密货币市场波动剧烈，价格可能快速变化
4. **技术风险**：系统故障、网络延迟可能导致交易失败或损失
5. **API 安全**：妥善保管 API 密钥，不要泄露给他人

**免责声明**：本系统仅供学习和研究使用，使用者需自行承担所有交易风险。

## 📚 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 代码检查
```

## 📚 了解更多

- [Next.js 文档](https://nextjs.org/docs) - Next.js 框架文档
- [Tailwind CSS 文档](https://tailwindcss.com/docs) - Tailwind CSS 样式框架
- [Framer Motion 文档](https://www.framer.com/motion/) - 动画库文档
- [CCXT 文档](https://docs.ccxt.com/) - 加密货币交易库文档
- [Binance API 文档](https://binance-docs.github.io/apidocs/) - Binance API 官方文档

## 📄 许可证

本项目为个人项目，保留所有权利。

## 👤 作者

songsongQAQ

---

**项目版本**: 1.0.0  
**最后更新**: 2025-01-20  
**状态**: ✅ 生产就绪

**注意**: 这是一个持续开发中的项目，功能可能会不断更新和完善。使用前请仔细阅读风险提示。
