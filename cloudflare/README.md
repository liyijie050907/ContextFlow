# ContextFlow · 纯 Cloudflare 托管

网页由 Pages 托管，`/api/*` 由 Pages Functions 执行，API 配置在 D1 加密保存。无需购买或运行 Node 服务器，不依赖作者电脑。复用已有模型协议、阅读缓存校验、导入文章和浏览器学习数据库。

## 最简单的方法（Windows）

1. 下载新版整合包，**完整解压**。
2. 双击根目录的 **`一键更新网站.cmd`**。
3. 首次运行在自动打开的 Cloudflare 网页登录并允许授权，然后等窗口显示“更新成功”。打开原网站，按 **Ctrl+F5** 刷新。

脚本会自动准备工具、找到 `contextflow-bgk`、沿用或创建数据库、沿用或生成加密密钥、启用后台并上传到原网址；Git 关联项目也会自动修正后续构建设置。不需要手动填 D1、Secret、兼容标志或构建目录。没有 Node.js 时从官方 nodejs.org 下载便携版并校验 SHA-256，不修改系统安装。

只对现有 `contextflow-bgk` 项目操作；找不到或多个账户重名时停止，不创建别的网站。不会删除学习数据、数据库、域名或已有密钥。重复运行可重试失败步骤；第一次生成的加密密钥在 `cloudflare/.deploy-private` 保留本机备份，**不要上传或分享此文件夹**。Cloudflare 登录由官方 Wrangler 处理，脚本不显示或保存 Cloudflare 访问令牌。完整整合包约 3 MB；首次运行需要联网下载官方工具。更新前建议从网站导出一次完整学习备份。

更新后只提供模型 API Key 接入，不再弹出 GPT 套餐登录。你仍需在网站中填写自己的模型 API Key。下载和解压本身不会修改线上网站；运行一键更新脚本后会上传并检查后台是否就绪。

## 手动配置（仅排查时使用）

### 更新现有 contextflow-bgk.pages.dev

保持原 Pages 项目、网址及自定义域名，可保留该网址下的浏览器学习数据。操作前仍建议在设置导出完整备份。不要新建网址来替代旧网址。

1. 在 Cloudflare **存储与数据库 → D1** 创建数据库，例如 `contextflow-settings`。表结构由程序第一次访问时自动创建，无需手动执行 SQL。
2. 在原 Pages 项目 **设置 → 绑定 → 添加 → D1 数据库**：变量名填写 **`CONTEXTFLOW_DB`**，选择上一步数据库。
3. 在项目 **设置 → 变量和机密** 添加 **Secret `CONTEXTFLOW_MASTER_KEY`**，内容为随机的 64 位十六进制字符串。在自己的终端运行以下命令生成，再复制到 Cloudflare（不要提交到 GitHub，也不要发给别人）：

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   保留并备份此 Secret；后续更新不要重新生成。它用于加密 API Key。丢失后须重新填写 API 配置。各浏览器配置由独立 HttpOnly Cookie 隔离，Cookie 有效期 30 天。

4. 在 Pages 项目 **设置 → 构建与部署** 填写：

   | 设置 | 值 |
   | --- | --- |
   | 框架预设 | 无 / None |
   | 根目录 Root directory | `cloudflare` |
   | 构建命令 Build command | `npm run build` |
   | 构建输出目录 Build output directory | `public` |
   | 生产分支 | `main` |

5. 在项目 **设置 → 运行时 → 兼容性标志** 添加 **`nodejs_compat`**，兼容日期设为 **`2025-09-01` 或更新**。这里需要 Node 兼容 API；不需要 Node 服务器。
6. 保存后在 **部署** 页面重试最新提交的构建。预览环境若也要使用 AI，单独绑定预览数据库和 Secret，避免与生产配置混用。

使用 GitHub 关联的 Pages 构建，或下面的 Wrangler 命令；不要只把 `index.html` 拖到静态上传界面。构建日志中应出现 Functions 编译。Cloudflare 控制台拖放上传不支持此 Functions 目录。

## 上线检查与使用

- 打开 `https://你的原网址/api/health`：应返回 `runtime: "cloudflare-pages"`、`ready: true`。若 `ready: false`，先检查 D1 和 Secret 绑定并重新部署。
- 打开 `/api/session` 应返回 JSON，不能显示网站首页。不要分享其中的 token。
- 强制刷新网站；进入「阅读缓存与查询」应只显示「模型 API」，不再出现 GPT 登录弹窗。
- 选择 OpenCode Go 等服务商，填写自己的 API Key，获取模型并选择，再保存。获取列表不产生推理请求；测试连接和后台缓存会调用所选模型。
- 继续原有词汇表 → 导出生成请求 → 导入多篇文章流程；AI 只处理词义、句子/段落译文和精准解释。缓存和学习内容继续保存在浏览器，切换页面不会取消后台缓存，关闭整个网站后任务不再运行。

GPT/ChatGPT 套餐登录依赖本机授权服务，Cloudflare 版不提供该入口；套餐订阅与独立 API Key 不是同一种接入方式。现有本机版登录仍保留。

默认允许常见服务商的 HTTPS 域名。其他公网接口可由部署者设置 `API_ALLOWED_HOSTS`（逗号分隔域名，完整替换默认名单，详见 `runtime.mjs`）。不允许代理 localhost、IP 或内网域名；请求不跟随重定向。不要配置全站共享服务商 Key。

D1 只保存加密 API 配置、模型选择及过期时间，不保存学习文章、词汇或查询正文。会话读取使用主库，保存后可立即查询；后台缓存结果按现有逻辑存入浏览器。Functions/D1 的额度及模型费用以各自账户为准。

## 本地 Cloudflare 运行时验证（不部署）

在本目录运行 `npm ci`、`npm run build`，把 `.dev.vars.example` 复制成 `.dev.vars`，填入自己生成的本地测试密钥，再运行 `npm run dev`。访问 `http://localhost:8788`。Wrangler 使用本地 D1 模拟器，不访问生产数据库。`.dev.vars`、本地数据库、API Key 及 `node_modules` 不得打包上传。

## Wrangler 手动上传（可选）

若原项目是 Direct Upload、不能关联 GitHub，可在本目录运行 `npx wrangler login`、`npm run build`、`npx wrangler pages deploy public --project-name=contextflow-bgk`。它会同时编译当前目录的 `functions/`。生产 D1、Secret、兼容性标志仍按上述步骤在控制台配置。请仅在确认目标项目名称后自行执行。

官方说明：[Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/)、[D1 绑定](https://developers.cloudflare.com/pages/functions/bindings/#d1-databases)、[Node 兼容](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)。

## 0.18.2 查询更新

详细解释采用流式连接，显示接收进度；只有完整且通过字段校验的解释和例句才会缓存。短暂的 HTTP 502/503/504 不再被误判为未部署后台，保留简明词义并允许重试。云端版继续使用 API Key，不额外安装本机连接程序。

一键更新会自动修正 Cloudflare 控制台导出的空 placement 配置，沿用已启用的智能放置设置。
