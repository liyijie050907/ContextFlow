# ContextFlow（语境流）

一个语境流背单词

基于个人词汇表的英语阅读工具。创建词汇表、导出文章生成请求、导入自行生成的多篇文章；支持 AI 词义和译文后台缓存。

`index.html` 可静态阅读；AI 缓存可使用 [Cloudflare Pages Functions + D1](cloudflare/README.md)，或 [独立 Node 后台](deploy/README.md)。纯 Cloudflare 无需单独服务器；仅静态网页不提供 AI 接口。

## 开发

使用 Node 24：在 `source/` 运行 `npm ci`、`npm run typecheck`、`npm test`、`npm run build`。构建输出上级 `ContextFlow.html`；同步到 `index.html` 和 `deploy/public/index.html` 后再部署。Windows 本机服务需额外准备 Node 运行时，Git 仓库不提交 `node.exe` 或 `node_modules`。

用户学习数据不包含在仓库中，API Key 不应提交；示例 `.env.example` 不包含有效密钥。源码 MIT，数据版权和来源见 `licenses/`。

## 模型设置（0.17.0）

常见服务商直接选择名称、填写 API Key、获取模型后选择；自定义中转接口再填写地址和协议。模型目录读取不发送推理请求。Windows 本地版支持 ChatGPT 套餐登录，授权地址失败会保留错误，登录成功后可获取套餐模型；自部署版继续使用独立会话的模型 API。

## 一键更新 Cloudflare（Windows）

下载整合包并完整解压，双击根目录 `一键更新网站.cmd`，在自动打开的 Cloudflare 网页登录并允许授权，等待“更新成功”。脚本会识别原网址 `contextflow-bgk.pages.dev`，自动配置数据库、保留或生成加密密钥、编译后台并上传；无需手动填 D1、Secret、兼容标志或构建目录。原学习数据不变。后续重复运行同一脚本即可更新。

没有 Node.js 时从官方 nodejs.org 下载并校验便携版；首次运行需要联网准备官方工具。脚本不自动处理 Cloudflare 登录授权，也不显示 Cloudflare 访问令牌。配置备份在 `cloudflare/.deploy-private`，不要分享或提交。只对原网址对应项目操作，找不到时停止，不创建别的网站。

详细排查和其他平台手动配置见 [cloudflare/README.md](cloudflare/README.md)。Cloudflare 版通过 API Key 查询与缓存，不提供本机 GPT 套餐登录。
