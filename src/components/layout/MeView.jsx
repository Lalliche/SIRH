"use client";

import { useMemo, useState } from "react";
import { DatabaseBackup, LogOut, ShieldCheck } from "lucide-react";
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, PageHeader, Segmented, toast } from "@/components/ui";
import { db, useCollection, useDb } from "@/lib/db";
import { ROLES, CONTRACT_TYPES } from "@/data/constants";
import { clearSession } from "@/lib/session";
import { dateLong, fullName } from "@/lib/format";
import { useCurrentUser } from "@/lib/use-current-user";
import { useTheme } from "./theme";
import { useRouter } from "next/navigation";

function Info({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-fg-muted">{label}</dt>
      <dd className="mt-[0.15em] truncate text-fg">{children || "—"}</dd>
    </div>
  );
}

const DENSITIES = [
  { value: "comfortable", label: "Confortable" },
  { value: "standard", label: "Standard" },
  { value: "compact", label: "Compact" },
];

export default function MeView() {
  const router = useRouter();
  const { role, employee } = useCurrentUser();
  const employees = useCollection("employees");
  const positions = useCollection("positions");
  const departments = useCollection("departments");
  const entities = useCollection("entities");
  const settings = useDb((s) => s.settings);
  const { theme, setTheme } = useTheme();
  const [confirmReset, setConfirmReset] = useState(false);

  const ref = useMemo(() => {
    if (!employee) return {};
    return {
      position: positions.find((p) => p.id === employee.positionId)?.title,
      department: departments.find((d) => d.id === employee.departmentId)?.name,
      entity: entities.find((e) => e.id === employee.entityId)?.name,
      manager: employees.find((e) => e.id === employee.managerId),
    };
  }, [employee, positions, departments, entities, employees]);

  return (
    <>
      <PageHeader eyebrow="Compte" title="Mon profil" description="Vos informations, vos préférences d'affichage et les données de la démo." />
      <div className="grid gap-[1.5em] lg:grid-cols-[3fr_2fr]">
        <Card>
          <div className="flex flex-wrap items-center gap-[1.1em]">
            <Avatar employee={employee ?? undefined} size="xl" />
            <div className="min-w-0">
              <h2 className="font-display text-h2 font-semibold text-fg">{employee ? fullName(employee) : "—"}</h2>
              <p className="text-fg-secondary">{ref.position}</p>
              <div className="mt-[0.5em] flex flex-wrap gap-[0.4em]">
                <Badge tone="brand">{ROLES[role].label}</Badge>
                {employee && <Badge tone="neutral" dot={false}>{employee.matricule}</Badge>}
              </div>
            </div>
          </div>
          {employee && (
            <dl className="mt-[1.6em] grid gap-x-[1.5em] gap-y-[1.1em] border-t border-border-subtle pt-[1.4em] text-sm sm:grid-cols-2">
              <Info label="E-mail professionnel">{employee.email}</Info>
              <Info label="Téléphone">{employee.phone}</Info>
              <Info label="Service">{ref.department}</Info>
              <Info label="Site">{ref.entity}</Info>
              <Info label="Responsable">{ref.manager ? fullName(ref.manager) : "—"}</Info>
              <Info label="Contrat">{CONTRACT_TYPES[employee.contract?.type] ?? employee.contract?.type}</Info>
              <Info label="Date d'embauche">{dateLong(employee.hireDate)}</Info>
              <Info label="Congés disponibles">{employee.leaveBalance ? `${employee.leaveBalance.annual} jours` : "—"}</Info>
            </dl>
          )}
          <div className="mt-[1.6em] flex flex-wrap gap-[0.5em] border-t border-border-subtle pt-[1.2em]">
            <Button variant="soft" size="sm" href="/app/payslips">Mes bulletins</Button>
            <Button variant="soft" size="sm" href="/app/leave">Mes congés</Button>
            <Button variant="soft" size="sm" href="/app/requests">Mes demandes</Button>
          </div>
        </Card>

        <div className="flex flex-col gap-[1.5em]">
          <Card>
            <CardHeader title="Préférences" description="Enregistrées dans ce navigateur." />
            <div className="space-y-[1.2em]">
              <div>
                <p className="mb-[0.45em] text-[0.8125em] font-medium text-fg-secondary">Thème</p>
                <Segmented value={theme} onChange={setTheme} options={[{ value: "light", label: "Clair" }, { value: "dark", label: "Sombre" }]} />
              </div>
              <div>
                <p className="mb-[0.45em] text-[0.8125em] font-medium text-fg-secondary">Densité des tableaux</p>
                <Segmented value={settings?.density ?? "standard"} onChange={(density) => db.patchSettings({ density })} options={DENSITIES} />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Session et sécurité" />
            <p className="flex items-start gap-[0.6em] text-sm text-fg-secondary">
              <ShieldCheck className="mt-[0.15em] size-[1.1em] shrink-0 text-fg-muted" aria-hidden />
              Vous explorez SIRH en tant que <strong className="font-semibold text-fg">{ROLES[role].label.toLowerCase()}</strong>. Les actions sensibles (consultation de salaire, validation de paie) sont tracées dans le journal d&apos;audit.
            </p>
            <div className="mt-[1em] flex flex-wrap gap-[0.5em]">
              <Button variant="secondary" size="sm" href="/demo">Changer de rôle</Button>
              <Button variant="ghost" size="sm" icon={LogOut} onClick={() => { clearSession(); router.push("/demo"); }}>Déconnexion</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Données de démonstration" description="Fictives, stockées uniquement dans votre navigateur." />
            <Button variant="danger" size="sm" icon={DatabaseBackup} onClick={() => setConfirmReset(true)}>Réinitialiser les données</Button>
          </Card>
        </div>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => { db.reset(); toast.success("Données de démonstration réinitialisées."); }}
        title="Réinitialiser les données ?"
        description="Toutes vos modifications (congés, demandes, notifications lues…) seront remplacées par les données d'origine de la démo."
        confirmLabel="Réinitialiser"
        danger
      />
    </>
  );
}
