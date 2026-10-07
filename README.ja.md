**[中文](README.md) | [English](README.en.md) | [日本語](README.ja.md)**

<div align="center">

# 📈 Stocks AI RSS

**Obsidian で米国株・中国 A 株の金融ニュースを読む RSS リーダー**

[![Release](https://img.shields.io/github/v/release/Serennity007/stocks-ai-rss?logo=github)](https://github.com/Serennity007/stocks-ai-rss/releases)
[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0--only-blue.svg)](LICENSE)
![Obsidian](https://img.shields.io/badge/Obsidian-%E2%89%A51.13.0-purple?logo=obsidian)
[![Upstream: Qiaomu AI RSS](https://img.shields.io/badge/fork%20of-Qiaomu%20AI%20RSS-orange)](https://github.com/joeseesun/qiaomu-ai-rss)
![言語](https://img.shields.io/badge/%E8%A8%80%E8%AA%9E-%E4%B8%AD%E6%96%87%20%7C%20EN%20%7C%20JA-orange)

*無料 · オープンソース · アカウント不要 · 完全ローカル*

</div>

---

市況ニュースは十数個のアプリに散らばり、ノートは Obsidian にある——ならば、ニュースをそのままナレッジベースに流し込めばいい。

**Stocks AI RSS** は米国株・中国 A 株の市況ニュースを Obsidian に取り込むプラグインです。検証済みの金融フィード 13 件を内蔵し、価値のある記事はワンクリックで Markdown ノートに、気になる一節はデイリーノートに保存できます。[Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) の洗練されたリーディング体験をベースに、投資リサーチ向けに再構成しました。

## ✨ 主な機能

- 📊 **金融フィード内蔵、すぐに使える** — CNBC、MarketWatch、WSJ、Seeking Alpha、米連邦準備制度、SEC、華爾街見聞、新浪財経、鉄媒体など 13 フィード。すべて HTTPS 直接接続を検証済みで、フィード URL を探す手間なし。
- ✍️ **読みながらメモ** — 記事をワンクリックで Markdown ノートに保存（画像もローカル化）、選択した一節はデイリーノートに追記、PDF 書き出しにも対応。元記事へのリンクも保持。
- 🗂️ **サブスクリプション整理** — グループ管理、OPML 入出力、保管庫内フォルダーをソースとして登録（クリップした Markdown もリーダーで読めます）。
- 📖 **快適な読書体験** — 7 テーマ、8 書体（朱雀仿宋サブセット同梱）、文字サイズ・行間・版幅の調整、J/K キーボード操作。
- 🔒 **完全ローカル** — アカウント不要、サーバー依存なし。既読・お気に入り・キャッシュはすべて保管庫内に保存。

## 📊 内蔵フィード

| カテゴリ | フィード |
| --- | --- |
| **米国・グローバル** | CNBC (Top News / Markets / Earnings)、MarketWatch、WSJ Markets、WSJ Opinion、Seeking Alpha、Fortune |
| **経済・マクロ** | CNBC Economy、米連邦準備制度理事会 (Federal Reserve)、SEC プレスリリース |
| **中国市場** | 華爾街見聞 (Wallstreetcn)、新浪財経、鉄媒体 (TMTPost) |
| **金融ブログ** | A Wealth of Common Sense (Ben Carlson)、The Reformed Broker (Josh Brown) |

> 雪球・財聯社・澎湃など公式 RSS のないサイトは、自前の [RSSHub](https://docs.rsshub.app/) で生成した URL を「探索」パネルに貼り付けて追加できます。

## 🚀 インストール

**方法 1：BRAT（推奨、自動更新）**

1. [BRAT](https://github.com/TfTHacker/obsidian42-brat) プラグインをインストール
2. BRAT 設定 → *Add Beta plugin* → `Serennity007/stocks-ai-rss` を入力
3. コミュニティプラグイン設定で有効化

**方法 2：手動**

1. [Releases](https://github.com/Serennity007/stocks-ai-rss/releases) から `main.js`・`manifest.json`・`styles.css` をダウンロード
2. `<vault>/.obsidian/plugins/stocks-ai-rss/` に配置
3. 設定 → コミュニティプラグイン → **Stocks AI RSS** を有効化

> 上流の [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss)（Obsidian 公式プラグインストアで入手可能）と ID が異なるため、両方の併用が可能です。

## ❓ FAQ

**なぜ PR ではなく fork なのか？**
上流の Qiaomu AI RSS は海外 AI ニュース向けで、厳選コンテンツは作者のサーバーから配信されます。本フォークは投資リサーチという別のユースケース向けのため、サーバー依存を外して完全ローカルの金融リーダーとして独立させました。上流サービスに無関係な負荷を掛けないためでもあります。

**データは安全？**
このプラグイン自身にサーバーはありません。サブスクリプションはユーザーが追加したフィード URL で、記事は保管庫内の `.obsidian/plugins/stocks-ai-rss/` に保存されます。プラグインをアンインストールしても保存済みノートには影響しません。

**上流との違いは？**

| | 上流 Qiaomu AI RSS | 本フォーク |
| --- | --- | --- |
| コンテンツ | Qiaomu 厳選（オンライン）+ 個人フィード | 個人フィード + 内蔵金融カタログ |
| 中国語 AI リライト/翻訳 | あり（サーバー生成） | なし、原文のみ |
| ポッドキャスト文字起こし、リンク収集ラボ | あり | 削除 |
| ネットワーク依存 | 厳選コンテンツは要オンライン | 購読したフィードのみ |

## 🛠️ 開発

```bash
npm ci
npm run check   # eslint + vitest + tsc + esbuild
```

内蔵カタログは [`src/data/finance-feeds.json`](src/data/finance-feeds.json) にあります。フィードの追加・修正には利用可能かの検証を添えてください。詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照。PR を歓迎します！

## 🙏 謝辞

- [向阳乔木 (@joeseesun)](https://github.com/joeseesun) 氏の [Qiaomu AI RSS](https://github.com/joeseesun/qiaomu-ai-rss) — 本プロジェクトは v0.26.2 のフォークで、リーディング体験のほとんどは上流の優れた設計によるものです。
- 同梱の朱雀仿宋フォントサブセットは [朱雀仿宋](https://github.com/TrionesType/zhuque)（SIL OFL 1.1）に基づきます。

## 📄 ライセンス

[GPL-3.0-only](LICENSE)。上流コードの著作権は 向阳乔木 氏に帰属し、本フォークの変更部分はリポジトリ作者に帰属します。サードパーティ表記：[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
