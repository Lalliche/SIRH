import { notFound } from "next/navigation";
import Container from "@/components/shared/Container";
import { legalPages } from "@/content/legal";

export function generateStaticParams() {
  return Object.keys(legalPages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const page = legalPages[(await params).slug];
  return { title: page?.title };
}

export default async function LegalPage({ params }) {
  const page = legalPages[(await params).slug];
  if (!page) notFound();
  return (
    <Container size="narrow" className="py-[7em]">
      <h1 className="text-[2.5em] font-semibold tracking-[-0.03em]">{page.title}</h1>
      <div className="mt-[2em] flex flex-col gap-[1.6em]">
        {page.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-h3 font-semibold">{s.h}</h2>
            <p className="mt-[0.4em] text-fg-secondary">{s.p}</p>
          </section>
        ))}
      </div>
    </Container>
  );
}
