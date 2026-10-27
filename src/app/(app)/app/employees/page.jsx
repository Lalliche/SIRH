import EmployeesList from "@/components/app/employees/EmployeesList";

export const metadata = { title: "Employés" };

export default async function EmployeesPage({ searchParams }) {
  const sp = await searchParams;
  const view = ["incomplete", "ending", "trial"].includes(sp?.filter) ? sp.filter : "all";
  return (
    <div>
      <EmployeesList initialView={view} initialQuery={typeof sp?.q === "string" ? sp.q : ""} />
    </div>
  );
}
