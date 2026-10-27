"use client";

import { Download } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function ChartCard({ title, description, onExport, className, children }) {
  return (
    <Card className={className}>
      <div className="mb-[1em] flex items-start justify-between gap-[1em]">
        <div className="min-w-0">
          <h2 className="text-h3 font-semibold text-fg">{title}</h2>
          {description && <p className="mt-[0.15em] text-sm text-fg-muted">{description}</p>}
        </div>
        {onExport && <Button variant="ghost" size="sm" icon={Download} onClick={onExport} aria-label={`Exporter « ${title} » en CSV`}>CSV</Button>}
      </div>
      {children}
    </Card>
  );
}
