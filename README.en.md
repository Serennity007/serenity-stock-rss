**[中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)**

<div align="center">

# 📈 Stocks AI RSS

**A finance RSS reader for Obsidian — US & China stock markets**

[![Release](https://img.shields.io/github/v/release/Serennity007/serenity-stock-rss?logo=github)](https://github.com/Serennity007/serenity-stock-rss/releases)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--only-blue.svg)](LICENSE)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.13.0-purple?logo=obsidian)
[![Upstream: Qiaomu AI RSS](https://img.shields.io/badge/fork%20of-Qiaomu%20AI%20RSS-orange)](https://github.com/joeseesun/qiaomu-ai-rss)
![Languages](https://img.shields.io/badge/Languages-%E4%B8%AD%E6%96%87%20%7C%20EN%20%7C%20JA-orange)

*Free · Open source · No account · Fully local*

**This project is a fork of — and was learned from — [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) by [向阳乔木](https://github.com/joeseesun). The reading experience is the original author's work 🙏**

<img src="docs/images/intro-screenshot.png" alt="Stocks AI RSS reader: subscription list on the left, article reading on the right" width="640" />

</div>

---

Market news lives in a dozen apps; your notes live in Obsidian. Why not let the news flow straight into your knowledge base?

**Stocks AI RSS** puts US & China market news inside Obsidian: it ships with 13 hand-verified finance feeds, and any article worth keeping becomes a Markdown note — or an excerpt in your daily note — with one click. Built on the polished reading experience of [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss), refocused on investment research.

## ✨ Features

- 📊 **Bundled finance feeds, zero setup** — CNBC, MarketWatch, WSJ, Seeking Alpha, Federal Reserve, SEC, 华尔街见闻, Sina Finance, TMTPost and more: 13 feeds, each verified to work over direct HTTPS. No hunting for feed URLs.
- ✍️ **Read and note in one place** — save any article as Markdown (images downloaded locally), append excerpts to your daily note, export to PDF; links back to the source are preserved.
- 🗂️ **Subscription groups** — custom groups, OPML import/export, and vault folders as reading sources (your clipped Markdown shows up in the reader).
- 📖 **Comfortable reading** — 7 themes, 8 fonts (bundled Zhuque Fangsong subset), adjustable size, line height and column width, J/K keyboard navigation.
- 🔒 **Fully local** — no accounts, no server dependency. Read state, favorites and cache all stay in your vault.

## 📊 Bundled feeds

| Category | Feeds |
| --- | --- |
| **US & global** | CNBC (Top News / Markets / Earnings), MarketWatch, WSJ Markets, WSJ Opinion, Seeking Alpha, Fortune |
| **Economy & macro** | CNBC Economy, Federal Reserve press releases, SEC press releases |
| **Chinese markets** | 华尔街见闻 (Wallstreetcn), Sina Finance, TMTPost |
| **Finance blogs** | A Wealth of Common Sense (Ben Carlson), The Reformed Broker (Josh Brown) |

> Want Xueqiu, Cailianshe or The Paper? They have no official RSS — self-host [RSSHub](https://docs.rsshub.app/) and paste the generated link into the plugin's discovery panel.

## 🚀 Install

**Option 1: BRAT (recommended, auto-updates)**

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. BRAT settings → *Add Beta plugin* → enter `Serennity007/serenity-stock-rss`
3. Enable it under community plugins

**Option 2: Manual**

1. Download `main.js`, `manifest.json`, `styles.css` from [Releases](https://github.com/Serennity007/serenity-stock-rss/releases)
2. Put them into `<vault>/.obsidian/plugins/stocks-ai-rss/`
3. Settings → Community plugins → enable **Stocks AI RSS**

> This plugin coexists with the upstream [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) (available in the official Obsidian plugin store) — the IDs differ.

## ❓ FAQ

**Why a fork instead of a PR upstream?**
Qiaomu AI RSS targets overseas AI news, with curated content served by the author's server. This fork serves a different scenario (US/A-share research), so it drops the server dependency and becomes a fully local finance reader instead of loading the upstream service with unrelated content.

**Is my data safe?**
The plugin has no server of its own. Subscriptions are the feed URLs you add; articles are stored under `.obsidian/plugins/stocks-ai-rss/` in your vault. Uninstalling the plugin never touches your saved notes.

**How does it differ from upstream?**

| | Upstream Qiaomu AI RSS | This fork |
| --- | --- | --- |
| Content | Qiaomu curated picks (online) + personal feeds | Personal feeds + bundled finance catalog |
| Chinese AI rewrite/translation | Yes (server-generated) | No, original text only |
| Podcast transcripts, link-collection lab | Yes | Removed |
| Network dependency | Curated content needs the service | Only the feeds you subscribe to |

## 🛠️ Development

```bash
npm ci
npm run check   # eslint + vitest + tsc + esbuild
```

The bundled catalog lives in [`src/data/finance-feeds.json`](src/data/finance-feeds.json). Feed additions or fixes need availability verification — see [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome!

## 🙏 Acknowledgements

- [向阳乔木 (@joeseesun)](https://github.com/joeseesun)'s [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) — this project is a fork of v0.26.2; nearly all of the reading experience comes from upstream's excellent design.
- The bundled Zhuque Fangsong font subset is based on [Zhuque Fangsong](https://github.com/TrionesType/zhuque) (SIL OFL 1.1).

## 📄 License

[GPL-3.0-only](LICENSE). Upstream code is copyright 向阳乔木; the changes in this fork are copyright the repository author. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
