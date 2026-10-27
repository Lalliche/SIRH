"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Megaphone, Pin, Plus } from "lucide-react";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, Progress, Segmented } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { useCollection } from "@/lib/db";
import { dateLong, fullName } from "@/lib/format";
import ReactionBar from "./ReactionBar";
import Composer from "./Composer";
import { CATEGORIES, audienceMembers, audienceOptions, readCount, visibleTo } from "./helpers";

export function AnnouncementCard({ a, author, size, user, showReceipts }) {
  const reads = readCount(a, size);
  const cat = CATEGORIES[a.category ?? "hr"];
  return (
    <Card as="article" interactive className="flex flex-col gap-[0.9em]">
      <div className="flex flex-wrap items-center gap-[0.5em]">
        {a.pinned && <Badge tone="neutral" icon={Pin}>Épinglée</Badge>}
        <Badge tone={cat.tone}>{cat.label}</Badge>
        <span className="text-xs text-fg-muted">Pour : {a.audience}</span>
      </div>
      <div>
        <h2 className="text-h3 font-semibold text-fg"><Link href={`/app/announcements/${a.id}`} className="hover:underline">{a.title}</Link></h2>
        <p className="mt-[0.4em] line-clamp-3 text-fg-secondary">{a.body}</p>
      </div>
      <div className="flex items-center gap-[0.6em] text-xs text-fg-muted">
        <Avatar employee={author} size="xs" /> {fullName(author)} · {dateLong(a.date)}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-[0.8em] border-t border-border-subtle pt-[0.8em]">
        <ReactionBar announcement={a} userId={user.employeeId} />
        {showReceipts ? (
          <div className="flex items-center gap-[0.6em] text-xs text-fg-muted" title="Accusés de lecture (démo)">
            <Eye className="size-[1.1em]" aria-hidden />
            <Progress className="w-[5em]" value={reads} max={size} />
            <span className="num">Lu par {reads}/{size}</span>
          </div>
        ) : (
          <Button variant="ghost" size="sm" href={`/app/announcements/${a.id}`}>Lire</Button>
        )}
      </div>
    </Card>
  );
}

function Content({ user }) {
  const router = useRouter();
  const announcements = useCollection("announcements");
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const [cat, setCat] = useState("all");
  const [compose, setCompose] = useState(null);
  const canWrite = user.role === "admin" || user.role === "hr";

  const audiences = useMemo(() => audienceOptions(departments, entities), [departments, entities]);
  const feed = useMemo(
    () => announcements
      .filter((a) => visibleTo(a, user, employees, departments, entities))
      .filter((a) => cat === "all" || (a.category ?? "hr") === cat)
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.date.localeCompare(a.date)),
    [announcements, user, employees, departments, entities, cat],
  );
  const size = (a) => audienceMembers(a.audience, employees, departments, entities).length;

  return (
    <>
      <PageHeader title="Annonces" description="Les informations de l'entreprise, ciblées par service, site ou rôle." actions={canWrite && <Button icon={Plus} onClick={() => setCompose(Math.random())}>Nouvelle annonce</Button>} />
      <div className="mb-[1.25em]">
        <Segmented value={cat} onChange={setCat} options={[{ value: "all", label: "Toutes" }, ...Object.entries(CATEGORIES).map(([value, c]) => ({ value, label: c.label }))]} />
      </div>
      {feed.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={cat === "all" ? (canWrite ? "Le fil est vide" : "Rien de nouveau") : "Aucune annonce dans cette catégorie"}
          description={canWrite ? "Publiez une première annonce : horaires, rappel de procédure, bienvenue à un nouveau collègue." : "Les annonces de l'entreprise apparaîtront ici."}
          action={canWrite ? <Button icon={Plus} onClick={() => setCompose(Math.random())}>Nouvelle annonce</Button> : cat !== "all" && <Button variant="secondary" onClick={() => setCat("all")}>Tout afficher</Button>}
        />
      ) : (
        <div className="mx-auto flex max-w-[48em] flex-col gap-[1em]">
          {feed.map((a) => <AnnouncementCard key={a.id} a={a} author={employees.find((e) => e.id === a.authorId)} size={size(a)} user={user} showReceipts={canWrite} />)}
        </div>
      )}
      {compose && <Composer key={compose} open user={user} audiences={audiences} employees={employees} departments={departments} entities={entities} onClose={(id) => { setCompose(null); if (id) router.push(`/app/announcements/${id}`); }} />}
    </>
  );
}

export default function AnnouncementsView() {
  return <AccessGate>{(user) => <Content user={user} />}</AccessGate>;
}
