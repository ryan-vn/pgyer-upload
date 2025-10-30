# 配置说明

## 🚀 快速开始

### 1. 使用 upload_config.json (推荐)
在项目根目录创建 `upload_config.json` 文件：
```bash
# 复制示例文件
cp upload_config.example.json upload_config.json

# 编辑配置文件
{
  "pgyapikey": "your_pgyer_api_key_here",
  "filepath": "path/to/your/app.apk",
  "type": "1",
  "password": "",
  "desc": "Uploaded via pgyer-upload CLI",
  "json": false
}

# 直接运行
pgyer-upload upload
```

### 2. 交互式配置
如果没有 `upload_config.json` 文件，脚本会引导你输入配置：
```bash
pgyer-upload upload
# 脚本会提示输入 API Key、文件路径等参数
# 并询问是否保存配置到 upload_config.json
```

### 3. 项目初始化 (传统方式)
```bash
pgyer-upload upload --init
# 创建 .env 配置文件
```

## 📋 参数存储方案

### 1. upload_config.json (推荐)
在项目根目录创建 `upload_config.json` 文件：
```bash
# 复制示例文件
cp upload_config.example.json upload_config.json

# 编辑配置
{
  "pgyapikey": "your_api_key",
  "filepath": "android/app/build/outputs/apk/release/app-release.apk",
  "type": "1",
  "password": "",
  "desc": "Uploaded via pgyer-upload CLI",
  "json": false
}
```

### 2. 项目级配置 (.env)
在项目根目录创建 `.env` 文件：
```bash
# 自动生成
pgyer-upload upload --init

# 手动创建
cat > .env << EOF
PGYER_API_KEY=your_api_key
PGYER_BUILD_PATH=android/app/build/outputs/apk/release/app-release.apk
PGYER_DEFAULT_TYPE=1
PGYER_DEFAULT_PASSWORD=
PGYER_DEFAULT_DESC=Uploaded via pgyer-upload CLI
EOF
```

### 3. 环境变量
```bash
export PGYER_API_KEY=your_api_key
export PGYER_BUILD_PATH=path/to/app.apk
export PGYER_DEFAULT_TYPE=1
export PGYER_DEFAULT_PASSWORD=your_password
export PGYER_DEFAULT_DESC="默认描述"
```

### 4. 全局配置 (~/.pgyer-upload)
```bash
echo "PGYER_API_KEY=your_api_key" > ~/.pgyer-upload
```

### 5. 命令行参数
```bash
pgyer-upload upload file.apk -k your_api_key -t 1 -p password -d "描述"
```

## 📊 优先级顺序

1. **命令行参数** (最高优先级)
2. **upload_config.json**
3. **环境变量**
4. **项目配置文件** (.env)
5. **全局配置文件** (~/.pgyer-upload)

## 🔧 项目类型支持

### Android 项目
- **React Native**: `android/app/build/outputs/apk/release/app-release.apk`
- **Flutter**: `build/app/outputs/flutter-apk/app-release.apk`
- **原生 Android**: `app/build/outputs/apk/release/app-release.apk`

### iOS 项目
- **React Native**: `ios/build/Build/Products/Release-iphoneos/YourApp.ipa`
- **Flutter**: `build/ios/ipa/YourApp.ipa`
- **原生 iOS**: `build/Release-iphoneos/YourApp.ipa`

### HarmonyOS 项目
- **Flutter**: `build/hap/outputs/hap/release/app-release.hap`

## 📊 优先级顺序

1. **命令行参数** (最高优先级)
2. **环境变量**
3. **项目配置文件** (.env)
4. **全局配置文件** (~/.pgyer-upload)

## 🎯 使用示例

### 开发环境
```bash
# 1. 初始化项目配置
pgyer-upload upload --init

# 2. 编辑 .env 文件设置 API Key
# PGYER_API_KEY=your_development_key

# 3. 上传构建文件
pgyer-upload upload --auto
```

### 生产环境
```bash
# 使用环境变量
export PGYER_API_KEY=production_key
pgyer-upload upload app.apk -t 2 -p secure_password -d "生产版本"
```

### CI/CD 环境
```bash
# 在 CI 脚本中
export PGYER_API_KEY=$PGYER_API_KEY
pgyer-upload upload dist/app-release.apk -d "CI Build #$BUILD_NUMBER"
```

## 🔍 自动检测功能

脚本会自动检测以下项目类型：
- **Android**: 查找 `android/` 目录
- **iOS**: 查找 `ios/` 或 `ios.xcodeproj` 目录  
- **Flutter**: 查找 `pubspec.yaml` 文件
- **React Native**: 查找 `package.json` 中的 `react-native` 依赖

## 📁 项目结构示例

```
your-app/
├── .env                    # ✅ 项目配置文件
├── android/               # Android 项目
│   └── app/build/outputs/apk/release/app-release.apk
├── ios/                   # iOS 项目
│   └── build/Build/Products/Release-iphoneos/YourApp.ipa
├── pubspec.yaml           # Flutter 项目
└── package.json           # React Native 项目
```
