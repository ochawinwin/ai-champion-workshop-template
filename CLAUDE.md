# กติกาสำหรับ Claude Code ในโปรเจกต์นี้

บอท Discord ของ workshop ที่รันบน **Vercel** (Interactions endpoint + Vercel Cron) ผู้ใช้เป็นผู้เรียนที่ไม่ใช่นักพัฒนา อธิบายสั้น ๆ เป็นภาษาไทยง่าย ๆ และบอกก่อนเสมอว่าจะรันคำสั่งอะไร ก่อนเขียนโค้ดใหญ่ให้วางแผนและรอผู้ใช้อนุมัติ หลังแก้โค้ดรัน `npm run typecheck`

## ห้ามเด็ดขาด
- **ห้ามเปิดอ่าน แก้ หรือแสดงเนื้อหาไฟล์ `.env` และ `.env.*`** (ยกเว้น `.env.example`) ผู้ใช้วางค่าเอง ถ้าต้องตรวจค่า ให้บอกผู้ใช้ว่าต้องดูตัวแปรชื่ออะไร
- **ห้ามใส่ key / token / รหัสผ่าน** ในโค้ด คอมมิต log หรือข้อความที่บอทส่งออก
- **ห้าม commit หรือ push** `.env.local` ก่อน `git add` ให้ตรวจ `git status`
- **ทุกการอ่าน BigQuery ต้องผ่าน `runQuery`** (`src/lib/bq.ts`): อ่านอย่างเดียว · parameterized (ห้ามต่อสตริงจากผู้ใช้เข้า SQL) · ห้าม `SELECT *` · ใส่ filter partition ทุกครั้งที่ตารางบังคับ · ห้ามคืน `customer_key` ถ้าไม่แน่ใจเรื่องตาราง/คอลัมน์/นิยาม ให้ถาม ห้ามเดา
- **ห้ามถอดรหัส** `customer_key` หรือเสนอให้ถอด
- **ห้ามมี tool ที่รับ SQL ดิบ** (`run_sql`) หรือรับตัวตนผู้ใช้เป็นพารามิเตอร์ ตัวตนต้องมาจาก `ctx.userId` (Discord เซ็นรับรอง) ผ่าน `gate()` เท่านั้น
- **ห้ามใช้ `@everyone` / `@here`** ข้อความที่บอทส่งต้องมี `allowed_mentions` ปิด (ยกเว้น mention เฉพาะผู้รับในข้อความ fallback)
- **ห้ามตัดการตรวจลายเซ็น** ใน `api/discord.ts` และห้ามเปิด `/api/cron` โดยไม่เช็ก `CRON_SECRET`

## ข้อจำกัดของ Vercel (ออกแบบให้ถูกตั้งแต่แรก)
- **ไม่มีบอทที่ต่อค้างกับ Discord** (ไม่ใช้ discord.js Client / Gateway) Discord ส่ง HTTP มาที่ `api/discord.ts` ต้องตอบภายใน **3 วินาที** คำสั่งที่ช้าให้ใช้ `Command.run` ปกติ (ระบบตอบรับ "กำลังคิด…" แล้วทำต่อด้วย `waitUntil`) ส่วน `immediate: true` และ `autocomplete` ต้องเสร็จเร็วมาก
- **ไม่มีไฟล์ถาวรและไม่มีตัวแปรในหน่วยความจำที่เชื่อได้** แต่ละคำขออาจรันคนละ instance ของที่ต้องจำ (watchlist, การสมัครรับ Brief) เก็บใน Postgres ผ่าน `DATABASE_URL` (Supabase) ใช้ `pg` กับ `attachDatabasePool` จาก `@vercel/functions` สร้างตารางด้วย `CREATE TABLE IF NOT EXISTS`
- **ไม่มีตัวตั้งเวลาในโปรเซส** ใช้ Vercel Cron (`vercel.json`) เรียก `api/cron.ts` ด้วย GET พร้อม `Authorization: Bearer <CRON_SECRET>` แผน Hobby **วันละครั้งเท่านั้น เวลาคลาดได้ ±59 นาที** ห้ามตั้ง schedule ถี่กว่านี้ (deploy จะล้ม) การเรียกอาจพลาดหรือซ้ำได้ จึงต้องเขียนให้ทำซ้ำได้โดยไม่เสียหาย (เก็บเวลา/วันที่ส่งล่าสุดต่อผู้สมัคร และส่งเฉพาะที่ถึงเวลาและยังไม่ได้ส่ง) · `?force=1` (พร้อม secret) = ส่งให้ทุกคนที่สมัครไว้ทันที ใช้ทดสอบ
- **รันในเครื่องไม่ได้** Discord ต้องเรียกเว็บที่เข้าถึงได้จากอินเทอร์เน็ต วิธีทดสอบคือ push ขึ้น GitHub ให้ Vercel deploy อัตโนมัติ แล้วลองใน Discord · แก้ environment variable ใน Vercel แล้วต้อง Redeploy
- เพิ่ม/แก้คำสั่งใน `src/commands.ts` แล้วต้องรัน `npm run register` · ส่ง DM ใช้ `discordApi` (`POST /users/@me/channels` แล้ว `POST /channels/{id}/messages`) ถ้า Discord ตอบ code `50007` (DM ไม่เข้า) ให้โพสต์ในช่อง `DISCORD_FALLBACK_CHANNEL_ID` โดย mention เฉพาะผู้ใช้คนนั้น

## กติกาตอนสร้างฟีเจอร์
- คำสั่งที่ต้องล็อกอินให้เริ่มด้วย `const g = await gate(ctx.userId); if (!g.ok) return g.message;` (ปิดไว้ก่อนเสมอ ถ้าตรวจตัวตนไม่ได้ให้ปฏิเสธ)
- ช่วงเวลา "เดือนนี้ / สัปดาห์นี้ / ล่าสุด" ต้องอิง **วันที่ของข้อมูล (asof)** จาก `tableAsOf()` ไม่ใช่วันนี้ ข้อความที่ส่งต้องระบุ "ข้อมูล ณ …" และเตือนถ้า asof เก่ากว่า 7 วัน
- เวลาในข้อมูลเป็นเวลาไทยอยู่แล้ว ห้ามบวกลบเพิ่ม (แต่เวลาของ Cron เป็น UTC ตอนตัดสินว่า "ถึงเวลาหรือยัง" ให้แปลงเป็น Asia/Bangkok)
- ถูกถามสิ่งที่ไม่มีในข้อมูล (ระดับบท/ตอน, conversion, ข้อมูลรายลูกค้า) ให้ปฏิเสธตรง ๆ ห้ามแต่งตัวเลข
- Push ต้องส่งเฉพาะคนที่สมัครเอง มีปุ่มหยุดรับ (`custom_id` = `stop:<id>` จัดการใน `api/discord.ts` ที่ `type === 3`) และข้อความ Push ประกอบด้วย template ในโค้ด ห้ามเรียกโมเดล AI เขียนหรือสรุป
- ถ้าคอร์สไม่มีออเดอร์ที่จับคู่ได้ ให้บอก "ไม่พบออเดอร์ที่จับคู่ได้" ห้ามบอกว่า "ขายได้ 0"
- ถ้า prompt ระบุตาราง นิยาม หรือคอลัมน์ ให้ทำตามนั้นเป๊ะ

## AI SDK เป็นรุ่น 7 (API ต่างจากที่คุ้น) — แบบที่ทดสอบแล้ว
```ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
const result = await generateText({
  model: openrouter(process.env.OPENROUTER_MODEL!),
  system: "...",
  prompt: question,
  tools: {
    my_tool: tool({
      description: "...",
      inputSchema: z.object({ x: z.string() }),
      execute: async ({ x }) => ({ data: "...", source: { tables: ["..."] } }), // source ใช้แสดง "ที่มา"
    }),
  },
  stopWhen: stepCountIs(5),
  maxOutputTokens: 800,
});
// result.text · result.steps[].toolCalls (toolName, input) · result.steps[].toolResults (output)
```
ถ้าไม่แน่ใจ API ให้อ่านชนิดข้อมูลใน `node_modules/ai/dist/index.d.ts` ก่อนเดา

## ไฟล์
`api/discord.ts` Interactions endpoint · `api/cron.ts` Vercel Cron · `src/commands.ts` คำสั่ง + `gate()` · `src/lib/discord.ts` ตรวจลายเซ็น/เรียก Discord · `src/lib/portal.ts` ตรวจตัวตน · `src/lib/bq.ts` `runQuery`/`tableAsOf` · `scripts/` (`register`, `doctor`, `cron:test`) · `vercel.json` ตารางเวลา Cron · ไฟล์ใหม่ให้แยกเป็น `src/commands/*.ts`, `src/tools/*.ts`, `src/lib/*.ts` แล้วลงทะเบียนใน `src/commands.ts`
