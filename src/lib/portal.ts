// ถาม Class Portal ว่า Discord ID นี้ผูกกับพนักงานแล้วหรือยัง
// สัญญา: GET {PORTAL_URL}/api/directory/<discordId>  (Authorization: Bearer CLASS_API_KEY)
//   200 { linked: true, name }  = ผูกแล้ว · 404 = ยังไม่ผูก · 401 = key ผิด
import { env } from "../config";

export type Who = { name: string } | null;

export async function whois(discordId: string): Promise<Who> {
  const base = env("PORTAL_URL").replace(/\/+$/, "");
  const res = await fetch(`${base}/api/directory/${encodeURIComponent(discordId)}`, {
    headers: { Authorization: `Bearer ${env("CLASS_API_KEY")}` },
    signal: AbortSignal.timeout(2500),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Portal ตอบ ${res.status}`);
  const body = (await res.json()) as { linked?: boolean; name?: string };
  return body.linked ? { name: body.name ?? "พนักงาน" } : null;
}

// จำผล "ผูกแล้ว" ไว้ 60 วินาที (autocomplete ยิงถี่) — ผล "ยังไม่ผูก" ไม่จำ เพื่อให้ผูกเสร็จแล้วใช้ได้ทันที
const linked = new Map<string, { at: number; who: NonNullable<Who> }>();

export async function whoisCached(discordId: string): Promise<Who> {
  const hit = linked.get(discordId);
  if (hit && Date.now() - hit.at < 60_000) return hit.who;
  const who = await whois(discordId);
  if (who) linked.set(discordId, { at: Date.now(), who });
  else linked.delete(discordId);
  return who;
}
