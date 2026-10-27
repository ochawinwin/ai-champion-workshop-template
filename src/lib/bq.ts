// ทางเดียวที่โค้ดของบอทใช้อ่าน BigQuery: runQuery()
// กันให้: SELECT อย่างเดียว · ห้าม SELECT * · dry run ก่อน · เพดานข้อมูล 1 GB · ติด label learner · ห้ามคืน customer_key
import { BigQuery } from "@google-cloud/bigquery";
import { BYTES_CAP, env } from "../config.js";

let _bq: BigQuery | undefined;
let _project = "";

export function bigquery(): BigQuery {
  if (_bq) return _bq;
  const creds = JSON.parse(Buffer.from(env("GCP_SA_KEY_B64"), "base64").toString("utf8")) as { project_id: string };
  _project = creds.project_id;
  _bq = new BigQuery({ projectId: creds.project_id, credentials: creds });
  return _bq;
}

export const dataset = (): string => env("BQ_DATASET");

/** ชื่อตารางเต็มพร้อม backtick สำหรับใส่ใน SQL เช่น T("courses") */
export function T(table: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(table)) throw new Error(`ชื่อตารางไม่ถูกต้อง: ${table}`);
  bigquery();
  return `\`${_project}.${dataset()}.${table}\``;
}

const FORBIDDEN = /\b(insert|update|delete|merge|drop|create|alter|truncate|grant|revoke|call|execute|export|load|begin|commit|rollback)\b/i;

function assertReadOnly(sql: string): void {
  const s = sql.replace(/--.*$/gm, "").trim();
  if (!/^(select|with)\b/i.test(s)) throw new Error("อนุญาตเฉพาะคำสั่ง SELECT");
  if (s.includes(";")) throw new Error("ห้ามส่งหลายคำสั่ง");
  if (/select\s+\*/i.test(s)) throw new Error("ห้าม SELECT * ให้เลือกเฉพาะคอลัมน์ที่ใช้");
  if (FORBIDDEN.test(s)) throw new Error("พบคำสั่งที่ไม่ใช่การอ่านข้อมูล");
  const prefix = `${_project}.${dataset()}.`;
  for (const m of s.matchAll(/`([^`]+)`/g)) {
    if (m[1].includes(".") && !m[1].startsWith(prefix)) throw new Error("อ่านได้เฉพาะ dataset ของคลาส");
  }
}

const labelValue = (v: string) => v.toLowerCase().replace(/[^a-z0-9_-]/g, "-").slice(0, 63) || "unknown";

export interface QueryOptions {
  sql: string;
  /** พารามิเตอร์ชื่อ @name ใน SQL — ห้ามต่อสตริงค่าจากผู้ใช้เข้า SQL */
  params?: Record<string, unknown>;
  /** ชนิดของพารามิเตอร์ถ้าเดาไม่ได้ เช่น { from: "DATE" } (ใช้ค่าเป็น "YYYY-MM-DD") */
  types?: Record<string, string>;
  maxBytes?: number;
}

export async function runQuery<Row = Record<string, unknown>>(opts: QueryOptions): Promise<Row[]> {
  const bq = bigquery();
  assertReadOnly(opts.sql);
  const cap = opts.maxBytes ?? BYTES_CAP;
  const base = {
    query: opts.sql,
    params: opts.params,
    types: opts.types,
    useLegacySql: false,
    labels: { app: "class", learner: labelValue(env("LEARNER_HANDLE")) },
    ...(env("BQ_LOCATION") ? { location: env("BQ_LOCATION") } : {}),
  };

  const [dry] = await bq.createQueryJob({ ...base, dryRun: true });
  const bytes = Number(dry.metadata?.statistics?.totalBytesProcessed ?? 0);
  if (bytes > cap) {
    throw new Error(`คิวรีนี้จะอ่านข้อมูล ${(bytes / 1e6).toFixed(0)} MB เกินเพดาน ${(cap / 1e6).toFixed(0)} MB — เพิ่ม filter ช่วงเวลาหรือเลือกคอลัมน์ให้น้อยลง`);
  }

  const [job] = await bq.createQueryJob({ ...base, maximumBytesBilled: String(cap) });
  const [rows] = await job.getQueryResults();
  if (rows.some((r) => r && typeof r === "object" && "customer_key" in r)) {
    throw new Error("ห้ามคืนคอลัมน์ customer_key ออกจาก tool");
  }
  return rows as Row[];
}

/** เวลาที่ตารางถูกอัปเดตล่าสุด (asof) — ใช้เป็นจุดสิ้นสุดของคำว่า "เดือนนี้/สัปดาห์นี้" แทนวันนี้ */
export async function tableAsOf(table: string): Promise<Date> {
  if (!/^[A-Za-z0-9_]+$/.test(table)) throw new Error(`ชื่อตารางไม่ถูกต้อง: ${table}`);
  const [meta] = await bigquery().dataset(dataset()).table(table).getMetadata();
  return new Date(Number(meta.lastModifiedTime));
}
