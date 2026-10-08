import { getUser } from "@/lib/auth";
import { issueStartToken } from "@/lib/gameToken";

export async function POST(request: Request) {
  const user = await getUser(request);
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ token: await issueStartToken(user.sub) });
}
