import Container from "@/components/shared/Container";
import SectionHeader from "@/components/shared/SectionHeader";
import { modules } from "@/content/modules";
import ModulesClient from "./ModulesClient";

export default function Modules() {
  return (
    <section id={modules.id} aria-labelledby="modules-title" className="scroll-mt-[4em] bg-bg pb-[6em] md:pb-[8em]">
      <Container>
        <SectionHeader id="modules-title" eyebrow={modules.eyebrow} title={modules.title} description={modules.description} />
        <p className="mt-[1em] text-center text-xs text-fg-muted md:text-start [@media(hover:none)]:hidden">{modules.replayHint}</p>
        <div className="mt-[2.5em]">
          <ModulesClient items={modules.items} mini={modules.mini} />
        </div>
      </Container>
    </section>
  );
}
