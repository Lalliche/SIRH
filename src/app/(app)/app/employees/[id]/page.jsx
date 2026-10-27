import EmployeeProfile from "@/components/app/employees/EmployeeProfile";

export const metadata = { title: "Fiche employé" };

export default async function EmployeePage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  return (
    <div>
      <EmployeeProfile id={id} initialTab={typeof sp?.tab === "string" ? sp.tab : "overview"} />
    </div>
  );
}
