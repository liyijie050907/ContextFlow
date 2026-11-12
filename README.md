# ContextFlow（语境流）

一个语境流背单词

基于个人词汇表的英语阅读工具。创建词汇表、导出文章生成请求、导入自行生成的多篇文章；支持 AI 词义和译文后台缓存。

`index.html` 可静态阅读；AI 缓存需要 `deploy/` 中的 Node 后端，不能仅靠 GitHub Pages 提供。运行与自行部署、HTTPS、API Key 和备份说明详见 [deploy/README.md](deploy/README.md)。

## 开发

使用 Node 24：在 `source/` 运行 `npm ci`、`npm run typecheck`、`npm test`、`npm run build`。构建输出上级 `ContextFlow.html`；同步到 `index.html` 和 `deploy/public/index.html` 后再部署。Windows 本机服务需额外准备 Node 运行时，Git 仓库不提交 `node.exe` 或 `node_modules`。

用户学习数据不包含在仓库中，API Key 不应提交；示例 `.env.example` 不包含有效密钥。源码 MIT，数据版权和来源见 `licenses/`。

## 模型设置（0.17.0）

常见服务商直接选择名称、填写 API Key、获取模型后选择；自定义中转接口再填写地址和协议。模型目录读取不发送推理请求。Windows 本地版支持 ChatGPT 套餐登录，授权地址失败会保留错误，登录成功后可获取套餐模型；自部署版继续使用独立会话的模型 API。

## 模型列表提示 HTML 错误

Cloudflare Pages 等纯静态托管会将 `/api/session` 回退为首页，导致 `Unexpected token '<'`。此时请求尚未到服务商，不代表 Key 无效。AI 功能必须运行 `deploy/` 中的 Node 后台并配置同源 `/api/*`；仅重新上传网页无法解决。具体步骤见 [部署说明](deploy/README.md#cloudflare-pages-返回-unexpected-token-)。
