// ตัวแปรที่ต้องมีใน W1 (ดู .env.example) — อ่านตอนใช้งาน ไม่ throw ตอน import เพื่อให้ doctor รายงานได้
export const REQUIRED_ENV = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_APP_ID",
  "DISCORD_PUBLIC_KEY",
  "DISCORD_GUILD_ID",
  "DISCORD_FALLBACK_CHANNEL_ID",
  "LEARNER_HANDLE",
  "PORTAL_URL",
  "CLASS_API_KEY",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "GCP_SA_KEY_B64",
  "BQ_DATASET",
] as const;

export const env = (k: string): string => (process.env[k] ?? "").trim();

export const missingEnv = (): string[] => REQUIRED_ENV.filter((k) => !env(k));

export const BYTES_CAP = 1_000_000_000; // เพดานข้อมูลที่คิวรีหนึ่งอ่านได้ (1 GB)
