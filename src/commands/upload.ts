import { Command, Flags, Args } from "@oclif/core";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import ora from "ora";
import chalk from "chalk";
import dotenv from "dotenv";
import inquirer from "inquirer";

const API_BASE_URL = "http://api.pgyer.com/apiv2";

interface UploadConfig {
  pgyapikey: string;
  filepath: string;
  type?: string;
  password?: string;
  desc?: string;
  json?: boolean;
}

export default class Upload extends Command {
  static description = "Upload iOS / Android / HarmonyOS builds to PGYER";

  static args = {
    file: Args.string({ description: "ipa/apk/hap file path (optional if configured)" })
  };

  static flags = {
    apiKey: Flags.string({ char: "k", description: "PGYER API Key" }),
    type: Flags.string({ char: "t", description: "Install type (1=public,2=password,3=invite)" }),
    password: Flags.string({ char: "p", description: "Install password if type=2" }),
    desc: Flags.string({ char: "d", description: "Build update description" }),
    json: Flags.boolean({ char: "j", description: "Output full JSON response" }),
    config: Flags.string({ char: "c", description: "Path to config file (.env)" }),
    init: Flags.boolean({ char: "i", description: "Initialize project configuration" }),
    auto: Flags.boolean({ char: "a", description: "Auto-detect build files" })
  };

  private loadConfig(configPath?: string): void {
    const finalConfigPath = this.getConfigPath(configPath);
    
    if (fs.existsSync(finalConfigPath)) {
      dotenv.config({ path: finalConfigPath });
      this.log(chalk.gray(`📁 Loaded config from: ${finalConfigPath}`));
    }
  }

  private loadUploadConfig(): UploadConfig | null {
    const configPath = path.join(process.cwd(), 'upload_config.json');
    
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent) as UploadConfig;
        this.log(chalk.green(`📁 Loaded upload config from: ${configPath}`));
        return config;
      } catch (error) {
        this.log(chalk.red(`❌ Error reading upload_config.json: ${error}`));
        return null;
      }
    }
    
    return null;
  }

  private async promptForConfig(): Promise<UploadConfig> {
    this.log(chalk.yellow('\n📝 upload_config.json not found. Please provide configuration:\n'));
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'pgyapikey',
        message: 'PGYER API Key:',
        validate: (input: string) => input.trim() !== '' || 'API Key is required'
      },
      {
        type: 'input',
        name: 'filepath',
        message: 'Build file path (APK/IPA/HAP):',
        validate: (input: string) => {
          if (input.trim() === '') return 'File path is required';
          if (!fs.existsSync(input.trim())) return 'File does not exist';
          return true;
        }
      },
      {
        type: 'list',
        name: 'type',
        message: 'Install type:',
        choices: [
          { name: 'Public (1)', value: '1' },
          { name: 'Password (2)', value: '2' },
          { name: 'Invite (3)', value: '3' }
        ],
        default: '1'
      },
      {
        type: 'input',
        name: 'password',
        message: 'Install password (if type=2):',
        when: (answers: any) => answers.type === '2'
      },
      {
        type: 'input',
        name: 'desc',
        message: 'Build description:',
        default: 'Uploaded via pgyer-upload CLI'
      },
      {
        type: 'confirm',
        name: 'json',
        message: 'Output full JSON response?',
        default: false
      },
      {
        type: 'confirm',
        name: 'saveConfig',
        message: 'Save this configuration to upload_config.json?',
        default: true
      }
    ]);

    const config: UploadConfig = {
      pgyapikey: answers.pgyapikey,
      filepath: answers.filepath,
      type: answers.type,
      password: answers.password,
      desc: answers.desc,
      json: answers.json
    };

    if (answers.saveConfig) {
      this.saveUploadConfig(config);
    }

    return config;
  }

  private saveUploadConfig(config: UploadConfig): void {
    const configPath = path.join(process.cwd(), 'upload_config.json');
    
    try {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      this.log(chalk.green(`✅ Configuration saved to: ${configPath}`));
    } catch (error) {
      this.log(chalk.red(`❌ Error saving config: ${error}`));
    }
  }

  private getConfigPath(configPath?: string): string {
    // 1. 命令行指定的配置文件
    if (configPath) {
      return path.resolve(configPath);
    }

    // 2. 当前目录的 .env
    const currentDir = process.cwd();
    const localEnv = path.join(currentDir, '.env');
    if (fs.existsSync(localEnv)) {
      return localEnv;
    }

    // 3. 用户主目录的 .pgyer-upload
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    return path.join(homeDir, '.pgyer-upload');
  }

  private async initProjectConfig(): Promise<void> {
    const configPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(configPath)) {
      this.log(chalk.yellow(`⚠️  Configuration file already exists: ${configPath}`));
      this.log(chalk.yellow('Use --force to overwrite existing configuration.'));
      return;
    }

    // 自动检测项目类型和构建文件
    const projectInfo = await this.detectProjectType();
    
    const config = {
      '# PGYER Upload Configuration': '',
      'PGYER_API_KEY': 'your_api_key_here',
      'PGYER_BUILD_PATH': projectInfo.buildPath || 'path/to/your/build/file',
      'PGYER_DEFAULT_TYPE': '1',
      'PGYER_DEFAULT_PASSWORD': '',
      'PGYER_DEFAULT_DESC': projectInfo.description || 'Uploaded via pgyer-upload CLI',
      '': '',
      '# Project Info': `# Detected: ${projectInfo.type}`,
      '# Build path': `# ${projectInfo.buildPath || 'Not found'}`,
      '# Common paths': `# ${projectInfo.commonPaths.join(', ')}`
    };

    const configContent = Object.entries(config)
      .map(([key, value]) => {
        if (key.startsWith('#')) {
          return value ? `${key} ${value}` : key;
        }
        return value ? `${key}=${value}` : '';
      })
      .join('\n');

    fs.writeFileSync(configPath, configContent);
    
    this.log(chalk.green(`\n✅ Project configuration created: ${configPath}`));
    this.log(chalk.blue('\n📝 Next steps:'));
    this.log(chalk.gray('1. Edit .env file and set your PGYER_API_KEY'));
    this.log(chalk.gray('2. Update PGYER_BUILD_PATH if needed'));
    this.log(chalk.gray('3. Run: pgyer-upload upload'));
  }

  private async detectProjectType(): Promise<{type: string, buildPath: string | null, description: string, commonPaths: string[]}> {
    const cwd = process.cwd();
    
    // 检测项目类型
    let projectType = 'Unknown';
    let buildPath: string | null = null;
    let description = 'Uploaded via pgyer-upload CLI';
    const commonPaths: string[] = [];

    // Android 项目检测
    if (fs.existsSync(path.join(cwd, 'android'))) {
      projectType = 'Android (React Native/Flutter)';
      commonPaths.push('android/app/build/outputs/apk/release/app-release.apk');
      commonPaths.push('android/app/build/outputs/apk/debug/app-debug.apk');
      
      // 查找实际的 APK 文件
      const apkPaths = [
        'android/app/build/outputs/apk/release/app-release.apk',
        'android/app/build/outputs/apk/debug/app-debug.apk',
        'android/app/build/outputs/bundle/release/app-release.aab',
        'android/app/build/outputs/bundle/debug/app-debug.aab'
      ];
      
      for (const apkPath of apkPaths) {
        if (fs.existsSync(path.join(cwd, apkPath))) {
          buildPath = apkPath;
          break;
        }
      }
    }
    // iOS 项目检测
    else if (fs.existsSync(path.join(cwd, 'ios')) || fs.existsSync(path.join(cwd, 'ios.xcodeproj'))) {
      projectType = 'iOS (React Native/Flutter)';
      commonPaths.push('ios/build/Build/Products/Release-iphoneos/YourApp.ipa');
      commonPaths.push('ios/build/Build/Products/Debug-iphoneos/YourApp.ipa');
      
      // 查找 IPA 文件
      const ipaPaths = this.findFiles(cwd, '.ipa');
      if (ipaPaths.length > 0) {
        buildPath = path.relative(cwd, ipaPaths[0]);
      }
    }
    // Flutter 项目检测
    else if (fs.existsSync(path.join(cwd, 'pubspec.yaml'))) {
      projectType = 'Flutter';
      commonPaths.push('build/app/outputs/flutter-apk/app-release.apk');
      commonPaths.push('build/app/outputs/flutter-apk/app-debug.apk');
      commonPaths.push('build/ios/ipa/YourApp.ipa');
      
      // 查找构建文件
      const buildPaths = [
        'build/app/outputs/flutter-apk/app-release.apk',
        'build/app/outputs/flutter-apk/app-debug.apk',
        'build/ios/ipa'
      ];
      
      for (const buildPathItem of buildPaths) {
        if (fs.existsSync(path.join(cwd, buildPathItem))) {
          if (fs.statSync(path.join(cwd, buildPathItem)).isDirectory()) {
            const ipaFiles = this.findFiles(path.join(cwd, buildPathItem), '.ipa');
            if (ipaFiles.length > 0) {
              buildPath = path.relative(cwd, ipaFiles[0]);
              break;
            }
          } else {
            buildPath = buildPathItem;
            break;
          }
        }
      }
    }
    // React Native 项目检测
    else if (fs.existsSync(path.join(cwd, 'package.json'))) {
      const packageJson = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
      if (packageJson.dependencies?.['react-native']) {
        projectType = 'React Native';
        commonPaths.push('android/app/build/outputs/apk/release/app-release.apk');
        commonPaths.push('ios/build/Build/Products/Release-iphoneos/YourApp.ipa');
      }
    }
    // 通用检测
    else {
      projectType = 'Generic';
      commonPaths.push('dist/app.apk', 'build/app.apk', 'output/app.apk');
      commonPaths.push('dist/app.ipa', 'build/app.ipa', 'output/app.ipa');
    }

    return { type: projectType, buildPath, description, commonPaths };
  }

  private findFiles(dir: string, extension: string): string[] {
    const files: string[] = [];
    
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          files.push(...this.findFiles(fullPath, extension));
        } else if (item.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // 忽略权限错误等
    }
    
    return files;
  }

  private async autoDetectBuildFile(): Promise<string | null> {
    const projectInfo = await this.detectProjectType();
    
    if (projectInfo.buildPath) {
      this.log(chalk.green(`🔍 Auto-detected: ${projectInfo.buildPath}`));
      return projectInfo.buildPath;
    }
    
    // 尝试查找任何构建文件
    const buildFiles = [
      ...this.findFiles(process.cwd(), '.apk'),
      ...this.findFiles(process.cwd(), '.ipa'),
      ...this.findFiles(process.cwd(), '.hap')
    ];
    
    if (buildFiles.length > 0) {
      const relativePath = path.relative(process.cwd(), buildFiles[0]);
      this.log(chalk.green(`🔍 Auto-detected: ${relativePath}`));
      return relativePath;
    }
    
    this.log(chalk.yellow(`⚠️  No build files found in common locations`));
    this.log(chalk.gray(`Common paths: ${projectInfo.commonPaths.join(', ')}`));
    
    return null;
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Upload);

    // 处理初始化命令
    if (flags.init) {
      await this.initProjectConfig();
      return;
    }

    // 加载配置文件
    this.loadConfig(flags.config);

    // 尝试加载 upload_config.json
    let uploadConfig = this.loadUploadConfig();
    
    // 如果没有配置文件，提供交互式输入
    if (!uploadConfig) {
      uploadConfig = await this.promptForConfig();
    }

    // 获取参数（优先级：命令行 > upload_config.json > 环境变量）
    const apiKey = flags.apiKey || uploadConfig.pgyapikey || process.env.PGYER_API_KEY;
    const file = args.file || uploadConfig.filepath || (flags.auto ? await this.autoDetectBuildFile() : undefined) || process.env.PGYER_BUILD_PATH;
    const type = flags.type || uploadConfig.type || process.env.PGYER_DEFAULT_TYPE;
    const password = flags.password || uploadConfig.password || process.env.PGYER_DEFAULT_PASSWORD;
    const desc = flags.desc || uploadConfig.desc || process.env.PGYER_DEFAULT_DESC;
    const json = flags.json || uploadConfig.json || false;
    if (!apiKey) {
      this.log(chalk.red("\n❌ Missing API Key"));
      this.log(chalk.yellow("请选择以下任一方式设置 API Key:\n"));
      this.log(chalk.blue("1. 环境变量:"));
      this.log(chalk.gray("   export PGYER_API_KEY=your_api_key\n"));
      this.log(chalk.blue("2. 命令行参数:"));
      this.log(chalk.gray("   pgyer-upload upload file.apk -k your_api_key\n"));
      this.log(chalk.blue("3. upload_config.json:"));
      this.log(chalk.gray("   {\"pgyapikey\": \"your_api_key\", \"filepath\": \"app.apk\"}\n"));
      this.log(chalk.blue("4. 配置文件 (.env):"));
      this.log(chalk.gray("   echo 'PGYER_API_KEY=your_api_key' > .env\n"));
      return;
    }

    if (!file) {
      this.log(chalk.red("\n❌ No build file specified"));
      this.log(chalk.yellow("请选择以下任一方式指定文件:\n"));
      this.log(chalk.blue("1. 命令行参数:"));
      this.log(chalk.gray("   pgyer-upload upload path/to/app.apk\n"));
      this.log(chalk.blue("2. upload_config.json:"));
      this.log(chalk.gray("   {\"pgyapikey\": \"key\", \"filepath\": \"path/to/app.apk\"}\n"));
      this.log(chalk.blue("3. 自动检测:"));
      this.log(chalk.gray("   pgyer-upload upload --auto\n"));
      return;
    }

    if (!fs.existsSync(file)) {
      this.error(`File does not exist: ${file}`);
    }

    const spinner = ora("Requesting upload token...").start();

    try {
      const tokenRes = await axios.post(`${API_BASE_URL}/app/getCOSToken`, null, {
        params: {
          _api_key: apiKey,
          buildType: file.split(".").pop(),
          buildInstallType: type,
          buildPassword: password,
          buildUpdateDescription: desc
        }
      });

      const data = tokenRes.data.data;
      if (!data) throw new Error("Failed to get upload token");

      spinner.text = "Uploading file...";

      // Some PGYER responses wrap fields under data.params; support both shapes
      const params = (data as any).params ?? {};
      const cosKey = data.key ?? params.key;
      const cosSignature = data.signature ?? params.signature;
      const cosToken = data["x-cos-security-token"] ?? params["x-cos-security-token"];
      const endpoint = data.endpoint as string;

      if (!cosKey || !cosSignature || !cosToken || !endpoint) {
        throw new Error("Invalid upload token response: missing COS fields");
      }

      const form = new FormData();
      form.append("key", cosKey);
      form.append("signature", cosSignature);
      form.append("x-cos-security-token", cosToken);
      form.append("x-cos-meta-file-name", file.split("/").pop());
      form.append("file", fs.createReadStream(file));

      // 使用正确的 COS 上传方式（参考官方 Shell 脚本）
      const uploadResponse = await axios.post(endpoint, form, { 
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (status) => status === 204 || status === 200 // 接受 204 和 200 状态码
      });

      if (uploadResponse.status !== 204) {
        throw new Error(`Upload failed with status code: ${uploadResponse.status}`);
      }

      spinner.text = "Waiting for PGYER to process build...";
      let buildInfo = null;

      for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const r = await axios.get(`${API_BASE_URL}/app/buildInfo`, {
          params: { _api_key: apiKey, buildKey: cosKey }
        });
        if (r.data.code === 0) {
          buildInfo = r.data.data;
          break;
        }
      }

      spinner.stop();

      if (!buildInfo) this.error("Timeout waiting for build to finish");

      this.log(chalk.green("\n✅ Upload Successful!"));
      this.log(chalk.blue(`🔗 Install Link: https://www.pgyer.com/${buildInfo.buildShortcutUrl}\n`));

      if (json) {
        this.log(JSON.stringify(buildInfo, null, 2));
      }

    } catch (err: any) {
      spinner.fail("Upload failed");
      this.error(err.message);
    }
  }
}
