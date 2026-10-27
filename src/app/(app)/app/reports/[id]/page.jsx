import ReportDetail from "@/components/app/reports/ReportDetail";

export const metadata = { title: "Rapport" };

export default async function ReportPage({ params }) {
  const { id } = await params;
  return <ReportDetail id={id} />;
}
