# ContextFlow（语境流）

阅读中点击单词查词，或划选一段英文查看译文。浮窗可拖动，方向键可移动位置。词卡和选段收藏到本机生词本。词汇库卡片右上角的书签和词义卡中的收藏按钮可以再次点击取消。导入时可粘贴如 `gene n. 基因` 的词条，或提供带词性列的表格。缺少词性的词条可按需用已连接的模型补全。打开「AI 补全词性」后先保存词表，再用后台模型补缺。词汇库里的「添加单词」可继续向同一张表追加英文和释义。
 
选择「导入并生成阅读和题目」，或在原词表点击「生成阅读和题目」。每组最多 20 个目标词，正文保存后便可阅读，随后生成五道阅读理解题。支持单独重试出题、手动导入文章和导出生成请求。
 
双击 HTML 可离线导入和学习。要在文件页面使用 AI，请先启动本机助手、设置模型，并在首次使用时连接本次学习。使用带后台的网页时直接在设置中连接模型。可选择 [Cloudflare Pages Functions + D1](cloudflare/README.md) 或 [独立 Node 后台](deploy/README.md)。
 
## 开发

使用 Node 24：在 `source/` 运行 `npm ci`、`npm run typecheck`、`npm test`、`npm run build`。构建输出上级 `ContextFlow.html`；同步到 `index.html` 和 `deploy/public/index.html` 后再部署。Windows 本机服务需额外准备 Node 运行时，Git 仓库不提交 `node.exe` 或 `node_modules`。

双击根目录的 ContextFlow.html 可离线使用。需要在线查询时，可用 Node 24 启动本机后台（在根目录运行 `node assistant/server.mjs`），并在 source 目录运行 `npm ci` 和 `npm run dev`，打开终端显示的本机地址，在设置中连接模型。

用户学习数据不包含在仓库中，API Key 不应提交；示例 `.env.example` 不包含有效密钥。源码 MIT，数据版权和来源见 `licenses/`。

## 模型设置（0.17.0）

常见服务商直接选择名称、填写 API Key、获取模型后选择；自定义中转接口再填写地址和协议。模型目录读取不发送推理请求。Windows 本地版支持 ChatGPT 套餐登录，授权地址失败会保留错误，登录成功后可获取套餐模型；自部署版继续使用独立会话的模型 API。

## 一键更新 Cloudflare（Windows）

下载整合包并完整解压，双击根目录 `一键更新网站.cmd`，在自动打开的 Cloudflare 网页登录并允许授权，等待“更新成功”。脚本会识别原网址 `contextflow-bgk.pages.dev`，自动配置数据库、保留或生成加密密钥、编译后台并上传；无需手动填 D1、Secret、兼容标志或构建目录。原学习数据不变。后续重复运行同一脚本即可更新。

没有 Node.js 时从官方 nodejs.org 下载并校验便携版；首次运行需要联网准备官方工具。脚本不自动处理 Cloudflare 登录授权，也不显示 Cloudflare 访问令牌。配置备份在 `cloudflare/.deploy-private`，不要分享或提交。只对原网址对应项目操作，找不到时停止，不创建别的网站。

详细排查和其他平台手动配置见 [cloudflare/README.md](cloudflare/README.md)。Cloudflare 版通过 API Key 查询与缓存，不提供本机 GPT 套餐登录。
