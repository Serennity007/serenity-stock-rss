# Release notes

## 1.1.2

- Group migration fixes: pre-1.1 category names in the remembered channel resolve to the merged group, and reopening the reader keeps a valid group selection (including empty or vault-only groups).
- 量子位 (QbitAI) loads again: feed requests that get a 403 are retried once with a browser User-Agent.
- Dead CSS trimmed (~9.5 KB) and image-retry button styles added.
- Docs: runtime catalog override is `finance-catalog.json` in the plugin folder (schema + `generated_at` freshness required); Japanese README brand typo fixed.

## 1.1.1

- Add 量子位 (QbitAI) to the AI & LLMs collection — catalog now ships 31 feeds.
- Discovery tab, card and subscription-group labels now match the actual category names.
- Plugin description updated to the five-theme positioning.

## 1.1.0

Five market themes: the bundled catalog grows from 16 to 30 hand-verified feeds.

- New collections: AI & LLMs (OpenAI, TechCrunch AI, Interconnects, Simon Willison), Semiconductors (SemiAnalysis, Tom's Hardware, SemiWiki, EE Times), Gold & crypto (MINING.com, FXStreet, The Block, Cointelegraph, Bitcoin Magazine, Decrypt), and Macro (CNBC Economy, Federal Reserve, SEC).
- Chinese finance and finance blogs remain as auxiliary collections.
- Discovery panel reorganized around the five themes; trilingual README (zh/en/ja) updated to match.

## 1.0.0

First release of Stocks AI RSS, a finance-focused fork of [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) (v0.26.2, GPL-3.0-only).

- Bundled finance catalog: 16 hand-verified feeds covering US markets (CNBC, MarketWatch, WSJ, Seeking Alpha, Fortune, Federal Reserve, SEC) and Chinese markets (华尔街见闻, 新浪财经, 钛媒体) plus finance blogs.
- Removed the upstream online curated service (Qiaomu picks, AI rewrite/translation, podcast transcripts, link collection lab). Everything now runs locally: subscriptions, reading, saving to notes.
- Rebranded plugin id to `stocks-ai-rss`; deep links are now `obsidian://stocks-ai-rss`.
- Fixed a discovery dedupe regression where same-name blogs from different sites merged.
