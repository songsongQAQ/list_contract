# 榜单合约系统 (Garson)

一个功能完整的基于 **Binance 期货** 的榜单交易系统，专注于市值榜单和涨幅榜单的交易机会。支持一键做多/做空操作、实时市场数据、完整的用户认证系统、后台管理和持仓管理。

**中文文档** | [English](./README.en.md)

---

## ✨ 核心特性

### 📊 智能榜单系统
- **市值榜单**：实时显示市值排名前 N 的币种（支持 Top 10/20/50）
- **涨幅榜单**：实时显示 24h 涨幅前 N 的币种
- **详细数据展示**：价格、涨跌幅、市值、交易量、排名
- **灵活查询**：支持自定义显示数量，可忽略特定币种

### 💼 完整的交易功能
- **一键做多**：基于市值榜单快速做多强势币种
- **一键做空**：基于涨幅榜单快速做空高涨幅币种
- **实时持仓管理**：查看所有当前持仓、盈亏、未实现盈亏
- **快速平仓**：一键平仓操作
- **灵活配置**：
  - 杠杆倍数：1x ~ 125x（可独立配置做多和做空）
  - 仓位价值：自定义单次开仓金额（USDT）
  - 止盈止损：支持百分比配置

### 👥 完整的用户管理系统
- **用户认证**：基于 NextAuth.js 的安全登录系统
- **后台管理**：使用管理员密码访问
- **用户管理页面**：创建、编辑、删除用户
- **独立配置**：每个用户拥有独立的 API 密钥和交易设置
- **密码加密**：使用 bcryptjs 安全存储密码

### 🎨 现代化用户体验
- **响应式设计**：
  - 🖥️ **桌面端**：双列布局，榜单和持仓并排显示
  - 📱 **移动端**：标签页布局，支持切换不同榜单
- **实时数据更新**：
  - 榜单数据每 60 秒自动刷新
  - 持仓数据每 10 秒实时更新
- **流畅动画**：使用 Framer Motion 实现优雅的界面交互
- **现代 UI 组件**：集成 Ant Design 美观的组件库

### 🔒 企业级安全
- **JWT 会话管理**：安全的会话管理机制
- **API 密钥加密**：敏感信息在数据库中加密存储
- **路由保护**：所有受保护的路由都需要用户认证
- **环境变量管理**：敏感配置通过环境变量安全管理

### 💾 数据持久化
- **MySQL 数据库**：使用 Prisma ORM 管理
- **用户数据**：账号、密码、配置独立存储
- **配置数据**：每个用户的交易参数独立保存

---

## 🛠️ 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| **Next.js** | 16.0.3 | React 框架（App Router） |
| **React** | 19.2.0 | UI 库 |
| **TypeScript** | 5.x | 类型安全的 JavaScript |
| **Tailwind CSS** | 4.x | 实用优先的 CSS 框架 |
| **Framer Motion** | 12.23.24 | React 动画库 |
| **NextAuth.js** | 5.0.0-beta.30 | 认证解决方案 |
| **Prisma** | 6.19.0 | ORM 数据库工具 |
| **MySQL** | 8.0+ | 关系型数据库 |
| **CCXT** | 4.5.20 | 加密货币交易库 |
| **Ant Design** | 6.0.0 | 企业级 UI 组件库 |
| **bcryptjs** | 3.0.3 | 密码加密库 |

---

## 📁 项目结构

```
garson/
├── app/
│   ├── admin/                          # 👥 后台管理界面
│   │   ├── login/
│   │   │   └── page.tsx               # 后台登录页
│   │   ├── users/
│   │   │   └── page.tsx               # 用户管理页面
│   │   ├── layout.tsx                 # 后台布局
│   │   └── page.tsx                   # 后台首页
│   │
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/
│   │   │   │   └── route.ts           # NextAuth 认证端点
│   │   │   └── session/               # Session 会话管理
│   │   │
│   │   ├── admin/                      # 👨‍💼 后台管理 API
│   │   │   ├── login/
│   │   │   │   └── route.ts           # 后台登录
│   │   │   ├── logout/
│   │   │   │   └── route.ts           # 后台登出
│   │   │   └── users/
│   │   │       ├── route.ts           # 用户 CRUD（GET/POST）
│   │   │       └── [id]/
│   │   │           ├── route.ts       # 单用户操作（PUT/DELETE）
│   │   │           └── config/
│   │   │               └── route.ts   # 用户配置获取
│   │   │
│   │   ├── user/                       # 👤 用户 API
│   │   │   └── config/
│   │   │       └── route.ts           # 获取/更新用户配置
│   │   │
│   │   └── binance/                    # 📈 Binance 交易 API
│   │       ├── market/
│   │       │   └── route.ts           # 获取榜单数据（市值/涨幅）
│   │       ├── positions/
│   │       │   └── route.ts           # 查询/平仓持仓
│   │       ├── trade/
│   │       │   └── route.ts           # 执行交易操作
│   │       └── credentials/
│   │           └── route.ts           # 验证 API 凭证
│   │
│   ├── components/
│   │   ├── binance/                    # 📊 交易相关组件
│   │   │   ├── MarketList.tsx         # 榜单列表显示
│   │   │   ├── PositionsTable.tsx     # 持仓表格
│   │   │   ├── TradeModal.tsx         # 交易弹窗
│   │   │   ├── SettingsModal.tsx      # 设置弹窗
│   │   │   ├── ConfirmModal.tsx       # 确认弹窗
│   │   │   └── ErrorModal.tsx         # 错误提示弹窗
│   │   └── LoginModal.tsx             # 登录弹窗
│   │
│   ├── actions/
│   │   └── settings.ts                # Server Actions（配置管理）
│   │
│   ├── page.tsx                       # 📍 主交易页面（首页）
│   ├── layout.tsx                     # 🎨 根布局
│   ├── providers.tsx                  # 🔌 Session Provider
│   └── globals.css                    # 🎨 全局样式
│
├── lib/
│   ├── binance-client.ts             # 🔗 Binance 客户端封装
│   ├── auth-config.ts                # 🔐 NextAuth 配置
│   ├── auth.ts                       # 🔑 认证辅助函数
│   ├── prisma.ts                     # 💾 Prisma 实例
│   ├── storage.ts                    # 💿 本地存储工具
│   └── user-config.ts                # ⚙️ 用户配置辅助函数
│
├── prisma/
│   └── schema.prisma                 # 📋 数据库 Schema 定义
│
├── types/
│   └── next-auth.d.ts                # 📝 NextAuth TypeScript 类型
│
├── middleware.ts                     # 🚧 Next.js 中间件（路由保护）
├── next.config.ts                    # ⚙️ Next.js 配置
├── tsconfig.json                     # 📝 TypeScript 配置
├── eslint.config.mjs                 # ✅ ESLint 配置
├── postcss.config.mjs                # 🎨 PostCSS 配置
├── tailwind.config.js                # 🎨 Tailwind 配置
└── package.json                      # 📦 项目依赖
```

---

## 🚀 快速开始

### 系统要求
- **Node.js** >= 18.x
- **npm/yarn/pnpm/bun**
- **MySQL** >= 8.0（可本地或远程）

### 1️⃣ 克隆并安装

```bash
# 克隆项目
git clone https://github.com/songsongQAQ/list_contract.git
cd garson

# 安装依赖
npm install
# 或使用其他包管理器
yarn install
pnpm install
bun install
```

### 2️⃣ 环境配置

创建 `.env.local` 文件（不要提交到 git）：

```env
# ==================== 数据库配置（必需）====================
DATABASE_URL="mysql://user:password@host:port/database"
# 示例: DATABASE_URL="mysql://root:password@localhost:3306/garson"

# ==================== NextAuth 配置（必需）====================
NEXTAUTH_SECRET=your_secret_here
# 生成方式: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# ==================== 后台管理员配置（必需）====================
ADMIN_PASSWORD=your_admin_password
# 用于访问后台管理页面的密码

# ==================== 服务器配置（可选）====================
SERVER_IP=your_server_ip_address
# 用于 Binance API 白名单配置，默认值为 '127.0.0.1'
# 示例: SERVER_IP="43.159.227.33"

# ==================== Binance API 配置（可选）====================
# 可在应用内设置，或预先配置
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret
```

### 3️⃣ 数据库初始化

```bash
# 生成 Prisma Client
npx prisma generate

# 推送数据库 Schema（推荐方式）
npx prisma db push

# 或使用迁移（需要数据库有创建表权限）
npx prisma migrate dev --name init
```

完成后系统会自动创建两个表：
- `users` - 用户账号表
- `user_configs` - 用户配置表（每个用户独立配置）

### 4️⃣ 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 开始使用

---

## 🔐 第一次使用流程

### A. 创建管理员用户

1. 访问后台管理登录页：`http://localhost:3000/admin/login`
2. 输入 `.env` 中配置的 `ADMIN_PASSWORD`
3. 进入用户管理页面，创建第一个用户
   - 设置用户名和密码
   - 用户会自动创建关联的配置记录

### B. 用户登录与配置

1. 访问主页 `http://localhost:3000`
2. 点击"去登录"按钮
3. 使用后台创建的用户账号登录
4. **重要**：登录后需要先配置 Binance API 密钥
   - 点击右上角 ⚙️ **设置** 按钮
   - 输入 Binance API Key 和 Secret
   - 配置交易参数（杠杆、仓位金额等）
   - 点击保存

### C. 开始交易

1. 配置完成后，点击榜单中的币种进行交易
2. 在交易弹窗中设置杠杆倍数和仓位金额
3. 确认交易即可开仓
4. 在持仓页面可以查看和管理现有头寸

---

## 🔑 Binance API 配置指南

### 获取 API 凭证

1. 访问 [Binance API 管理](https://www.binance.com/en/account/api-management)
2. 点击"创建 API"
3. 选择"系统生成"或"自定义标签"
4. **关键步骤**：启用以下权限：
   - ✅ 期货交易权限（**必须**）
   - ✅ 读取权限
   - ✅ 限制条款
5. 完成身份验证
6. 复制 **API Key** 和 **Secret Key**
7. **强烈建议**：设置 IP 白名单来限制 API 访问

### 在应用中配置

**方式一**：通过应用 UI 配置（推荐）
```
1. 登录应用
2. 点击右上角 ⚙️ 设置
3. 在弹窗中输入 API Key 和 Secret
4. 保存配置
```

**方式二**：环境变量配置
```
在 .env.local 中设置:
BINANCE_API_KEY=your_key
BINANCE_API_SECRET=your_secret
```

### IP 白名单配置

应用在设置界面中会显示服务器 IP 地址，您需要将该 IP 添加到 Binance API 白名单。

**配置步骤**：

1. 在应用设置界面中可以看到服务器 IP 地址（点击即可复制）
2. 访问 [Binance API 管理](https://www.binance.com/en/account/api-management)
3. 在对应的 API Key 配置中，找到"IP 白名单"设置
4. 将应用显示的 IP 地址添加到白名单中
5. 保存配置

**通过环境变量配置服务器 IP**：

默认情况下，应用会自动使用服务器的 IP 地址。您也可以通过环境变量 `SERVER_IP` 手动指定：

```env
SERVER_IP=43.159.227.33
```

- 如果不设置，应用将使用默认值 `127.0.0.1`
- 在生产环境中，强烈建议显式设置此值为您的服务器实际 IP 地址

### 🔒 安全建议

| 建议 | 说明 |
|------|------|
| 🔑 **最小权限** | 仅启用应用需要的权限（期货交易） |
| 🌐 **IP 白名单** | 添加部署服务器的 IP 地址 |
| 🔄 **定期轮换** | 每 3-6 个月更换一次 API Key |
| 📊 **监控使用** | 定期检查 Binance 中的 API 使用记录 |
| 🚫 **不要分享** | 永远不要将 API Key 分享给他人 |
| 💻 **安全环境** | 不在公共计算机上使用 |

---

## 📊 使用指南

### 🟢 市值榜单交易（做多策略）

**适用场景**：看好市场走势，做多市值稳定的币种

```
1. 查看市值榜单
   ├─ 系统默认显示 Top 10
   └─ 支持切换 Top 20 或 Top 50

2. 选择目标币种
   ├─ 关注流动性好的币种
   ├─ 避免被忽略的币种
   └─ 参考最近交易量

3. 点击"做多"按钮
   ├─ 设置杠杆倍数（建议 1x-5x）
   ├─ 设置仓位金额（建议 ≤ 总资金的 10%）
   └─ 确认交易

4. 持仓管理
   ├─ 实时查看未实现盈亏
   ├─ 设置止盈止损
   └─ 根据策略平仓
```

### 🔴 涨幅榜单交易（做空策略）

**适用场景**：识别过度上涨的币种，做空高风险头寸

```
1. 切换到涨幅榜单
   ├─ 查看 24h 涨幅前列币种
   └─ 识别过度上涨的机会

2. 风险识别
   ├─ 关注涨幅 > 20% 的币种
   ├─ 检查成交量
   └─ 评估回调风险

3. 点击"做空"按钮
   ├─ 设置较保守杠杆（建议 1x-3x）
   ├─ 设置较小仓位（建议 ≤ 总资金的 5%）
   └─ 确认交易

4. 风险管理
   ├─ 紧密监控盈亏
   ├─ 及时止损
   └─ 不追求过高杠杆
```

### 📋 持仓管理

| 功能 | 说明 |
|------|------|
| 📊 **查看持仓** | 在"持仓"标签页查看所有当前头寸 |
| 💰 **监控盈亏** | 实时显示已实现和未实现盈亏 |
| ⚡ **快速平仓** | 点击平仓按钮快速平仓 |
| 📱 **批量管理** | 同时管理多个持仓头寸 |
| ⚙️ **参数调整** | 可随时修改止盈止损设置 |

---

## 🔌 API 接口文档

### 认证相关

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth 认证端点 | ❌ |

### 用户相关

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/user/config` | GET | 获取用户配置 | ✅ |
| `/api/user/config` | POST | 更新用户配置 | ✅ |

### Binance 交易 API（需要用户认证）

| 端点 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/api/binance/market` | GET | 获取榜单数据 | `type`: "market"/"gainers"/"losers"<br/>`limit`: 数量 |
| `/api/binance/positions` | GET | 获取持仓列表 | - |
| `/api/binance/positions` | DELETE | 平仓 | `symbol`: 币种<br/>`side`: "LONG"/"SHORT" |
| `/api/binance/trade` | POST | 开仓交易 | `symbol`<br/>`side`<br/>`leverage`<br/>`margin` |
| `/api/binance/credentials` | POST | 验证 API 凭证 | `apiKey`<br/>`apiSecret` |

### 后台管理 API（需要管理员密码）

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/admin/login` | POST | 后台登录 | ❌ |
| `/api/admin/logout` | POST | 后台登出 | ✅ |
| `/api/admin/users` | GET | 获取用户列表 | ✅ |
| `/api/admin/users` | POST | 创建用户 | ✅ |
| `/api/admin/users/[id]` | GET | 获取单个用户 | ✅ |
| `/api/admin/users/[id]` | PUT | 更新用户 | ✅ |
| `/api/admin/users/[id]` | DELETE | 删除用户 | ✅ |
| `/api/admin/users/[id]/config` | GET | 获取用户配置 | ✅ |

---

## 📦 常用命令

```bash
# ==================== 开发 ====================
npm run dev              # 启动开发服务器 (http://localhost:3000)
npm run build            # 构建生产版本
npm run start            # 启动生产服务器
npm run lint             # 运行代码检查

# ==================== 数据库管理 ====================
npx prisma generate     # 生成 Prisma Client
npx prisma db push      # 推送 Schema 到数据库（开发环境）
npx prisma migrate dev  # 创建并应用迁移（需要权限）
npx prisma migrate prod # 生产环境迁移
npx prisma studio      # 打开 Prisma Studio（可视化数据库工具）

# ==================== 查看数据库 ====================
npx prisma db seed     # 运行数据库种子脚本
```

---

## 🌍 部署指南

### 📦 生成构建版本

```bash
# 构建
npm run build

# 本地测试（模拟生产）
npm start
```

### ☁️ 部署到 Vercel（推荐）

```bash
# 1. 推送代码到 GitHub
git push origin main

# 2. 在 Vercel 导入项目
# https://vercel.com/new

# 3. 配置环境变量
# - DATABASE_URL（必需）
# - NEXTAUTH_SECRET（必需）
# - NEXTAUTH_URL（必需）
# - ADMIN_PASSWORD（必需）
# - BINANCE_API_KEY（可选）
# - BINANCE_API_SECRET（可选）

# 4. 自动部署完成
```

### 🖥️ 自托管部署

```bash
# 服务器上克隆项目
git clone https://github.com/songsongQAQ/list_contract.git
cd garson

# 安装依赖
npm install

# 配置环境变量
nano .env.local

# 初始化数据库
npx prisma db push

# 构建
npm run build

# 使用 PM2 运行（或其他进程管理器）
npm install -g pm2
pm2 start npm --name "garson" -- start
```

### ⚙️ 部署注意事项

| 项目 | 说明 |
|------|------|
| 🔐 **环境变量** | 生产环境必须配置所有必需的环境变量 |
| 🔒 **HTTPS** | 必须使用 HTTPS，保护 API 密钥和会话数据 |
| 🔑 **NEXTAUTH_SECRET** | 生产环境必须生成新的安全密钥 |
| 🌐 **NEXTAUTH_URL** | 确保与实际域名一致 |
| 💾 **数据库** | 使用云服务（AWS RDS、阿里云等），建议启用自动备份 |
| 📊 **连接池** | MySQL 连接配置，建议设置连接池 |
| 🚀 **性能优化** | 启用 CDN，配置缓存策略 |
| 📈 **监控日志** | 配置日志系统和错误追踪（Sentry 等） |
| 🔄 **自动化** | 使用 CI/CD 流程自动化构建和部署 |

---

## 📊 数据库模型

### User 表
```sql
CREATE TABLE users (
  id        VARCHAR(255) PRIMARY KEY,
  username  VARCHAR(255) UNIQUE NOT NULL,
  password  VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### UserConfig 表
```sql
CREATE TABLE user_configs (
  id                    VARCHAR(255) PRIMARY KEY,
  userId                VARCHAR(255) UNIQUE NOT NULL,
  apiKey                TEXT,                              -- Binance API Key
  apiSecret             TEXT,                              -- Binance API Secret
  longLeverage          VARCHAR(255) DEFAULT '50',         -- 做多杠杆
  longMargin            VARCHAR(255) DEFAULT '3',          -- 做多本金 (USDT)
  shortLeverage         VARCHAR(255) DEFAULT '50',         -- 做空杠杆
  shortMargin           VARCHAR(255) DEFAULT '3',          -- 做空本金 (USDT)
  defaultLimit          VARCHAR(255) DEFAULT '10',         -- 榜单显示数量
  ignoredSymbols        TEXT,                              -- 忽略币种列表
  takeProfit            VARCHAR(255),                      -- 止盈百分比
  stopLoss              VARCHAR(255),                      -- 止损百分比
  copytradingMode       BOOLEAN DEFAULT false,             -- 带单模式开关
  copytradingApiKey     TEXT,                              -- 带单 API Key
  copytradingApiSecret  TEXT,                              -- 带单 API Secret
  created_at            DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## ⚠️ 风险提示

> **⛔ 期货交易存在极高风险，可能导致本金全部损失。使用本系统需自行承担所有交易风险。**

### 风险类型

| 风险 | 说明 | 防范 |
|------|------|------|
| 📉 **市场风险** | 加密货币市场波动剧烈 | 设置止损，控制头寸大小 |
| ⚡ **杠杆风险** | 杠杆会放大盈亏 | 使用保守杠杆倍数（1-5x） |
| 🔗 **流动性风险** | 部分币种流动性差 | 选择交易量大的币种 |
| 🖥️ **技术风险** | 系统故障、网络延迟 | 定期检查系统，监控连接 |
| 🔑 **安全风险** | API 密钥泄露 | 妥善保管，定期轮换 |
| 📊 **API 限制** | Binance 有调用频率限制 | 避免频繁操作 |

### 使用建议

1. ✅ **先小额测试**：先用小资金体验系统
2. ✅ **设置止损**：始终设置合理的止损点
3. ✅ **控制头寸**：单次头寸不超过账户的 10%
4. ✅ **监控持仓**：定期检查开仓的持仓
5. ✅ **避免过度交易**：不要频繁开平仓
6. ✅ **学习市场**：理解币种和市场动态

**免责声明**：本系统仅供学习和研究使用。使用者对所有交易结果自行承担责任。

---

## 🐛 故障排查

### 常见问题

#### Q: 登录后显示"需要配置 API 密钥"
```
A: 正常行为。需要先在设置中配置 Binance API 密钥才能交易。
   1. 点击右上角设置图标
   2. 输入 API Key 和 Secret
   3. 点击保存
```

#### Q: API 密钥验证失败
```
A: 可能原因：
   1. 密钥输入错误（复制时多了空格）
   2. 未启用期货权限
   3. IP 被限制（检查 Binance 白名单）
   4. 网络连接问题
   
   解决方案：
   - 从 Binance 网站重新复制密钥
   - 确保启用了期货交易权限
   - 检查防火墙和网络连接
```

#### Q: 数据库连接失败
```
A: 检查项目：
   1. DATABASE_URL 是否正确配置
   2. MySQL 服务是否运行
   3. 数据库用户密码是否正确
   4. 网络连接是否畅通
   
   调试方法：
   npx prisma db execute --stdin < query.sql
```

#### Q: 持仓数据无法更新
```
A: 可能原因：
   1. API 被限流（Binance 频率限制）
   2. 网络延迟
   3. Binance 服务故障
   
   解决方案：
   - 等待一段时间后重试
   - 检查网络连接
   - 查看浏览器控制台的错误信息
```

### 调试建议

1. **检查浏览器控制台**：`F12` → Console 查看错误信息
2. **查看网络请求**：`F12` → Network 查看 API 调用
3. **检查服务器日志**：在终端中查看 `npm run dev` 的输出
4. **使用 Prisma Studio**：`npx prisma studio` 查看数据库

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📚 参考资源

### 官方文档
- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

### 库文档
- [NextAuth.js 文档](https://next-auth.js.org/)
- [Prisma 文档](https://www.prisma.io/docs/)
- [Framer Motion 文档](https://www.framer.com/motion/)
- [Ant Design 文档](https://ant.design/docs/react/introduce)
- [CCXT 文档](https://docs.ccxt.com/)
- [bcryptjs 文档](https://github.com/dcodeIO/bcrypt.js)

### 交易相关
- [Binance API 文档](https://binance-docs.github.io/apidocs/)
- [Binance 期货交易规则](https://www.binance.com/en/trade/BTC_USDT)
- [CCXT 交易所集成](https://github.com/ccxt/ccxt)

---

## 📄 许可证

本项目保留所有权利。仅供个人学习和研究使用。

---

## 👤 作者

**songsongQAQ**

---

## 📈 项目信息

| 信息 | 值 |
|------|-----|
| 📦 **版本** | 2.0.0 |
| 📅 **最后更新** | 2025-01-26 |
| ✅ **状态** | 生产就绪 |
| 🌟 **核心特性** | 用户认证、数据库持久化、后台管理 |

---

## 🆕 更新日志

### v2.0.0 (2025-01-26)
- ✨ **完整的用户认证系统**：集成 NextAuth.js，支持用户登录
- ✨ **后台管理功能**：用户创建、编辑、删除
- ✨ **数据库支持**：集成 Prisma + MySQL
- ✨ **用户配置持久化**：每个用户独立配置存储到数据库
- ✨ **安全加密**：使用 bcryptjs 加密密码和 API 密钥
- 🔒 **API 认证保护**：所有交易 API 需要用户认证
- 📱 **响应式改进**：完全适配桌面和移动设备
- 🎨 **UI 增强**：集成 Ant Design 美观组件
- 📝 **文档完善**：详细的部署和使用指南

### v1.0.0 (2024-01-15)
- 🎉 **初始发布**
- ✨ 市值榜单和涨幅榜单显示
- 💼 一键做多/做空功能
- 📊 实时持仓管理
- 🎨 响应式 UI 设计

---

**提示**：这是一个积极开发的项目，功能可能会不断更新和完善。使用前请仔细阅读风险提示和使用指南。

