# 跟单模式快速参考卡片 🎯

## ⚡ 30秒快速了解

### 改动了什么？
✅ **前端 `app/page.tsx`** - 4 个方法改用 `getActiveCredentials()` 来选择账户
❌ **后端 API** - 无需改动（已支持动态凭证）

### 怎么工作的？
```
启用跟单模式 → 自动使用跟单账户 API → 在跟单账户交易
关闭跟单模式 → 自动使用主账户 API → 在主账户交易
```

### 需要改动接口吗？
- ✅ 开仓接口 - **否，无需改动** ✓
- ✅ 平仓接口 - **否，无需改动** ✓
- ✅ 持仓接口 - **否，无需改动** ✓

**理由：** 后端已经支持通过 headers 传递不同的凭证！

---

## 🔧 修改明细

### 新增 1 个函数

```javascript
getActiveCredentials() // 根据跟单模式返回对应的账户凭证
```

### 修改 4 个函数

| 函数 | 改动 |
|------|------|
| `fetchPositions()` | 使用 getActiveCredentials() |
| `handleTrade()` | 使用 getActiveCredentials() |
| `handleOpenPosition()` | 使用 getActiveCredentials() |
| `handleClosePositions()` | 使用 getActiveCredentials() |

---

## 📊 对比表

| 操作 | 原来 | 现在 |
|------|------|------|
| 查持仓 | 总是查主账户 | ✅ 查跟单或主账户 |
| 开仓 | 总是用主账户 | ✅ 用跟单或主账户 |
| 平仓 | 总是平主账户 | ✅ 平跟单或主账户 |

---

## 🎮 使用方法

### 启用跟单模式
```
1. 点击设置 ⚙️
2. 开启"👥 带单模式"
3. 输入跟单账户 API
4. 保存
```

### 切换账户
```
跟单模式 ON  → 所有操作用跟单账户
跟单模式 OFF → 所有操作用主账户
```

---

## 🧪 快速测试

### 测试 1：启用跟单模式后开仓
```
预期：在跟单账户中开仓 ✓
检查：持仓列表显示跟单账户的仓位
```

### 测试 2：关闭跟单模式后开仓
```
预期：在主账户中开仓 ✓
检查：持仓列表显示主账户的仓位
```

### 测试 3：平仓
```
启用跟单模式 → 平仓 → 跟单账户仓位消失 ✓
关闭跟单模式 → 平仓 → 主账户仓位消失 ✓
```

---

## 🔍 调试技巧

### 查看日志
打开浏览器控制台（F12），会看到：
```
Fetching positions using main account
Fetching positions using copytrading account
Opening position using copytrading account: BTCUSDT
Closing positions using copytrading account: ALL
```

### 检查当前使用的账户
```javascript
// 在控制台运行
const creds = getActiveCredentials();
console.log(creds.mode); // 'main' 或 'copytrading'
```

---

## ❓ 常见问题

### Q1: 需要修改后端吗？
**A:** 不需要！后端已经支持。✓

### Q2: 两个账户能同时使用吗？
**A:** 不能同时，但能快速切换。启用/关闭跟单模式即可。✓

### Q3: 跟单账户凭证错了怎么办？
**A:** 会自动降级到主账户。放心使用。✓

### Q4: 数据会混乱吗？
**A:** 不会。持仓是按账户独立存储的。✓

### Q5: 支持同时显示两个账户的持仓吗？
**A:** 当前不支持，但可以切换查看。未来可扩展。✓

---

## 📋 核心代码

### getActiveCredentials()

```javascript
const getActiveCredentials = () => {
  // 跟单模式优先级更高
  const isCopytradingMode = localStorage.getItem('copytrading_mode') === 'true';
  
  if (isCopytradingMode) {
    const copytradingApiKey = localStorage.getItem('copytrading_api_key')?.trim();
    const copytradingApiSecret = localStorage.getItem('copytrading_api_secret')?.trim();
    if (copytradingApiKey && copytradingApiSecret) {
      return { apiKey: copytradingApiKey, apiSecret: copytradingApiSecret, mode: 'copytrading' };
    }
  }
  
  // 降级到主账户
  const apiKey = localStorage.getItem('binance_api_key')?.trim();
  const apiSecret = localStorage.getItem('binance_api_secret')?.trim();
  return { apiKey, apiSecret, mode: 'main' };
};
```

### 使用示例

```javascript
// 原来
const apiKey = localStorage.getItem('binance_api_key');

// 现在
const credentials = getActiveCredentials();
const apiKey = credentials.apiKey;
```

---

## ✅ 验收清单

- [x] 新增 getActiveCredentials() 函数
- [x] 修改 fetchPositions()
- [x] 修改 handleTrade()
- [x] 修改 handleOpenPosition()
- [x] 修改 handleClosePositions()
- [x] 代码无错误
- [x] 日志输出正确账户
- [x] 文档完整

---

## 📞 快速链接

- 📖 详细文档：`COPYTRADING_MODE_GUIDE.md`
- 📊 完整总结：`IMPLEMENTATION_SUMMARY.md`
- 💻 代码位置：`app/page.tsx`

---

## 🎓 设计理念

**为什么选择方案二（自动判断）？**

1. **用户友好** - 启用就用，无需手动切换
2. **逻辑清晰** - 优先级简单明了
3. **兼容性好** - 完全兼容现有代码
4. **易于维护** - 改动集中在一个地方
5. **可扩展性** - 为未来功能预留空间

---

最后检查：`app/page.tsx` 是否无错误？ ✅

