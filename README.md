# Stocks AI RSS

**在 Obsidian 里读美股与 A 股财经资讯 · Read US & China stock-market feeds in Obsidian**

Stocks AI RSS 是 [Qiaomu AI RSS（乔木 RSS）](https://github.com/joeseesun/qiaomu-ai-rss) 的财经分支：保留其完整的本地 RSS 阅读器体验，内置经过实测验证的美股与中文财经订阅源，并移除了对作者在线服务的依赖。基于 GPL-3.0-only 开源。

Stocks AI RSS is a finance fork of [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss): it keeps the polished local-first RSS reading experience, bundles hand-verified US & Chinese market feeds, and removes the dependency on the upstream online service. Licensed GPL-3.0-only.

## 功能 · Features

- **内置财经源**：美股、宏观、中文财经与财经博客四个分类，开箱即用，全部直连（无代理）
- **发现订阅**：探索页搜索/分类浏览，粘贴 RSS 或 OPML 链接一键订阅；支持 OPML 批量导入导出
- **边读边记**：文章一键存为 Markdown 笔记（正文/图片本地化）、摘录写进今日日记、PDF 导出
- **订阅分组**：分组管理、拖拽整理、库内文件夹作为来源（把剪藏的 Markdown 放进阅读器）
- **阅读体验**：7 种主题、8 种字体（含内置朱雀仿宋）、字号行距版心调节、J/K 键盘导航
- **完全本地**：无账号、无服务器，已读/收藏/缓存全部保存在当前库

## 内置订阅源 · Bundled feeds

| 分类 | 源 |
| --- | --- |
| 美股与全球 | CNBC (Top News / Markets / Earnings)、MarketWatch、WSJ Markets、WSJ Opinion、Seeking Alpha、Fortune |
| 经济与宏观 | CNBC Economy、美联储新闻稿 (Federal Reserve)、SEC 新闻 |
| A股与中文财经 | 华尔街见闻、新浪财经、钛媒体 |
| 财经博客 | A Wealth of Common Sense (Ben Carlson)、The Reformed Broker (Josh Brown) |

想订阅雪球、财联社、澎湃等没有官方 RSS 的站点？可自建 [RSSHub](https://docs.rsshub.app/) 后把生成的链接粘贴到探索页添加。

## 安装 · Install

- **BRAT**：安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 后添加本仓库 `Serennity007/stocks-ai-rss`
- **手动**：从 [Releases](https://github.com/Serennity007/stocks-ai-rss/releases) 下载 `main.js`、`manifest.json`、`styles.css`，放入 `<vault>/.obsidian/plugins/stocks-ai-rss/`，并在设置中启用社区插件
- 上游 [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) 可从 Obsidian 官方插件库安装；两者 ID 不同，可以共存

## 与上游的差异 · Differences from upstream

| | 上游 Qiaomu AI RSS | 本分支 |
| --- | --- | --- |
| 内容来源 | 乔木精选（在线服务）+ 个人订阅 | 仅个人订阅 + 内置财经目录 |
| 中文 AI 改写/翻译 | 有（服务器生成） | 无，始终原文 |
| 播客转录、链接收录实验室 | 有 | 移除 |
| 网络依赖 | 阅读精选内容需联网 | 仅抓取你订阅的 feed |

## 开发 · Development

```bash
npm ci
npm run check   # eslint + vitest + tsc + esbuild
```

内置目录在 `src/data/finance-feeds.json`，新增或修正源请附可用性验证，详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可 · License

- 本项目及上游代码遵循 [GPL-3.0-only](LICENSE)，上游版权归 向阳乔木 所有；本分支的修改部分归仓库作者
- 内置朱雀仿宋字体子集遵循 [SIL OFL 1.1](fonts/OFL.txt)
- 第三方依赖声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
