import { Suspense } from "react";
import SearchView from "@/components/layout/SearchView";
import PageSkeleton from "@/components/layout/PageSkeleton";

export const metadata = { title: "Recherche" };

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SearchView />
    </Suspense>
  );
}
