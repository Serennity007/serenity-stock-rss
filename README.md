**[中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)**

<div align="center">

# 📈 Stocks AI RSS

**美股 · AI · 半导体 · 黄金 · BTC——五大主题财经资讯，直接流进你的 Obsidian**

[![Release](https://img.shields.io/github/v/release/Serennity007/serenity-stock-rss?logo=github)](https://github.com/Serennity007/serenity-stock-rss/releases)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--only-blue.svg)](LICENSE)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.13.0-purple?logo=obsidian)
[![Upstream: Qiaomu AI RSS](https://img.shields.io/badge/fork%20of-Qiaomu%20AI%20RSS-orange)](https://github.com/joeseesun/qiaomu-ai-rss)
![语言](https://img.shields.io/badge/%E8%AF%AD%E8%A8%80-%E4%B8%AD%E6%96%87%20%7C%20EN%20%7C%20JA-orange)

*免费 · 开源 · 无账号 · 纯本地 · 30 个内置源*

**本项目学习自 [向阳乔木](https://github.com/joeseesun) 的 [Qiaomu AI RSS（乔木 RSS）](https://github.com/joeseesun/qiaomu-ai-rss) 并在其基础上深度改造，阅读体验的功劳属于原作者 🙏**

<img src="docs/images/intro-screenshot.png" alt="Stocks AI RSS 阅读器：左侧订阅列表，右侧中文正文阅读" width="640" />

</div>

---

投资决策靠信息质量。但今天的信息流是这样的：AI 突发在 X 上、半导体深度在付费研报里、BTC 消息在十几个群轮播、黄金行情得盯着行情软件——**看完就散，永远进不了你的知识库**。

**Stocks AI RSS** 把这件事收拢进 Obsidian：**30 个逐个实测直连可用的财经源**，按五大主题组织，刷到有价值的文章一键变成 Markdown 笔记或日记摘录。基于 [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) 的成熟阅读体验改造——那位作者把「RSS 阅读 → 存笔记」这条链路做到了极致，本仓库站在他的肩膀上把它带向投资研究场景。

## 🔥 五大主题，一键订阅

| 主题 | 内置源 | 你会刷到什么 |
| --- | --- | --- |
| 🇺🇸 **美股市场**（8 源） | CNBC ×3 · MarketWatch · WSJ ×2 · Seeking Alpha · Fortune | 大盘异动、财报季、个股消息 |
| 🤖 **AI 与大模型**（4 源） | OpenAI · TechCrunch AI · Interconnects · Simon Willison | 模型发布、AI 创业融资、LLM 前沿研究 |
| 💾 **半导体**（4 源） | SemiAnalysis · Tom's Hardware · SemiWiki · EE Times | 算力产业链、制程工艺、芯片设计 |
| 🪙 **黄金与加密货币**（6 源） | MINING.com · FXStreet · The Block · Cointelegraph · Bitcoin Magazine · Decrypt | 金价供给端、BTC 行情、机构采用与监管 |
| 🏛️ **宏观经济**（3 源） | CNBC Economy · 美联储官方 · SEC 官方 | FOMC 决议、就业通胀数据、监管规则 |

另有 **中文财经**（华尔街见闻、新浪财经、钛媒体）与 **财经博客**（Ben Carlson、Josh Brown）两个辅助分类，共 **30 源**。想加雪球、财联社这类无官方 RSS 的站点？自建 [RSSHub](https://docs.rsshub.app/) 后把链接粘进探索页即可。

## ✨ 为什么它值得常驻你的 Obsidian

- ✍️ **信息 → 知识的最后一公里**：文章一键存为 Markdown（图片本地化，不怕原链接失效），选中的段落直接追加进今日日记并自动带出处链接
- 📊 **源即研报**：SemiAnalysis、Interconnects 这类机构级深度内容，和快讯流并列在同一阅读器里，不必在十几个 App 间横跳
- 🗂️ **订阅组织方式随你**：分组管理、OPML 批量导入导出、库内文件夹当阅读源（剪藏的研报 Markdown 也能进阅读器）
- 📖 **为长文阅读打磨的排版**：7 主题、8 字体（含内置朱雀仿宋）、字号行距版心可调、J/K 键盘流
- 🔒 **纯本地**：无账号、无遥测，已读/收藏/缓存全部留在你的库里；插件不依赖任何服务器，作者跑路了它照样能跑

## 🚀 安装

**方式一：BRAT（推荐，自动更新）**

1. 安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. BRAT 设置 → *Add Beta plugin* → 输入 `Serennity007/serenity-stock-rss`
3. 社区插件设置里启用即可

**方式二：手动**

1. 从 [Releases](https://github.com/Serennity007/serenity-stock-rss/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 放入 `<vault>/.obsidian/plugins/stocks-ai-rss/`
3. 设置 → 第三方插件 → 启用 **Stocks AI RSS**

> 与上游 [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss)（Obsidian 官方插件库可装）ID 不同，可同时安装共存。

## ❓ FAQ

**为什么是这五个主题？**
美股是市场基准面，AI 与半导体是本轮周期最大的产业叙事（且互为上下游），黄金与 BTC 是法币信心的两面镜子——这四类信息叠加宏观官方口径，构成一个自洽的投资研究信息面。中文源保留但降级为辅助，因为高质量中文内容大多没有 RSS。

**源以后会更新吗？**
会。目录是独立数据文件（[finance-feeds.json](src/data/finance-feeds.json)，CC0），新增/修正源只需 PR 这个文件并附可用性验证；放在插件文件夹里的同名 JSON 会覆盖内置目录。

**数据安全吗？**
插件自身无服务器。订阅的是你自己添加的 feed，文章存在库内 `.obsidian/plugins/stocks-ai-rss/` 下，卸载插件不影响已保存的笔记。

**和上游的区别？**

| | 上游 Qiaomu AI RSS | 本分支 |
| --- | --- | --- |
| 内容来源 | 乔木精选（在线服务）+ 个人订阅 | 个人订阅 + 内置五大主题目录 |
| 中文 AI 改写/翻译 | 有（服务器生成） | 无，始终原文 |
| 播客转录、链接收录实验室 | 有 | 移除 |
| 网络依赖 | 精选内容需联网 | 仅抓取你订阅的 feed |

## 🛠️ 开发

```bash
npm ci
npm run check   # eslint + vitest + tsc + esbuild
```

欢迎 PR 新源与改进——见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 🙏 致谢

- [向阳乔木 (@joeseesun)](https://github.com/joeseesun) 的 [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss)——本项目基于其 v0.26.2 改造，阅读器体验几乎全部来自上游的出色设计
- 内置朱雀仿宋字体子集基于 [朱雀仿宋](https://github.com/TrionesType/zhuque)（SIL OFL 1.1）

## 📄 许可

[GPL-3.0-only](LICENSE)。上游代码版权归 向阳乔木 所有；本分支的修改部分归仓库作者。第三方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
