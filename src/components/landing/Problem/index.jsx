import Container from "@/components/shared/Container";
import SectionHeader from "@/components/shared/SectionHeader";
import { problem } from "@/content/problem";
import LedgerRows from "./LedgerRows";

export default function Problem() {
  return (
    <section id="probleme" aria-labelledby="problem-title" className="scroll-mt-[5em] py-[6em] md:py-[8em]">
      <Container className="grid gap-[3.5em] lg:grid-cols-[0.9fr_1.1fr] lg:gap-[5em]">
        <div className="lg:sticky lg:top-[7em] lg:self-start">
          <SectionHeader id="problem-title" eyebrow={problem.eyebrow} title={problem.title} description={problem.description} />
        </div>
        <LedgerRows rows={problem.rows} fixLabel={problem.fixLabel} total={problem.total} />
      </Container>
    </section>
  );
}
