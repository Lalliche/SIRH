import AnnouncementDetail from "@/components/app/announcements/AnnouncementDetail";

export const metadata = { title: "Annonce" };

export default async function AnnouncementPage({ params }) {
  const { id } = await params;
  return <AnnouncementDetail id={id} />;
}
