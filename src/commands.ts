// คำสั่ง slash ของบอท — เพิ่มคำสั่งใหม่ตามแบบ ping/whoami แล้วใส่ใน commands ด้านล่าง
// เพิ่ม/แก้คำสั่งแล้ว ต้อง deploy และรัน npm run register ให้ Discord รู้จัก
import { env } from "./config.js";
import { whoisCached } from "./lib/portal.js";

/** ข้อมูลของคนที่เรียกคำสั่ง — userId มาจากข้อมูลที่ Discord เซ็นรับรอง ไม่ใช่ข้อความที่พิมพ์ */
export interface Ctx {
  userId: string;
  /** ค่าของ option ที่ผู้ใช้กรอก (undefined ถ้าไม่ได้กรอก) */
  option(name: string): string | undefined;
}

export interface Command {
  def: { name: string; description: string; type: 1; options?: unknown[] };
  /** true = ตอบทันที (ต้องเสร็จใน 3 วินาที) · ไม่ใส่ = Discord ได้ "กำลังคิด…" ก่อน แล้วค่อยแก้เป็นคำตอบ (เห็นเฉพาะผู้พิมพ์) */
  immediate?: boolean;
  run(ctx: Ctx): Promise<string>;
  /** ตัวช่วยเติมคำ (ต้องตอบใน 3 วินาที) — ใช้กับ option ที่ตั้ง autocomplete: true */
  autocomplete?(ctx: Ctx, focused: { name: string; value: string }): Promise<{ name: string; value: string }[]>;
}

/**
 * ตรวจว่า Discord ของผู้ใช้ผูกกับ Class Portal แล้วหรือยัง — ปิดไว้ก่อนเสมอ (ตรวจไม่ได้ = ปฏิเสธ)
 * ตัวอย่าง: const g = await gate(ctx.userId); if (!g.ok) return g.message;
 */
export async function gate(userId: string): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
  try {
    const who = await whoisCached(userId);
    if (who) return { ok: true, name: who.name };
    return { ok: false, message: `ยังใช้คำสั่งนี้ไม่ได้ เพราะ Discord ของคุณยังไม่ผูกกับ Class Portal\nเปิด ${env("PORTAL_URL")} → Sign in with Google → Connect Discord แล้วลองใหม่` };
  } catch (err) {
    console.error("[gate]", err instanceof Error ? err.message : err);
    return { ok: false, message: "ตรวจตัวตนไม่ได้ชั่วคราว (Portal ไม่ตอบ) ลองใหม่อีกครั้งในอีกสักครู่" };
  }
}

const ping: Command = {
  def: { name: "ping", description: "ทดสอบว่าบอทตอบได้", type: 1 },
  immediate: true,
  async run() {
    return "pong";
  },
};

const whoami: Command = {
  def: { name: "whoami", description: "ดูว่าบอทรู้จักคุณคือใคร (ผูกบัญชีที่ Portal แล้วหรือยัง)", type: 1 },
  async run(ctx) {
    const g = await gate(ctx.userId);
    return g.ok ? `คุณคือ ${g.name}` : g.message;
  },
};

export const commands: Command[] = [ping, whoami];
