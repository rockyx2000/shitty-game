# 逃げるボタン

逃げ回るスタートボタンを5ステージ捕まえ、合計タイムを競うクソゲー。
Next.js + MUI + Cloudflare Workers / D1 / Access(Zero Trust, Google ログイン)。

## ローカル開発

```bash
npm install
npm run db:local   # ローカル D1 にマイグレーション適用
npm run dev        # http://localhost:3000 (認証はダミーユーザー)
```

`.dev.vars` に `GAME_SECRET` が必要(開発用の値を同梱)。

## Cloudflare へデプロイ

1. D1 を作成し、出力された `database_id` を `wrangler.jsonc` に設定
   ```bash
   npx wrangler d1 create shitty-game
   npm run db:remote
   ```
   `d1 create` の対話プロンプトの注意:
   - 「Wrangler に wrangler.jsonc へ追記させるか」は **No** にする(Yes だと別名のバインディングが重複追加される。追記されたら `binding` が `DB` 以外のエントリを削除する)。
     コードは `env.DB` を参照するので、バインディング名は必ず `DB`。
   - 「ローカル開発でリモートのリソースに接続するか」は **N**(Yes だとローカル開発が本番D1を書き換える)。
2. スコア署名用シークレットを登録
   ```bash
   openssl rand -hex 32 | npx wrangler secret put GAME_SECRET
   ```
3. `npm run deploy` (`wrangler.jsonc` の `routes` で `game.example.com` をカスタムドメインとして割り当てる。`workers.dev` は無効)
4. Zero Trust ダッシュボードで設定
   - Settings > Authentication > Login methods に **Google** を追加
   - Access > Applications > Add > Self-hosted: `game.example.com` を指定し、許可ポリシー(例: メールドメイン)を作成
   - 作成したアプリの **Application Audience (AUD) Tag** と、チームドメイン(`xxx.cloudflareaccess.com`)を
     `wrangler.jsonc` の `CF_ACCESS_AUD` / `CF_ACCESS_TEAM_DOMAIN` に設定して再デプロイ

アプリは `Cf-Access-Jwt-Assertion` を JWKS で検証し、検証できないリクエストは 401 にする(fail closed)。
`next dev` のときだけ認証をバイパスする。

## スコアの不正対策

`/api/game/start` が署名付き開始時刻を発行し、`/api/scores` が申告タイムとサーバー側経過時間の整合性と下限を検証する。
クライアントを完全に信用しない程度の対策で、本格的なチート対策はしていない。
