import Section from "../_b/Section";
import SectionHeader from "@/components/shared/SectionHeader";
import ComplianceBoard from "./ComplianceBoard";
import { compliance } from "@/content/compliance";

export default function Compliance() {
  return (
    <Section id={compliance.id} labelledBy="conformite-title">
      <ComplianceBoard
        header={<SectionHeader id="conformite-title" eyebrow={compliance.eyebrow} title={compliance.title} description={compliance.description} />}
      />
    </Section>
  );
}
