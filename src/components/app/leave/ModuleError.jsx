"use client";

import { TriangleAlert } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";

/** Shared route-level error state (used by every error.jsx of the time/pay back-office modules). */
export default function ModuleError({ error, reset }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Cette page n'a pas pu s'afficher"
      description={`Une erreur inattendue est survenue${error?.digest ? ` (réf. ${error.digest})` : ""}. Vos données locales ne sont pas affectées. Support : +213 23 85 00 00.`}
      action={<Button onClick={reset}>Réessayer</Button>}
    />
  );
}
