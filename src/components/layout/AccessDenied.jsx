import { ShieldAlert } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { ROLES } from "@/data/constants";

/** "Permission denied" state (ux-ia §6): says which roles can open the page. */
export default function AccessDenied({ item, role }) {
  const needed = (item?.roles ?? []).map((r) => ROLES[r].label.toLowerCase());
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Vous n'avez pas accès à cette page"
      description={`« ${item?.label ?? "Cette page"} » est réservée aux rôles suivants : ${needed.join(", ")}. Vous êtes connecté en tant que ${ROLES[role].label.toLowerCase()}.`}
      action={<Button href="/app">Retour au tableau de bord</Button>}
      secondary={<Button variant="ghost" href="/demo">Changer de rôle</Button>}
      className="py-[4em]"
    />
  );
}
