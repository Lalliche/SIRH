"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Database } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { variants } from "@/lib/motion-tokens";
import { useCollection } from "@/lib/db";
import { PERSONAS, ROLES } from "@/data/constants";
import { setSession, useSession } from "@/lib/session";
import { fullName, initials } from "@/lib/format";
import { BrandMark, Wordmark } from "./Logo";

const ARCH = { borderRadius: "50% 50% 0 0 / 38% 38% 0 0" };

function PersonaCard({ persona, current, loading, onEnter }) {
  const e = persona.employee;
  return (
    <motion.li
      variants={variants.rise}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative flex flex-col items-center rounded-xl border border-border bg-surface px-[1.25em] pb-[1.4em] pt-[1.5em] text-center shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-border-strong hover:shadow-lg focus-within:border-ring"
    >
      <div style={ARCH} aria-hidden className="relative flex h-[8.5em] w-[7em] items-end justify-center overflow-hidden bg-primary-soft pb-[1em] text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-fg">
        <span style={ARCH} className="absolute inset-[0.45em] border border-current opacity-25" />
        <span className="relative font-display text-[2.1em] font-bold leading-none tracking-[-0.03em]">{e ? initials(e.firstName, e.lastName) : "?"}</span>
      </div>
      <Badge tone={current ? "success" : "brand"} className="mt-[1.1em]">{current ? "Session actuelle" : ROLES[persona.role].label}</Badge>
      <h2 className="mt-[0.7em] font-display text-[1.35em] font-semibold leading-tight text-fg">{e ? fullName(e) : "—"}</h2>
      <p className="mt-[0.2em] text-sm font-medium text-fg-secondary">{persona.position}</p>
      <p className="mt-[0.6em] flex-1 text-sm text-fg-muted">{persona.blurb}</p>
      <Button
        variant={current ? "primary" : "secondary"}
        iconEnd={ArrowRight}
        loading={loading}
        onClick={onEnter}
        aria-label={`Entrer en tant que ${e ? fullName(e) : persona.role}, ${ROLES[persona.role].label}`}
        className="mt-[1.2em] w-full after:absolute after:inset-0 after:rounded-xl after:content-['']"
      >
        Entrer
      </Button>
    </motion.li>
  );
}

export default function DemoChooser({ next }) {
  const router = useRouter();
  const session = useSession();
  const employees = useCollection("employees");
  const positions = useCollection("positions");
  const [pending, setPending] = useState(null);
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";

  const personas = useMemo(
    () =>
      PERSONAS.map((p) => {
        const employee = employees.find((x) => x.id === p.employeeId);
        return { ...p, employee, position: positions.find((x) => x.id === employee?.positionId)?.title };
      }),
    [employees, positions],
  );

  const enter = (role) => {
    setPending(role);
    setSession(role);
    router.push(target);
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-bg">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[34em] bg-[radial-gradient(60%_80%_at_50%_0%,var(--primary-soft),transparent)]" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[80em] flex-col px-[1.25em] pb-[2.5em] pt-[1.25em] md:px-[2em]">
        <header className="flex items-center justify-between gap-[1em]">
          <span className="inline-flex items-center gap-[0.55em]">
            <BrandMark />
            <Wordmark />
          </span>
          <Button variant="ghost" size="sm" icon={ArrowLeft} href="/">Retour au site</Button>
        </header>

        <motion.div initial="hidden" animate="show" variants={variants.container} className="flex flex-1 flex-col justify-center py-[2.5em]">
          <motion.div variants={variants.rise} className="mx-auto max-w-[44em] text-center">
            <h1 className="text-balance text-[2.1em] font-bold leading-[1.1] tracking-[-0.03em] text-fg md:text-[2.8em]">Choisissez un rôle pour explorer SIRH</h1>
            <p className="mx-auto mt-[0.9em] max-w-[38em] text-pretty text-fg-secondary">
              Une même entreprise, cinq points de vue. Chaque rôle voit une interface adaptée à ses droits, et vous pourrez en changer à tout moment depuis la barre supérieure.
            </p>
          </motion.div>

          <motion.ul variants={variants.container} className={cn("mt-[2.5em] flex flex-wrap justify-center gap-[1.25em]", "[&>li]:w-full sm:[&>li]:w-[calc(50%-0.65em)] lg:[&>li]:w-[calc(33.333%-0.85em)] xl:[&>li]:w-[calc(20%-1em)]")}>
            {personas.map((p) => (
              <PersonaCard key={p.role} persona={p} current={session?.role === p.role} loading={pending === p.role} onEnter={() => enter(p.role)} />
            ))}
          </motion.ul>

          <motion.p variants={variants.rise} className="mt-[2em] flex items-center justify-center gap-[0.55em] text-center text-sm text-fg-muted">
            <Database className="size-[1.1em] shrink-0" aria-hidden strokeWidth={1.6} />
            Données fictives, enregistrées dans votre navigateur. Rien n&apos;est envoyé sur un serveur.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
