# AI Champion Workshop — Discord Bot Starter (minimal)

โครงเล็กที่สุดสำหรับบอท Discord ของ Workshop 3 มีแค่สิ่งที่ต้องถูกต้องและไม่ควรให้ AI เดาเอง: การต่อ Discord, การตรวจตัวตนผ่าน Portal, การอ่าน BigQuery ที่ปลอดภัย, และ `npm run doctor` ส่วนที่เหลือ (`/ask`, `/watch`, `/subscribe`, ตัวตั้งเวลา ฯลฯ) คุณสั่ง Claude Code สร้างเองตามคู่มือที่ผู้สอนแจก

**ไม่มีค่าลับใน repo นี้** ผู้สอนแจกค่าที่ใช้ในห้องเรียน

## เริ่มใช้ (Node.js 22 ขึ้นไป + Git)

```bash
git clone https://github.com/ochawinwin/ai-champion-workshop-template.git fs-discord-bot
cd fs-discord-bot
npm install

cp .env.example .env.local      # Windows: copy .env.example .env.local
# เปิด .env.local แล้ววางค่าเองด้วยมือ (อย่าให้ AI อ่านไฟล์นี้)

npm run doctor                  # ตรวจเครื่อง ต้องผ่านครบ
npm run dev                     # รันบอท (รีสตาร์ตเองเมื่อแก้โค้ด)
```

ใน Discord ที่ server ทดสอบ ลอง `/ping` และ `/whoami`

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `.env.example` | รายชื่อตัวแปร (คัดลอกเป็น `.env.local`) |
| `CLAUDE.md` | กติกาที่ Claude Code ต้องทำตามใน repo นี้ |
| `src/index.ts` | ต่อ Discord · ลงทะเบียนคำสั่ง |
| `src/commands.ts` | คำสั่ง `/ping` `/whoami` และ `begin()` (ตรวจการผูก Portal) |
| `src/lib/portal.ts` | ถาม Portal ว่า Discord ID ผูกแล้วหรือยัง |
| `src/lib/bq.ts` | `runQuery` (อ่านอย่างเดียว จำกัดขนาด) และ `tableAsOf` |
| `scripts/doctor.ts` | `npm run doctor` |

## Dependency ที่สำคัญ

| แพ็กเกจ | ไว้ทำอะไร | ใช้ตอนไหน |
|---|---|---|
| `discord.js` | ต่อบอทกับ Discord (รับคำสั่ง slash, ตอบ, ส่ง DM) | ใช้อยู่แล้วใน `src/index.ts` |
| `@google-cloud/bigquery` | อ่านข้อมูล FutureSkill จาก BigQuery (ผ่าน `runQuery` เท่านั้น) | ใช้อยู่แล้วใน `src/lib/bq.ts` |
| `ai` (Vercel AI SDK v7) | ให้โมเดล AI เรียก tool แล้วเรียบเรียงคำตอบ (`generateText`, `tool`) | `/ask` ใน W3 |
| `@openrouter/ai-sdk-provider` | ต่อ AI SDK เข้ากับ OpenRouter (ใช้โมเดลตามค่า `OPENROUTER_MODEL`) | `/ask` ใน W3 |
| `zod` | กำหนดและตรวจพารามิเตอร์ของ tool ให้เป็นไปตามที่ประกาศ | `/ask` ใน W3 |
| `tsx` | รันไฟล์ TypeScript ได้ตรง ๆ (`npm run dev` / `npm start`) และรีสตาร์ตเองเมื่อแก้โค้ด | ทุกครั้งที่รัน |
| `typescript` | ตรวจชนิดข้อมูลด้วย `npm run typecheck` | หลังแก้โค้ด |

`ai` รุ่น 7 เรียกใช้ต่างจากรุ่นเก่าที่หลายคนคุ้น ดูแบบที่ใช้ได้จริงใน [CLAUDE.md](CLAUDE.md) · ตัวเก็บข้อมูลบน Railway (`pg`) ยังไม่ติดตั้ง จะเพิ่มตอนทำส่วน Push

## Class Portal

```
GET {PORTAL_URL}/api/directory/<discordId>
Authorization: Bearer <CLASS_API_KEY>
→ 200 { "linked": true, "name": "..." }   ผูกแล้ว
→ 404                                      ยังไม่ผูก
→ 401                                      รหัสผิด
```
