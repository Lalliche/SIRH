import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Container from "@/components/shared/Container";
import Logo from "@/components/shared/Logo";
import Zellige from "@/components/shared/Zellige";
import { cn } from "@/lib/utils";
import { defaultParams } from "@/lib/payroll";
import { date } from "@/lib/format";
import { footer } from "@/content/footer";
import { site } from "@/content/site";
import FooterWordmark from "./FooterWordmark";

const digits = (s) => s.replace(/[^\d+]/g, "");

// Underline draws from the start edge on hover (transform only).
const linkCls =
  "relative inline-block py-[0.2em] text-fg-secondary transition-colors duration-150 hover:text-fg after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-200 hover:after:scale-x-100 focus-visible:after:scale-x-100 motion-reduce:after:transition-none";

export default function Footer() {
  const contact = [
    { icon: MapPin, label: footer.addressLabel, value: site.address },
    { icon: Phone, label: footer.phoneLabel, value: site.phone, href: `tel:${digits(site.phone)}` },
    { icon: MessageCircle, label: footer.whatsappLabel, value: site.whatsapp, href: `https://wa.me/${digits(site.whatsapp).replace("+", "")}` },
    { icon: Mail, label: footer.emailLabel, value: site.email, href: `mailto:${site.email}` },
  ];

  return (
    <footer className="relative isolate overflow-hidden bg-bg-sunken pt-[5em] text-sm">
      <div aria-hidden className="absolute inset-0 -z-10 text-fg opacity-[0.07] [mask-image:radial-gradient(60%_60%_at_50%_0%,black,transparent)]">
        <Zellige id="zellige-footer" />
      </div>

      <Container className="grid gap-[3em] lg:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
        <div className="flex max-w-[24em] flex-col gap-[1.2em]">
          <Link href="/" aria-label="SIRH" className="w-fit text-fg">
            <Logo />
          </Link>
          <p className="text-fg-secondary">{footer.blurb}</p>
          <div>
            <p className="mb-[0.6em] text-xs font-semibold uppercase tracking-[0.1em] text-fg-muted">{footer.vocabularyTitle}</p>
            <ul className="flex flex-wrap gap-[0.4em]">
              {footer.vocabulary.map((v) => (
                <li key={v} className="rounded-sm border border-border bg-surface px-[0.55em] py-[0.2em] font-mono text-xs text-fg-secondary">
                  {v}
                </li>
              ))}
            </ul>
            <p className="mt-[0.8em] text-xs text-fg-muted">
              {footer.paramsNote} <span className="num font-mono text-fg-secondary">{date(defaultParams.effectiveFrom)}</span>
            </p>
          </div>
        </div>

        {footer.columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="mb-[0.9em] font-sans text-xs font-semibold uppercase tracking-[0.1em] text-fg-muted">{col.title}</h2>
            <ul className="flex flex-col">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className={linkCls}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h2 className="mb-[0.9em] font-sans text-xs font-semibold uppercase tracking-[0.1em] text-fg-muted">{footer.contactTitle}</h2>
          <ul className="flex flex-col gap-[0.8em]">
            {contact.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-start gap-[0.75em]">
                <Icon className="mt-[0.2em] size-[1.1em] shrink-0 text-link" aria-hidden strokeWidth={1.75} />
                <span>
                  <span className="sr-only">{label} : </span>
                  {href ? (
                    <a href={href} className={cn(linkCls, "num")}>
                      {value}
                    </a>
                  ) : (
                    <span className="text-fg-secondary">{value}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-[1em] text-xs text-fg-muted">{footer.hours}</p>
        </div>
      </Container>

      <Container className="mt-[3.5em] flex flex-col gap-[0.8em] border-t border-border pt-[1.5em] text-xs text-fg-muted md:flex-row md:items-center md:justify-between">
        <p>
          © 2026 {footer.copyright} <span className="block md:inline">{footer.prototype}</span>
        </p>
        <ul className="flex flex-wrap gap-x-[1.25em] gap-y-[0.3em]">
          {footer.legal.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={linkCls}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <FooterWordmark label={site.name} toTop={footer.toTop} />
    </footer>
  );
}

