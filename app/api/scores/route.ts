import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUser } from "@/lib/auth";
import { readStartToken } from "@/lib/gameToken";
import { getTopRanking, invalidateTopRanking } from "@/lib/rankingCache";

const MIN_MS = 1500; // 5ステージ分として人間に物理的に不可能な値は弾く

export async function GET(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { env } = getCloudflareContext();

  // 上位はキャッシュ / 自分の記録は主キーで1行 (D1 は読んだ行数で課金)
  const [{ rows, hit }, mine] = await Promise.all([
    getTopRanking(request),
    env.DB.prepare(`SELECT ms FROM bests WHERE user_sub = ?`)
      .bind(user.sub)
      .first<{ ms: number }>(),
  ]);

  // 圏外の順位は件数を数える全走査になるため出さない
  const idx = rows.findIndex((r) => r.user_sub === user.sub);

  return Response.json(
    {
      ranking: rows.map((r, i) => ({ rank: i + 1, name: r.display_name, ms: r.ms })),
      me: { name: user.displayName, best: mine?.ms ?? null, rank: idx >= 0 ? idx + 1 : null },
    },
    { headers: { "X-Ranking-Cache": hit ? "HIT" : "MISS" } },
  );
}

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
    ms?: unknown;
  } | null;
  if (typeof body?.token !== "string" || typeof body.ms !== "number") {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const startedAt = await readStartToken(body.token, user.sub);
  if (startedAt === null) {
    return Response.json({ error: "invalid token" }, { status: 400 });
  }

  // クライアント申告値はサーバー側の経過時間と矛盾してはいけない
  const elapsed = Date.now() - startedAt;
  const ms = Math.round(body.ms);
  if (ms < MIN_MS || ms > elapsed + 500 || ms < elapsed - 3000) {
    return Response.json({ error: "rejected" }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  // 記録更新時のみ書き込む (更新なしなら行は書かれない)
  const result = await env.DB.prepare(
    `INSERT INTO bests (user_sub, display_name, ms, updated_at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(user_sub) DO UPDATE SET
       ms = excluded.ms, display_name = excluded.display_name, updated_at = excluded.updated_at
     WHERE excluded.ms < bests.ms`,
  )
    .bind(user.sub, user.displayName, ms, Date.now())
    .run();
  if (result.meta.changes > 0) await invalidateTopRanking(request);

  return Response.json({ ok: true, ms });
}
