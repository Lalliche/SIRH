"use client";

import { useState } from "react";
import { FileUp, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { Badge, Button, Card, CardHeader, toast } from "@/components/ui";
import { TODAY } from "@/lib/clock";
import { addDays } from "@/lib/dates";
import { date } from "@/lib/format";
import ImportModal from "./ImportModal";

const DEVICES = [
  { id: "zk-1", name: "ZKTeco SpeedFace-V5L", site: "Siège — Hydra, accueil", ip: "192.168.1.201", lastSync: `${TODAY}T07:58`, online: true, users: 18 },
  { id: "zk-2", name: "ZKTeco MB460", site: "Usine de Rouïba, entrée A", ip: "192.168.10.45", lastSync: `${TODAY}T08:02`, online: true, users: 22 },
  { id: "zk-3", name: "ZKTeco K40", site: "Agence Oran", ip: "192.168.30.12", lastSync: `${TODAY}T07:49`, online: true, users: 6 },
  { id: "zk-4", name: "ZKTeco ProFace X", site: "Plateforme Sétif", ip: "192.168.40.8", lastSync: `${addDays(TODAY, -5)}T17:12`, online: false, users: 4 },
];

const fmt = (iso) => `${date(iso)} à ${iso.slice(11, 16)}`;

/** Mock ZKTeco terminals: status, last sync, manual sync, CSV import. */
export default function TerminalsPanel() {
  const [devices, setDevices] = useState(DEVICES);
  const [importFor, setImportFor] = useState(null);
  const [busy, setBusy] = useState(null);

  const sync = (d) => {
    setBusy(d.id);
    setTimeout(() => {
      setBusy(null);
      if (!d.online) return toast.error(`${d.name} est injoignable. Vérifiez le câble réseau, puis importez le fichier à la main.`);
      setDevices((l) => l.map((x) => (x.id === d.id ? { ...x, lastSync: `${TODAY}T09:00` } : x)));
      toast.success(`${d.name} synchronisé : aucun nouveau badgeage.`);
    }, 900);
  };

  return (
    <Card>
      <CardHeader title="Terminaux de pointage" description={`${devices.filter((d) => d.online).length} sur ${devices.length} en ligne`} />
      <ul className="flex flex-col divide-y divide-border-subtle">
        {devices.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-[0.75em] py-[0.7em] first:pt-0 last:pb-0">
            {d.online ? <Wifi className="size-[1.3em] text-success" aria-hidden /> : <WifiOff className="size-[1.3em] text-danger" aria-hidden />}
            <div className="min-w-[10em] flex-1">
              <p className="truncate text-sm font-medium text-fg">{d.name}</p>
              <p className="truncate text-xs text-fg-muted">{d.site} · <span className="font-mono">{d.ip}</span> · {d.users} badges</p>
              <p className="text-xs text-fg-muted">Dernière synchro : {fmt(d.lastSync)}</p>
            </div>
            <Badge tone={d.online ? "success" : "danger"}>{d.online ? "En ligne" : "Hors ligne"}</Badge>
            <Button size="icon" variant="ghost" aria-label={`Synchroniser ${d.name}`} loading={busy === d.id} onClick={() => sync(d)}><RefreshCw className="size-[1.1em]" /></Button>
            {!d.online && <Button size="sm" variant="soft" onClick={() => setImportFor(d.name)}>Importer</Button>}
          </li>
        ))}
      </ul>
      <Button className="mt-[1em] w-full" variant="secondary" icon={FileUp} onClick={() => setImportFor("")}>Importer le fichier de pointage</Button>
      <ImportModal open={importFor !== null} onClose={() => setImportFor(null)} device={importFor || undefined} />
    </Card>
  );
}
