"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Briefcase, Building2, Crown, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Avatar, Badge, Button, Card, ConfirmDialog, EmptyState, Modal, PageHeader, SelectInput, Tabs, TextArea, TextInput, Toggle, toast } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { WILAYAS } from "@/data/constants";
import { db, newId, useCollection } from "@/lib/db";
import { fullName, int } from "@/lib/format";
import { duration, ease, variants } from "@/lib/motion-tokens";

const KINDS = {
  departments: { collection: "departments", prefix: "dep", singular: "département", add: "Ajouter un département", noun: "Département" },
  positions: { collection: "positions", prefix: "pos", singular: "poste", add: "Ajouter un poste", noun: "Poste" },
  entities: { collection: "entities", prefix: "ent", singular: "entité", add: "Ajouter une entité", noun: "Entité" },
};

export default function OrganizationPage() {
  return <AccessGate roles={["admin", "hr"]}>{(user) => <Body user={user} />}</AccessGate>;
}

function Body({ user }) {
  const departments = useCollection("departments");
  const positions = useCollection("positions");
  const entities = useCollection("entities");
  const employees = useCollection("employees");
  const actor = user.employee;

  const [tab, setTab] = useState("departments");
  const [form, setForm] = useState(null); // { kind, item|null }
  const [removing, setRemoving] = useState(null); // { kind, item }

  const active = useMemo(() => employees.filter((e) => e.status !== "sorti"), [employees]);
  const count = useMemo(() => {
    const c = { departments: {}, positions: {}, entities: {} };
    active.forEach((e) => {
      c.departments[e.departmentId] = (c.departments[e.departmentId] ?? 0) + 1;
      c.positions[e.positionId] = (c.positions[e.positionId] ?? 0) + 1;
      c.entities[e.entityId] = (c.entities[e.entityId] ?? 0) + 1;
    });
    return c;
  }, [active]);
  const byId = useMemo(() => Object.fromEntries(employees.map((e) => [e.id, e])), [employees]);

  const lists = { departments, positions, entities };
  const tabs = [
    { value: "departments", label: "Départements", icon: Building2, count: departments.length },
    { value: "positions", label: "Postes", icon: Briefcase, count: positions.length },
    { value: "entities", label: "Entités & sites", icon: MapPin, count: entities.length },
  ];
  const kind = KINDS[tab];

  const askRemove = (k, item) => {
    const n = count[k][item.id] ?? 0;
    if (n > 0) {
      toast.warning(`Impossible de supprimer « ${item.name ?? item.title} » : ${int(n)} employé${n > 1 ? "s y sont" : " y est"} rattaché${n > 1 ? "s" : ""}. Réaffectez-les d'abord.`);
      return;
    }
    if (k === "entities" && item.isHQ) {
      toast.warning("Le siège ne peut pas être supprimé. Désignez d'abord un autre siège.");
      return;
    }
    if (k === "departments" && positions.some((p) => p.departmentId === item.id)) {
      toast.warning(`Ce département contient encore des postes. Supprimez-les ou déplacez-les avant de continuer.`);
      return;
    }
    setRemoving({ kind: k, item });
  };

  const doRemove = () => {
    const { kind: k, item } = removing;
    const snapshot = item;
    db.remove(KINDS[k].collection, item.id);
    db.audit(actor?.id, `${KINDS[k].noun} supprimé`, item.name ?? item.title, "Organisation");
    toast.success(`« ${item.name ?? item.title} » supprimé.`, { action: { label: "Annuler", onClick: () => db.insert(KINDS[k].collection, snapshot) } });
  };

  return (
    <div>
      <PageHeader
        title="Organisation"
        description="Structure de l'entreprise : départements, postes et sites. Les effectifs sont calculés sur les salariés actifs."
        actions={<Button icon={Plus} onClick={() => setForm({ kind: tab, item: null })}>{kind.add}</Button>}
      />
      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-[1.25em]" />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: duration.base, ease: ease.out }}>
          {lists[tab].length === 0 ? (
            <Card padded={false}>
              <EmptyState icon={Building2} title={`Aucun ${kind.singular} défini`} description="Créez le premier élément pour structurer vos dossiers salariés et l'organigramme." action={<Button icon={Plus} onClick={() => setForm({ kind: tab, item: null })}>{kind.add}</Button>} />
            </Card>
          ) : (
            <motion.ul variants={variants.container} initial="hidden" animate="show" className="grid gap-[1em] sm:grid-cols-2 xl:grid-cols-3">
              {lists[tab].map((item) => (
                <motion.li key={item.id} variants={variants.rise}>
                  {tab === "departments" && <DepartmentCard item={item} head={byId[item.headId]} headcount={count.departments[item.id] ?? 0} positions={positions.filter((p) => p.departmentId === item.id).length} onEdit={() => setForm({ kind: tab, item })} onRemove={() => askRemove(tab, item)} />}
                  {tab === "positions" && <PositionCard item={item} department={departments.find((d) => d.id === item.departmentId)} headcount={count.positions[item.id] ?? 0} onEdit={() => setForm({ kind: tab, item })} onRemove={() => askRemove(tab, item)} />}
                  {tab === "entities" && <EntityCard item={item} headcount={count.entities[item.id] ?? 0} onEdit={() => setForm({ kind: tab, item })} onRemove={() => askRemove(tab, item)} />}
                </motion.li>
              ))}
            </motion.ul>
          )}
        </motion.div>
      </AnimatePresence>

      <ItemModal state={form} onClose={() => setForm(null)} departments={departments} active={active} positions={positions} actor={actor} />
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={doRemove}
        danger
        confirmLabel="Supprimer"
        title={`Supprimer ce ${removing ? KINDS[removing.kind].singular : "élément"} ?`}
        description={removing ? `« ${removing.item.name ?? removing.item.title} » sera retiré de la structure. Aucun employé n'y est rattaché. Vous pourrez annuler juste après.` : ""}
      />
    </div>
  );
}

function CardActions({ label, onEdit, onRemove }) {
  return (
    <div className="flex shrink-0 gap-[0.1em]">
      <Button variant="ghost" size="icon" icon={Pencil} aria-label={`Modifier ${label}`} onClick={onEdit} />
      <Button variant="ghost" size="icon" icon={Trash2} aria-label={`Supprimer ${label}`} onClick={onRemove} />
    </div>
  );
}

const Stat = ({ icon: Icon, children }) => <span className="inline-flex items-center gap-[0.4em] text-sm text-fg-secondary"><Icon className="size-[1.1em] text-fg-muted" aria-hidden strokeWidth={1.6} />{children}</span>;

function DepartmentCard({ item, head, headcount, positions, onEdit, onRemove }) {
  return (
    <Card interactive className="flex h-full flex-col gap-[1em]">
      <div className="flex items-start justify-between gap-[0.5em]">
        <div className="min-w-0">
          <h3 className="text-h3 font-semibold text-fg">{item.name}</h3>
          <p className="mt-[0.15em] text-sm text-fg-muted">{item.description || "Sans description"}</p>
        </div>
        <CardActions label={item.name} onEdit={onEdit} onRemove={onRemove} />
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-[0.6em] border-t border-border-subtle pt-[0.9em]">
        {head ? (
          <span className="flex min-w-0 items-center gap-[0.6em]"><Avatar employee={head} size="sm" /><span className="min-w-0"><span className="block truncate text-sm font-medium text-fg">{fullName(head)}</span><span className="flex items-center gap-[0.3em] text-xs text-fg-muted"><Crown className="size-[1em]" aria-hidden />Responsable</span></span></span>
        ) : (
          <Button variant="soft" size="sm" onClick={onEdit}>Désigner un responsable</Button>
        )}
        <span className="flex gap-[0.9em]"><Stat icon={Users}>{int(headcount)}</Stat><Stat icon={Briefcase}>{int(positions)}</Stat></span>
      </div>
    </Card>
  );
}

function PositionCard({ item, department, headcount, onEdit, onRemove }) {
  return (
    <Card interactive className="flex h-full flex-col gap-[0.9em]">
      <div className="flex items-start justify-between gap-[0.5em]">
        <h3 className="min-w-0 text-h3 font-semibold text-fg">{item.title}</h3>
        <CardActions label={item.title} onEdit={onEdit} onRemove={onRemove} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-[0.6em]">
        <Badge tone="neutral" dot={false}>{department?.name ?? "Sans département"}</Badge>
        <Stat icon={Users}>{int(headcount)} {headcount > 1 ? "titulaires" : "titulaire"}</Stat>
      </div>
    </Card>
  );
}

function EntityCard({ item, headcount, onEdit, onRemove }) {
  return (
    <Card interactive className="flex h-full flex-col gap-[0.9em]">
      <div className="flex items-start justify-between gap-[0.5em]">
        <div className="min-w-0">
          <h3 className="text-h3 font-semibold text-fg">{item.name}</h3>
          <p className="mt-[0.15em] flex items-center gap-[0.4em] text-sm text-fg-muted"><MapPin className="size-[1em]" aria-hidden />{item.city}, wilaya de {item.wilaya}</p>
        </div>
        <CardActions label={item.name} onEdit={onEdit} onRemove={onRemove} />
      </div>
      {item.cnasEmployerNo && <p className="text-xs text-fg-muted">N° employeur CNAS : <span className="font-mono">{item.cnasEmployerNo}</span></p>}
      <div className="mt-auto flex items-center justify-between gap-[0.6em]">
        {item.isHQ ? <Badge tone="brand" dot={false}>Siège</Badge> : <Badge tone="neutral" dot={false}>Site</Badge>}
        <Stat icon={Users}>{int(headcount)} {headcount > 1 ? "salariés" : "salarié"}</Stat>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ add / edit */

const EMPTY = {
  departments: { name: "", description: "", headId: "" },
  positions: { title: "", departmentId: "" },
  entities: { name: "", city: "", wilaya: "Alger", isHQ: false, cnasEmployerNo: "" },
};

function ItemModal({ state, onClose, departments, active, positions, actor }) {
  // Remount the form whenever the target changes so initial state is derived without effects.
  const key = state ? `${state.kind}:${state.item?.id ?? "new"}` : "closed";
  return <ItemForm key={key} state={state} onClose={onClose} departments={departments} active={active} positions={positions} actor={actor} />;
}

function ItemForm({ state, onClose, departments, active, positions, actor }) {
  const kind = state?.kind ?? "departments";
  const editing = !!state?.item;
  const [values, setValues] = useState(() => ({ ...EMPTY[kind], ...(state?.item ?? {}) }));
  const [touched, setTouched] = useState({});
  const set = (k) => (v) => setValues((s) => ({ ...s, [k]: v }));
  const touch = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const nameKey = kind === "positions" ? "title" : "name";
  const errors = {
    [nameKey]: !String(values[nameKey] ?? "").trim()
      ? "Ce champ est obligatoire"
      : (kind === "positions" ? positions : kind === "departments" ? departments : []).some((x) => x.id !== state?.item?.id && String(x[nameKey]).toLowerCase() === String(values[nameKey]).trim().toLowerCase())
        ? "Ce nom existe déjà"
        : null,
    ...(kind === "positions" ? { departmentId: values.departmentId ? null : "Choisissez un département" } : {}),
    ...(kind === "entities" ? { city: String(values.city).trim() ? null : "Ce champ est obligatoire" } : {}),
  };
  const invalid = Object.values(errors).some(Boolean);
  const err = (k) => (touched[k] ? errors[k] : undefined);

  const submit = () => {
    if (invalid) return setTouched(Object.fromEntries(Object.keys(errors).map((k) => [k, true])));
    const clean = { ...values };
    ["name", "title", "description", "city", "cnasEmployerNo"].forEach((k) => { if (typeof clean[k] === "string") clean[k] = clean[k].trim(); });
    const cfg = KINDS[kind];
    const label = clean.name ?? clean.title;
    if (editing) {
      db.patch(cfg.collection, state.item.id, clean);
      if (kind === "entities" && clean.isHQ) departments && db.update("entities", (list) => list.map((e) => (e.id === state.item.id ? e : { ...e, isHQ: false })));
      db.audit(actor?.id, `${cfg.noun} modifié`, label, "Organisation");
      toast.success(`« ${label} » mis à jour.`);
    } else {
      const item = { id: newId(cfg.prefix), ...clean };
      db.insert(cfg.collection, item);
      if (kind === "entities" && clean.isHQ) db.update("entities", (list) => list.map((e) => (e.id === item.id ? e : { ...e, isHQ: false })));
      db.audit(actor?.id, `${cfg.noun} créé`, label, "Organisation");
      toast.success(`« ${label} » ajouté.`);
    }
    onClose();
  };

  const onEnter = (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };

  return (
    <Modal
      open={!!state}
      onClose={onClose}
      size="md"
      title={`${editing ? "Modifier" : "Ajouter"} ${kind === "entities" ? "une" : "un"} ${KINDS[kind].singular}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Annuler</Button>
          <Button onClick={submit}>{editing ? "Enregistrer" : "Ajouter"}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-[1em]">
        {kind === "departments" && (
          <>
            <TextInput label="Nom du département" required autoFocus value={values.name} onChange={set("name")} onBlur={touch("name")} error={err("name")} onKeyDown={onEnter} />
            <TextArea label="Description" rows={2} value={values.description} onChange={set("description")} />
            <SelectInput
              label="Responsable du département"
              value={values.headId ?? ""}
              onChange={set("headId")}
              placeholder="Aucun responsable"
              options={[...active].sort((a, b) => Number(b.departmentId === state?.item?.id) - Number(a.departmentId === state?.item?.id) || a.lastName.localeCompare(b.lastName, "fr")).map((e) => ({ value: e.id, label: fullName(e) }))}
              hint="Les membres du département sont proposés en premier."
            />
          </>
        )}
        {kind === "positions" && (
          <>
            <TextInput label="Intitulé du poste" required autoFocus value={values.title} onChange={set("title")} onBlur={touch("title")} error={err("title")} onKeyDown={onEnter} />
            <SelectInput label="Département" required value={values.departmentId} onChange={set("departmentId")} onBlur={touch("departmentId")} error={err("departmentId")} placeholder="Choisir" options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          </>
        )}
        {kind === "entities" && (
          <>
            <TextInput label="Nom de l'entité ou du site" required autoFocus value={values.name} onChange={set("name")} onBlur={touch("name")} error={err("name")} onKeyDown={onEnter} />
            <div className="grid gap-[1em] sm:grid-cols-2">
              <TextInput label="Ville" required value={values.city} onChange={set("city")} onBlur={touch("city")} error={err("city")} onKeyDown={onEnter} />
              <SelectInput label="Wilaya" value={values.wilaya} onChange={set("wilaya")} options={WILAYAS} />
            </div>
            <TextInput label="N° employeur CNAS du site" value={values.cnasEmployerNo ?? ""} onChange={set("cnasEmployerNo")} placeholder="16 123456 78" className="[&_input]:font-mono" hint="Facultatif. Utilisé pour les déclarations par établissement." onKeyDown={onEnter} />
            <div className="flex items-center justify-between gap-[1em] rounded-md border border-border-subtle bg-surface-2 px-[0.9em] py-[0.7em]">
              <span><span className="block text-sm font-medium text-fg">Siège de l’entreprise</span><span className="text-xs text-fg-muted">Un seul siège à la fois.</span></span>
              <Toggle checked={!!values.isHQ} onChange={set("isHQ")} label="Siège de l'entreprise" />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
