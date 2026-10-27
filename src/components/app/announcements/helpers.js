import { HandHeart, PartyPopper, ThumbsUp } from "lucide-react";
import { hashUnit, isActive } from "@/components/app/_kit/metrics";

export const CATEGORIES = {
  hr: { label: "RH", tone: "brand" },
  event: { label: "Événement", tone: "info" },
  policy: { label: "Politique", tone: "neutral" },
  urgent: { label: "Urgent", tone: "danger" },
};

export const REACTIONS = [
  { key: "useful", label: "Utile", icon: ThumbsUp },
  { key: "thanks", label: "Merci", icon: HandHeart },
  { key: "bravo", label: "Bravo", icon: PartyPopper },
];

export const audienceOptions = (departments, entities) => [
  "Tous",
  "Managers",
  ...departments.map((d) => d.name),
  ...entities.map((e) => e.name),
];

/** Members of an audience label. */
export function audienceMembers(audience, employees, departments, entities) {
  const active = employees.filter(isActive);
  if (!audience || audience === "Tous") return active;
  if (audience === "Managers") return active.filter((e) => e.role === "manager");
  const d = departments.find((x) => x.name === audience);
  if (d) return active.filter((e) => e.departmentId === d.id);
  const en = entities.find((x) => x.name === audience);
  if (en) return active.filter((e) => e.entityId === en.id);
  return active;
}

export function visibleTo(a, user, employees, departments, entities) {
  if (user.role === "admin" || user.role === "hr" || a.authorId === user.employeeId) return true;
  return audienceMembers(a.audience, employees, departments, entities).some((e) => e.id === user.employeeId);
}

export const readCount = (a, size) => {
  const base = a.baseReads ?? Math.round(size * (0.5 + hashUnit(a.id) * 0.4));
  return Math.min(size, base + (a.readBy?.length ?? 0));
};

export const reactionCount = (a, key) => a.reactions?.[key]?.length ?? 0;

export function toggleReaction(a, key, userId) {
  const cur = a.reactions ?? {};
  const list = cur[key] ?? [];
  return { ...cur, [key]: list.includes(userId) ? list.filter((x) => x !== userId) : [...list, userId] };
}
