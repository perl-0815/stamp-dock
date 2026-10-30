# STAMPDOCK

エンジニアのためのスタンプ工房。Next.js 16 / App Router / React 19 / TypeScriptで作成しています。128種類のテンプレートの検索、編集、自作、PNG・ZIPダウンロードに対応します。

## 起動

Node.js **26系のLTS**を使います。ローカルの確認済みバージョンは**26.13.0**です。

| 設定 | バージョン |
| --- | --- |
| ローカルの基準（`.nvmrc` / `.node-version`） | `26.13.0` |
| `package.json`の`engines.node` | `26.x` |
| VercelのNode.js Version | `26.x` |

現在のMacはHomebrewのNodeを使用しています。更新・確認は次の手順です。

```sh
brew update
brew upgrade node
node --version # このプロジェクトではv26系であることを確認
npm --version
```

新しく環境を用意する場合は、`.nvmrc`または`.node-version`に対応するバージョン管理ツールで26.13.0を選択してください。nvmを使用している場合は、プロジェクト内で`nvm install`、`nvm use`を実行します。Homebrewの`node`が将来別のメジャーへ更新された場合も、プロジェクトの指定を優先します。

Nodeを切り替えた後に依存関係を入れ直して起動します。

```sh
npm ci
npm run dev
```

http://127.0.0.1:5217 を開いてください。

```sh
npm run check  # TypeScriptと描画エンジンの構文確認
npm run build  # Next.jsの本番ビルド。out/へ静的出力
npm start      # out/をローカルで確認（同じポート）
```

`next.config.ts`で`output: 'export'`を設定しています。配信対象は`out/`で、VercelなどのNext.js対応ホスティングでも、静的ファイルを配信できる環境でも配置できます。`npm start`は静的出力を確認するサーバーです。`PORT=5220 npm start`でプレビューのポートを変更できます。

VercelではSettings → Build and Deployment → Node.js Versionを`26.x`に揃えます。`engines.node`も`26.x`として、将来のメジャー更新を自動で選択させない設定です。Vercel側のマイナー・パッチ版はプラットフォームが更新するため、ローカルの26.13.0と完全一致するとは限りません。[VercelのNode.jsバージョン指定](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

## 機能

- LGTM、解決済み、APPROVED、WIP、ありがとうなど128種類、6カテゴリ。
- 全角・半角、大文字・小文字をそろえた検索。複数語は空白区切りでAND検索。
- お気に入り、マイスタンプをブラウザに保存。マイスタンプは最大60個。
- スタンダード / コードレビュー / タスク進行 / リリース・運用 / チームの会話 / ひとやすみの6つのパック。各16個の透過PNGをZIPでまとめて保存。
- パックの全16個をプレビューし、128〜2048pxの解像度を選択。生成中は進捗を表示し、キャンセルや再試行にも対応。
- 文言とサブテキストはそれぞれ40文字まで。改行にも対応。
- ラバースタンプ、ポップ、認定バッジ、ターミナル、ピクセル、手描き風、まる印、インパクトの8スタイル。
- 配色、4書体、文字サイズ、傾き、透明・白・単色背景の編集。
- 128 / 256 / 512 / 1024 / 2048 pxの正方形PNG。チェック模様は画像に含まれません。
- テンプレートから編集しても書体・傾きを維持。プレビューとダウンロードは同一Canvas描画を使用。
- PC・スマートフォン表示、キーボード操作、動きを減らす設定に対応。

スタンプの内容、保存データを外部に送信する処理はありません。お気に入りとマイスタンプは端末間で同期せず、ブラウザのサイトデータを削除すると失われます。Sitesの個人用公開ではホスティング側の認証が別途適用されます。

## 構成

```text
src/app/                  App Routerのページ・レイアウト・CSS
src/components/StampApp    検索・保存・ダウンロードのReact状態管理
src/components/StampLibrary / StampPacks / StampEditor
                          各画面の制御コンポーネント
src/components/StampCanvas / StampDialogs
                          Canvasのライフサイクル・ダイアログ
src/lib/                  型定義・既存の保存データとの互換処理
public/assets/render.js    共通Canvas描画・PNG生成
public/assets/templates.js テンプレート・カテゴリ・スタイル
public/assets/packs.js     用途別パックの構成
public/assets/archive.js   PNGの一括生成・ZIP作成
public/assets/fonts/       同梱フォント
public/assets/licenses/    フォントライセンス
scripts/serve.mjs          本番静的出力を確認するサーバー
tests/                    ブラウザによる操作・画像検証
.openai/hosting.json       SitesのプロジェクトIDと静的配信設定
```

画面とイベントはReactが管理し、Canvasの描画はClient ComponentのEffect内で実行します。旧HTMLやDOMを直接書き換えるアプリは使用していません。描画・PNG・ZIP生成は移行前と同じエンジンを使い、共有モジュールにはTypeScriptの型定義を付けています。

お気に入りとマイスタンプは従来の`stampdock-favorites-v1` / `stampdock-custom-v1`をそのまま読み書きします。同じURL・ブラウザで利用すれば、移行前のデータを引き継げます。

フォントはM PLUS Rounded 1c 700とDela Gothic One 400を同梱し、外部のフォント配信に依存しません。明朝体は端末の書体を使用します。

## 検証

```sh
npm ci
npx playwright install chromium # 初回のみ
npm run check
npm test
npm run build
npm run test:production
```

テストは独立したブラウザコンテキストで実行します。検索、カテゴリ、ページ追加、お気に入りの永続化、実ファイルのダウンロード、5解像度・透過・背景、8種類のテンプレート編集時の画像一致、自作の保存・更新・削除、空入力、キーボード、破損データ、320〜1440px幅、アセットの読込を検証します。

開発サーバーを停止してから`test:production`を実行すると、Next.jsが出力した`out/`を配信して同じテストを行います。移行用のテストでは、初期HTMLがNext.jsから生成されていること、旧データの読み込み・更新、編集途中の移動と最新プレビューのPNG保存も確認します。

パックのテストではPython 3の標準`zipfile`で、実際のZIPダウンロードを展開してCRC、全16枚のPNG、解像度、一覧の内容を確認します。128pxで全6パックと、2048pxでスタンダードパックを検証し、生成のキャンセル・失敗・再試行、途中で解像度を変更したときの挙動も確認します。

ローカルのChromiumで確認済み。Safariは初期画面の描画を目視確認済み。Safariでの全操作、Firefox、実機タッチや保存先ダイアログは未検証です。

構成の参照：[Next.jsの静的出力](https://nextjs.org/docs/app/guides/static-exports)、[Server / Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)。
