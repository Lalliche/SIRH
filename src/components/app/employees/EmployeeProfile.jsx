"use client";

import { useCallback, useState } from "react";
import { ArrowLeft, Briefcase, CalendarDays, FileText, History, LogOut, Pause, Pencil, Play, ShieldOff, User, UserX, Wallet } from "lucide-react";
import { Badge, Button, Card, EmptyState, Modal, PageHeader, SelectInput, StatusBadge, Tabs, TextInput, ConfirmDialog, toast, Avatar } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import ProgressRing from "@/components/app/_kit/ProgressRing";
import { TODAY } from "@/lib/clock";
import { db, useCollection } from "@/lib/db";
import { fullName, money } from "@/lib/format";
import { severanceIndemnity } from "@/lib/payroll-run";
import AttestationModal from "./AttestationModal";
import { EXIT_REASONS, EMP_STATUS, canEdit, canOpenProfile, canSeeSalary, completeness, SENSITIVE_ROLES } from "./helpers";
import { ContractBadge } from "./parts";
import { ActivityTab, DocumentsTab, JobTab, OverviewTab, PayTab, TimeTab } from "./ProfileTabs";

const TAB_DEFS = [
  { value: "overview", label: "Aperçu", icon: User },
  { value: "job", label: "Poste & contrat", icon: Briefcase },
  { value: "pay", label: "Rémunération", icon: Wallet },
  { value: "time", label: "Temps & congés", icon: CalendarDays },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "activity", label: "Activité", icon: History },
];

export default function EmployeeProfile({ id, initialTab = "overview" }) {
  return <AccessGate>{(user) => <Gate id={id} user={user} initialTab={initialTab} />}</AccessGate>;
}

function Gate({ id, user, initialTab }) {
  const employees = useCollection("employees");
  const departments = useCollection("departments");
  const emp = employees.find((e) => e.id === id);

  if (!emp) {
    return (
      <EmptyState
        icon={UserX}
        title="Employé introuvable"
        description="Ce dossier n'existe pas ou a été supprimé. Retournez à la liste pour retrouver la personne."
        action={<Button href={user.role === "employee" ? "/app" : "/app/employees"}>{user.role === "employee" ? "Retour au tableau de bord" : "Retour aux employés"}</Button>}
      />
    );
  }
  if (!canOpenProfile(user.role, user.employee, emp, employees, departments)) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="Accès restreint"
        description={user.role === "employee" ? "Vous pouvez uniquement consulter votre propre fiche." : "Vous ne pouvez consulter que les fiches des membres de votre équipe."}
        action={<Button href={user.employee ? `/app/employees/${user.employee.id}` : "/app"}>Voir ma fiche</Button>}
      />
    );
  }
  return <ProfileBody key={emp.id} emp={emp} user={user} initialTab={initialTab} />;
}

function ProfileBody({ emp, user, initialTab }) {
  const { role, employee: actor } = user;
  const positions = useCollection("positions");
  const departments = useCollection("departments");
  const entities = useCollection("entities");

  const isSelf = actor?.id === emp.id;
  const editable = canEdit(role);
  const showPay = canSeeSalary(role, actor, emp);
  const canIds = SENSITIVE_ROLES.includes(role) || isSelf;
  const tabs = TAB_DEFS.filter((t) => t.value !== "pay" || showPay);

  const [tab, setTabState] = useState(tabs.some((t) => t.value === initialTab) ? initialTab : "overview");
  const [editingId, setEditingId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [attestation, setAttestation] = useState(false);
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);

  const setTab = (t) => {
    setTabState(t);
    setEditingId(null);
    if (t !== "pay") setRevealed(false);
    if (typeof window !== "undefined") window.history.replaceState(null, "", t === "overview" ? window.location.pathname : `?tab=${t}`);
  };

  const update = useCallback(
    (label, patch, before, after, { sensitive } = {}) => {
      db.patch("employees", emp.id, patch);
      db.audit(actor?.id, "Fiche modifiée", fullName(emp), sensitive ? `${label} modifié` : `${label} : ${before || "—"} → ${after || "—"}`);
      toast.success(`${label} mis à jour.`);
    },
    [emp, actor],
  );

  const reveal = () => {
    if (!isSelf) db.audit(actor?.id, "Salaire consulté", fullName(emp), "Fiche salarié · onglet Rémunération");
    setRevealed(true);
    toast.info(isSelf ? "Rémunération affichée." : "Affichage consigné dans le journal d'audit.");
  };

  const ctx = { editable, editMode, editingId, setEditingId, update, canIds, isSelf, actor, revealed, reveal, hide: () => setRevealed(false) };

  const pos = positions.find((p) => p.id === emp.positionId);
  const dep = departments.find((d) => d.id === emp.departmentId);
  const ent = entities.find((e) => e.id === emp.entityId);
  const c = completeness(emp);

  const openAttestation = () => {
    db.audit(actor?.id, "Attestation de travail générée", fullName(emp), `Réf. AT/${TODAY.slice(0, 4)}/${emp.matricule.replace(/\D/g, "")}`);
    setAttestation(true);
  };

  const toggleLeave = () => {
    const prev = emp.status;
    const next = prev === "conge" ? "actif" : "conge";
    db.patch("employees", emp.id, { status: next });
    db.audit(actor?.id, next === "conge" ? "Mise en congé" : "Reprise d'activité", fullName(emp), `Statut : ${EMP_STATUS[prev].label} → ${EMP_STATUS[next].label}`);
    toast.success(next === "conge" ? `${emp.firstName} est maintenant en congé.` : `${emp.firstName} a repris son activité.`, {
      action: { label: "Annuler", onClick: () => db.patch("employees", emp.id, { status: prev }) },
    });
  };

  return (
    <div>
      {role !== "employee" && (
        <Button href="/app/employees" variant="ghost" size="sm" icon={ArrowLeft} className="-ms-[0.5em] mb-[0.75em]">
          {role === "manager" ? "Mon équipe" : "Employés"}
        </Button>
      )}

      <Card className="mb-[1.25em] !p-[1.5em]">
        <div className="flex flex-wrap items-start justify-between gap-[1.25em]">
          <div className="flex min-w-0 items-center gap-[1.1em]">
            <Avatar employee={emp} size="lg" />
            <div className="min-w-0">
              <h1 className="text-h1 font-semibold text-fg">{fullName(emp)}</h1>
              <p className="text-fg-secondary">{pos?.title ?? "—"} · {dep?.name}</p>
              <p className="text-sm text-fg-muted">{ent?.name} · <span className="font-mono">{emp.matricule}</span></p>
              <div className="mt-[0.6em] flex flex-wrap items-center gap-[0.4em]">
                <StatusBadge status={emp.status} map={EMP_STATUS} />
                <ContractBadge contract={emp.contract} />
                {isSelf && <Badge tone="brand" dot={false}>Ma fiche</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-[0.9em] rounded-lg border border-border-subtle bg-surface-2 px-[1em] py-[0.8em]">
            <ProgressRing value={c.pct} tone={c.critical.length ? "warning" : "success"} size="3.6em" stroke={10} label={`Dossier complet à ${c.pct} %`} />
            <div className="text-sm">
              <p className="font-medium text-fg">Dossier complet à {c.pct} %</p>
              <p className="max-w-[20ch] text-fg-muted">{c.missing.length ? `Manque : ${c.missing.map((m) => m.label).join(", ")}` : "Aucune pièce manquante"}</p>
            </div>
          </div>
        </div>

        {(editable || true) && (
          <div className="mt-[1.25em] flex flex-wrap items-center gap-[0.6em] border-t border-border-subtle pt-[1em]">
            {(editable || isSelf) && <Button variant="secondary" icon={FileText} onClick={openAttestation}>Générer l’attestation de travail</Button>}
            {editable && (
              <>
                <Button
                  variant={editMode ? "primary" : "soft"}
                  icon={Pencil}
                  onClick={() => {
                    setEditMode((v) => !v);
                    setEditingId(null);
                    if (!editMode && tab !== "overview" && tab !== "job" && tab !== "pay") setTab("overview");
                  }}
                  aria-pressed={editMode}
                >
                  {editMode ? "Terminer la modification" : "Modifier"}
                </Button>
                {emp.status !== "sorti" && (
                  <>
                    <Button variant="ghost" icon={emp.status === "conge" ? Play : Pause} onClick={() => (emp.status === "conge" ? toggleLeave() : setLeaveConfirm(true))}>
                      {emp.status === "conge" ? "Reprendre l'activité" : "Mettre en congé"}
                    </Button>
                    <Button variant="danger" icon={LogOut} onClick={() => setExitOpen(true)}>Enregistrer une sortie</Button>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {editMode && (
          <p className="mt-[0.9em] rounded-md bg-primary-soft px-[0.9em] py-[0.6em] text-sm text-link" role="status">
            Mode modification : cliquez sur le crayon d’un champ, validez avec Entrée. Chaque changement est tracé dans l’activité.
          </p>
        )}
      </Card>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-[1.25em]" />

      <div role="tabpanel" aria-label={tabs.find((t) => t.value === tab)?.label}>
        {tab === "overview" && <OverviewTab emp={emp} ctx={ctx} />}
        {tab === "job" && <JobTab emp={emp} ctx={ctx} />}
        {tab === "pay" && showPay && <PayTab emp={emp} ctx={ctx} />}
        {tab === "time" && <TimeTab emp={emp} />}
        {tab === "documents" && <DocumentsTab emp={emp} ctx={ctx} />}
        {tab === "activity" && <ActivityTab emp={emp} />}
      </div>

      <AttestationModal open={attestation} onClose={() => setAttestation(false)} emp={emp} />

      <ConfirmDialog
        open={leaveConfirm}
        onClose={() => setLeaveConfirm(false)}
        onConfirm={toggleLeave}
        title={`Mettre ${emp.firstName} en congé ?`}
        description="Le dossier passe au statut « En congé » (suspension d'activité, par exemple un arrêt de longue durée). Le salarié reste dans les effectifs. Vous pourrez annuler juste après."
        confirmLabel="Mettre en congé"
      />
      <ExitModal open={exitOpen} onClose={() => setExitOpen(false)} emp={emp} actor={actor} />
    </div>
  );
}

function ExitModal({ open, onClose, emp, actor }) {
  const [exitDate, setExitDate] = useState(TODAY);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const runs = useCollection("payrollRuns");
  const errors = {
    exitDate: !exitDate ? "Date obligatoire" : exitDate < emp.hireDate ? "Antérieure à la date d'embauche" : null,
    reason: !reason ? "Choisissez un motif" : null,
  };
  const severance = reason && !errors.exitDate ? severanceIndemnity({ employee: emp, runs, exitReason: reason, exitDate }) : null;
  const submit = () => {
    setTouched(true);
    if (errors.exitDate || errors.reason) return;
    const prev = { status: emp.status, exitDate: emp.exitDate ?? null, exitReason: emp.exitReason ?? null };
    db.patch("employees", emp.id, { status: "sorti", exitDate, exitReason: reason });
    db.audit(actor?.id, "Sortie enregistrée", fullName(emp), `${reason} · ${exitDate.split("-").reverse().join("/")}`);
    toast.success(`Sortie de ${fullName(emp)} enregistrée.`, { action: { label: "Annuler", onClick: () => db.patch("employees", emp.id, prev) } });
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Enregistrer une sortie"
      description={`${fullName(emp)} sera retiré(e) des effectifs actifs à la date indiquée.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button variant="danger-solid" onClick={submit}>Confirmer la sortie</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[1em]">
        <TextInput label="Date de sortie" type="date" required value={exitDate} onChange={setExitDate} onBlur={() => setTouched(true)} error={touched ? errors.exitDate : undefined} />
        <SelectInput label="Motif" required value={reason} onChange={setReason} onBlur={() => setTouched(true)} placeholder="Sélectionner un motif" options={EXIT_REASONS} error={touched ? errors.reason : undefined} />
        {severance && (
          <div className="rounded-md border border-border-subtle bg-surface-subtle p-[0.9em] text-sm">
            {severance.eligible ? (
              <>
                <p className="font-medium text-fg">Indemnité de licenciement estimée : {money(severance.amount)}</p>
                <p className="mt-[0.3em] text-xs text-fg-muted">
                  {severance.monthsOwed} mois × {money(severance.monthlyAverage)} (moyenne {severance.basedOnHistory ? "des bulletins disponibles" : "sur le salaire de base — historique de paie insuffisant"}), plafonné à 15 mois. Art. 72, loi 90-11. [à confirmer]
                </p>
              </>
            ) : (
              <p className="text-fg-muted">{severance.blockedReason}</p>
            )}
          </div>
        )}
        <p className="text-sm text-fg-muted">Pensez à préparer le solde de tout compte, le certificat de travail et la déclaration de sortie CNAS.</p>
      </div>
    </Modal>
  );
}
