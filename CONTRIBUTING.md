# Contributing

Stocks AI RSS is a community fork of [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) (GPL-3.0-only). Contributions to the finance-specific parts are welcome: use feature branches and pull requests. Run `npm ci` then `npm run check` (lint + tests + build). Test UI changes in a separate Obsidian vault, including narrow panes, light/dark themes, offline behaviour, list thumbnails, and repeated Daily Note actions.

To add or fix a feed in the bundled catalog, edit `src/data/finance-feeds.json` and verify the feed returns XML over HTTPS before opening a PR. Feeds that only work through a self-hosted RSSHub belong in the README list, not the catalog.

Keep runtime code independent of Node.js/Electron so mobile support remains possible. Never execute remote scripts, render external Markdown through executable plugin processors, or upload vault content.

For a release, update `package.json`, `package-lock.json`, `manifest.json` and `versions.json` together, then create the version tag without a `v` prefix — CI attaches `main.js`, `manifest.json`, and `styles.css` to a draft release.
