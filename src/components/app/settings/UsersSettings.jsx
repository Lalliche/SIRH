"use client";

import { useMemo, useState } from "react";
import { Eye, MailPlus, Trash2 } from "lucide-react";
import { Badge, Button, DataTable, Modal, PersonCell, SearchInput, SelectInput, TextInput, toast } from "@/components/ui";
import { ROLES } from "@/data/constants";
import { navGroups } from "@/content/nav";
import { db, newId, useCollection, useDb } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { dateShort } from "@/lib/format";
import { hashUnit } from "@/components/app/_kit/metrics";
import Section from "./Section";

const roleOptions = Object.entries(ROLES).map(([value, r]) => ({ value, label: r.label }));
const EMPTY = [];

function InviteModal({ open, onClose, user }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");
  const [error, setError] = useState("");
  const send = () => {
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Saisissez une adresse e-mail valide.");
    db.update("settings", (s) => ({ ...s, invitations: [{ id: newId("inv"), email: email.trim(), role, at: TODAY }, ...(s.invitations ?? [])] }));
    db.audit(user.employeeId, "Invitation envoyée", email.trim(), ROLES[role].label);
    toast.success(`Invitation envoyée à ${email.trim()} (simulation).`);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Inviter un utilisateur" description="Prototype : aucun e-mail n'est réellement envoyé." footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={send}>Envoyer l&apos;invitation</Button></>}>
      <form className="flex flex-col gap-[1em]" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <TextInput label="Adresse e-mail" type="email" required value={email} onChange={(v) => { setEmail(v); setError(""); }} error={error} placeholder="prenom.nom@entreprise.dz" />
        <SelectInput label="Rôle" value={role} onChange={setRole} options={roleOptions} />
      </form>
    </Modal>
  );
}

export default function UsersSettings({ user }) {
  const employees = useCollection("employees");
  const invitations = useDb((s) => s.settings.invitations) ?? EMPTY;
  const [q, setQ] = useState("");
  const [invite, setInvite] = useState(null);
  const [preview, setPreview] = useState("manager");

  const admins = employees.filter((e) => e.role === "admin" && e.status !== "sorti").length;
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return employees.filter((e) => e.status !== "sorti" && (!needle || `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(needle)));
  }, [employees, q]);

  const changeRole = (e, role) => {
    if (e.role === "admin" && role !== "admin" && admins <= 1) return toast.error("Il faut au moins un administrateur.");
    db.patch("employees", e.id, { role });
    db.audit(user.employeeId, "Rôle modifié", `${e.firstName} ${e.lastName}`, `${ROLES[e.role].label} → ${ROLES[role].label}`);
    toast.success(`${e.firstName} ${e.lastName} : ${ROLES[role].label}.`);
  };

  const columns = [
    { key: "name", header: "Utilisateur", sortValue: (e) => e.lastName, cell: (e) => <PersonCell employee={e} sub={e.email} /> },
    {
      key: "role",
      header: "Rôle",
      sortValue: (e) => e.role,
      cell: (e) => (
        <SelectInput aria-label={`Rôle de ${e.firstName} ${e.lastName}`} className="w-[14em]" value={e.role} disabled={e.id === user.employeeId} onChange={(v) => changeRole(e, v)} options={roleOptions} />
      ),
    },
    { key: "last", header: "Dernière connexion", sortable: false, cell: (e) => <span className="text-fg-muted num">{dateShort(`2026-10-${String(27 - Math.floor(hashUnit(e.id) * 12)).padStart(2, "0")}`)}</span> },
    { key: "status", header: "Statut", sortable: false, cell: (e) => <Badge tone={e.status === "conge" ? "neutral" : "success"}>{e.status === "conge" ? "En congé" : "Actif"}</Badge> },
  ];

  const visible = navGroups.flatMap((g) => g.items).filter((i) => i.roles.includes(preview));

  return (
    <div className="flex flex-col gap-[1.25em]">
      <Section
        title="Utilisateurs et rôles"
        description="Le rôle détermine les modules visibles et les données accessibles. Vous ne pouvez pas modifier votre propre rôle."
        action={<Button icon={MailPlus} onClick={() => setInvite(Math.random())}>Inviter</Button>}
      >
        <SearchInput className="mb-[1em] w-full sm:w-[20em]" placeholder="Rechercher un utilisateur…" value={q} onChange={setQ} />
        <DataTable columns={columns} rows={rows} pageSize={10} empty={<p className="p-[2em] text-center text-sm text-fg-muted">Aucun utilisateur ne correspond.</p>} />
      </Section>

      {invitations.length > 0 && (
        <Section title="Invitations en attente" description={`${invitations.length} invitation${invitations.length > 1 ? "s" : ""} envoyée${invitations.length > 1 ? "s" : ""}.`}>
          <ul className="divide-y divide-border-subtle">
            {invitations.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-[1em] py-[0.6em]">
                <span><span className="font-medium text-fg">{i.email}</span> <Badge tone="info" className="ms-[0.5em]">{ROLES[i.role].label}</Badge></span>
                <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Révoquer l'invitation de ${i.email}`} onClick={() => { db.update("settings", (s) => ({ ...s, invitations: s.invitations.filter((x) => x.id !== i.id) })); toast.info("Invitation révoquée."); }}>Révoquer</Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Aperçu des permissions" description="Ce que voit chaque rôle dans le menu." action={<SelectInput aria-label="Rôle à prévisualiser" className="w-[14em]" value={preview} onChange={setPreview} options={roleOptions} />}>
        <ul className="flex flex-wrap gap-[0.5em]">
          {visible.map((i) => <li key={i.href}><Badge tone="neutral" icon={Eye}>{i.label}</Badge></li>)}
        </ul>
      </Section>
      {invite && <InviteModal key={invite} open user={user} onClose={() => setInvite(null)} />}
    </div>
  );
}
