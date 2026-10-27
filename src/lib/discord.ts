// ส่วนที่ต้องถูกต้องเสมอ: ตรวจลายเซ็นของ Discord · เรียก Discord REST · แก้ข้อความตอบ
// บอทนี้ไม่ได้ "ต่อค้าง" กับ Discord (ไม่มี Gateway) Discord ส่ง HTTP มาหา /api/discord ทุกครั้งที่มีคนใช้คำสั่ง
import { createPublicKey, verify } from "node:crypto";
import { env } from "../config";

export const API = "https://discord.com/api/v10";
export const EPHEMERAL = 64; // flag: ข้อความที่เห็นเฉพาะผู้เรียกคำสั่ง
export const clip = (s: string, n = 1900) => (s.length > n ? `${s.slice(0, n - 1)}…` : s); // ข้อความ Discord ยาวสุด 2,000 ตัวอักษร

// Ed25519 public key แบบ raw 32 ไบต์ → รูปแบบ SPKI DER ที่ Node ใช้ได้
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/** ตรวจว่าคำขอมาจาก Discord จริง (ไม่ผ่านต้องตอบ 401 เสมอ — Discord จะส่งคำขอลายเซ็นปลอมมาทดสอบเราเอง) */
export function verifyDiscordRequest(body: string, signature: string | null, timestamp: string | null): boolean {
  if (!signature || !timestamp) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([SPKI_PREFIX, Buffer.from(env("DISCORD_PUBLIC_KEY"), "hex")]), format: "der", type: "spki" });
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

/** เรียก Discord REST ด้วย bot token (ส่ง DM, ลงทะเบียนคำสั่ง ฯลฯ) */
export async function discordApi(method: string, path: string, body?: unknown): Promise<{ status: number; json: any }> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bot ${env("DISCORD_BOT_TOKEN")}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  return { status: res.status, json: text ? safeJson(text) : null };
}

const safeJson = (t: string) => {
  try {
    return JSON.parse(t);
  } catch {
    return { raw: t.slice(0, 200) };
  }
};

/** แก้ข้อความ "กำลังคิด…" ให้เป็นคำตอบจริง (โทเคนของคำสั่งใช้ได้ 15 นาที ไม่ต้องใช้ bot token) */
export async function editOriginal(interaction: { token: string }, content: string): Promise<void> {
  const res = await fetch(`${API}/webhooks/${env("DISCORD_APP_ID")}/${interaction.token}/messages/@original`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: clip(content), allowed_mentions: { parse: [] } }), // กัน @everyone จากข้อความที่ AI เขียน
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`แก้ข้อความตอบไม่สำเร็จ (HTTP ${res.status})`);
}
