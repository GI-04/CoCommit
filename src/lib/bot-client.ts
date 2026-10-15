// Asks the @cocommit bot from browser code ("use client" screens), through POST /api/bot.
//
//   import { askBot, BotRequestError } from "@/lib/bot-client";
//   const { answer, sources } = await askBot("GI-04/CoCommit", "where is the login decision?", chatLines);

import type { BotAnswer, ChatLine } from "./bot";

export class BotRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "BotRequestError";
    this.status = status;
  }
}

export async function askBot(repo: string, question: string, chat: ChatLine[] = []): Promise<BotAnswer> {
  const res = await fetch("/api/bot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo, question, chat }),
  });
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (!res.ok) throw new BotRequestError(res.status, data?.error ?? res.statusText);
  return data as BotAnswer;
}
