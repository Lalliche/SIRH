import PayslipView from "@/components/app/payslips/PayslipView";

export const metadata = { title: "Bulletin de paie" };

export default async function Page({ params }) {
  const { runId, employeeId } = await params;
  return <PayslipView runId={runId} employeeId={employeeId} />;
}
