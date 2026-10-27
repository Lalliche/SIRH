"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileText, FolderOpen, Grid2x2, List, Trash2, Upload } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, DataTable, Drawer, EmptyState, Progress, SearchInput, Segmented, TextInput, toast } from "@/components/ui";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { date, fullName } from "@/lib/format";
import { fileSize } from "@/components/app/_kit/csv";
import ExpiryBadge from "./ExpiryBadge";
import UploadModal from "./UploadModal";
import { STORAGE_QUOTA, ROOT_ICON, expiryOf, foldersFor, scopeDocs } from "./helpers";

export default function VaultTab({ user, documents, employees }) {
  const [folder, setFolder] = useState("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState("grid");
  const [soonOnly, setSoonOnly] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [upload, setUpload] = useState(null);
  const [del, setDel] = useState(null);

  const visible = useMemo(() => scopeDocs(documents, user), [documents, user]);
  const folders = foldersFor(user.role);
  const attention = visible.filter((d) => ["expired", "soon"].includes(expiryOf(d)?.state));
  const used = documents.reduce((s, d) => s + d.size, 0);
  const owner = (d) => employees.find((e) => e.id === d.ownerId);
  const canManage = (d) => user.role === "admin" || user.role === "hr" || d.ownerId === user.employeeId;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visible
      .filter((d) => folder === "all" || d.folder === folder)
      .filter((d) => !soonOnly || ["expired", "soon"].includes(expiryOf(d)?.state))
      .filter((d) => !needle || d.name.toLowerCase().includes(needle))
      .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
  }, [visible, folder, soonOnly, q]);

  const current = documents.find((d) => d.id === openId);
  const columns = [
    { key: "name", header: "Nom", cell: (d) => <span className="flex items-center gap-[0.6em]"><FileText className="size-[1.2em] shrink-0 text-fg-muted" aria-hidden strokeWidth={1.5} /><span className="font-medium text-fg">{d.name}</span></span> },
    { key: "folder", header: "Dossier" },
    { key: "owner", header: "Concerne", sortValue: (d) => owner(d)?.lastName ?? "", cell: (d) => (d.folder === "Entreprise" ? <span className="text-fg-muted">Toute l&apos;entreprise</span> : fullName(owner(d))) },
    { key: "size", header: "Taille", align: "end", cell: (d) => fileSize(d.size) },
    { key: "uploadedAt", header: "Ajouté le", cell: (d) => <span className="num">{date(d.uploadedAt)}</span> },
    { key: "expiresAt", header: "Validité", sortValue: (d) => d.expiresAt ?? "9999", cell: (d) => <ExpiryBadge doc={d} /> },
  ];

  return (
    <div className="grid gap-[1.5em] lg:grid-cols-[15em_1fr]">
      <aside className="flex flex-col gap-[1em]">
        <nav aria-label="Dossiers" className="flex gap-[0.4em] overflow-x-auto lg:flex-col lg:overflow-visible">
          {[{ key: "all", icon: ROOT_ICON, label: "Tous les documents", count: visible.length }, ...folders.map((f) => ({ ...f, label: f.key, count: visible.filter((d) => d.folder === f.key).length }))].map((f) => (
            <Button
              key={f.key}
              variant={folder === f.key ? "soft" : "ghost"}
              icon={f.icon}
              aria-current={folder === f.key}
              onClick={() => setFolder(f.key)}
              className="lg:!w-full lg:!justify-start"
            >
              <span className="flex-1 text-start">{f.label}</span>
              <span className="text-xs text-fg-muted num">{f.count}</span>
            </Button>
          ))}
        </nav>
        {(user.role === "admin" || user.role === "hr") && (
          <Card className="hidden !p-[1em] lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted">Stockage</p>
            <Progress className="mt-[0.6em]" value={used} max={STORAGE_QUOTA} />
            <p className="mt-[0.5em] text-xs text-fg-muted num">{fileSize(used)} sur 5 Go (offre Business)</p>
          </Card>
        )}
      </aside>

      <div className="min-w-0">
        {attention.length > 0 && (
          <div role="status" className="mb-[1em] flex flex-wrap items-center gap-[0.8em] rounded-lg border border-warning/50 bg-warning-bg px-[1em] py-[0.8em] text-warning-fg">
            <AlertTriangle className="size-[1.2em] shrink-0" aria-hidden />
            <p className="flex-1 text-sm"><span className="font-semibold">{attention.length} document{attention.length > 1 ? "s" : ""}</span> expirent dans moins de 60 jours ou sont déjà expirés.</p>
            <Button size="sm" variant="secondary" onClick={() => setSoonOnly(!soonOnly)}>{soonOnly ? "Tout afficher" : "Les voir"}</Button>
          </div>
        )}

        <div className="mb-[1em] flex flex-wrap items-center gap-[0.7em]">
          <SearchInput className="w-full sm:w-[18em]" placeholder="Rechercher un document…" value={q} onChange={setQ} />
          <div className="ms-auto flex items-center gap-[0.7em]">
            <Segmented value={view} onChange={setView} options={[{ value: "grid", label: <span className="inline-flex items-center gap-[0.4em]"><Grid2x2 className="size-[1.1em]" aria-label="Grille" /></span> }, { value: "list", label: <span className="inline-flex items-center gap-[0.4em]"><List className="size-[1.1em]" aria-label="Liste" /></span> }]} />
            <Button icon={Upload} onClick={() => setUpload(Math.random())}>Déposer</Button>
          </div>
        </div>

        {list.length === 0 ? (
          <Card className="!p-0">
            <EmptyState
              icon={FolderOpen}
              title={q || soonOnly ? "Aucun document ne correspond" : "Ce dossier est vide"}
              description={q || soonOnly ? "Essayez un autre mot-clé ou retirez le filtre d'expiration." : "Déposez un premier document : contrat, certificat, justificatif."}
              action={q || soonOnly ? <Button variant="secondary" onClick={() => { setQ(""); setSoonOnly(false); }}>Effacer les filtres</Button> : <Button icon={Upload} onClick={() => setUpload(Math.random())}>Déposer</Button>}
            />
          </Card>
        ) : view === "grid" ? (
          <ul className="grid gap-[0.9em] sm:grid-cols-2 xl:grid-cols-3">
            {list.map((d) => (
              <li key={d.id}>
                <Card as="button" type="button" interactive onClick={() => setOpenId(d.id)} className="flex h-full w-full flex-col gap-[0.8em] text-start !p-[1.1em]">
                  <span className="flex items-start gap-[0.8em]">
                    <span className="flex size-[2.6em] shrink-0 items-center justify-center rounded-md bg-primary-soft text-link"><FileText className="size-[1.3em]" aria-hidden strokeWidth={1.5} /></span>
                    <span className="min-w-0">
                      <span className="block break-words font-medium leading-snug text-fg">{d.name}</span>
                      <span className="block text-xs text-fg-muted">{d.folder} · {fileSize(d.size)}</span>
                    </span>
                  </span>
                  <span className="mt-auto flex flex-wrap items-center gap-[0.5em]">
                    <ExpiryBadge doc={d} />
                    <span className="text-xs text-fg-muted">{date(d.uploadedAt)}</span>
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <DataTable columns={columns} rows={list} onRowClick={(d) => setOpenId(d.id)} />
        )}
      </div>

      <Drawer open={!!current} onClose={() => setOpenId(null)} title={current?.name ?? ""} description={current?.folder}
        footer={current && <>
          {canManage(current) && <Button variant="danger" icon={Trash2} onClick={() => setDel(current)}>Supprimer</Button>}
          <Button icon={Download} onClick={() => toast.info("Démo : le contenu des fichiers n'est pas conservé, seul le nom l'est.")}>Télécharger</Button>
        </>}>
        {current && (
          <div className="flex flex-col gap-[1.2em]">
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg border border-border-subtle bg-bg-sunken"><FileText className="size-[3em] text-fg-faint" aria-hidden strokeWidth={1.2} /></div>
            <dl className="grid grid-cols-2 gap-[1em] text-sm">
              <div><dt className="text-xs text-fg-muted">Taille</dt><dd className="text-fg">{fileSize(current.size)}</dd></div>
              <div><dt className="text-xs text-fg-muted">Ajouté le</dt><dd className="text-fg">{date(current.uploadedAt)}</dd></div>
              <div><dt className="text-xs text-fg-muted">Accès</dt><dd><Badge tone="neutral">{current.folder === "Entreprise" ? "Toute l'entreprise" : "RH et personne concernée"}</Badge></dd></div>
              <div><dt className="text-xs text-fg-muted">Concerne</dt><dd className="text-fg">{current.folder === "Entreprise" ? "—" : fullName(owner(current))}</dd></div>
            </dl>
            <div><p className="mb-[0.4em] text-xs text-fg-muted">Validité</p>{current.expiresAt ? <ExpiryBadge doc={current} /> : <span className="text-sm text-fg-secondary">Sans date d&apos;expiration</span>}</div>
            {canManage(current) && (
              <TextInput label="Modifier la date d'expiration" type="date" value={current.expiresAt ?? ""} onChange={(v) => db.patch("documents", current.id, { expiresAt: v || null })} />
            )}
          </div>
        )}
      </Drawer>
      {upload && <UploadModal key={upload} open user={user} employees={employees} defaultFolder={folder === "all" ? undefined : folder} onClose={() => setUpload(null)} />}
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Supprimer ce document ?" description={del ? `« ${del.name} » sera supprimé définitivement.` : ""} confirmLabel="Supprimer" onConfirm={() => { db.remove("documents", del.id); db.audit(user.employeeId, "Document supprimé", del.name, del.folder); setOpenId(null); toast.info("Document supprimé."); }} />
    </div>
  );
}
