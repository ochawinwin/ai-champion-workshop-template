// npm run doctor — ตรวจเครื่องก่อนเริ่ม (ไม่พิมพ์ค่าลับใด ๆ ออกมา)
import { env, missingEnv } from "../src/config.js";
import { bigquery, dataset, runQuery, T } from "../src/lib/bq.js";
import { API, discordApi } from "../src/lib/discord.js";

let failed = 0;
const ok = (msg: string) => console.log(`✅ ${msg}`);
const bad = (msg: string, hint?: string) => {
  failed++;
  console.log(`❌ ${msg}${hint ? `\n   → ${hint}` : ""}`);
};
const short = (e: unknown) => (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 160);

function checkEnv(): boolean {
  const missing = missingEnv();
  if (missing.length) {
    bad(`env ไม่ครบ ขาด: ${missing.join(", ")}`, "เปิด .env.local แล้ววางค่าให้ครบ (ดู .env.example)");
    return false;
  }
  ok("env ครบทุกตัว");
  return true;
}

async function checkDiscord() {
  if (!/^[0-9a-f]{64}$/i.test(env("DISCORD_PUBLIC_KEY"))) {
    bad("DISCORD_PUBLIC_KEY รูปแบบไม่ถูกต้อง (ต้องเป็นตัวอักษร 0-9 a-f ยาว 64 ตัว)", "คัดลอก Public Key จากหน้า General Information ของ Application ใน Developer Portal");
  } else {
    ok("Discord: Public Key รูปแบบถูกต้อง");
  }
  try {
    const me = await discordApi("GET", "/users/@me");
    if (me.status !== 200) return bad(`Discord token ใช้ไม่ได้ (HTTP ${me.status})`, "กด Reset Token ที่ Developer Portal แล้ววางค่าใหม่");
    const guild = await discordApi("GET", `/guilds/${env("DISCORD_GUILD_ID")}`);
    if (guild.status !== 200) return bad(`บอทล็อกอินได้ แต่ไม่พบ server (HTTP ${guild.status})`, "ตรวจ DISCORD_GUILD_ID และว่าเชิญบอทเข้า server แล้ว");
    ok("Discord: token ใช้ได้ และบอทอยู่ใน server ทดสอบ");
  } catch (e) {
    bad(`Discord ต่อไม่ได้ (${API}): ${short(e)}`);
  }
}

async function checkPortal() {
  try {
    const base = env("PORTAL_URL").replace(/\/+$/, "");
    const res = await fetch(`${base}/api/directory/0`, { headers: { Authorization: `Bearer ${env("CLASS_API_KEY")}` }, signal: AbortSignal.timeout(8000) });
    if (res.status === 404 || res.status === 200) ok("Portal: ต่อได้ และรหัส (CLASS_API_KEY) ถูกต้อง");
    else if (res.status === 401) bad("Portal: รหัส CLASS_API_KEY ไม่ถูกต้อง", "ตรวจค่าที่ผู้สอนแจก");
    else bad(`Portal ตอบ HTTP ${res.status}`, "ตรวจ PORTAL_URL");
  } catch (e) {
    bad(`Portal ต่อไม่ได้: ${short(e)}`, "ตรวจ PORTAL_URL");
  }
}

async function checkBigQuery() {
  try {
    const rows = await runQuery({ sql: `SELECT TRIM(code) AS code FROM ${T("courses")} WHERE actual_launch >= DATE '1900-01-01' LIMIT 1` });
    if (!rows.length) return bad("BigQuery: คิวรีได้แต่ไม่พบข้อมูล", "ตรวจ BQ_DATASET");
    ok("BigQuery: อ่านข้อมูล (dry run + คิวรีจริง) ผ่าน");
  } catch (e) {
    return bad(`BigQuery อ่านไม่ได้: ${short(e)}`, "ตรวจ GCP_SA_KEY_B64 และ BQ_DATASET หรือแจ้งผู้สอน");
  }
  // กุญแจของคลาสต้องอ่านข้อมูลเข้ารหัส (dataset *_keys) ไม่ได้
  try {
    await bigquery().dataset(`${dataset()}_keys`).getTables();
    bad("BigQuery: เข้า dataset ที่เก็บคีย์เข้ารหัสได้ — สิทธิ์เกิน", "แจ้งผู้สอนทันที และหยุดใช้กุญแจนี้");
  } catch {
    ok("BigQuery: dataset ที่เก็บคีย์เข้ารหัสถูกปฏิเสธ (ถูกต้อง)");
  }
}

async function checkOpenRouter() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env("OPENROUTER_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: env("OPENROUTER_MODEL"), max_tokens: 5, messages: [{ role: "user", content: "ตอบว่า ok" }] }),
      signal: AbortSignal.timeout(20000),
    });
    if (res.ok) ok("OpenRouter: โมเดล AI ตอบ");
    else bad(`OpenRouter ตอบ HTTP ${res.status}`, res.status === 401 || res.status === 403 ? "ตรวจ OPENROUTER_API_KEY (อาจหมดอายุ/เกินวงเงิน)" : "ตรวจ OPENROUTER_MODEL");
  } catch (e) {
    bad(`OpenRouter ต่อไม่ได้: ${short(e)}`);
  }
}

async function main() {
  console.log("ตรวจเครื่อง (ไม่แสดงค่าลับ)\n");
  if (checkEnv()) {
    await checkDiscord();
    await checkPortal();
    await checkBigQuery();
    await checkOpenRouter();
  }
  console.log(failed ? `\nไม่ผ่าน ${failed} ข้อ แก้ตามคำแนะนำแล้วรันใหม่` : "\nผ่านครบทุกข้อ ขั้นต่อไป: push ขึ้น GitHub แล้ว deploy บน Vercel");
  process.exit(failed ? 1 : 0);
}

main();
