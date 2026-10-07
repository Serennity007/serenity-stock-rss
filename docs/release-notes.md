# Release notes

## 1.0.0

First release of Stocks AI RSS, a finance-focused fork of [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) (v0.26.2, GPL-3.0-only).

- Bundled finance catalog: 13 hand-verified feeds covering US markets (CNBC, MarketWatch, WSJ, Seeking Alpha, Fortune, Federal Reserve, SEC) and Chinese markets (华尔街见闻, 新浪财经, 钛媒体) plus finance blogs.
- Removed the upstream online curated service (Qiaomu picks, AI rewrite/translation, podcast transcripts, link collection lab). Everything now runs locally: subscriptions, reading, saving to notes.
- Rebranded plugin id to `stocks-ai-rss`; deep links are now `obsidian://stocks-ai-rss`.
- Fixed a discovery dedupe regression where same-name blogs from different sites merged.
