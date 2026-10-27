"use client";

import RouteError from "@/components/layout/RouteError";

export default function Error({ error, retry, reset }) {
  return <RouteError error={error} retry={retry ?? reset} />;
}
