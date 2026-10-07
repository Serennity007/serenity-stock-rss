**[中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)**

<div align="center">

# 📈 Stocks AI RSS

**在 Obsidian 里读美股 & A 股财经资讯的 RSS 阅读器**

[![Release](https://img.shields.io/github/v/release/Serennity007/serenity-stock-rss?logo=github)](https://github.com/Serennity007/serenity-stock-rss/releases)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--only-blue.svg)](LICENSE)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.13.0-purple?logo=obsidian)
[![Upstream: Qiaomu AI RSS](https://img.shields.io/badge/fork%20of-Qiaomu%20AI%20RSS-orange)](https://github.com/joeseesun/qiaomu-ai-rss)
![语言](https://img.shields.io/badge/%E8%AF%AD%E8%A8%80-%E4%B8%AD%E6%96%87%20%7C%20EN%20%7C%20JA-orange)

*免费 · 开源 · 无账号 · 纯本地*

**本项目学习自 [向阳乔木](https://github.com/joeseesun) 的 [Qiaomu AI RSS（乔木 RSS）](https://github.com/joeseesun/qiaomu-ai-rss) 并在其基础上深度改造，阅读体验的功劳属于原作者 🙏**

</div>

---

财经资讯散落在雪球、Wind、公众号、财经 App 里，看完就忘；而 Obsidian 是你沉淀笔记的地方——为什么不让资讯直接流进你的知识库？

**Stocks AI RSS** 把美股与 A 股市场资讯装进 Obsidian：内置 13 个实测可用的财经订阅源，读到有价值的内容一键存为 Markdown 笔记或摘录进日记。基于 [Qiaomu AI RSS（乔木 RSS）](https://github.com/joeseesun/qiaomu-ai-rss) 的成熟阅读体验改造，专注投资研究场景。

## ✨ 核心特性

- 📊 **内置财经源，开箱即用** — CNBC、MarketWatch、WSJ、Seeking Alpha、美联储、SEC、华尔街见闻、新浪财经、钛媒体等 13 个源，全部直连、逐个实测，无需自己找 feed 地址
- ✍️ **边读边记，资讯进笔记** — 一键把文章存为 Markdown（图片本地化）、摘录写进今日日记、导出 PDF；文章链接自动回链
- 🗂️ **订阅分组管理** — 自定义分组、OPML 批量导入导出、把库内文件夹当作阅读源（剪藏的 Markdown 也能进阅读器）
- 📖 **舒服的阅读排版** — 7 种主题、8 种字体（含内置朱雀仿宋）、字号行距版心可调、J/K 键盘流导航
- 🔒 **纯本地，无账号** — 无服务器依赖，已读、收藏、缓存全部保存在当前库，不收集任何数据

## 📊 内置订阅源

| 分类 | 源 |
| --- | --- |
| **美股与全球** | CNBC (Top News / Markets / Earnings)、MarketWatch、WSJ Markets、WSJ Opinion、Seeking Alpha、Fortune |
| **经济与宏观** | CNBC Economy、美联储新闻稿 (Federal Reserve)、SEC 新闻 |
| **A股与中文财经** | 华尔街见闻、新浪财经、钛媒体 |
| **财经博客** | A Wealth of Common Sense (Ben Carlson)、The Reformed Broker (Josh Brown) |

> 想订阅雪球、财联社、澎湃等没有官方 RSS 的站点？自建 [RSSHub](https://docs.rsshub.app/) 后把生成的链接粘贴到插件「探索订阅」页即可添加。

## 🚀 安装

**方式一：BRAT（推荐，自动更新）**

1. 先安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件
2. BRAT 设置 → *Add Beta plugin* → 输入 `Serennity007/serenity-stock-rss`
3. 回到社区插件设置启用即可

**方式二：手动安装**

1. 从 [Releases](https://github.com/Serennity007/serenity-stock-rss/releases) 下载 `main.js`、`manifest.json`、`styles.css`
2. 放入库目录 `<vault>/.obsidian/plugins/stocks-ai-rss/`
3. 设置 → 第三方插件 → 启用 **Stocks AI RSS**

> 本插件与上游 [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss)（Obsidian 官方插件库可装）ID 不同，可同时安装共存。

## ❓ FAQ

**为什么 fork 而不是给原版提 PR？**
原版乔木 RSS 定位海外 AI 资讯，内置精选内容依赖作者服务器提供中文改写。本分支的目标场景（美股/A股）与上游服务无关，剥离服务器依赖做成纯本地阅读器更符合需求，也避免给原版服务增加无关负载。

**数据安全吗？**
插件自身没有任何服务器。订阅源是你自己添加的 feed 地址，文章抓取后存在本库 `.obsidian/plugins/stocks-ai-rss/` 下；卸载插件不影响已保存的笔记。

**和原版有什么区别？**

| | 上游 Qiaomu AI RSS | 本分支 |
| --- | --- | --- |
| 内容来源 | 乔木精选（在线服务）+ 个人订阅 | 仅个人订阅 + 内置财经目录 |
| 中文 AI 改写/翻译 | 有（服务器生成） | 无，始终原文 |
| 播客转录、链接收录实验室 | 有 | 移除 |
| 网络依赖 | 精选内容需联网 | 仅抓取你订阅的 feed |

## 🛠️ 开发

```bash
npm ci
npm run check   # eslint + vitest + tsc + esbuild
```

内置目录在 [`src/data/finance-feeds.json`](src/data/finance-feeds.json)，新增或修正源请附可用性验证，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。欢迎 PR！

## 🙏 致谢

- [向阳乔木 (@joeseesun)](https://github.com/joeseesun) 的 [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) —— 本项目基于其 v0.26.2 改造，阅读器的绝大部分体验都来自上游的出色设计
- 内置朱雀仿宋字体子集基于 [朱雀仿宋](https://github.com/TrionesType/zhuque)（SIL OFL 1.1）

## 📄 许可

[GPL-3.0-only](LICENSE)。上游代码版权归 向阳乔木 所有；本分支的修改部分归仓库作者。第三方依赖声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
