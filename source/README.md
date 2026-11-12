# 0.16.0 五篇识别与整合包

导入支持 Article 1–5、第一篇、数字标题、Markdown 1–6 级标题、加粗标题及 JSON articles 数组。保存前显示识别数量和每篇标题。旧的合并文章若识别到五篇，可在阅读页点击“拆分为 5 篇”；保留词汇表、首篇原 ID，并用 batchId 关联五篇导航。程序仍不生成文章。

运行数据不再包含内置例文。历史测试夹具移到 tests/fixtures，仅用于验证旧学习数据兼容性。新增 deploy/ 提供无第三方 npm 依赖的 Node 24 后端与 Docker 配置；公开部署由用户自行执行。本地版保持 Windows DPAPI 和已有接入方式，自部署版使用独立浏览器会话及服务端加密密钥，只提供自定义 API。

完整流程与部署边界见整合包根目录的使用说明及 deploy/README.md。测试模型全部为模拟服务，不使用真实凭据。

# 0.15.0 词汇表驱动的阅读流程

产品不再显示内置例文和内置题库。词汇库一次性清空现有词汇表及独立词条，保留生词本、历史记录所引用的释义和已有用户阅读。清理标记随备份保存，后续新建的词汇表不会在刷新时被再次清除。

新流程：词汇库新建词汇表（最多 200 词，支持 Markdown 词义和强调）→ 导出 Markdown 文章生成请求，在用户自己的 AI 中生成 → 选择该词汇表批量导入文章。请求使用当前最新词义，要求五篇不同文章、每篇全部词汇。导入前检查每篇是否覆盖所选词汇表；缺词时提示具体篇目和词，不调用 AI 重写。文章持久保存 setId 关联并绑定目标词，阅读页可按词汇表筛选；词义、句子及段落缓存继续在后台处理。

移除无效生成按钮、阅读中的空题库测试入口、考试/主题/篇幅筛选、空状态导出/复习按钮。词汇库只展示必要的创建、导出请求、导入文章、词义编辑与删除操作。后台队列完成时不再展示无效暂停按钮。备份、精准词义、选段解释、朗读和个人词义优先保留。

桌面和手机浏览器验证新建两词表、Markdown 原义导出、导入绑定、目标词、按表筛选、刷新持久化和零生成请求。AI 缓存测试均为隔离模拟。

# 0.14.0 批量阅读导入与后台缓存

文章生成功能已从阅读入口、设置、前端模块和后台推理路由移除；历史阅读、词表、个人释义、记录与备份继续保留。旧 `/generate` 返回 410，不会调用模型。保留的历史生成校验测试仅用于旧学习包的回归，不再向用户提供生成流程。

阅读页「导入文章」可一次粘贴多篇文章，以 Markdown 标题或独立 `---` 分隔；也可同时选择多个 TXT/Markdown 文件。保存后立即打开第一篇，顶部可切换本批文章；标准学习包 JSON 仍可导入。

词义、逐句与整段译文在后台排队准备并存入 IndexedDB，不再用阻塞弹窗。切换文章、打开设置或查词不会取消；提供暂停、继续、错误重试与重新连接服务。已完成的部分保留，重新打开某篇可补齐缺项。关闭网页后任务停止，之后打开文章可继续准备。原用户 Markdown 词义优先、精准查询、选段解释、收藏和朗读保持可用，AI 不生成文章。

真实浏览器桌面/手机验证：两篇批量导入、切换、打开对话框时继续缓存、完成后词义/段落读取零新增查询、零生成请求、无页面异常与横向溢出。缓存接口均使用隔离模拟，未在测试中调用用户真实推理服务。

# 0.13.1 OpenCode 接口兼容修复

OpenCode Go 兼容接口：`https://opencode.ai/inference/go/openai/v1`，选择 Chat Completions，模型填写原始 ID（例如 `kimi-k2.7-code`），不加 `opencode-go/`。需用加入 Go 工作区的个人 API Key，个人 Go 不覆盖服务账号。模型以官方实时列表为准。控制台的用量网页不能用作 API；前后端现在都提前识别此错误。

依据官方要求，请求使用真实客户端名称 `ContextFlow/0.13.1`，同一生成批次或查询语境提供稳定的 `x-opencode-session`。OpenCode 的所有协议都使用 Bearer 身份验证，模型列表使用 `/inference/go/v1/models`；其他厂商保留原有身份验证方式。Go 主要面向编程代理；学习工具的请求是否被接受取决于服务商规定与账号权限，没有伪装其他客户端或自动切换到按量余额。

64 项测试通过（含四协议隔离集成），未调用用户真实付费推理。官方依据：[Go](https://opencode.ai/docs/console/go/)、[接口及身份验证](https://opencode.ai/docs/console/api/inference/)、[会话与 Base URL](https://opencode.ai/docs/console/harnesses/)。

# 0.13.0 自定义模型 API

设置 → 生成与查询 → 连接或更换服务 → 自定义模型 API。选择协议，填写服务商的 Base URL、API Key 与模型 ID，点击“保存并使用此模型”。不要求密钥以 `sk-` 开头，也不要求服务提供模型列表。可选“测试连接”会发送一次简短模型请求；保存本身不调用模型。

支持 OpenAI 兼容 Chat Completions、Responses、Anthropic Messages 和 Gemini 原生四种文本协议。服务商有独有签名或私有请求格式时仍需增加适配，不能仅凭 API Key 自动识别。协议与模型由用户明确选择，不自动切换服务。原 ChatGPT 和 OpenAI API 入口继续保留。

生成、实时词义、详细解释、选段翻译和阅读预缓存均使用选定服务。密钥通过 Windows 用户级 DPAPI 加密保存在后台用户目录，不返回网页、不进入学习备份。模型与服务选择可恢复；修改地址须重新填写对应密钥。本机和局域网服务允许 HTTP，远程服务要求 HTTPS。支持流式输出，未完成的输出不保存为学习文章或缓存。高级配置可调整最大输出 Token 与 Anthropic-Version。

62 项测试通过，其中隔离的本地模拟服务逐一验证四种协议的全部学习路由、5 篇覆盖校验、凭据加密及重启恢复。桌面/手机真实浏览器验证手动模型、不支持模型列表、保存失败、配置恢复和布局。没有使用用户的第三方密钥做真实付费推理。

接口依据：[Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[Anthropic Messages](https://platform.claude.com/docs/en/api/messages)、[Gemini](https://ai.google.dev/api/generate-content)。

# 0.12.0 阅读前预缓存

`reading-cache.ts` 保存按文章版本、句子语境区分的词义和句译；`reading-preparation.ts` 在进入文章前自动准备缺项并持久保存。后台 `reading-preparation.mjs` 限制并发、合并重复请求、补齐漏项，取消一个页面不影响另一个页面相同任务。48 项测试通过。

# 0.11.2 快查与快译

`lookup-cache.ts` 和 `translation-cache.ts` 存储按语境区分的完成结果；`live-stream.ts` 消费增量内容并要求终态。前端快查、快译走 NDJSON，完整解释按需请求；已有整段译文直接复用。类型检查与 44 项测试通过，实时环境继续位于 http://127.0.0.1:5173。

# 0.11.0 实时预览与直接生成 / 查询

双击 `Start-Preview.cmd` 或运行 `npm run dev`，预览为 http://127.0.0.1:5173。当前页面内直接生成文章和查询词义，后台自动沿用现有授权，不再打开生成助手窗口。开发工具及 AI+可视化选区用法见 `../preview/开始使用实时预览.md`。原业务组件、存储格式和词表数据保留；不再使用词典浏览作为产品入口。

# 0.10.1 连接修复

`assistant/network.ps1` 继承现有 Windows 手动代理；启动 Node 使用 `--use-env-proxy`。`network.mjs` 提供底层错误分类及只针对连接前失败的有界重试。程序测试现为 36 项。

# 0.10.0 更新

短语导入、用户词义全局优先、系统朗读、选段翻译、固定用户目录授权与并行初稿。32 项测试通过；真实账号推理未验证。详见上级目录的新版使用说明和逐项验收报告。`src/speech.ts` 使用浏览器系统语音；`assistant/selection-page.mjs` 提供选段翻译窗口。

# ContextFlow source

本目录是 TypeScript + 原生 DOM/CSS 源码。程序 MIT，数据许可单列。请保留与本目录同级的 `data/`、`assistant/` 和 `licenses/`。

## 构建

需要 Node 24（本交付包 `../assistant/node.exe` 可用）与 npm。运行：

```powershell
cd source
npm ci
npm run typecheck
npm test
npm run build
```

输出为上级目录 `ContextFlow.html`。构建读取已交付的本地 `data/*.json` 及 `scripts/phrase-supplements.json`，不下载字体、脚本或词典。HTML 内联普通 IIFE、CSS 和 JSON，Hash 路由兼容 `file://`。此 HTML 的日常使用无需 Node 或 npm。

## 从锁定数据重建

需要 Python 3 标准库。采用的 FreeDict 源包 SHA-512 在 `prepare-data.py` 与 manifest 中固定。按顺序运行：

```powershell
python scripts/prepare-data.py ../data/freedict-eng-zho-2025.11.23.src.tar.xz ../data/cet2016-wordlist-extracted.txt
python scripts/content.py
python scripts/supplemental-questions.py
python scripts/ielts-candidates.py
python scripts/align-content.py
npm test
npm run build
```

`content.py` 每次以第一步的规范化词典为输入；不要跳过第一步反复叠加数据。`supplemental-questions.py` 也应仅在新生成的 content 后执行一次。候选 CET 文本是官方 PDF 自动提取的词表部分，保留未决项，不视为精确的 5,418 条覆盖映射。

## 文件边界

- `src/types.ts`：词典、文章、义项、个人覆盖层与学习状态。
- `src/domain.ts`：规则识别、词形候选、真实语境身份、间隔复习、CSV、备份和学习包校验。
- `src/storage.ts`：持久化探测、串行提交、IndexedDB 原子事务与快照。
- `src/app.ts`：五页界面、阅读标注、导入预览、测试与本地助手桥接。
- `src/style.css`：阅读布局、移动底栏、深浅主题与减少动画。
- `../assistant/server.mjs`：可选 OAuth/API 本地服务、DPAPI、SSE 与窗口消息桥。

`npm test` 运行服务和领域测试，不触发真实授权、推理或付费 API。浏览器验收结果、版本和限制在 `../reports/`。当前是未通过正式数据质量门槛的 0.10.0 候选包，不能作为已完成独立语言审阅的正式首发宣传。
