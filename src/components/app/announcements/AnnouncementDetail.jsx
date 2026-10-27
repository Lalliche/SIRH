"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Megaphone, Pin, PinOff, Trash2 } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Progress, toast } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { db, useCollection } from "@/lib/db";
import { dateLong, fullName } from "@/lib/format";
import ReactionBar from "./ReactionBar";
import { CATEGORIES, audienceMembers, readCount, visibleTo } from "./helpers";

function Content({ user, id }) {
  const router = useRouter();
  const announcements = useCollection("announcements");
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const [del, setDel] = useState(false);
  const a = announcements.find((x) => x.id === id);
  const canWrite = user.role === "admin" || user.role === "hr";
  const unread = a && !(a.readBy ?? []).includes(user.employeeId);

  // Opening the announcement records a read receipt.
  useEffect(() => {
    if (a && unread && visibleTo(a, user, employees, departments, entities)) db.patch("announcements", a.id, { readBy: [...(a.readBy ?? []), user.employeeId] });
  }, [a, unread, user, employees, departments, entities]);

  if (!a || !visibleTo(a, user, employees, departments, entities)) {
    return <EmptyState icon={Megaphone} title="Annonce introuvable" description="Elle a peut-être été supprimée ou ne vous est pas destinée." action={<Button href="/app/announcements">Retour au fil</Button>} />;
  }
  const members = audienceMembers(a.audience, employees, departments, entities);
  const reads = readCount(a, members.length);
  const author = employees.find((e) => e.id === a.authorId);
  const cat = CATEGORIES[a.category ?? "hr"];
  const notRead = members.filter((e) => !(a.readBy ?? []).includes(e.id)).slice(0, Math.max(0, members.length - reads));

  return (
    <>
      <Link href="/app/announcements" className="mb-[1em] inline-flex items-center gap-[0.4em] text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-[1.1em]" aria-hidden />Toutes les annonces</Link>
      <div className="grid gap-[1.25em] lg:grid-cols-[1fr_20em]">
        <Card as="article" className="!p-[2em]">
          <div className="mb-[1em] flex flex-wrap items-center gap-[0.5em]">
            {a.pinned && <Badge tone="neutral" icon={Pin}>Épinglée</Badge>}
            <Badge tone={cat.tone}>{cat.label}</Badge>
            <span className="text-xs text-fg-muted">Pour : {a.audience} · {members.length} personnes</span>
          </div>
          <h1 className="text-h1 font-semibold text-fg">{a.title}</h1>
          <p className="mt-[0.8em] flex items-center gap-[0.6em] text-sm text-fg-muted"><Avatar employee={author} size="xs" />{fullName(author)} · {dateLong(a.date)}</p>
          <div className="mt-[1.5em] max-w-[62ch] whitespace-pre-line text-lead text-fg-secondary">{a.body}</div>
          <div className="mt-[2em] border-t border-border-subtle pt-[1em]"><ReactionBar announcement={a} userId={user.employeeId} /></div>
        </Card>

        {canWrite && (
          <aside className="flex flex-col gap-[1em]">
            <Card>
              <CardHeader title="Accusés de lecture" description="Données de démonstration" />
              <p className="flex items-center gap-[0.5em] font-display text-kpi font-semibold text-fg num"><Eye className="size-[0.6em] text-fg-muted" aria-hidden />{reads}<span className="text-h3 font-normal text-fg-muted">/ {members.length}</span></p>
              <Progress className="mt-[0.6em]" value={reads} max={members.length} />
              {notRead.length > 0 && (
                <>
                  <p className="mb-[0.5em] mt-[1em] text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Pas encore lu</p>
                  <ul className="flex flex-col gap-[0.4em]">
                    {notRead.slice(0, 6).map((e) => <li key={e.id} className="flex items-center gap-[0.5em] text-sm text-fg-secondary"><Avatar employee={e} size="xs" />{fullName(e)}</li>)}
                    {notRead.length > 6 && <li className="text-xs text-fg-muted">+ {notRead.length - 6} autres</li>}
                  </ul>
                </>
              )}
            </Card>
            <Card className="flex flex-col gap-[0.6em]">
              <Button variant="secondary" icon={a.pinned ? PinOff : Pin} onClick={() => { db.patch("announcements", a.id, { pinned: !a.pinned }); toast.success(a.pinned ? "Annonce désépinglée." : "Annonce épinglée en haut du fil."); }}>{a.pinned ? "Désépingler" : "Épingler"}</Button>
              <Button variant="danger" icon={Trash2} onClick={() => setDel(true)}>Supprimer</Button>
            </Card>
          </aside>
        )}
      </div>
      <ConfirmDialog open={del} onClose={() => setDel(false)} danger title="Supprimer cette annonce ?" description="Elle disparaîtra du fil pour tous les destinataires." confirmLabel="Supprimer" onConfirm={() => { db.remove("announcements", a.id); db.audit(user.employeeId, "Annonce supprimée", a.title, ""); toast.info("Annonce supprimée."); router.push("/app/announcements"); }} />
    </>
  );
}

export default function AnnouncementDetail({ id }) {
  return <AccessGate>{(user) => <Content user={user} id={id} />}</AccessGate>;
}
