# Release notes

## 1.1.5

- 中文财经 group: 新浪财经 replaced by 界面新闻. The Sina feed answers 200 with valid RSS but has served zero items and a 2018 `pubDate` for years, so it never appeared in the reader.
- Catalog still ships 45 feeds; no other source changed.

## 1.1.4

- Reader view type is now `stocks-ai-rss-reader`; a pane left in your workspace from the previous build closes itself on startup instead of showing an unknown view.
- Upstream attribution moved out of the READMEs and out of the plugin's About/settings text into a single notice block at the end of LICENSE.
- Bundled reading font file renamed; the font, its SIL OFL 1.1 license and the embedded notices are unchanged.
- Includes the unreleased 1.1.3 work: 日本語 and Español discovery collections, and the catalog growing to 45 hand-verified feeds.

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

First release of Stocks AI RSS, a finance-focused Obsidian reader built on the upstream GPL-3.0 reader project (source notice: [LICENSE](../LICENSE)).

- Bundled finance catalog: 16 hand-verified feeds covering US markets (CNBC, MarketWatch, WSJ, Seeking Alpha, Fortune, Federal Reserve, SEC) and Chinese markets (华尔街见闻, 新浪财经, 钛媒体) plus finance blogs.
- Removed the upstream online curated service (editorial picks, AI rewrite/translation, podcast transcripts, link collection lab). Everything now runs locally: subscriptions, reading, saving to notes.
- Rebranded plugin id to `stocks-ai-rss`; deep links are now `obsidian://stocks-ai-rss`.
- Fixed a discovery dedupe regression where same-name blogs from different sites merged.
