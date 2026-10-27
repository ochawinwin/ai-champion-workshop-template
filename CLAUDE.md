# กติกาสำหรับ Claude Code ในโปรเจกต์นี้

บอท Discord ของ workshop ผู้ใช้เป็นผู้เรียนที่ไม่ใช่นักพัฒนา อธิบายสั้น ๆ เป็นภาษาไทยง่าย ๆ และบอกก่อนเสมอว่าจะรันคำสั่งอะไร ก่อนเขียนโค้ดใหญ่ให้วางแผนและรอผู้ใช้อนุมัติ หลังแก้โค้ดรัน `npm run typecheck`

## ห้ามเด็ดขาด
- **ห้ามเปิดอ่าน แก้ หรือแสดงเนื้อหาไฟล์ `.env` และ `.env.*`** (ยกเว้น `.env.example`) ผู้ใช้วางค่าเอง ถ้าต้องตรวจค่า ให้บอกผู้ใช้ว่าต้องดูตัวแปรชื่ออะไร
- **ห้ามใส่ key / token / รหัสผ่าน** ในโค้ด คอมมิต log หรือข้อความที่บอทส่งออก
- **ห้าม commit หรือ push** `.env.local` และโฟลเดอร์ `.data/` ก่อน `git add` ให้ตรวจ `git status`
- **ทุกการอ่าน BigQuery ต้องผ่าน `runQuery`** (`src/lib/bq.ts`): อ่านอย่างเดียว · parameterized (ห้ามต่อสตริงจากผู้ใช้เข้า SQL) · ห้าม `SELECT *` · ใส่ filter partition ทุกครั้งที่ตารางบังคับ · ห้ามคืน `customer_key` ถ้าไม่แน่ใจเรื่องตาราง/คอลัมน์/นิยาม ให้ถาม ห้ามเดา
- **ห้ามถอดรหัส** `customer_key` หรือเสนอให้ถอด
- **ห้ามมี tool ที่รับ SQL ดิบ** (`run_sql`) หรือรับตัวตนผู้ใช้เป็นพารามิเตอร์ ตัวตนต้องมาจาก Discord ID ผ่าน `begin()` เท่านั้น
- **ห้ามใช้ `@everyone` / `@here`** ห้ามเปิด `allowedMentions` ให้กว้างกว่าเดิม และห้ามเปิด privileged intent
- **ห้ามรันบอท token เดียวกันสองที่พร้อมกัน** (เครื่อง + Railway) ถ้าจะขึ้น Railway ให้หยุดตัวในเครื่องก่อน

## กติกาตอนสร้างฟีเจอร์
- คำสั่งที่ต้องล็อกอินให้เริ่มด้วย `const who = await begin(i); if (!who) return;` (ปิดไว้ก่อนเสมอ ถ้าตรวจตัวตนไม่ได้ให้ปฏิเสธ)
- ช่วงเวลา "เดือนนี้ / สัปดาห์นี้ / ล่าสุด" ต้องอิง **วันที่ของข้อมูล (asof)** จาก `tableAsOf()` ไม่ใช่วันนี้ ข้อความที่ส่งต้องระบุ "ข้อมูล ณ …" และเตือนถ้า asof เก่ากว่า 7 วัน
- เวลาในข้อมูลเป็นเวลาไทยอยู่แล้ว ห้ามบวกลบเพิ่ม
- ถูกถามสิ่งที่ไม่มีในข้อมูล (ระดับบท/ตอน, conversion, ข้อมูลรายลูกค้า) ให้ปฏิเสธตรง ๆ ห้ามแต่งตัวเลข
- Push ต้องส่งเฉพาะคนที่สมัครเอง มีปุ่มหยุดรับ และข้อความ Push ประกอบด้วย template ในโค้ด ห้ามเรียกโมเดล AI เขียนหรือสรุป
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
`src/index.ts` ต่อ Discord · `src/commands.ts` คำสั่ง + `begin()` · `src/lib/portal.ts` ตรวจตัวตน · `src/lib/bq.ts` `runQuery`/`tableAsOf` · `scripts/doctor.ts` · ไฟล์ใหม่ให้แยกเป็น `src/commands/*.ts`, `src/tools/*.ts`, `src/lib/*.ts` แล้วลงทะเบียนใน `src/commands.ts`
