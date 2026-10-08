import { createRemoteJWKSet, jwtVerify } from "jose";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type User = { sub: string; displayName: string };

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

// 公開ランキングに生のメールアドレスを出さないため、先頭を残して伏せる
function maskEmail(email: string): string {
  const local = email.split("@")[0] ?? "anonymous";
  return `${local.slice(0, 3)}***`;
}

/**
 * Cloudflare Access が付与する Cf-Access-Jwt-Assertion を検証してユーザーを返す。
 * 検証できなければ null (fail closed)。ローカル開発(next dev)のみダミーユーザーを返す。
 */
export async function getUser(request: Request): Promise<User | null> {
  if (process.env.NODE_ENV === "development") {
    return { sub: "dev-user", displayName: "dev***" };
  }

  const { env } = getCloudflareContext();
  const team = env.CF_ACCESS_TEAM_DOMAIN;
  const aud = env.CF_ACCESS_AUD;
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!team || !aud || !token) return null;

  let jwks = jwksCache.get(team);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`));
    jwksCache.set(team, jwks);
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://${team}`,
      audience: aud,
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    const sub = payload.sub ?? email;
    if (!sub) return null;
    return { sub, displayName: maskEmail(email || sub) };
  } catch {
    return null;
  }
}
