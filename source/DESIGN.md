---
name: "ContextFlow 语境流 · 阅读与词卡"
description: "本地阅读、划词翻译和词卡的设计规范。"
colors:
  light-bg: "#f7f7f9"
  light-paper: "#fff"
  light-ink: "#25242b"
  light-muted: "#62616d"
  light-line: "#dedde3"
  light-accent: "#50417e"
  light-accent-hover: "#382969"
  light-soft: "#ebe7f6"
  light-target: "#e8e0fc"
  light-target-ink: "#34234f"
  light-dot: "#e0dfe5"
  light-purple: "#d8cef6"
  light-purple-ink: "#302448"
  dark-bg: "#222127"
  dark-paper: "#2b2931"
  dark-ink: "#f2f0f6"
  dark-muted: "#c0bbc9"
  dark-line: "#48444f"
  dark-accent: "#cbb9ff"
  dark-accent-hover: "#e1d7ff"
  dark-soft: "#40374e"
  dark-target: "#544365"
  dark-target-ink: "#f9f3ff"
  dark-dot: "#46404e"
  dark-purple: "#c6b4f1"
  dark-purple-ink: "#2d203e"
  peach: "#f2c8bc"
  honey: "#efd69e"
  blue: "#c3d4ef"
  mint: "#c6dfd3"
  butter: "#f1e5a9"
  lilac: "#dcd1e9"
typography:
  heading:
    fontFamily: "ui-rounded,\"Arial Rounded MT Bold\",\"Trebuchet MS\",\"Segoe UI\",\"Microsoft YaHei\",sans-serif"
    fontSize: "34px"
    fontWeight: 800
    letterSpacing: "-.035em"
  word:
    fontFamily: "ui-rounded,\"Arial Rounded MT Bold\",\"Trebuchet MS\",\"Segoe UI\",\"Microsoft YaHei\",sans-serif"
    fontSize: "31px"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-.035em"
  date:
    fontFamily: "Georgia,\"Times New Roman\",serif"
    fontSize: "37px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-.03em"
  article:
    fontFamily: "Georgia,\"Times New Roman\",serif"
    fontSize: "var(--reading-size, 19px)"
    fontWeight: 400
    lineHeight: 1.85
  example:
    fontFamily: "Georgia,serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  field: "12px"
  sheet: "26px"
  card: "25px"
  modal: "30px"
  pill: "24px"
  round: "50%"
spacing:
  controlGap: "8px"
  mobileGutter: "17px"
  reversePadding: "24px"
components:
  collect-button:
    backgroundColor: "{colors.light-purple}"
    textColor: "{colors.light-purple-ink}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
  round-control:
    backgroundColor: "{colors.light-paper}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.round}"
    size: "44px"
  deck-front:
    backgroundColor: "{colors.lilac}"
    rounded: "{rounded.card}"
    padding: "20px"
  nav-current:
    backgroundColor: "{colors.light-soft}"
    textColor: "{colors.light-accent}"
    padding: "0 15px"
  form-input:
    backgroundColor: "{colors.light-paper}"
    textColor: "{colors.light-ink}"
    rounded: "{rounded.field}"
  notebook-label:
    backgroundColor: "#fff"
    textColor: "#29262c"
    padding: "8px"
    rounded: "8px"
---

# ContextFlow 语境流

阅读页保留暖灰紫背景、白纸、圆体标题与衬线英文正文。目标词只在字面上着淡紫色，悬停时改变短阴影；目标词列表和词库卡片承担展开与收藏操作。已有物件插画仅在词条与插画匹配时使用。深色沿用原有墨紫纸面及浅紫状态色。

## 布局与交互

- 底部四个图标用于阅读练习、词汇库、我的生词本、设置。每个图标均有可访问名称，当前入口以圆角底片标识，单图标持续悬停 5.2 秒后显示白字提示，移到其他图标重新计时。练习记录通过设置查看。
- 文章正文逐段朗读、展开译文。字号、缓存状态与停止朗读在更多菜单内。阅读完成与词卡收藏分别反馈，并以本机持久化成功为准。
- 新建词表时输入与预览并排，手机改为上下排布。词库按词条展开，当前词表和生词本共享词卡自测，支持翻面、键盘翻页、触屏横滑及只练待巩固词。
- 划选英文后打开非模态浮窗。桌面默认宽 284px，窄屏为 254px。句级参考与精确结果有不同标题，参考结果可主动请求精确翻译。精确结果可以收藏。拖动栏支持指针捕获、触摸与方向键，边距为 8px。
- 页间使用 GSAP，离场 85ms，入场 190ms，底片滑动 250ms。词卡按压、菜单展开和悬停使用 CSS，词卡以 520ms 的折页翻面或切换，收藏沿用贴纸收纳动效。系统开启减少动态效果时直接切换状态。


## 材质与动效来源

空白处的光标字阵参考 [OJO Dashboard](https://ojo.art/dashboard)，进入正文或表单时淡出。底部导航按指针距离放大，选中状态与悬停反馈独立。自测时将页面整体虚化，卡片仅在模切边缘反光。自测记录进入完整备份，和间隔复习的掌握规则分别记录。

[React Bits](https://github.com/DavidHDev/react-bits) 查阅时为 52,312 stars。参考 [Dock](https://reactbits.dev/components/dock) 的距离响应、[Spotlight Card](https://reactbits.dev/components/spotlight-card) 的局部光源、[Glare Hover](https://reactbits.dev/animations/glare-hover) 的反光、[Glass Surface](https://reactbits.dev/components/glass-surface) 的材质和 [Letter Glitch](https://reactbits.dev/backgrounds/letter-glitch) 的字符网格，将相关交互适配为原生 TypeScript、Canvas 和 CSS。按需绘制光标周围区域，保留离线单文件。许可随附于 licenses/React-Bits-LICENSE.md，并内嵌在单文件中。


## 网格涟漪、标题与词卡

页面标题使用内嵌的思源宋体字形子集，鼠标经过时字形与网线向指针轻微形变。滚动视口边缘逐层虚化。指针在可操作控件上显示四角定位标记，移到空白处时，网线随波峰偏移、点亮并显出字母。词卡围绕稳定的点击区域倾斜，保持翻面、横滑与长释义滚动。
动效可在设置中选择跟随系统、完整或减少。跟随系统且系统减少动效时，卡片界面提供直接开启完整翻页的入口。选择仅保存在当前浏览器。生词本的待复习包含新收藏、需再练的词以及距上一次词卡通过满一天的词。个人状态和正式练习分别记录，以最近的操作决定生词本状态。

原生实现参考 React Bits 的 [Tilted Card](https://reactbits.dev/components/tilted-card)、[Target Cursor](https://reactbits.dev/animations/target-cursor)、[Gradual Blur](https://reactbits.dev/animations/gradual-blur)、[Grid Distortion](https://reactbits.dev/backgrounds/grid-distortion) 和 [Text Pressure](https://reactbits.dev/text-animations/text-pressure)。本轮查阅时项目有 52,315 stars。许可证随源码与单文件附带，字体依据 SIL OFL 1.1 分发。
