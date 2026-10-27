import { PageHeader } from "@/components/ui";
import AssistantChat from "./AssistantChat";

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        eyebrow="Assistant IA"
        title="Posez vos questions RH"
        description="Congés, absences, contrats, coûts, calculs brut → net : l'assistant répond à partir de vos données et cite ses sources."
      />
      <div className="h-[calc(100dvh-17em)] min-h-[30em] overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <AssistantChat />
      </div>
    </>
  );
}
