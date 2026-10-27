// จุดเริ่มบอท: ต่อ Discord (Gateway) · ลงทะเบียนคำสั่งใน server ทดสอบ · ส่งต่อคำสั่งให้ src/commands.ts
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Client, Events, GatewayIntentBits, MessageFlags, REST, Routes, type Interaction } from "discord.js";
import { commands } from "./commands";
import { env, missingEnv } from "./config";

const missing = missingEnv();
if (missing.length) {
  console.error(`ยังไม่ได้ตั้งค่า: ${missing.join(", ")}\nเปิด .env.local แล้วใส่ค่าให้ครบ (ดู .env.example) แล้วรัน npm run doctor`);
  process.exit(1);
}

// ใช้ Guilds อย่างเดียว ไม่ต้องเปิด privileged intent ใด ๆ · allowedMentions ปิดทั้งหมด กัน @everyone จากข้อความที่ AI เขียน
const client = new Client({ intents: [GatewayIntentBits.Guilds], allowedMentions: { parse: [] } });
const byName = new Map(commands.map((c) => [c.data.name, c]));

async function registerCommands(): Promise<void> {
  const body = commands.map((c) => c.data.toJSON());
  const hash = createHash("sha1").update(JSON.stringify(body)).digest("hex");
  const hashFile = ".data/commands.hash";
  if ((await readFile(hashFile, "utf8").catch(() => "")) === hash) return; // คำสั่งไม่เปลี่ยน ไม่ต้องลงทะเบียนซ้ำ
  const rest = new REST().setToken(env("DISCORD_BOT_TOKEN"));
  await rest.put(Routes.applicationGuildCommands(env("DISCORD_APP_ID"), env("DISCORD_GUILD_ID")), { body });
  await mkdir(".data", { recursive: true });
  await writeFile(hashFile, hash);
  console.log(`ลงทะเบียนคำสั่งแล้ว ${body.length} คำสั่ง`);
}

client.on(Events.InteractionCreate, async (i: Interaction) => {
  try {
    if (i.isChatInputCommand()) await byName.get(i.commandName)?.execute(i);
    else if (i.isAutocomplete()) await byName.get(i.commandName)?.autocomplete?.(i);
    // ปุ่ม (เช่น "หยุดรับ") ให้เพิ่มตรงนี้ด้วย i.isButton()
  } catch (err) {
    console.error("[interaction]", err instanceof Error ? err.message : err);
    if (i.isRepliable()) {
      const msg = "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง";
      if (i.replied || i.deferred) await i.editReply(msg).catch(() => {});
      else await i.reply({ content: msg, flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

client.once(Events.ClientReady, async (c) => {
  await registerCommands();
  console.log(`บอทออนไลน์แล้ว: ${c.user.tag}`);
  // ตัวตั้งเวลา (Push) ให้เริ่มตรงนี้
});

process.on("unhandledRejection", (e) => console.error("[unhandledRejection]", e instanceof Error ? e.message : e));

await client.login(env("DISCORD_BOT_TOKEN"));
