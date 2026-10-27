"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { site } from "@/content/site";

/** Recoverable error state (same layout as empty states, danger icon, retry, support phone). */
export default function RouteError({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Cette page n'a pas pu s'afficher"
      description={`Un incident est survenu pendant le chargement. Vos données locales sont intactes. Si le problème persiste, appelez le support au ${site.phone}${error?.digest ? ` (réf. ${error.digest})` : ""}.`}
      action={<Button onClick={() => retry?.()}>Réessayer</Button>}
      secondary={<Button variant="ghost" href="/app">Retour au tableau de bord</Button>}
      className="py-[4em]"
    />
  );
}
