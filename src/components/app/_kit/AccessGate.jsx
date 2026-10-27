"use client";

import { ShieldOff } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { ROLES } from "@/data/constants";
import { useCurrentUser } from "@/lib/use-current-user";
import { PageSkeleton } from "./Skeleton";

const ALL = ["admin", "hr", "manager", "accountant", "employee"];

/**
 * Wraps a module view. Shows a skeleton until the session is read (no role flash),
 * a "permission denied" page for other roles, and renders children(user) otherwise.
 */
export default function AccessGate({ roles = ALL, children }) {
  const user = useCurrentUser();
  if (!user.ready) return <PageSkeleton />;
  if (!roles.includes(user.role)) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="Vous n'avez pas accès à cette page"
        description={`Cette section est réservée à : ${roles.map((r) => ROLES[r].short).join(", ")}. Vous êtes connecté en tant que ${ROLES[user.role].label.toLowerCase()}.`}
        action={<Button href="/app">Retour au tableau de bord</Button>}
      />
    );
  }
  return children(user);
}
