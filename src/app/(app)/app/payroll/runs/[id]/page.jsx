import RunDetail from "@/components/app/payroll/RunDetail";

export const metadata = { title: "Détail de la paie" };

export default async function Page({ params }) {
  const { id } = await params;
  return <RunDetail id={id} />;
}
