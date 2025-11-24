# 榜单合约系统

一个基于 Binance 期货的榜单交易系统，专注于市值榜单和涨幅榜单的交易机会，支持一键做多/做空操作，实时市场数据和持仓管理。

## ✨ 功能特性

### 📊 榜单数据展示
- **市值榜单**：实时显示市值排名前 N 的币种（支持 Top 10/20/50）
- **涨幅榜单**：实时显示 24h 涨幅前 N 的币种
- **数据详情**：价格、涨跌幅、市值、交易量、排名

### 💰 交易功能
- **一键做多**：基于市值榜单，快速做多强势币种
- **一键做空**：基于涨幅榜单，快速做空涨幅过高的币种
- **持仓管理**：实时查看盈亏、未实现盈亏、持仓数量、快速平仓
- **灵活配置**：杠杆倍数（1x-125x）、仓位价值、API 密钥管理

### 🎨 用户体验
- **响应式设计**：
  - 🖥️ 桌面端：双列布局，榜单和持仓并排显示
  - 📱 移动端：标签页布局，支持切换不同榜单
- **实时数据更新**：榜单每 60 秒刷新，持仓每 10 秒刷新
- **现代 UI**：流畅动画和直观的界面设计

## 🛠️ 技术栈

| 技术 | 版本 |
|------|------|
| **Next.js** | 16 (App Router) |
| **React** | 19 |
| **TypeScript** | 最新版 |
| **Tailwind CSS** | 4 |
| **Framer Motion** | 动画库 |
| **CCXT** | Binance 期货交易 |

## 📁 项目结构

```
garson/
├── app/
│   ├── components/binance/          # Binance 交易组件
│   │   ├── MarketList.tsx           # 榜单列表
│   │   ├── PositionsTable.tsx       # 持仓表格
│   │   ├── TradeModal.tsx           # 交易弹窗
│   │   ├── ConfirmModal.tsx         # 确认弹窗
│   │   └── SettingsModal.tsx        # 设置弹窗
│   │
│   ├── api/binance/                 # Binance API 路由
│   │   ├── credentials/             # API 凭证管理
│   │   ├── market/                  # 市场数据
│   │   ├── positions/               # 持仓查询
│   │   └── trade/                   # 交易操作
│   │
│   ├── page.tsx                     # 主交易页面
│   ├── layout.tsx                   # 根布局
│   └── globals.css                  # 全局样式
│
├── lib/
│   └── binance-client.ts            # Binance 客户端
│
├── next.config.ts                   # Next.js 配置
├── tsconfig.json                    # TypeScript 配置
└── package.json                     # 项目依赖
```

## 🚀 快速开始

### 系统要求
- Node.js 18+
- npm/yarn/pnpm/bun

### 安装

```bash
# 克隆项目
git clone https://github.com/songsongQAQ/list_contract.git
cd garson

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用。

### 环境配置（可选）

创建 `.env` 文件并配置以下变量（也可在应用内设置）：

```env
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
```

## 🔑 Binance API 配置

1. **获取 API 凭证**
   - 访问 [Binance API Management](https://www.binance.com/en/account/api-management)
   - 创建新的 API Key
   - **重要**：启用 **Futures（期货）** 权限
   - 设置 IP 白名单（可选但推荐）

2. **在应用中配置**
   - 打开榜单合约系统
   - 点击右上角 **⚙️ 设置** 按钮
   - 输入 API Key 和 Secret
   - 配置交易参数（杠杆倍数、仓位价值）
   - 点击 **保存设置**

### 🔒 安全建议
- ⚠️ 定期轮换 API Key（建议每 3-6 个月）
- 📊 监控 API 使用情况
- 🔑 最小权限原则：仅启用应用需要的权限
- 🌐 设置 IP 白名单限制 API 访问
- 🚫 不要在公共计算机上使用

## 📊 使用指南

### 市值榜单交易（做多策略）
1. 查看市值榜单：系统默认显示 Top 10 币种
2. 选择目标币种：选择市值稳定、流动性好的币种
3. 点击"做多"按钮：一键开仓做多
4. 设置参数：杠杆倍数（建议 1x-5x）、仓位价值（建议不超过 10% 总资金）
5. 确认交易

### 涨幅榜单交易（做空策略）
1. 切换到涨幅榜单
2. 识别高涨幅币种：关注 24h 涨幅超过 20% 的币种
3. 点击"做空"按钮：一键开仓做空
4. 设置参数：杠杆倍数（建议 1x-3x）、仓位价值（建议不超过 5% 总资金）
5. 确认交易

### 持仓管理
- **查看持仓**：在"持仓"标签页查看所有当前持仓
- **监控盈亏**：实时查看未实现盈亏
- **快速平仓**：点击"平仓"按钮快速平仓
- **批量管理**：同时管理多个持仓

## 🔌 API 接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/binance/credentials` | POST | 保存/验证 API 凭证 |
| `/api/binance/market` | GET | 获取榜单数据（市值/涨幅） |
| `/api/binance/positions` | GET | 获取当前所有持仓 |
| `/api/binance/trade` | POST | 执行交易操作（开仓/平仓） |

## 📦 常用命令

```bash
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 代码检查
```

## 🚀 部署

### 构建生产版本
```bash
npm run build
npm start
```

### 部署到 Vercel
1. 将项目推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量（可选）：`BINANCE_API_KEY`、`BINANCE_API_SECRET`
4. 部署完成

### 部署注意事项
- ⚠️ 生产环境建议使用环境变量存储 API 密钥
- 🔒 确保使用 HTTPS 连接，保护 API 密钥传输安全
- 📊 注意 Binance API 的调用频率限制

## ⚠️ 风险提示

**期货交易存在高风险，可能导致本金全部损失。使用本系统需自行承担所有交易风险。**

1. **期货交易风险**：期货交易具有高风险
2. **杠杆风险**：使用杠杆会放大盈亏
3. **市场风险**：加密货币市场波动剧烈
4. **技术风险**：系统故障、网络延迟可能导致交易失败
5. **API 安全**：妥善保管 API 密钥，不要泄露给他人

**免责声明**：本系统仅供学习和研究使用。

## 📚 参考资源

- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Framer Motion 文档](https://www.framer.com/motion/)
- [CCXT 文档](https://docs.ccxt.com/)
- [Binance API 文档](https://binance-docs.github.io/apidocs/)

## 📄 许可证

本项目为个人项目，保留所有权利。

## 👤 作者

songsongQAQ

---

**项目版本**: 1.0.0  
**最后更新**: 2025-01-24  
**状态**: ✅ 生产就绪

**提示**: 这是一个持续开发中的项目，功能可能会不断更新和完善。使用前请仔细阅读风险提示。
