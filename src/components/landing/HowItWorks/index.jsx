import Section from "../_b/Section";
import SectionHeader from "@/components/shared/SectionHeader";
import HowTimeline from "./HowTimeline";
import { how } from "@/content/how";

export default function HowItWorks() {
  return (
    <Section id={how.id} labelledBy="fonctionnement-title" tone="sunken">
      <HowTimeline header={<SectionHeader id="fonctionnement-title" eyebrow={how.eyebrow} title={how.title} description={how.description} />} />
    </Section>
  );
}
