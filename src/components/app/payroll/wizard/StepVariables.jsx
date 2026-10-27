"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Badge, Button, Card, DataTable, EmptyState, PersonCell, Progress, SearchInput, Segmented } from "@/components/ui";
import { amount, fullName, int } from "@/lib/format";
import EditableCell from "./EditableCell";


export default function StepVariables({ view, update, model }) {
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const edits = useMemo(() => view.edits ?? {}, [view.edits]);

  const rows = useMemo(
    () => model.lines.map((line) => ({ id: line.employeeId, employee: model.empById[line.employeeId], vars: model.variables[line.employeeId], line })),
    [model],
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (needle && !`${fullName(r.employee)} ${r.employee.matricule}`.toLowerCase().includes(needle)) return false;
      if (filter === "edited") return !!edits[r.id];
      if (filter === "absence") return r.vars.absenceDays > 0;
      if (filter === "loan") return r.vars.loanDeduction > 0;
      if (filter === "prime") return r.vars.prime > 0 || r.vars.overtimeHours > 0;
      return true;
    });
  }, [rows, filter, q, edits]);

  const ready = useMemo(() => {
    const ok = model.employees.filter((e) => String(e.cnasNumber ?? "").trim() && e.rib && e.baseSalary >= model.params.snmg).length;
    return model.employees.length ? Math.round((ok / model.employees.length) * 100) : 0;
  }, [model]);

  const setField = (id, field, value) =>
    update({ edits: { ...edits, [id]: { ...(edits[id] ?? {}), [field]: value, sources: { ...(model.variables[id].sources ?? {}), [field === "absenceDays" ? "absence" : field === "overtimeHours" ? "overtime" : field === "loanDeduction" ? "loan" : "prime"]: "Saisie manuelle" } } }, calcDone: false });
  const isEdited = (id, field) => edits[id]?.[field] !== undefined;

  const columns = [
    { key: "name", header: "Salarié", sortValue: (r) => fullName(r.employee), cell: (r) => <PersonCell employee={r.employee} sub={r.employee.matricule} /> },
    { key: "prime", header: "Prime (DA)", align: "end", sortValue: (r) => r.vars.prime, cell: (r) => <EditableCell label={`Prime de ${fullName(r.employee)}`} value={r.vars.prime} edited={isEdited(r.id, "prime")} source={r.vars.sources?.prime} onCommit={(v) => setField(r.id, "prime", v)} /> },
    { key: "overtime", header: "Heures sup. (h)", align: "end", sortValue: (r) => r.vars.overtimeHours, cell: (r) => <EditableCell label={`Heures supplémentaires de ${fullName(r.employee)}`} value={r.vars.overtimeHours} decimals={1} edited={isEdited(r.id, "overtimeHours")} source={r.vars.sources?.overtime} onCommit={(v) => setField(r.id, "overtimeHours", v)} /> },
    { key: "absence", header: "Absences (j)", align: "end", sortValue: (r) => r.vars.absenceDays, cell: (r) => <EditableCell label={`Jours d'absence de ${fullName(r.employee)}`} value={r.vars.absenceDays} edited={isEdited(r.id, "absenceDays")} source={r.vars.sources?.absence ?? r.vars.sources?.absenceHint} onCommit={(v) => setField(r.id, "absenceDays", v)} /> },
    { key: "other", header: "Retenue (DA)", align: "end", sortValue: (r) => r.vars.otherDeductions, cell: (r) => <EditableCell label={`Retenue de ${fullName(r.employee)}`} value={r.vars.otherDeductions} edited={isEdited(r.id, "otherDeductions")} onCommit={(v) => setField(r.id, "otherDeductions", v)} /> },
    { key: "loan", header: "Prêt / avance (DA)", align: "end", sortValue: (r) => r.vars.loanDeduction, cell: (r) => <EditableCell label={`Prêt ou avance de ${fullName(r.employee)}`} value={r.vars.loanDeduction} edited={isEdited(r.id, "loanDeduction")} source={r.vars.sources?.loan} onCommit={(v) => setField(r.id, "loanDeduction", v)} /> },
    { key: "prorata", header: "Jours payés", align: "end", sortValue: (r) => r.line.ratio, cell: (r) => (r.line.ratio < 1 ? <Badge tone="info">{r.line.workedDays}/{r.line.contractualDays} j</Badge> : <span className="text-fg-muted">Mois complet</span>) },
    { key: "net", header: "Net estimé (DA)", align: "end", sortValue: (r) => r.line.net, cell: (r) => <span className="font-medium">{amount(r.line.net, { decimals: 0 })}</span> },
  ];

  const editedCount = Object.keys(edits).length;
  const fromSources = rows.filter((r) => Object.keys(r.vars.sources ?? {}).length).length;

  return (
    <div className="flex flex-col gap-[1em]">
      <Card className="grid gap-[1em] !p-[1.1em] md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="mb-[0.4em] flex items-baseline justify-between gap-[1em] text-sm">
            <span className="font-medium text-fg">{ready} % des salariés prêts</span>
            <span className="text-fg-muted">Dossier complet : N° CNAS, RIB, salaire ≥ SNMG</span>
          </div>
          <Progress value={ready} tone={ready === 100 ? "success" : ready >= 90 ? "primary" : "warning"} />
          <p className="mt-[0.6em] text-xs text-fg-muted">
            Préremplies depuis les congés sans solde, le pointage (absences, heures au-delà de 17 h 30) et l’échéancier des prêts : {int(fromSources)} salarié{fromSources > 1 ? "s" : ""} concerné{fromSources > 1 ? "s" : ""}. Cliquez sur une valeur ou appuyez sur Entrée pour la modifier.
          </p>
        </div>
        <Button variant="ghost" icon={RotateCcw} disabled={!editedCount} onClick={() => update({ edits: {}, calcDone: false })}>
          Annuler mes saisies{editedCount ? ` (${editedCount})` : ""}
        </Button>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-[0.8em]">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tous" },
            { value: "prime", label: "Primes et heures sup." },
            { value: "absence", label: "Absences" },
            { value: "loan", label: "Prêts" },
            { value: "edited", label: "Modifiés" },
          ]}
        />
        <SearchInput className="w-full sm:w-[18em]" placeholder="Nom ou matricule" onChange={setQ} />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        pageSize={12}
        density="comfortable"
        empty={<EmptyState title="Aucun salarié pour ce filtre" description="Modifiez le filtre ou la recherche pour retrouver des salariés." />}
      />
    </div>
  );
}
