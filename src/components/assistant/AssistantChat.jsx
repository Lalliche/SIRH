"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Check, FileText, RotateCcw, Send, Sparkles, TriangleAlert, X } from "lucide-react";
import { Avatar, Badge, Button, TextInput } from "@/components/ui";
import { cn } from "@/lib/utils";
import { duration, ease } from "@/lib/motion-tokens";
import { ASSISTANT_LABEL, getSuggestions } from "@/lib/assistant";
import { useCurrentUser } from "@/lib/use-current-user";
import { shell, useShell } from "@/components/layout/shell-ui";
import { clearChat, finishMessage, isBusy, resolveAction, sendMessage, useMessages } from "./chat-store";
import RichText from "./RichText";

function StreamText({ text, instant, onTick, onDone }) {
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [n, setN] = useState(instant ? tokens.length : 0);

  useEffect(() => {
    if (instant) {
      const t = setTimeout(onDone, 0);
      return () => clearTimeout(t);
    }
    let i = 0;
    const t = setInterval(() => {
      i += 3;
      setN(i);
      onTick?.();
      if (i >= tokens.length) {
        clearInterval(t);
        onDone();
      }
    }, 26);
    return () => clearInterval(t);
  }, [instant, tokens, onTick, onDone]);

  return <RichText text={tokens.slice(0, n).join("")} />;
}

function Typing() {
  return (
    <span className="flex items-center gap-[0.3em] py-[0.35em]" role="status" aria-label="L'assistant écrit">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-[0.5em] rounded-full bg-fg-muted"
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: ease.inOut }}
        />
      ))}
    </span>
  );
}

function SourceChips({ sources, onNavigate }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-[0.8em] flex flex-wrap items-center gap-[0.4em]">
      <span className="text-xs font-medium text-fg-muted">Sources</span>
      {sources.map((s) => (
        <Button key={`${s.href}${s.label}`} variant="secondary" size="sm" icon={FileText} href={s.href} onClick={onNavigate} className="max-w-full !font-normal">
          <span className="truncate">{s.label}</span>
        </Button>
      ))}
    </div>
  );
}

function ResultList({ list, onNavigate }) {
  if (!list?.length) return null;
  return (
    <ul className="mt-[0.8em] divide-y divide-border-subtle overflow-hidden rounded-md border border-border bg-surface">
      {list.map((row, i) => (
        <li key={`${row.title}${i}`}>
          <Link
            href={row.href}
            onClick={onNavigate}
            className="flex items-center gap-[0.7em] px-[0.8em] py-[0.55em] transition-colors duration-150 hover:bg-surface-hover"
          >
            {row.employee && <Avatar employee={row.employee} size="sm" />}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.875em] font-medium text-fg">{row.title}</span>
              <span className="block truncate text-xs text-fg-muted">{row.detail}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ActionCard({ msg, ctx }) {
  const { action, actionState } = msg;
  const pending = actionState === "pending";
  return (
    <div className="mt-[0.9em] rounded-lg border border-border-strong bg-surface p-[1em]">
      <div className="flex items-center justify-between gap-[0.5em]">
        <p className="text-sm font-semibold text-fg">{action.title}</p>
        {actionState === "done" && <Badge tone="success" icon={Check}>Enregistré</Badge>}
        {actionState === "cancelled" && <Badge tone="neutral" icon={X}>Annulé</Badge>}
        {pending && <Badge tone="warning">À confirmer</Badge>}
      </div>
      <ul className="mt-[0.6em] space-y-[0.3em] text-sm text-fg-secondary">
        {action.lines.map((l) => (
          <li key={l} className="flex gap-[0.5em]"><Check className="mt-[0.25em] size-[0.95em] shrink-0 text-fg-muted" aria-hidden />{l}</li>
        ))}
      </ul>
      {action.warnings?.map((w) => (
        <p key={w} className="mt-[0.6em] flex gap-[0.5em] rounded-md bg-warning-bg px-[0.7em] py-[0.45em] text-sm text-warning-fg">
          <TriangleAlert className="mt-[0.2em] size-[1em] shrink-0" aria-hidden />{w}
        </p>
      ))}
      {pending && (
        <div className="mt-[0.9em] flex flex-wrap justify-end gap-[0.5em]">
          <Button variant="ghost" size="sm" onClick={() => resolveAction(msg.id, ctx, false)}>Annuler</Button>
          <Button size="sm" icon={Check} onClick={() => resolveAction(msg.id, ctx, true)}>{action.confirmLabel ?? "Confirmer"}</Button>
        </div>
      )}
    </div>
  );
}

function BotBubble({ msg, ctx, reduce, onTick, onNavigate, onAsk, busy }) {
  const done = msg.status === "done";
  const finish = useMemo(() => () => finishMessage(msg.id), [msg.id]);
  return (
    <div className="flex items-start gap-[0.65em]">
      <span className="mt-[0.1em] flex size-[2em] shrink-0 items-center justify-center rounded-md bg-primary-soft text-link"><Sparkles className="size-[1.05em]" aria-hidden /></span>
      <div className="min-w-0 max-w-[calc(100%-2.65em)] rounded-lg rounded-ss-sm border border-border bg-surface-2 px-[0.95em] py-[0.7em] text-[0.9375em] leading-relaxed text-fg-secondary">
        {msg.status === "typing" ? (
          <Typing />
        ) : (
          <>
            <StreamText text={msg.text} instant={done || reduce} onTick={onTick} onDone={finish} />
            {done && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: duration.base, ease: ease.out }}>
                <ResultList list={msg.list} onNavigate={onNavigate} />
                {msg.action && <ActionCard msg={msg} ctx={ctx} />}
                {msg.footnote && <p className="mt-[0.7em] text-xs text-fg-muted">{msg.footnote}</p>}
                <SourceChips sources={msg.sources} onNavigate={onNavigate} />
                {msg.followUps?.length > 0 && (
                  <div className="mt-[0.8em] flex flex-wrap gap-[0.4em]">
                    {msg.followUps.map((q) => (
                      <Button key={q} variant="soft" size="sm" disabled={busy} onClick={() => onAsk(q)} className="max-w-full">
                        <span className="truncate">{q}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Shared by /app/assistant and the slide-over. Rule-based answers over the local db, with sources. */
export default function AssistantChat({ onNavigate, className }) {
  const reduce = useReducedMotion();
  const { role, employeeId, employee } = useCurrentUser();
  const ctx = useMemo(() => ({ role, employeeId }), [role, employeeId]);
  const messages = useMessages();
  const busy = isBusy(messages);
  const seed = useShell((s) => s.seed);
  const [draft, setDraft] = useState("");
  const scroller = useRef(null);
  const suggestions = getSuggestions(role);

  const stick = useMemo(
    () => () => {
      const el = scroller.current;
      if (el) el.scrollTop = el.scrollHeight;
    },
    [],
  );
  useEffect(stick, [messages.length, stick]);

  useEffect(() => {
    if (!seed) return;
    const t = setTimeout(() => {
      sendMessage(seed.text, ctx);
      shell.consumeSeed();
    }, 0);
    return () => clearTimeout(t);
  }, [seed, ctx]);

  const ask = (q) => sendMessage(q, ctx);
  const submit = (e) => {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    ask(draft);
    setDraft("");
  };
  const asked = new Set(messages.filter((m) => m.from === "user").map((m) => m.text));
  const more = suggestions.filter((s) => !asked.has(s)).slice(0, 4);

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-center justify-between gap-[0.6em] border-b border-border-subtle bg-surface-2 px-[1em] py-[0.55em]">
        <p className="flex min-w-0 items-center gap-[0.5em] text-xs text-fg-muted">
          <Badge tone="info" dot={false}>Démo</Badge>
          <span className="truncate">{ASSISTANT_LABEL}</span>
        </p>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={clearChat} aria-label="Effacer la conversation">
            <span className="max-sm:hidden">Effacer</span>
          </Button>
        )}
      </div>

      <div ref={scroller} role="log" aria-live="polite" aria-label="Conversation avec l'assistant" className="min-h-0 flex-1 space-y-[1em] overflow-y-auto px-[1em] py-[1.1em]">
        <div className="flex items-start gap-[0.65em]">
          <span className="mt-[0.1em] flex size-[2em] shrink-0 items-center justify-center rounded-md bg-primary-soft text-link"><Sparkles className="size-[1.05em]" aria-hidden /></span>
          <div className="min-w-0">
            <div className="rounded-lg rounded-ss-sm border border-border bg-surface-2 px-[0.95em] py-[0.7em] text-[0.9375em] leading-relaxed text-fg-secondary">
              <p>Bonjour{employee ? ` ${employee.firstName}` : ""}. Je réponds à partir des données de votre entreprise (employés, congés, présences, paie) et je cite mes sources. Les actions qui modifient vos données demandent toujours votre confirmation.</p>
            </div>
            {messages.length === 0 && (
              <div className="mt-[0.8em] flex flex-wrap gap-[0.45em]">
                {suggestions.map((s) => (
                  <Button key={s} variant="secondary" size="sm" onClick={() => ask(s)} className="max-w-full !font-normal">
                    <span className="truncate">{s}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {messages.map((m) =>
          m.from === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-lg rounded-ee-sm bg-primary px-[0.95em] py-[0.6em] text-[0.9375em] text-primary-fg">{m.text}</p>
            </div>
          ) : (
            <BotBubble key={m.id} msg={m} ctx={ctx} reduce={reduce} onTick={stick} onNavigate={onNavigate} onAsk={ask} busy={busy} />
          ),
        )}
      </div>

      <div className="shrink-0 border-t border-border-subtle bg-surface px-[1em] pb-[max(0.8em,env(safe-area-inset-bottom))] pt-[0.7em]">
        {messages.length > 0 && more.length > 0 && (
          <div className="-mx-[0.2em] mb-[0.6em] flex gap-[0.4em] overflow-x-auto px-[0.2em] pb-[0.2em]">
            {more.map((s) => (
              <Button key={s} variant="soft" size="sm" disabled={busy} onClick={() => ask(s)}>{s}</Button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex items-start gap-[0.5em]">
          <TextInput
            className="flex-1"
            value={draft}
            onChange={setDraft}
            placeholder="Posez une question sur vos données…"
            aria-label="Votre question"
            autoComplete="off"
            autoFocus
          />
          <Button type="submit" size="icon" className="!h-[2.75em] !w-[2.75em]" disabled={!draft.trim() || busy} aria-label="Envoyer">
            <Send className="size-[1.15em]" />
          </Button>
        </form>
      </div>
    </div>
  );
}
