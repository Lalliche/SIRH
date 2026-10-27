"use client";

import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { Button, Modal, SelectInput, TextInput, toast } from "@/components/ui";
import { db, newId } from "@/lib/db";
import { TODAY } from "@/lib/clock";
import { fileSize } from "@/components/app/_kit/csv";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD, foldersFor, kindOf } from "./helpers";

export default function UploadModal({ open, onClose, user, employees, defaultFolder }) {
  const inputRef = useRef(null);
  const privileged = user.role === "admin" || user.role === "hr";
  const folders = privileged ? foldersFor(user.role).map((f) => f.key) : ["Dossiers salariés"];
  const [file, setFile] = useState(null);
  const [folder, setFolder] = useState(folders.includes(defaultFolder) ? defaultFolder : folders[0]);
  const [owner, setOwner] = useState(user.employeeId);
  const [expiresAt, setExpiresAt] = useState("");
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");

  const pick = (f) => {
    if (!f) return;
    if (f.size > MAX_UPLOAD) { setError(`Fichier trop volumineux (${fileSize(f.size)}). Maximum : 10 Mo.`); setFile(null); return; }
    if (!/\.(pdf|docx?|xlsx?|csv|png|jpe?g)$/i.test(f.name)) { setError("Format non pris en charge. Utilisez PDF, Word, Excel ou image."); setFile(null); return; }
    setError("");
    setFile(f);
  };

  const submit = () => {
    if (!file) return setError("Choisissez un fichier à déposer.");
    const doc = { id: newId("doc"), name: file.name, folder, kind: kindOf(file.name), size: file.size, uploadedAt: TODAY, expiresAt: expiresAt || null, ownerId: folder === "Entreprise" ? user.employeeId : owner };
    db.insert("documents", doc, { prepend: true });
    db.audit(user.employeeId, "Document déposé", doc.name, folder);
    toast.success(`« ${doc.name} » ajouté à ${folder}.`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Déposer un document" description="Prototype : seuls le nom et la taille sont conservés." footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={submit}>Déposer</Button></>}>
      <div className="flex flex-col gap-[1em]">
        <input ref={inputRef} type="file" className="sr-only" tabIndex={-1} aria-label="Choisir un fichier" onChange={(e) => pick(e.target.files?.[0])} />
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
          className={cn("flex flex-col items-center gap-[0.6em] rounded-lg border-2 border-dashed px-[1em] py-[2em] text-center transition-colors", over ? "border-primary bg-primary-soft" : "border-border-strong")}
        >
          <UploadCloud className="size-[2em] text-fg-muted" aria-hidden strokeWidth={1.4} />
          {file ? <p className="font-medium text-fg">{file.name} <span className="font-normal text-fg-muted">· {fileSize(file.size)}</span></p> : <p className="text-fg-secondary">Glissez un fichier ici ou</p>}
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>{file ? "Changer de fichier" : "Parcourir"}</Button>
          <p className="text-xs text-fg-muted">PDF, Word, Excel, image · 10 Mo maximum</p>
        </div>
        {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
        <div className="grid gap-[1em] sm:grid-cols-2">
          <SelectInput label="Dossier" value={folder} onChange={setFolder} options={folders} disabled={!privileged} />
          <TextInput label="Date d'expiration" type="date" value={expiresAt} onChange={setExpiresAt} hint="Facultatif : permis, assurance, visite médicale…" />
          {privileged && folder !== "Entreprise" && (
            <SelectInput className="sm:col-span-2" label="Concerne" value={owner} onChange={setOwner} options={employees.filter((e) => e.status !== "sorti").map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))} />
          )}
        </div>
      </div>
    </Modal>
  );
}
