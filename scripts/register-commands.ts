// npm run register — ลงทะเบียนคำสั่งใน server ทดสอบ (เห็นทันที) ต้องรันใหม่ทุกครั้งที่เพิ่ม/แก้คำสั่งใน src/commands.ts
import { commands } from "../src/commands.js";
import { env, missingEnv } from "../src/config.js";
import { discordApi } from "../src/lib/discord.js";

async function main() {
  const missing = missingEnv();
  if (missing.length) {
    console.error(`ยังไม่ได้ตั้งค่า: ${missing.join(", ")}`);
    process.exit(1);
  }
  const { status, json } = await discordApi("PUT", `/applications/${env("DISCORD_APP_ID")}/guilds/${env("DISCORD_GUILD_ID")}/commands`, commands.map((c) => c.def));
  if (status !== 200) {
    console.error(`ลงทะเบียนไม่สำเร็จ (HTTP ${status}) ${typeof json?.message === "string" ? json.message : ""}\nตรวจ DISCORD_BOT_TOKEN / DISCORD_APP_ID / DISCORD_GUILD_ID และว่าเชิญบอทเข้า server แล้ว`);
    process.exit(1);
  }
  console.log(`ลงทะเบียนแล้ว ${json.length} คำสั่ง: ${json.map((c: { name: string }) => `/${c.name}`).join(" ")}`);
}

main();
