import { SignJWT, jwtVerify } from "jose";
import { getCloudflareContext } from "@opennextjs/cloudflare";

function key() {
  const { env } = getCloudflareContext();
  if (!env.GAME_SECRET) throw new Error("GAME_SECRET is not set");
  return new TextEncoder().encode(env.GAME_SECRET);
}

/** ゲーム開始時刻を署名して返す。スコア送信時に経過時間の検証に使う。 */
export async function issueStartToken(sub: string): Promise<string> {
  return new SignJWT({ startedAt: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(sub)
    .setExpirationTime("10m")
    .sign(key());
}

export async function readStartToken(
  token: string,
  sub: string,
): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { subject: sub });
    return typeof payload.startedAt === "number" ? payload.startedAt : null;
  } catch {
    return null;
  }
}
