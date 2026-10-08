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
2. スコア署名用シークレットを登録
   ```bash
   openssl rand -hex 32 | npx wrangler secret put GAME_SECRET
   ```
3. `npm run deploy` (初回デプロイで Worker の URL / ドメインが決まる)
4. Zero Trust ダッシュボードで設定
   - Settings > Authentication > Login methods に **Google** を追加
   - Access > Applications > Add > Self-hosted: デプロイ先ドメインを指定し、許可ポリシー(例: メールドメイン)を作成
   - 作成したアプリの **Application Audience (AUD) Tag** と、チームドメイン(`xxx.cloudflareaccess.com`)を
     `wrangler.jsonc` の `CF_ACCESS_AUD` / `CF_ACCESS_TEAM_DOMAIN` に設定して再デプロイ

アプリは `Cf-Access-Jwt-Assertion` を JWKS で検証し、検証できないリクエストは 401 にする(fail closed)。
`next dev` のときだけ認証をバイパスする。

## スコアの不正対策

`/api/game/start` が署名付き開始時刻を発行し、`/api/scores` が申告タイムとサーバー側経過時間の整合性と下限を検証する。
クライアントを完全に信用しない程度の対策で、本格的なチート対策はしていない。
