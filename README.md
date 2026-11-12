# ContextFlow（语境流）

一个语境流背单词

基于个人词汇表的英语阅读工具。创建词汇表、导出文章生成请求、导入自行生成的多篇文章；支持 AI 词义和译文后台缓存。

`index.html` 可静态阅读；AI 缓存可使用 [Cloudflare Pages Functions + D1](cloudflare/README.md)，或 [独立 Node 后台](deploy/README.md)。纯 Cloudflare 无需单独服务器；仅静态网页不提供 AI 接口。

## 开发

使用 Node 24：在 `source/` 运行 `npm ci`、`npm run typecheck`、`npm test`、`npm run build`。构建输出上级 `ContextFlow.html`；同步到 `index.html` 和 `deploy/public/index.html` 后再部署。Windows 本机服务需额外准备 Node 运行时，Git 仓库不提交 `node.exe` 或 `node_modules`。

用户学习数据不包含在仓库中，API Key 不应提交；示例 `.env.example` 不包含有效密钥。源码 MIT，数据版权和来源见 `licenses/`。

## 模型设置（0.17.0）

常见服务商直接选择名称、填写 API Key、获取模型后选择；自定义中转接口再填写地址和协议。模型目录读取不发送推理请求。Windows 本地版支持 ChatGPT 套餐登录，授权地址失败会保留错误，登录成功后可获取套餐模型；自部署版继续使用独立会话的模型 API。

## 纯 Cloudflare 部署（0.18.0）

沿用现有 Pages 项目：根目录 `cloudflare`，构建命令 `npm run build`，输出目录 `public`；绑定 D1 数据库 `CONTEXTFLOW_DB`，添加加密 Secret `CONTEXTFLOW_MASTER_KEY`，启用 `nodejs_compat`（兼容日期 2025-09-01 或更新），然后重新部署。完整操作见 [cloudflare/README.md](cloudflare/README.md)。本方案使用 Pages Functions，无需 Node 服务器，不提供本机 GPT 套餐登录；通过 API Key 读取模型目录、查询词义并准备阅读缓存。

`/api/session` 返回 HTML 或 `Unexpected token '<'` 表示仍在使用纯静态部署。不要更换 Key 来处理这个路由错误，应检查 Functions 是否已构建和绑定。学习数据继续保存在原网址的浏览器中，更新前先导出完整备份。
