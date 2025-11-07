# 本地调试指南

## 快速开始

### 1. 安装依赖
```bash
pnpm install
# 或
npm install
```

### 2. 开发模式运行（推荐）

直接运行 TypeScript 源码，修改代码后立即生效：

```bash
# 查看帮助
pnpm dev upload --help

# 运行上传命令（使用配置文件）
pnpm dev upload

# 运行上传命令（指定文件）
pnpm dev upload test.apk -k your_api_key

# 测试飞书推送功能
pnpm dev upload test.apk -k your_api_key
```

### 3. 编译后运行

先编译 TypeScript 代码，然后运行编译后的 JavaScript：

```bash
# 编译
pnpm build

# 运行编译后的代码
pnpm start upload --help
pnpm start upload test.apk -k your_api_key
```

### 4. 监听模式（自动编译）

在另一个终端运行，代码修改后自动重新编译：

```bash
pnpm watch
```

## 调试飞书推送功能

### 1. 准备测试配置

创建 `upload_config.json` 文件：

```json
{
  "pgyapikey": "your_api_key",
  "filepath": "test.apk",
  "type": "1",
  "desc": "测试上传",
  "notification_channel": "feishu",
  "feishu": {
    "enabled": true,
    "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-id"
  }
}
```

### 2. 测试飞书推送

```bash
# 使用开发模式运行
pnpm dev upload

# 或者直接指定文件
pnpm dev upload test.apk
```

### 3. 调试技巧

#### 添加 console.log 调试

在 `src/commands/upload.ts` 的 `sendFeishuNotification` 方法中添加日志：

```typescript
private async sendFeishuNotification(feishuCfg: UploadConfig["feishu"], buildInfo: any): Promise<void> {
  console.log('🔍 Debug: Feishu config:', feishuCfg);
  console.log('🔍 Debug: Build info:', buildInfo);
  // ... 其他代码
}
```

#### 使用 Node.js 调试器

使用 VS Code 或 Chrome DevTools 调试：

1. **VS Code 调试**：
   - 创建 `.vscode/launch.json`：
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "Debug Upload",
         "runtimeExecutable": "pnpm",
         "runtimeArgs": ["dev", "upload"],
         "skipFiles": ["<node_internals>/**"],
         "console": "integratedTerminal"
       }
     ]
   }
   ```

2. **命令行调试**：
   ```bash
   node --inspect-brk node_modules/.bin/ts-node --esm ./bin/dev.js upload
   ```
   然后在 Chrome 中打开 `chrome://inspect`

#### 测试飞书 Webhook

可以使用 curl 直接测试飞书 webhook：

```bash
curl -X POST https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-id \
  -H "Content-Type: application/json" \
  -d '{
    "msg_type": "text",
    "content": {
      "text": "测试消息"
    }
  }'
```

## 常见问题

### 1. ts-node ESM 警告

如果看到 `ts-node executable cannot transpile ESM` 警告，这是正常的，不影响功能。oclif 会自动处理。

### 2. 模块找不到错误

确保已安装所有依赖：
```bash
pnpm install
```

### 3. 配置文件路径问题

确保在项目根目录运行命令，或者使用绝对路径指定配置文件：
```bash
pnpm dev upload -c /path/to/.env
```

## 测试清单

- [ ] 测试邮箱推送
- [ ] 测试飞书推送
- [ ] 测试同时推送邮箱和飞书
- [ ] 测试不推送选项
- [ ] 测试配置文件的保存和加载
- [ ] 测试交互式配置流程

## 开发建议

1. **使用开发模式**：`pnpm dev` 是最快的开发方式
2. **使用 TypeScript 类型检查**：确保代码类型正确
3. **测试不同场景**：测试各种配置组合
4. **查看日志**：注意控制台输出的错误信息

