# pgyer-upload

命令行工具，用于将 iOS / Android / HarmonyOS 构建文件上传到蒲公英（PGYER），支持邮件和飞书群推送通知。

## 🚀 快速开始

### 使用 npx（推荐，无需安装）

```bash
# 基本用法
npx pgyer-upload upload app.apk -k your_api_key

# 自动检测构建文件
npx pgyer-upload upload --auto -k your_api_key
```

## 📋 安装（可选）

如果需要全局安装：

```bash
npm install -g pgyer-upload
# 或
pnpm add -g pgyer-upload
# 或
yarn global add pgyer-upload
```

安装后可直接使用：

```bash
pgyer-upload upload app.apk -k your_api_key
```

## ⚙️ 配置方式

### 方式一：配置文件（推荐）

在项目根目录创建 `upload_config.json`：

```json
{
  "pgyapikey": "your_api_key_here",
  "filepath": "build/app/outputs/flutter-apk/app-release.apk",
  "type": "1",
  "desc": "Uploaded via pgyer-upload CLI",
  "notification_channel": "feishu",
  "feishu": {
    "enabled": true,
    "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-id"
  }
}
```

然后直接运行：

```bash
npx pgyer-upload upload
```

### 方式二：交互式配置

首次运行时会引导配置：

```bash
npx pgyer-upload upload
```

按提示输入：
- PGYER API Key
- 构建文件路径
- 安装类型
- 推送通知配置（邮箱/飞书）
- 是否保存配置
- 部署环境与更新说明（若未通过命令行传入）

### 方式三：命令行参数

```bash
npx pgyer-upload upload app.apk \
  -k your_api_key \
  -t 1 \
  -p password \
  -d "版本描述"
```

也可以通过 `--env` 与 `--notes` 组合跳过环境/描述的交互输入：

```bash
npx pgyer-upload upload \
  --env uat \
  --notes "更新描述" \
  -k your_api_key \
  app.apk
```

### 方式四：环境变量

```bash
export PGYER_API_KEY=your_api_key
export PGYER_BUILD_PATH=path/to/app.apk
npx pgyer-upload upload
```

## 📋 命令行参数

| 参数 | 简写 | 说明 | 示例 |
|------|------|------|------|
| `[FILE]` | - | 构建文件路径 | `app.apk` |
| `--apiKey` | `-k` | PGYER API Key | `-k your_key` |
| `--type` | `-t` | 安装类型：1=公开，2=密码，3=邀请 | `-t 1` |
| `--password` | `-p` | 安装密码（type=2 时必需） | `-p 123456` |
| `--desc` | `-d` | 构建更新描述 | `-d "修复bug"` |
| `--env` | - | 部署环境标签（development/uat/production） | `--env uat` |
| `--notes` | - | 发布说明文本，和 `--env` 搭配可跳过交互 | `--notes "更新描述"` |
| `--json` | `-j` | 输出完整 JSON 响应 | `-j` |
| `--config` | `-c` | 指定配置文件路径 | `-c .env` |
| `--init` | `-i` | 初始化项目配置 | `-i` |
| `--auto` | `-a` | 自动检测构建文件 | `-a` |
| `--useCurl` | `-b` | 使用 curl 上传（显示进度条） | `-b` |

## 📧 邮件通知配置

在 `upload_config.json` 中配置：

```json
{
  "notification_channel": "email",
  "email": {
    "enabled": true,
    "host": "smtp.gmail.com",
    "port": 465,
    "secure": true,
    "user": "your_email@gmail.com",
    "pass": "your_app_password",
    "from": "PGYER Bot <noreply@example.com>",
    "to": ["team@example.com"],
    "cc": ["manager@example.com"],
    "subject": "新版本构建上传成功"
  }
}
```

### 邮件内容变量

在 `text` 或 `html` 字段中使用变量：

- `{{appName}}`: 应用名称
- `{{version}}`: 版本号
- `{{buildNo}}`: 构建号
- `{{env}}`: 环境（development/uat/production）
- `{{notes}}`: 更新说明
- `{{installUrl}}`: 下载链接
- `{{buildKey}}`: Build Key
- `{{qrCodeUrl}}`: 二维码图片 URL

## 📱 飞书群推送配置

### 获取 Webhook

1. 在飞书群聊中，点击右上角设置
2. 选择「群机器人」→「添加机器人」→「自定义机器人」
3. 设置机器人名称和描述
4. 复制生成的 Webhook URL

### 配置示例

```json
{
  "notification_channel": "feishu",
  "feishu": {
    "enabled": true,
    "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-id"
  }
}
```

### 推送渠道选择

`notification_channel` 可选值：
- `"email"`: 仅邮箱
- `"feishu"`: 仅飞书群
- `"both"`: 邮箱和飞书群
- `"none"` 或不设置: 不推送

## 🎯 使用示例

### 基本使用

```bash
# 使用配置文件
npx pgyer-upload upload

# 指定文件
npx pgyer-upload upload app.apk -k your_api_key

# 自动检测构建文件
npx pgyer-upload upload --auto -k your_api_key
```

### 完整配置示例

```json
{
  "pgyapikey": "your_api_key",
  "filepath": "build/app/outputs/flutter-apk/app-release.apk",
  "type": "1",
  "password": "",
  "desc": "Uploaded via pgyer-upload CLI",
  "json": false,
  "before_command": "npm run build",
  "notification_channel": "both",
  "email": {
    "enabled": true,
    "host": "smtp.example.com",
    "port": 465,
    "secure": true,
    "user": "your_email@example.com",
    "pass": "your_password",
    "from": "PGYER Bot <noreply@example.com>",
    "to": ["team@example.com"],
    "subject": "New Build Uploaded"
  },
  "feishu": {
    "enabled": true,
    "webhook": "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-id"
  }
}
```

### CI/CD 集成

```bash
# GitHub Actions 示例
- name: Upload to PGYER
  run: |
    npx pgyer-upload upload dist/app-release.apk \
      -k ${{ secrets.PGYER_API_KEY }} \
      -d "CI Build #${{ github.run_number }}"
```

### 使用 curl 上传（显示进度）

```bash
npx pgyer-upload upload app.apk -k your_api_key --useCurl
```

## 🔍 自动检测功能

工具会自动检测以下项目类型和构建文件：

- **Android**: `android/app/build/outputs/apk/release/app-release.apk`
- **Flutter**: `build/app/outputs/flutter-apk/app-release.apk`
- **iOS**: `ios/build/Build/Products/Release-iphoneos/YourApp.ipa`
- **React Native**: 自动检测项目结构

使用 `--auto` 参数启用自动检测：

```bash
npx pgyer-upload upload --auto -k your_api_key
```

## 📁 配置文件优先级

1. **命令行参数**（最高优先级）
2. **upload_config.json**
3. **环境变量**
4. **项目配置文件** (.env)
5. **全局配置文件** (~/.pgyer-upload)

## 🐛 常见问题

### 找不到构建文件

使用 `--auto` 自动检测，或检查文件路径是否正确。

### 邮件发送失败

- 检查 SMTP 配置是否正确
- Gmail 需要使用应用专用密码
- 检查防火墙和网络连接

### 飞书推送失败

- 检查 Webhook URL 是否正确
- 确保机器人未被移除
- 查看错误信息中的详细说明

### API Key 错误

- 检查 API Key 是否正确
- 使用 `-k` 参数直接指定
- 确认配置文件的优先级

## 📄 更多信息

- 详细配置说明：查看 `CONFIG.md`
- 开发调试指南：查看 `DEBUG.md`
- 配置文件示例：查看 `upload_config.example.json`

---

**Made with ❤️ by vincet**
