import JobBoardView from "@/components/app/recruitment/JobBoardView";

export const metadata = { title: "Pipeline de recrutement" };

export default async function JobPage({ params }) {
  const { id } = await params;
  return <JobBoardView jobId={id} />;
}
