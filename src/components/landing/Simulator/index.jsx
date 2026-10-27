import Section from "../_b/Section";
import Container from "@/components/shared/Container";
import SectionHeader from "@/components/shared/SectionHeader";
import PayrollSimulator from "./PayrollSimulator";
import { simulator } from "@/content/simulator";

export { default as PayrollSimulator } from "./PayrollSimulator";

export default function Simulator() {
  return (
    <Section id={simulator.id} labelledBy="simulateur-title">
      <Container className="flex flex-col gap-[3em]">
        <SectionHeader id="simulateur-title" eyebrow={simulator.eyebrow} title={simulator.title} description={simulator.description} />
        <PayrollSimulator />
      </Container>
    </Section>
  );
}
