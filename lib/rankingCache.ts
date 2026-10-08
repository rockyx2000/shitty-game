import { getCloudflareContext } from "@opennextjs/cloudflare";

export type TopRow = { user_sub: string; display_name: string; ms: number };

const TOP_N = 20;
const TTL_SECONDS = 60;

// Cache API は colo ごと・カスタムドメインでのみ有効。next dev など無い環境では素通しにする
function cacheEntry(request: Request) {
  if (typeof caches === "undefined") return null;
  const cache = (caches as unknown as { default?: Cache }).default;
  if (!cache) return null;
  return {
    cache,
    key: new Request(new URL("/__cache/ranking", request.url)),
  };
}

/** 上位 TOP_N 件。キャッシュが効いている間は D1 を読まない (D1 は読んだ行数で課金)。 */
export async function getTopRanking(
  request: Request,
): Promise<{ rows: TopRow[]; hit: boolean }> {
  const entry = cacheEntry(request);
  const hit = entry && (await entry.cache.match(entry.key));
  if (hit) return { rows: (await hit.json()) as TopRow[], hit: true };

  const { env } = getCloudflareContext();
  const { results } = await env.DB.prepare(
    `SELECT user_sub, display_name, ms FROM bests ORDER BY ms ASC LIMIT ?`,
  )
    .bind(TOP_N)
    .all<TopRow>();

  if (entry) {
    await entry.cache.put(
      entry.key,
      new Response(JSON.stringify(results), {
        headers: { "Cache-Control": `public, max-age=${TTL_SECONDS}` },
      }),
    );
  }
  return { rows: results, hit: false };
}

/** 記録が更新されたとき、この colo のキャッシュを捨てる (他 colo は TTL で追随) */
export async function invalidateTopRanking(request: Request): Promise<void> {
  const entry = cacheEntry(request);
  if (entry) await entry.cache.delete(entry.key);
}
