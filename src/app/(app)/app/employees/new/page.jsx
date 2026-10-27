import EmployeeWizard from "@/components/app/employees/EmployeeWizard";

export const metadata = { title: "Ajouter un employé" };

export default function NewEmployeePage() {
  return (
    <div>
      <EmployeeWizard />
    </div>
  );
}
