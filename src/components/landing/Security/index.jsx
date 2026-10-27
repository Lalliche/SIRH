import Section from "../_b/Section";
import SectionHeader from "@/components/shared/SectionHeader";
import SecurityGrid from "./SecurityGrid";
import { security } from "@/content/security";

export default function Security() {
  return (
    <Section id={security.id} labelledBy="securite-title">
      <SecurityGrid header={<SectionHeader id="securite-title" eyebrow={security.eyebrow} title={security.title} description={security.description} />} />
    </Section>
  );
}
