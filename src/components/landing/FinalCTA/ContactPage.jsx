import { MessageCircle, Mail, Phone } from "lucide-react";
import Container from "@/components/shared/Container";
import Reveal from "@/components/motion/Reveal";
import { Button } from "@/components/ui";
import PageIntro from "../_b/PageIntro";
import ContactForm from "../_b/ContactForm";
import { whatsappUrl } from "@/lib/contact";
import { cta, contactPage as page } from "@/content/cta";
import { site } from "@/content/site";

/** Body of /contact: h1, numbered process, reusable demo form, direct channels. */
export default function ContactPage() {
  return (
    <>
      <PageIntro eyebrow={page.eyebrow} title={page.title} lead={page.lead} />
      <section id="demande" aria-labelledby="contact-form-title" className="pb-[6em] md:pb-[8em]">
        <Container>
          <h2 id="contact-form-title" className="sr-only">{cta.form.title}</h2>
          <div className="grid items-start gap-[3em] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-[5em]">
            <div className="flex flex-col gap-[2.5em]">
              <ol className="flex flex-col">
                {page.steps.map((s, i) => (
                  <Reveal as="li" key={s} delay={i * 0.06} className="flex gap-[1em] border-t border-border py-[1.1em] last:border-b">
                    <span aria-hidden className="font-mono text-code text-fg-muted">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-fg-secondary text-pretty">{s}</span>
                  </Reveal>
                ))}
              </ol>
              <ul className="flex flex-col gap-[0.75em] text-fg-secondary">
                <li className="flex items-center gap-[0.75em]"><Phone aria-hidden className="size-[1.2em] text-link" strokeWidth={1.5} /><a href={`tel:${site.phone.replace(/\s/g, "")}`} className="font-mono hover:underline">{site.phone}</a></li>
                <li className="flex items-center gap-[0.75em]"><Mail aria-hidden className="size-[1.2em] text-link" strokeWidth={1.5} /><a href={`mailto:${site.email}`} className="hover:underline">{site.email}</a></li>
                <li className="ps-[1.95em] text-sm text-fg-muted">{site.address}</li>
                <li className="ps-[1.95em] text-sm text-fg-muted">{cta.contact.hours}</li>
              </ul>
              <Button href={whatsappUrl(cta.whatsapp.message)} variant="secondary" className="self-start" target="_blank" rel="noopener noreferrer">
                <MessageCircle aria-hidden className="size-[1.1em]" strokeWidth={1.75} />
                {cta.whatsapp.label}
              </Button>
            </div>
            <ContactForm />
          </div>
        </Container>
      </section>
    </>
  );
}
