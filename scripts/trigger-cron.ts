// npm run cron:test — สั่งให้ cron ทำงานเดี๋ยวนี้ (ไม่ต้องรอ 09:00) เรียก {APP_URL}/api/cron?force=1 ด้วย CRON_SECRET
import { env } from "../src/config";

async function main() {
  const base = env("APP_URL").replace(/\/+$/, "");
  if (!base || !env("CRON_SECRET")) {
    console.error("ต้องตั้ง APP_URL (เช่น https://fs-xxx.vercel.app) และ CRON_SECRET ใน .env.local ก่อน");
    process.exit(1);
  }
  const res = await fetch(`${base}/api/cron?force=1`, { headers: { Authorization: `Bearer ${env("CRON_SECRET")}` }, signal: AbortSignal.timeout(60_000) });
  console.log(`HTTP ${res.status}`);
  console.log((await res.text()).slice(0, 500));
  process.exit(res.ok ? 0 : 1);
}

main();
