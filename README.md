# AI Champion Workshop — Discord Bot Starter (Vercel)

โครงเล็กที่สุดสำหรับบอท Discord ของ Workshop 3 รันบน **Vercel** (Discord เรียกเว็บของเรา + Vercel Cron ตั้งเวลา) มีแค่สิ่งที่ต้องถูกต้องและไม่ควรให้ AI เดาเอง: การตรวจลายเซ็นของ Discord, การตรวจตัวตนผ่าน Portal, การอ่าน BigQuery ที่ปลอดภัย, endpoint ของ Cron และ `npm run doctor` ส่วนที่เหลือ (`/ask`, `/watch`, `/subscribe`, ที่เก็บข้อมูล, ส่ง DM ฯลฯ) คุณสั่ง Claude Code สร้างเองตามคู่มือที่ผู้สอนแจก

**ไม่มีค่าลับใน repo นี้** ผู้สอนแจกค่าที่ใช้ในห้องเรียน

## เริ่มใช้ (Node.js 22 ขึ้นไป + Git)

```bash
git clone https://github.com/ochawinwin/ai-champion-workshop-template.git fs-discord-bot
cd fs-discord-bot
npm install

cp .env.example .env.local      # Windows: copy .env.example .env.local
# เปิด .env.local แล้ววางค่าเองด้วยมือ (อย่าให้ AI อ่านไฟล์นี้)

npm run doctor                  # ตรวจเครื่อง ต้องผ่านครบ
```

จากนั้น push ขึ้น GitHub repo ของคุณ → import เข้า Vercel (Framework Preset: Other) → ใส่ Environment Variables → deploy → ใส่ `https://<โปรเจกต์>.vercel.app/api/discord` ที่ **Interactions Endpoint URL** ใน Discord Developer Portal → `npm run register` แล้วลอง `/ping` และ `/whoami`

**รันในเครื่องไม่ได้** เพราะ Discord ต้องเรียกเว็บที่เข้าถึงได้จากอินเทอร์เน็ต ทุกครั้งที่แก้โค้ด ให้ push แล้วรอ Vercel deploy (ประมาณ 1 นาที) · แก้ Environment Variable ใน Vercel แล้วต้อง Redeploy

## คำสั่งใน npm

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run doctor` | ตรวจ env · Discord · Portal · BigQuery · OpenRouter |
| `npm run register` | ลงทะเบียนคำสั่งใน server ทดสอบ (รันใหม่ทุกครั้งที่เพิ่ม/แก้คำสั่งใน `src/commands.ts`) |
| `npm run cron:test` | สั่งให้ Cron ทำงานเดี๋ยวนี้ (ไม่ต้องรอ 09:00) ต้องตั้ง `APP_URL` และ `CRON_SECRET` |
| `npm run typecheck` | ตรวจชนิดข้อมูลหลังแก้โค้ด |

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `.env.example` | รายชื่อตัวแปร (คัดลอกเป็น `.env.local`) |
| `CLAUDE.md` | กติกาที่ Claude Code ต้องทำตามใน repo นี้ |
| `api/discord.ts` | Interactions endpoint: ตรวจลายเซ็น → ส่งคำสั่งให้ `src/commands.ts` |
| `api/cron.ts` | Vercel Cron เรียกที่นี่ (ตรวจ `CRON_SECRET`) ส่วนส่ง Brief ผู้เรียนเติม |
| `vercel.json` | ตารางเวลา Cron (`0 2 * * *` = 09:00 เวลาไทย วันละครั้ง) |
| `src/commands.ts` | คำสั่ง `/ping` `/whoami` และ `gate()` (ตรวจการผูก Portal) |
| `src/lib/discord.ts` | ตรวจลายเซ็นของ Discord · เรียก Discord REST |
| `src/lib/portal.ts` | ถาม Portal ว่า Discord ID ผูกแล้วหรือยัง |
| `src/lib/bq.ts` | `runQuery` (อ่านอย่างเดียว จำกัดขนาด) และ `tableAsOf` |
| `scripts/` | `register-commands.ts` · `doctor.ts` · `trigger-cron.ts` |

## ข้อจำกัดของ Vercel แผน Hobby ที่ควรรู้

- **Cron วันละครั้งเท่านั้น** และเวลาคลาดได้ ±59 นาที (ตั้งถี่กว่านี้ deploy จะล้ม) การเรียกอาจพลาดหรือซ้ำได้
- ฟังก์ชันรันได้นานสุด 300 วินาที ไม่มีไฟล์หรือหน่วยความจำถาวร ต้องเก็บข้อมูลใน Postgres (Neon ผ่าน Vercel Storage)
- บอทจะขึ้นสถานะ **ออฟไลน์** ใน Discord ตลอด ซึ่งเป็นเรื่องปกติของบอทแบบ Interactions
- Hobby ใช้ได้สำหรับ **personal / non-commercial** เท่านั้น แอปนี้ใช้เพื่อเรียนรู้

## Dependency ที่สำคัญ

| แพ็กเกจ | ไว้ทำอะไร | ใช้ตอนไหน |
|---|---|---|
| `@google-cloud/bigquery` | อ่านข้อมูล FutureSkill จาก BigQuery (ผ่าน `runQuery` เท่านั้น) | ใช้อยู่แล้วใน `src/lib/bq.ts` |
| `@vercel/functions` | `waitUntil` (ทำงานต่อหลังตอบ Discord ภายใน 3 วินาทีแล้ว) และจัดการ connection ของฐานข้อมูล | ใช้อยู่แล้วใน `api/discord.ts` |
| `ai` (Vercel AI SDK v7) | ให้โมเดล AI เรียก tool แล้วเรียบเรียงคำตอบ (`generateText`, `tool`) | `/ask` ใน W3 |
| `@openrouter/ai-sdk-provider` | ต่อ AI SDK เข้ากับ OpenRouter (ใช้โมเดลตามค่า `OPENROUTER_MODEL`) | `/ask` ใน W3 |
| `zod` | กำหนดและตรวจพารามิเตอร์ของ tool ให้เป็นไปตามที่ประกาศ | `/ask` ใน W3 |
| `tsx` | รันสคริปต์ TypeScript (`doctor`, `register`, `cron:test`) | เวลารันสคริปต์ |
| `typescript` | ตรวจชนิดข้อมูลด้วย `npm run typecheck` | หลังแก้โค้ด |

`ai` รุ่น 7 เรียกใช้ต่างจากรุ่นเก่าที่หลายคนคุ้น ดูแบบที่ใช้ได้จริงใน [CLAUDE.md](CLAUDE.md) · `pg` (ต่อ Postgres ของ Neon) ยังไม่ติดตั้ง จะเพิ่มตอนทำส่วน Push

## Class Portal

```
GET {PORTAL_URL}/api/directory/<discordId>
Authorization: Bearer <CLASS_API_KEY>
→ 200 { "linked": true, "name": "..." }   ผูกแล้ว
→ 404                                      ยังไม่ผูก
→ 401                                      รหัสผิด
```
