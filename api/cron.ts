// Vercel Cron เรียกที่นี่ด้วย GET ตามเวลาใน vercel.json (ตอนนี้ 02:00 UTC = 09:00 เวลาไทย วันละครั้ง)
// แผน Hobby: วันละครั้งเท่านั้น และเวลาคลาดได้ ±59 นาที (ตั้งถี่กว่านี้ deploy จะล้ม) · ส่งพลาด/ส่งซ้ำได้ → ต้องเขียนให้ทำซ้ำได้โดยไม่เสียหาย
// ?force=1 (พร้อม secret) = สั่งรันเองทันที ใช้ตอนทดสอบ: npm run cron:test
import { env } from "../src/config.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const secret = env("CRON_SECRET");
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
    // W3 ขั้น Push: ส่ง Weekly Brief ให้ผู้ที่สมัครไว้และถึงเวลา ที่นี่
    return Response.json({ ok: true, force: new URL(request.url).searchParams.get("force") === "1", note: "ยังไม่ได้ทำส่วนส่ง Brief" });
  },
};
