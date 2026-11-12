# ContextFlow 0.16.0 · 自行部署

这个目录是独立的 Node 24 / Docker 部署版，前端已经构建好，没有 npm 依赖。文章由用户自行生成再导入，服务器仅处理词义、翻译和缓存请求。不需要 GPT 登录或作者电脑开机。

## Node 运行（先本机检查）

```sh
node setup.mjs
node --env-file=.env server.mjs
```

打开 `http://localhost:8080`。初次运行会创建 `.env` 和独立加密密钥，`setup.mjs` 不覆盖已有文件。已有 Windows 整合包可用上级 `assistant/node.exe` 代替 `node`。

## Docker / 服务器上线

1. 将本 `deploy` 文件夹上传服务器。需要 Node 24，或 Docker + Compose。
2. 运行 `node setup.mjs` 创建 `.env`。若宿主机只有 Docker，可在该目录运行：

```sh
docker run --rm -v "$PWD:/app" -w /app node:24-alpine node setup.mjs
```

3. 编辑 `.env`：将 `PUBLIC_ORIGIN` 改成最终域名，例如 `https://reading.example.com`（不加尾斜线、路径或端口以外的内容）。保留随机生成的 `CONTEXTFLOW_MASTER_KEY`。启动：

```sh
docker compose up -d --build
```

容器仅绑定宿主机 `127.0.0.1:8080`。用 Caddy、Nginx 或服务器面板把 HTTPS 域名反向代理到这个地址。`Caddyfile.example` 给出了最小示例；如使用 Nginx，应关闭代理缓冲并将响应超时设为至少 240 秒，以保留流式查询。

不要只将 `public/index.html` 上传静态托管：这样能进行本机数据管理及阅读，但 `/api/*` 不存在，AI 缓存不能运行。AI 完整版需要整个 Node 服务和反向代理，不能像纯静态建筑展示页那样只上传网页。

### Cloudflare Pages 返回 `Unexpected token '<'`

纯静态 Pages 会把不存在的 `/api/session` 等路径回退到首页，HTTP 状态甚至是 200。浏览器收到 `<!doctype html>` 而不是 JSON，模型目录请求尚未到达服务商，因此更换 API Key 无效。

本目录的后台使用 Node 24、文件存储与加密会话，不能把 `server.mjs` 放进 Pages 静态目录就运行，也不是现成的 Pages Functions/Workers 项目。当前可用方法是按上面的 Node/Docker 步骤运行完整目录，再让网站域名统一反向代理到 Node 服务（包含 `/api/*`）。若要保留纯 Cloudflare 托管，需要另行适配 Functions/Workers 和持久化存储。

检查部署时访问 `/api/session`：应返回带 `token` 的 JSON 和会话 Cookie；如果仍显示网页或 HTML，应先修正后台部署。不要把含 token 的响应贴到公开位置。页面和后台应从同一版本一起更新。切换域名前，先从原网站导出完整学习备份，再在新网址导入。

## API 与数据

- 在线页面「设置 → 阅读缓存与查询」选择自定义 API，填写服务商地址、Key、协议及模型 ID。支持四种已适配的文本协议；不提供 ChatGPT 套餐 OAuth。保存配置不会自动发送测试请求。
- 每个浏览器使用自己的 HttpOnly 会话 Cookie；Key 用 AES-256-GCM 在服务器 `private-data` 加密保存，不返回明文，不进入学习备份。没有内置共享 Key，访客不会消耗作者账号。
- 词汇表、阅读文章、收藏、学习记录和已生成的阅读缓存保存在访客浏览器。不同设备不会自动同步，可通过完整备份导出/导入。迁移域名后浏览器存储也不会自动迁移。
- 服务器会话 30 天有效。清理 Cookie、使用无痕模式、到期或更换加密密钥后，可能需要重新填写 API；学习数据是否保留取决于浏览器存储。
- 务必备份 `.env` 中的加密密钥及 `private-data` 数据卷。两者均不得发布到代码仓库或静态目录；丢失密钥无法解密原凭据。
- 默认只允许常用模型服务域名。需要其他厂商时，在 `.env` 增加 `API_ALLOWED_HOSTS=域名1,域名2`；这是完整白名单替换，不填 URL、协议或路径。HTTPS、443 端口、非内网地址是部署版的要求。本机无 Key 模型请使用 Windows 本地版，不要将公开服务器代理到内网。
- 不要在公开环境设置 `CONTEXTFLOW_LOCAL_TEST`，它仅供隔离回归测试。

默认白名单包括 OpenAI、Anthropic、Google Gemini、DeepSeek、OpenRouter、OpenCode、阿里云百炼、Moonshot、SiliconFlow、MiniMax、智谱的常用 API 域名，详见 `server.mjs`。地址、模型和套餐权限仍以服务商文档为准。

## 验证与范围

本交付没有替你部署，也没有生成公共地址或二维码。已在 Node 实际运行环境中验证页面、自部署设置、四协议模拟调用、流式终态、访客隔离、加密凭据与重启恢复；Docker 配置提供待你服务器环境验证。真实模型调用需要你填入自己的有效配置。

上线后用无登录浏览器检查词汇表、五篇导入、缓存；再用目标手机网络检查访问。网站不限制访客必须安装或登录 GPT，但域名和网络能否访问需要实际验证。
