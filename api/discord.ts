// Interactions Endpoint: Discord ส่ง HTTP POST มาที่นี่ทุกครั้งที่มีคนใช้คำสั่ง/กดปุ่ม
// ตั้งค่าใน Discord Developer Portal → General Information → Interactions Endpoint URL = https://<โปรเจกต์>.vercel.app/api/discord
// กติกา: ตรวจลายเซ็นทุกคำขอ · ต้องตอบภายใน 3 วินาที (คำสั่งที่ช้าให้ตอบรับก่อนแล้วทำต่อด้วย waitUntil)
import { waitUntil } from "@vercel/functions";
import { commands, type Command, type Ctx } from "../src/commands";
import { EPHEMERAL, clip, editOriginal, verifyDiscordRequest } from "../src/lib/discord";

const byName = new Map(commands.map((c) => [c.def.name, c]));

const json = (body: unknown) => Response.json(body);
const message = (content: string) => json({ type: 4, data: { content: clip(content), flags: EPHEMERAL, allowed_mentions: { parse: [] } } });

function makeCtx(i: any): Ctx {
  const options: { name: string; value?: unknown }[] = i.data?.options ?? [];
  return {
    userId: i.member?.user?.id ?? i.user?.id ?? "",
    option: (name) => {
      const v = options.find((o) => o.name === name)?.value;
      return v === undefined || v === null ? undefined : String(v);
    },
  };
}

async function runDeferred(cmd: Command, ctx: Ctx, i: any): Promise<void> {
  let content: string;
  try {
    content = await cmd.run(ctx);
  } catch (err) {
    console.error(`[/${cmd.def.name}]`, err instanceof Error ? err.message : err);
    content = "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
  }
  try {
    await editOriginal(i, content);
  } catch (err) {
    console.error("[editOriginal]", err instanceof Error ? err.message : err);
  }
}

async function handle(i: any): Promise<Response> {
  if (i.type === 1) return json({ type: 1 }); // PING (Discord ใช้ตรวจ URL ตอนบันทึก)

  if (i.type === 2) {
    // คำสั่ง slash
    const cmd = byName.get(i.data?.name);
    if (!cmd) return message("ไม่รู้จักคำสั่งนี้ (ลอง npm run register ใหม่)");
    const ctx = makeCtx(i);
    if (cmd.immediate) return message(await cmd.run(ctx).catch(() => "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง"));
    waitUntil(runDeferred(cmd, ctx, i)); // ทำต่อหลังตอบรับ (ใช้เวลาได้ถึงเพดานของฟังก์ชัน)
    return json({ type: 5, data: { flags: EPHEMERAL } }); // "กำลังคิด…" เห็นเฉพาะผู้พิมพ์
  }

  if (i.type === 4) {
    // autocomplete — ต้องตอบทันที
    const cmd = byName.get(i.data?.name);
    const focused = (i.data?.options ?? []).find((o: any) => o.focused);
    if (!cmd?.autocomplete || !focused) return json({ type: 8, data: { choices: [] } });
    const choices = await cmd.autocomplete(makeCtx(i), { name: focused.name, value: String(focused.value ?? "") }).catch(() => []);
    return json({ type: 8, data: { choices: choices.slice(0, 25) } });
  }

  if (i.type === 3) {
    // ปุ่ม: เช่น "หยุดรับ" (customId stop:<id>) ให้เพิ่มตรงนี้ — ตอบ { type: 7, data } เพื่ออัปเดตข้อความเดิม
    return json({ type: 6 });
  }

  return message("ยังไม่รองรับการใช้งานแบบนี้");
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const body = await request.text();
    if (!verifyDiscordRequest(body, request.headers.get("x-signature-ed25519"), request.headers.get("x-signature-timestamp"))) {
      return new Response("invalid request signature", { status: 401 });
    }
    try {
      return await handle(JSON.parse(body));
    } catch (err) {
      console.error("[discord]", err instanceof Error ? err.message : err);
      return message("เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    }
  },
};
