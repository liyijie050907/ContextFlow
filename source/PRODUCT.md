# ContextFlow 语境流

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
用户指定 TypeScript、原生 HTML/CSS，构建为无外部资源的单文件 HTML；Windows Chrome / Edge 优先，手机网页适配。

## Users
准备 CET-4、CET-6 与 IELTS 的英语学习者，需要离线阅读、按义项查词和跨语境复习。

## Product Purpose
准确理解词义，在新语境中认出并使用。阅读、收藏、测试、间隔复习组成闭环。

## Operating Context
双击本地 HTML，学习数据保存在本机浏览器；备份可以导出恢复。公开部署须交付后另获授权。

## Capabilities and Constraints
五页：阅读练习、词汇管理、我的生词本、测试记录、设置。IndexedDB 自检与兼容/临时模式；全量版本化备份和冲突预览。数据稳定 ID，个人覆盖层。规则词形及义项消歧。首次答题计分，14 天、5 次有效复习、3 个语境才可掌握。可选本地生成助手独立于 HTML，不复用聊天凭据。

## Evidence on Hand
完整用户 PRD 已保存在 work/user-request.txt。没有用户提供的成品词典。必须下载核验开放数据，未完成逐条来源核对和独立语言审阅时不得称为正式首发。CET 和 IELTS 覆盖门槛必须按实际结果报告。

## Brand Commitments
名称 ContextFlow（语境流）。用户确认按方案和默认暖白、深绿界面推进；默认界面以长时间阅读为主。

## Product Principles
- 不虚构释义、考试标签、统计、置信度或数据验收结论。
- 离线功能独立；不自动启用付费 API。
- 写入失败不得误报保存；导入先预览，提交需原子性。
- 所有第三方数据各自遵循原许可，软件源码 MIT。

## Accessibility & Inclusion
键盘操作、焦点恢复、减少动画、深浅主题和窄屏布局。

## 0.9.1 用户补充的核心要求

单轮导入最多 200 个不同的自有单词，固定生成 5 篇不同文章，每篇英文正文都需完整包含全部导入词。前后端逐篇核对，不能分词表、漏词或以元数据冒充覆盖。阅读页与词汇管理需有明显入口。Windows 启动脚本需真实 cmd.exe 验证。
