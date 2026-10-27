"use client";

import { useSyncExternalStore } from "react";
import { toast } from "@/components/ui";
import { answerQuestion, executeAction } from "@/lib/assistant";

// Shared conversation: the full page and the slide-over show the same thread (kept for the session).

let messages = [];
let seq = 0;
const listeners = new Set();
const empty = [];

function set(next) {
  messages = next;
  listeners.forEach((l) => l());
}
const patch = (id, p) => set(messages.map((m) => (m.id === id ? { ...m, ...p } : m)));
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useMessages = () => useSyncExternalStore(subscribe, () => messages, () => empty);
export const isBusy = (list) => list.some((m) => m.status === "typing" || m.status === "streaming");

const TYPING_MS = (len) => 520 + Math.min(700, len * 2.2);

function pushBot(content, status = "typing") {
  const bot = { id: ++seq, from: "bot", sources: [], status, ...content };
  set([...messages, bot]);
  return bot;
}

/** ctx = { role, employeeId } */
export function sendMessage(text, ctx) {
  const q = text.trim();
  if (!q || isBusy(messages)) return;
  set([...messages, { id: ++seq, from: "user", text: q, status: "done" }]);
  let answer;
  try {
    answer = answerQuestion(q, ctx);
  } catch {
    answer = { text: "Désolé, je n'ai pas pu traiter cette question. Reformulez-la ou essayez une des suggestions.", sources: [] };
  }
  const bot = pushBot({ ...answer, actionState: answer.action ? "pending" : null });
  setTimeout(() => patch(bot.id, { status: "streaming" }), TYPING_MS(answer.text.length));
}

export const finishMessage = (id) => patch(id, { status: "done" });

export function resolveAction(id, ctx, confirmed) {
  const msg = messages.find((m) => m.id === id);
  if (!msg?.action || msg.actionState !== "pending") return;
  if (!confirmed) {
    patch(id, { actionState: "cancelled" });
    pushBot({ text: "D'accord, rien n'a été enregistré. Dites-moi si vous voulez modifier la demande." }, "streaming");
    return;
  }
  const res = executeAction(msg.action, ctx);
  patch(id, { actionState: "done" });
  pushBot({ text: res.text, sources: res.sources }, "streaming");
  if (res.toast) toast.success(res.toast);
}

export function clearChat() {
  set([]);
}
