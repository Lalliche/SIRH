"use client";

// Header (design-system.md › Landing nav; landing-motion-plan.md §4.1). Transparent at rest, glass past 24px
// (the glass layer fades; its blur radius never animates), scroll-progress hairline, hides on scroll-down and
// returns on any scroll-up (never while focus is inside, a menu is open, or motion is reduced).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { Button } from "@/components/ui";
import Container from "@/components/shared/Container";
import Logo from "@/components/shared/Logo";
import { lpDur, lpEase, lpScroll } from "@/components/motion/landing-tokens";
import { useCanHover, useMedia } from "@/components/motion/use-media";
import { spring } from "@/lib/motion-tokens";
import { cn } from "@/lib/utils";
import MobileMenu from "./MobileMenu";

const telHref = (phone) => `tel:${phone.replace(/\s/g, "")}`;

function useActiveSection(links, enabled) {
  const [active, setActive] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    const targets = links
      .filter((l) => l.href.startsWith("/#"))
      .map((l) => document.getElementById(l.href.slice(2)))
      .filter(Boolean);
    if (!targets.length) return;
    // A band just above the middle of the viewport decides which section is current.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(`/#${e.target.id}`);
          else setActive((cur) => (cur === `/#${e.target.id}` ? null : cur));
        }
      },
      { rootMargin: "-45% 0px -54% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [links, enabled]);
  return enabled ? active : null;
}

function ResourcesMenu({ link, canHover, onNavigate }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={canHover ? () => setOpen(true) : undefined}
      onPointerLeave={canHover ? () => setOpen(false) : undefined}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        iconEnd={ChevronDown}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="[&_svg]:transition-transform [&_svg]:duration-200 aria-expanded:[&_svg]:rotate-180"
      >
        {link.label}
      </Button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: "-0.4em" }}
            animate={{ opacity: 1, y: "0em" }}
            exit={{ opacity: 0, y: "-0.25em", transition: { duration: lpDur.fast } }}
            transition={{ duration: lpDur.base, ease: lpEase.outStrong }}
            className="absolute start-1/2 top-full z-10 w-[19em] -translate-x-1/2 pt-[0.5em]"
          >
            <ul className="rounded-xl border border-border bg-surface p-[0.4em] shadow-lg">
              {link.menu.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                    className="block rounded-lg px-[0.8em] py-[0.6em] transition-colors duration-150 hover:bg-surface-hover"
                  >
                    <span className="block text-sm font-medium text-fg">{item.label}</span>
                    <span className="block text-xs text-fg-muted">{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function NavbarClient({ nav, phone }) {
  const reduce = useReducedMotion();
  const canHover = useCanHover();
  const isDesktop = useMedia("(min-width: 850px)");
  const pathname = usePathname();
  const { scrollY, scrollYProgress } = useScroll();

  const [condensed, setCondensed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const lastY = useRef(0);
  const focusInside = useRef(false);
  const toggleRef = useRef(null);
  const active = useActiveSection(nav.links, pathname === "/");
  const menuOpen = open && !isDesktop; // derived: the sheet only exists below md

  // Pick up a restored scroll position (setState from a frame callback, not the effect body).
  useEffect(() => {
    const id = requestAnimationFrame(() => setCondensed(scrollY.get() > lpScroll.condense));
    return () => cancelAnimationFrame(id);
  }, [scrollY]);

  useMotionValueEvent(scrollY, "change", (y) => {
    const delta = y - lastY.current;
    lastY.current = y;
    setCondensed(y > lpScroll.condense);
    if (delta > lpScroll.noise && y > lpScroll.hideAfter && !reduce && !menuOpen && !focusInside.current) setHidden(true);
    else if (delta < -lpScroll.noise || y <= lpScroll.hideAfter) setHidden(false);
  });

  const closeMenu = (refocus) => {
    setOpen(false);
    if (refocus) toggleRef.current?.focus();
  };

  return (
    <header
      id="nav"
      className="fixed inset-x-0 top-0 z-50"
      onFocusCapture={() => {
        focusInside.current = true;
        setHidden(false);
      }}
      onBlurCapture={() => {
        focusInside.current = false;
      }}
    >
      <a
        href="#main"
        className="sr-only rounded-md bg-primary px-[1em] py-[0.5em] text-sm text-primary-fg focus:not-sr-only focus:absolute focus:start-[0.75em] focus:top-[0.75em] focus:z-10"
      >
        {nav.skipLink}
      </a>

      <motion.div animate={{ y: hidden ? "-110%" : "0%" }} transition={{ duration: lpDur.base, ease: hidden ? lpEase.in : lpEase.outStrong }}>
        <div className="relative">
          <motion.div
            aria-hidden
            className="absolute inset-0 border-b border-border-subtle bg-bg/80 backdrop-blur-[0.75em] backdrop-saturate-150"
            initial={false}
            animate={{ opacity: condensed || menuOpen ? 1 : 0 }}
            transition={{ duration: lpDur.base, ease: lpEase.outStrong }}
          >
            <motion.div className="absolute inset-x-0 -bottom-px h-px origin-left bg-fg/25" style={{ scaleX: scrollYProgress }} />
          </motion.div>

          <Container size="content" className="relative flex h-[4em] items-center gap-[1.5em]">
            <Link
              href="/"
              aria-label={nav.logoLabel}
              className="rounded-xs text-[1.05em] text-fg transition-opacity duration-150 hover:opacity-80"
              onClick={() => closeMenu(false)}
            >
              <Logo />
            </Link>

            <nav aria-label={nav.label} className="hidden flex-1 justify-center md:flex">
              <LayoutGroup id="nav">
                <ul className="flex items-center" onPointerLeave={() => setHovered(null)}>
                  {nav.links.map((link) => {
                    const isActive = active === link.href;
                    return (
                      <li key={link.href} className="relative" onPointerEnter={canHover ? () => setHovered(link.href) : undefined}>
                        {link.menu ? (
                          <ResourcesMenu link={link} canHover={canHover} />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            href={link.href}
                            aria-current={isActive ? "location" : pathname === link.href ? "page" : undefined}
                            className={cn("isolate", isActive && "text-fg")}
                          >
                            {link.label}
                          </Button>
                        )}
                        <AnimatePresence>
                          {hovered === link.href && (
                            <motion.span
                              layoutId="nav-hover"
                              aria-hidden
                              className="absolute inset-0 -z-10 rounded-md bg-fg/6"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0, transition: { duration: lpDur.fast } }}
                              transition={spring.soft}
                            />
                          )}
                        </AnimatePresence>
                        {isActive && (
                          <motion.span
                            layoutId="nav-active"
                            aria-hidden
                            className="absolute -bottom-[0.2em] start-1/2 size-[0.3em] -translate-x-1/2 rounded-full bg-primary"
                            transition={spring.soft}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </LayoutGroup>
            </nav>

            <div className="ms-auto flex items-center gap-[0.5em] md:ms-0">
              <a
                href={telHref(phone)}
                className="hidden items-center gap-[0.5em] rounded-md px-[0.6em] py-[0.4em] text-sm font-medium text-fg-secondary transition-colors duration-150 hover:text-fg xl:inline-flex"
              >
                <Phone className="size-[1.05em]" aria-hidden strokeWidth={1.75} />
                <span className="num">{phone}</span>
              </a>
              <Button variant="ghost" size="sm" href={nav.login.href} className="hidden lg:inline-flex">
                {nav.login.label}
              </Button>
              <Button variant="primary" size="sm" href={nav.cta.href} onClick={() => closeMenu(false)}>
                {nav.cta.label}
              </Button>
              <Button
                ref={toggleRef}
                variant="ghost"
                size="icon"
                icon={menuOpen ? X : Menu}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? nav.menuClose : nav.menuOpen}
                className="-me-[0.4em] md:hidden"
                onClick={() => setOpen((o) => !o)}
              />
            </div>
          </Container>
        </div>
      </motion.div>

      <AnimatePresence>{menuOpen && <MobileMenu nav={nav} phone={phone} onClose={closeMenu} />}</AnimatePresence>
    </header>
  );
}
