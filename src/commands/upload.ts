import { Command, Flags, Args } from "@oclif/core";
import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import ora from "ora";
import chalk from "chalk";
import dotenv from "dotenv";
import inquirer from "inquirer";
import nodemailer from "nodemailer";
import { execSync, spawn } from "node:child_process";

const API_BASE_URL = "http://api.pgyer.com/apiv2";

type NotificationChannel = 'email' | 'feishu' | 'both';

console.log('欢迎使用自动上传工具、推送工具')

interface UploadConfig {
  pgyapikey: string;
  filepath: string;
  type?: string;
  password?: string;
  desc?: string;
  json?: boolean;
  before_command?: string;
  last_env?: 'development' | 'uat' | 'production';
  last_notes?: string;
  notification_channel?: NotificationChannel;
  email?: {
    enabled?: boolean;
    host: string;
    port: number;
    secure?: boolean;
    user?: string;
    pass?: string;
    from: string;
    to: string | string[];
    cc?: string | string[];
    subject?: string;
    text?: string;
    html?: string;
  };
  feishu?: {
    enabled?: boolean;
    webhook: string;
  };
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
    auto: Flags.boolean({ char: "a", description: "Auto-detect build files" }),
    useCurl: Flags.boolean({ char: "b", description: "Use curl for upload with progress bar (requires curl installed)" })
  };

  private justCreatedUploadConfig: boolean = false;

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
      // Notification channel selection
      {
        type: 'list',
        name: 'notificationChannel',
        message: 'Select notification channel:',
        choices: [
          { name: 'Email only', value: 'email' },
          { name: 'Feishu group only', value: 'feishu' },
          { name: 'Both email and Feishu', value: 'both' },
          { name: 'None', value: 'none' }
        ],
        default: 'none',
      },
      // Email settings (conditional)
      {
        type: 'input',
        name: 'emailHost',
        message: 'SMTP host (e.g. smtp.example.com):',
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
        validate: (v:string) => v ? true : 'Required',
      },
      {
        type: 'number',
        name: 'emailPort',
        message: 'SMTP port (e.g. 465):',
        default: 465,
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
      },
      {
        type: 'confirm',
        name: 'emailSecure',
        message: 'Use TLS (secure)?',
        default: true,
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
      },
      {
        type: 'input',
        name: 'emailUser',
        message: 'SMTP user (leave empty if not required):',
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
      },
      {
        type: 'password',
        name: 'emailPass',
        message: 'SMTP password (leave empty if not required):',
        mask: '*',
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
      },
      {
        type: 'input',
        name: 'emailFrom',
        message: 'From (e.g. PGYER Bot <no-reply@example.com>):',
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
        validate: (v:string) => v ? true : 'Required',
      },
      {
        type: 'input',
        name: 'emailTo',
        message: 'To (comma separated emails):',
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
        validate: (v:string) => v ? true : 'Required',
      },
      {
        type: 'input',
        name: 'emailCc',
        message: 'CC (optional, comma separated):',
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
      },
      {
        type: 'input',
        name: 'emailSubject',
        message: 'Email subject (optional):',
        default: 'New Build Uploaded',
        when: (a:any) => a.notificationChannel === 'email' || a.notificationChannel === 'both',
      },
      // Feishu settings (conditional)
      {
        type: 'input',
        name: 'feishuWebhook',
        message: 'Feishu webhook URL:',
        when: (a:any) => a.notificationChannel === 'feishu' || a.notificationChannel === 'both',
        validate: (v:string) => {
          if (!v || v.trim() === '') return 'Webhook URL is required';
          try {
            new URL(v);
            return true;
          } catch {
            return 'Invalid webhook URL';
          }
        },
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

    const notificationChannel = answers.notificationChannel === 'none' ? undefined : answers.notificationChannel as NotificationChannel;
    
    const config: UploadConfig = {
      pgyapikey: answers.pgyapikey,
      filepath: answers.filepath,
      type: answers.type,
      password: answers.password,
      desc: answers.desc,
      json: answers.json,
      notification_channel: notificationChannel,
      email: (notificationChannel === 'email' || notificationChannel === 'both')
        ? {
            enabled: true,
            host: answers.emailHost,
            port: Number(answers.emailPort) || 465,
            secure: Boolean(answers.emailSecure),
            user: answers.emailUser || undefined,
            pass: answers.emailPass || undefined,
            from: answers.emailFrom,
            to: String(answers.emailTo)
              .split(',')
              .map((s:string)=>s.trim())
              .filter(Boolean),
            cc: answers.emailCc
              ? String(answers.emailCc)
                  .split(',')
                  .map((s:string)=>s.trim())
                  .filter(Boolean)
              : undefined,
            subject: answers.emailSubject,
          }
        : undefined,
      feishu: (notificationChannel === 'feishu' || notificationChannel === 'both')
        ? {
            enabled: true,
            webhook: answers.feishuWebhook,
          }
        : undefined,
    };

    if (answers.saveConfig) {
      this.saveUploadConfig(config);
    }

    return config;
  }

  private saveUploadConfig(config: UploadConfig): void {
    const configPath = path.join(process.cwd(), 'upload_config.json');
    
    try {
      const existed = fs.existsSync(configPath);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      this.log(chalk.green(`✅ Configuration saved to: ${configPath}`));
      // ensure .gitignore ignores upload_config.json
      this.ensureGitignoreForUploadConfig();
      if (!existed) {
        this.justCreatedUploadConfig = true;
      }
    } catch (error) {
      this.log(chalk.red(`❌ Error saving config: ${error}`));
    }
  }

  private clearLastEnvAndNotes(): void {
    const configPath = path.join(process.cwd(), 'upload_config.json');
    if (!fs.existsSync(configPath)) return;
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as UploadConfig;
      delete config.last_env;
      delete config.last_notes;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      this.log(chalk.gray('🧹 Cleared last environment and notes from config'));
    } catch (error) {
      // 不影响主流程
    }
  }

  private saveLastEnvAndNotes(env?: string, notes?: string): void {
    const configPath = path.join(process.cwd(), 'upload_config.json');
    if (!fs.existsSync(configPath)) return;
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as UploadConfig;
      if (env) config.last_env = env as any;
      if (notes) config.last_notes = notes;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      // 不影响主流程
    }
  }

  private async sendEmailNotification(emailCfg: UploadConfig["email"], buildInfo: any): Promise<void> {
    if (!emailCfg || emailCfg.enabled === false) return;

    const transporter = nodemailer.createTransport({
      host: emailCfg.host,
      port: emailCfg.port,
      secure: Boolean(emailCfg.secure),
      auth: emailCfg.user && emailCfg.pass ? { user: emailCfg.user, pass: emailCfg.pass } : undefined,
    } as any);

    const toList = Array.isArray(emailCfg.to) ? emailCfg.to.join(",") : emailCfg.to;
    const ccList = emailCfg.cc ? (Array.isArray(emailCfg.cc) ? emailCfg.cc.join(",") : emailCfg.cc) : undefined;

    const subject = emailCfg.subject || `PGYER Upload: ${buildInfo?.buildName || "Build"}`;
    const installUrl = buildInfo?.buildShortcutUrl ? `https://www.pgyer.com/${buildInfo.buildShortcutUrl}` : "";
    const buildKey = buildInfo?.buildKey || "";
    const buildKeyOnly = typeof buildKey === 'string' ? buildKey.replace(/\.[^.]+$/, '') : '';
    const qrCodeUrl = buildKeyOnly ? `https://www.pgyer.com/app/qrcode/${buildKeyOnly}` : "";
    const envLabel = buildInfo?.__env as string | undefined;
    const notes = buildInfo?.__notes as string | undefined;

    const defaultText = `Upload Successful\n\nApp: ${buildInfo?.buildName || "-"}\nVersion: ${buildInfo?.buildVersion || "-"} (${buildInfo?.buildVersionNo || "-"})\nEnvironment: ${envLabel || '-'}\nNotes: ${notes || '-'}\nInstall: ${installUrl}\nBuild Key: ${buildKey || '-'}`;

    const variables = {installUrl, buildKey, qrCodeUrl, env: envLabel || '', notes: notes || '', desc: buildInfo?.__desc || '', appName: buildInfo?.buildName || '-', version: buildInfo?.buildVersion || '-', buildNo: buildInfo?.buildVersionNo || '-' } as Record<string,string>;
    const text = emailCfg.text ? this.interpolate(emailCfg.text, variables) : defaultText;
    const html = emailCfg.html 
      ? this.interpolate(emailCfg.html, variables)
      : `<p>App: <b>${buildInfo?.buildName || "-"}</b></p>
         <p>Version: ${buildInfo?.buildVersion || "-"} (${buildInfo?.buildVersionNo || "-"})</p>
         ${envLabel ? `<p>Environment: ${envLabel}</p>` : ''}
         ${notes ? `<p>Notes: ${notes}</p>` : ''}
         <p>Install: <a href="${installUrl}">${installUrl}</a></p>
         ${buildKey ? `<p>Build Key: ${buildKey}</p>` : ''}
         ${qrCodeUrl ? `<p><strong>扫码下载:</strong><br/><img src="${qrCodeUrl}" alt="QR Code" style="width:200px;height:200px;"/></p>` : ''}`;

    await transporter.sendMail({
      from: emailCfg.from,
      to: toList,
      cc: ccList,
      subject,
      text,
      html,
    });

    this.log(chalk.green("📧 Email notification sent"));
  }

  private interpolate(template: string, vars: Record<string,string>): string {
    return Object.entries(vars).reduce((acc,[k,v])=>acc.replace(new RegExp(`\\{\\{${k}\\}\\}`,'g'), v || ''), template);
  }

  private async sendFeishuNotification(feishuCfg: UploadConfig["feishu"], buildInfo: any): Promise<void> {
    if (!feishuCfg || feishuCfg.enabled === false || !feishuCfg.webhook) return;

    const installUrl = buildInfo?.buildShortcutUrl ? `https://www.pgyer.com/${buildInfo.buildShortcutUrl}` : "";
    const buildKey = buildInfo?.buildKey || "";
    const buildKeyOnly = typeof buildKey === 'string' ? buildKey.replace(/\.[^.]+$/, '') : '';
    const qrCodeUrl = buildKeyOnly ? `https://www.pgyer.com/app/qrcode/${buildKeyOnly}` : "";
    const envLabel = buildInfo?.__env as string | undefined;
    const notes = buildInfo?.__notes as string | undefined;

    // 构建消息内容
    const title = `📦 新版本构建上传成功`;
    
    // 构建文本内容
    const textLines = [
      `应用名称: ${buildInfo?.buildName || "-"}`,
      `版本号: ${buildInfo?.buildVersion || "-"} (${buildInfo?.buildVersionNo || "-"})`,
      ...(envLabel ? [`环境: ${envLabel}`] : []),
      ...(notes ? [`更新说明: ${notes}`] : []),
      `下载链接: ${installUrl}`,
      ...(buildKey ? [`Build Key: ${buildKey}`] : []),
      ...(qrCodeUrl ? [`扫码下载二维码: ${qrCodeUrl}`] : []),
    ];
    const textContent = textLines.join('\n');

    // 使用 post 格式发送消息（更美观）
    const postPayload = {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: title,
            content: [
              [
                {
                  tag: 'text',
                  text: textContent,
                },
              ],
            ],
          },
        },
      },
    };

    try {
      const postResponse = await axios.post(feishuCfg.webhook, postPayload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (postResponse.data.code === 0) {
        this.log(chalk.green("📱 Feishu notification sent"));
      } else {
        // 如果 post 格式失败，尝试使用文本格式
        throw new Error(postResponse.data.msg || 'Failed to send Feishu notification');
      }
    } catch (error: any) {
      // 如果 post 格式失败，尝试使用文本格式
      const textPayload = {
        msg_type: 'text',
        content: {
          text: `${title}\n\n${textContent}`,
        },
      };

      try {
        const textResponse = await axios.post(feishuCfg.webhook, textPayload, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (textResponse.data.code === 0) {
          this.log(chalk.green("📱 Feishu notification sent (text format)"));
        } else {
          throw new Error(textResponse.data.msg || 'Failed to send Feishu notification');
        }
      } catch (textError: any) {
        throw new Error(`Feishu notification failed: ${textError.response?.data?.msg || textError.message || textError}`);
      }
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
    // 检测一次项目信息，供 .env 及 email 默认值使用
    const projectInfo = await this.detectProjectType();
    const envExists = fs.existsSync(configPath);
    if (envExists) {
      this.log(chalk.yellow(`⚠️  Configuration file already exists: ${configPath}`));
      this.log(chalk.gray('Skipping .env creation and continuing to optional email setup...'));
    } else {
      // 写入 .env
      
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

    // Optional: initialize upload_config.json with email settings
    const { setupEmail } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupEmail',
        message: 'Do you want to configure email notifications now?',
        default: false,
      },
    ]);

    if (setupEmail) {
      const emailAnswers = await inquirer.prompt([
        { type: 'input', name: 'host', message: 'SMTP host (e.g. smtp.example.com):', validate: (v:string)=>v?true:'Required' },
        { type: 'number', name: 'port', message: 'SMTP port (e.g. 465):', default: 465 },
        { type: 'confirm', name: 'secure', message: 'Use TLS (secure)?', default: true },
        { type: 'input', name: 'user', message: 'SMTP user (leave empty if not required):' },
        { type: 'password', name: 'pass', message: 'SMTP password (leave empty if not required):', mask: '*' },
        { type: 'input', name: 'from', message: 'From (e.g. PGYER Bot <no-reply@example.com>):', validate: (v:string)=>v?true:'Required' },
        { type: 'input', name: 'to', message: 'To (comma separated emails):', validate: (v:string)=>v?true:'Required' },
        { type: 'input', name: 'cc', message: 'CC (optional, comma separated):' },
        { type: 'input', name: 'subject', message: 'Subject (optional):', default: 'New Build Uploaded' },
      ]);

      const uploadJsonPath = path.join(process.cwd(), 'upload_config.json');
      const uploadJson = {
        pgyapikey: 'your_api_key_here',
        filepath: projectInfo.buildPath || 'path/to/your/build/file',
        type: '1',
        password: '',
        desc: 'Uploaded via pgyer-upload CLI',
        json: false,
        email: {
          enabled: true,
          host: emailAnswers.host,
          port: Number(emailAnswers.port) || 465,
          secure: Boolean(emailAnswers.secure),
          user: emailAnswers.user || undefined,
          pass: emailAnswers.pass || undefined,
          from: emailAnswers.from,
          to: (emailAnswers.to as string).split(',').map(s=>s.trim()).filter(Boolean),
          cc: (emailAnswers.cc as string)?.split(',').map(s=>s.trim()).filter(Boolean) || undefined,
          subject: emailAnswers.subject,
        },
      };

      fs.writeFileSync(uploadJsonPath, JSON.stringify(uploadJson, null, 2));
      this.log(chalk.green(`✅ Email config created: ${uploadJsonPath}`));
      // ensure .gitignore ignores upload_config.json
      this.ensureGitignoreForUploadConfig();
      this.justCreatedUploadConfig = true;
      this.log(chalk.blue('\nℹ️  初始化配置文件已创建。'));
      this.log(chalk.gray('接下来请再次运行上传命令以执行上传，例如:'));
      this.log(chalk.gray('  pgyer-upload upload'));
    }
  }

  private ensureGitignoreForUploadConfig(): void {
    try {
      const cwd = process.cwd();
      const giPath = path.join(cwd, '.gitignore');
      const ignoreEntry = 'upload_config.json';

      if (!fs.existsSync(giPath)) {
        fs.writeFileSync(giPath, `# pgyer-upload
${ignoreEntry}\n`);
        this.log(chalk.gray(`🛡️  Created .gitignore with ${ignoreEntry}`));
        return;
      }

      const content = fs.readFileSync(giPath, 'utf8');
      // quick check for existing entry (exact match in any line)
      const lines = content.split(/\r?\n/);
      const has = lines.some(l => l.trim() === ignoreEntry);
      if (has) return;

      const needsNewline = content.length > 0 && !content.endsWith('\n');
      const updated = needsNewline ? `${content}\n${ignoreEntry}\n` : `${content}${ignoreEntry}\n`;
      fs.writeFileSync(giPath, updated);
      this.log(chalk.gray(`🛡️  Added ${ignoreEntry} to .gitignore`));
    } catch (e) {
      // Do not fail the command if .gitignore cannot be updated
      this.log(chalk.yellow(`⚠️  Could not update .gitignore: ${e}`));
    }
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

  /**
   * Check if curl is available on the system
   * @returns Promise that resolves to true if curl is available
   */
  private checkCurlAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const curl = spawn('curl', ['--version'], {
        stdio: 'ignore'
      });

      curl.on('close', (code) => {
        resolve(code === 0);
      });

      curl.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * Upload file using curl command with progress bar
   * @param endpoint - Upload endpoint URL
   * @param cosKey - COS key
   * @param cosSignature - COS signature
   * @param cosToken - COS security token
   * @param filePath - Path to file to upload
   * @returns Promise that resolves when upload completes
   */
  private uploadWithCurl(
    endpoint: string,
    cosKey: string,
    cosSignature: string,
    cosToken: string,
    filePath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const fileName = path.basename(filePath);
      const absoluteFilePath = path.resolve(filePath);

      // Build curl arguments similar to the bash script
      const curlArgs = [
        '-o', '/dev/null',           // Don't output response body
        '-w', '%{http_code}',        // Output HTTP status code
        '--progress-bar',            // Show progress bar
        '--form-string', `key=${cosKey}`,
        '--form-string', `signature=${cosSignature}`,
        '--form-string', `x-cos-security-token=${cosToken}`,
        '--form-string', `x-cos-meta-file-name=${fileName}`,
        '-F', `file=@${absoluteFilePath}`,
        endpoint
      ];

      this.log(chalk.blue(`📤 Uploading ${fileName} with curl...`));

      const curl = spawn('curl', curlArgs, {
        stdio: ['inherit', 'pipe', 'inherit'] // stdin: inherit, stdout: pipe (capture status), stderr: inherit (show progress)
      });

      let statusCode = '';

      curl.stdout.on('data', (data) => {
        statusCode += data.toString();
      });

      curl.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`curl process exited with code ${code}`));
          return;
        }

        const httpStatus = parseInt(statusCode.trim(), 10);
        if (httpStatus === 204 || httpStatus === 200) {
          this.log(chalk.green('\n✅ Upload complete!\n'));
          resolve();
        } else {
          reject(new Error(`Upload failed with HTTP status code: ${httpStatus}`));
        }
      });

      curl.on('error', (err) => {
        reject(new Error(`Failed to start curl: ${err.message}. Make sure curl is installed.`));
      });
    });
  }

  /**
   * Upload file using axios (fallback when curl is not available)
   * @param endpoint - Upload endpoint URL
   * @param cosKey - COS key
   * @param cosSignature - COS signature
   * @param cosToken - COS security token
   * @param filePath - Path to file to upload
   * @returns Promise that resolves when upload completes
   */
  private async uploadWithAxios(
    endpoint: string,
    cosKey: string,
    cosSignature: string,
    cosToken: string,
    filePath: string
  ): Promise<void> {
    const form = new FormData();
    form.append("key", cosKey);
    form.append("signature", cosSignature);
    form.append("x-cos-security-token", cosToken);
    form.append("x-cos-meta-file-name", path.basename(filePath));
    form.append("file", fs.createReadStream(filePath));

    const fileStats = fs.statSync(filePath);
    const totalSize = fileStats.size;
    this.log(chalk.blue(`📤 Uploading ${path.basename(filePath)} (${(totalSize / 1024 / 1024).toFixed(2)} MB)...`));

    const uploadResponse = await axios.post(endpoint, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (status) => status === 204 || status === 200
    });

    if (uploadResponse.status !== 204) {
      throw new Error(`Upload failed with status code: ${uploadResponse.status}`);
    }

    this.log(chalk.green('✅ Upload complete!\n'));
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
      if (this.justCreatedUploadConfig) {
        this.log(chalk.blue('\nℹ️  初始化配置文件已创建。'));
        this.log(chalk.gray('接下来请再次运行上传命令以执行上传，例如:'));
        this.log(chalk.gray('  pgyer-upload upload'));
        return;
      }
    }

    const hasUploadConfig = fs.existsSync(path.join(process.cwd(), 'upload_config.json'));

    let envLabel: 'development' | 'uat' | 'production' | undefined;
    let notes: string | undefined;
    let descFromPrompt: string | undefined;

    // always prompt if config exists and no --desc provided
    if (hasUploadConfig && !flags.desc) {
      const ans = await inquirer.prompt([
        {
          type: 'list',
          name: 'env',
          message: 'Select deployment environment:',
          choices: [
            {name: 'development', value: 'development'},
            {name: 'uat', value: 'uat'},
            {name: 'production', value: 'production'},
          ],
          default: uploadConfig.last_env || 'development',
        },
        {
          type: 'input',
          name: 'notes',
          message: 'Release notes / description:',
          default: uploadConfig.last_notes || '',
          validate: (v:string)=> v && v.trim().length>0 ? true : 'Please enter a description',
        },
      ]);
      envLabel = ans.env;
      notes = ans.notes;
      descFromPrompt = `[${envLabel}] ${notes}`;
    }

    // 获取参数（优先级：命令行 > upload_config.json > 环境变量）
    const apiKey = flags.apiKey || uploadConfig.pgyapikey || process.env.PGYER_API_KEY;
    const file = args.file || uploadConfig.filepath || (flags.auto ? await this.autoDetectBuildFile() : undefined) || process.env.PGYER_BUILD_PATH;
    const type = flags.type || uploadConfig.type || process.env.PGYER_DEFAULT_TYPE;
    const password = flags.password || uploadConfig.password || process.env.PGYER_DEFAULT_PASSWORD;
    let desc = descFromPrompt || flags.desc || uploadConfig.desc || process.env.PGYER_DEFAULT_DESC;

    // Prompt for environment and description when not provided via flags/config
    if (!desc) {
      const ans = await inquirer.prompt([
        {
          type: 'list',
          name: 'env',
          message: 'Select deployment environment:',
          choices: [
            {name: 'development', value: 'development'},
            {name: 'uat', value: 'uat'},
            {name: 'production', value: 'production'},
          ],
          default: 'development',
        },
        {
          type: 'input',
          name: 'notes',
          message: 'Release notes / description:',
          validate: (v:string)=> v && v.trim().length>0 ? true : 'Please enter a description',
        },
      ]);
      envLabel = ans.env;
      notes = ans.notes;
      desc = `[${envLabel}] ${notes}`;
    }
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

    // Execute before_command if configured
    if (uploadConfig.before_command) {
      this.log(chalk.blue(`\n🔧 Executing before_command: ${uploadConfig.before_command}`));
      try {
        execSync(uploadConfig.before_command, { stdio: 'inherit', cwd: process.cwd() });
        this.log(chalk.green('✅ before_command executed successfully\n'));
      } catch (error: any) {
        this.log(chalk.red(`\n❌ before_command failed: ${error.message || error}`));
        // Save current env/notes for next run
        this.saveLastEnvAndNotes(envLabel, notes);
        this.log(chalk.yellow('💾 Saved environment and notes for next run'));
        return;
      }
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

      spinner.stop();

      // Some PGYER responses wrap fields under data.params; support both shapes
      const params = (data as any).params ?? {};
      const cosKey = data.key ?? params.key;
      const cosSignature = data.signature ?? params.signature;
      const cosToken = data["x-cos-security-token"] ?? params["x-cos-security-token"];
      const endpoint = data.endpoint as string;

      if (!cosKey || !cosSignature || !cosToken || !endpoint) {
        throw new Error("Invalid upload token response: missing COS fields");
      }

      // 默认使用 curl 上传（带进度条），如果 curl 不可用则降级到 axios
      const curlAvailable = await this.checkCurlAvailable();
      
      if (curlAvailable) {
        // 使用 curl 上传（带进度条）
        await this.uploadWithCurl(endpoint, cosKey, cosSignature, cosToken, file);
      } else {
        // curl 不可用，降级到 axios
        this.log(chalk.yellow('⚠️  curl not available, using fallback upload method (no progress bar)'));
        await this.uploadWithAxios(endpoint, cosKey, cosSignature, cosToken, file);
      }
      const spinner2 = ora("Waiting for PGYER to process build...").start();
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

      spinner2.stop();

      if (!buildInfo) this.error("Timeout waiting for build to finish");

      const buildKey = buildInfo?.buildKey || cosKey;
      const installLink = `https://www.pgyer.com/${buildInfo.buildShortcutUrl}`;
      const qrCodeUrl = buildKey ? `https://www.pgyer.com/app/qrcode/${buildKey.replace(/\.[^.]+$/, '')}` : '';

      this.log(chalk.green("\n✅ Upload Successful!"));
      this.log(chalk.blue(`🔗 Install Link: ${installLink}`));
      if (envLabel) this.log(chalk.cyan(`🌎 Environment: ${envLabel}`));
      if (notes) this.log(chalk.cyan(`📝 Notes: ${notes}`));
      if (buildKey) this.log(chalk.gray(`📦 Build Key: ${buildKey}`));
      if (qrCodeUrl) this.log(chalk.blue(`📷 QR Code URL: ${qrCodeUrl}`));
      this.log("");

      if (json) {
        this.log(JSON.stringify(buildInfo, null, 2));
      }

      // Send notifications based on configured channel
      const notificationChannel = uploadConfig.notification_channel || 
        (uploadConfig.email?.enabled ? 'email' : undefined) ||
        (uploadConfig.feishu?.enabled ? 'feishu' : undefined);

      const buildInfoWithMeta = {...buildInfo, buildKey, __env: envLabel, __notes: notes, __desc: desc};

      if (notificationChannel === 'email' || notificationChannel === 'both') {
        if (uploadConfig.email?.enabled) {
          try {
            await this.sendEmailNotification(uploadConfig.email, buildInfoWithMeta);
          } catch (e: any) {
            this.log(chalk.yellow(`⚠️ Email send failed: ${e.message || e}`));
          }
        }
      }

      if (notificationChannel === 'feishu' || notificationChannel === 'both') {
        if (uploadConfig.feishu?.enabled) {
          try {
            await this.sendFeishuNotification(uploadConfig.feishu, buildInfoWithMeta);
          } catch (e: any) {
            this.log(chalk.yellow(`⚠️ Feishu notification failed: ${e.message || e}`));
          }
        }
      }

      // Clear last_env and last_notes after successful upload
      this.clearLastEnvAndNotes();

    } catch (err: any) {
      spinner.fail("Upload failed");
      // Save current env/notes for next run if upload failed
      this.saveLastEnvAndNotes(envLabel, notes);
      this.log(chalk.yellow('💾 Saved environment and notes for next run'));
      this.error(err.message);
    }
  }
}
