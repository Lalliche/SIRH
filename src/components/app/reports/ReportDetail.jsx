"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileSearch } from "lucide-react";
import { AreaChart, BarList, Button, DataTable, EmptyState, KpiCard, PageHeader } from "@/components/ui";
import AccessGate from "@/components/app/_kit/AccessGate";
import { downloadCsv } from "@/components/app/_kit/csv";
import { REPORTS, buildReport } from "./definitions";
import { compact, shortMonth, useHrData } from "./data";
import ChartCard from "./ChartCard";

function Content({ id }) {
  const d = useHrData();
  const meta = REPORTS.find((r) => r.id === id);
  const report = useMemo(() => (meta ? buildReport(id, d) : null), [meta, id, d]);

  if (!meta) return <EmptyState icon={FileSearch} title="Rapport introuvable" description="Ce rapport n'existe pas dans la bibliothèque." action={<Button href="/app/reports">Retour aux rapports</Button>} />;

  const csvColumns = report.columns.map((c) => ({ key: c.key, header: c.header }));
  const { chart } = report;
  return (
    <>
      <Link href="/app/reports" className="mb-[0.8em] inline-flex items-center gap-[0.4em] text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-[1.1em]" aria-hidden />Statistiques RH</Link>
      <PageHeader title={meta.title} description={meta.description} actions={<Button icon={Download} onClick={() => downloadCsv(`rapport-${id}.csv`, report.rows, csvColumns)}>Exporter en CSV</Button>} />
      <div className="mb-[1.25em] grid grid-cols-2 gap-[1em] lg:grid-cols-4">
        {report.summary.map((s) => <KpiCard key={s.label} label={s.label} value={s.value} />)}
      </div>
      {chart && (
        <ChartCard className="mb-[1.25em]" title={chart.title ?? "Évolution"}>
          {chart.kind === "area" ? (
            <div role="img" aria-label={`${chart.series.map((s) => s.name).join(" et ")} par mois`}>
              <AreaChart labels={chart.points.map((p) => shortMonth(p.period))} format={compact} series={chart.series.map((s) => ({ name: s.name, color: s.color, data: chart.points.map((p) => p[s.key]) }))} />
            </div>
          ) : (
            <BarList items={chart.items} format={chart.format} />
          )}
        </ChartCard>
      )}
      <DataTable
        columns={report.columns}
        rows={report.rows}
        pageSize={12}
        empty={<EmptyState icon={FileSearch} title="Aucune donnée" description="Ce rapport ne contient aucune ligne pour la période actuelle." />}
      />
    </>
  );
}

export default function ReportDetail({ id }) {
  return <AccessGate roles={["admin", "hr", "accountant"]}>{() => <Content id={id} />}</AccessGate>;
}
