// คำสั่ง slash ของบอท — เพิ่มคำสั่งใหม่ได้โดยทำตามแบบ ping/whoami แล้วใส่ใน commands ด้านล่าง
import {
  MessageFlags,
  SlashCommandBuilder,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord.js";
import { env } from "./config";
import { whois, whoisCached, type Who } from "./lib/portal";

export interface Command {
  data: { name: string; toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody };
  execute(i: ChatInputCommandInteraction): Promise<void>;
  autocomplete?(i: AutocompleteInteraction): Promise<void>;
}

/**
 * เริ่มทุกคำสั่งที่ต้องผูก Portal: ตอบรับ (เห็นคนเดียว) ภายใน 3 วินาที แล้วตรวจตัวตน
 * คืนข้อมูลผู้ใช้ ถ้ายังไม่ผูกหรือตรวจไม่ได้ จะตอบปฏิเสธแล้วคืน null (ปิดไว้ก่อนเสมอ ไม่เปิด)
 * ตัวอย่าง: const who = await begin(i); if (!who) return;
 */
export async function begin(i: ChatInputCommandInteraction): Promise<NonNullable<Who> | null> {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  try {
    const who = await whoisCached(i.user.id);
    if (who) return who;
    await i.editReply(
      `ยังใช้คำสั่งนี้ไม่ได้ เพราะ Discord ของคุณยังไม่ผูกกับ Class Portal\nเปิด ${env("PORTAL_URL")} → Sign in with Google → Connect Discord แล้วลองใหม่`,
    );
  } catch (err) {
    console.error("[begin]", err instanceof Error ? err.message : err);
    await i.editReply("ตรวจตัวตนไม่ได้ชั่วคราว (Portal ไม่ตอบ) ลองใหม่อีกครั้งในอีกสักครู่");
  }
  return null;
}

const ping: Command = {
  data: new SlashCommandBuilder().setName("ping").setDescription("ทดสอบว่าบอทออนไลน์"),
  async execute(i) {
    await i.reply({ content: "pong", flags: MessageFlags.Ephemeral });
  },
};

const whoami: Command = {
  data: new SlashCommandBuilder().setName("whoami").setDescription("ดูว่าบอทรู้จักคุณคือใคร (ผูกบัญชีที่ Portal แล้วหรือยัง)"),
  async execute(i) {
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const who = await whois(i.user.id);
      await i.editReply(
        who ? `คุณคือ ${who.name}` : `ยังไม่ผูกบัญชี เปิด ${env("PORTAL_URL")} → Sign in with Google → Connect Discord แล้วลองใหม่`,
      );
    } catch (err) {
      console.error("[whoami]", err instanceof Error ? err.message : err);
      await i.editReply("ต่อ Portal ไม่ได้ชั่วคราว ลองใหม่อีกครั้ง");
    }
  },
};

export const commands: Command[] = [ping, whoami];
