import { AlertTriangle, CalendarCheck, CalendarX } from "lucide-react";
import { Badge } from "@/components/ui";
import { date } from "@/lib/format";
import { expiryOf } from "./helpers";

export default function ExpiryBadge({ doc }) {
  const e = expiryOf(doc);
  if (!e) return null;
  if (e.state === "expired") return <Badge tone="danger" icon={CalendarX}>Expiré depuis {-e.days} j</Badge>;
  if (e.state === "soon") return <Badge tone="warning" icon={AlertTriangle}>Expire dans {e.days} j</Badge>;
  return <Badge tone="neutral" icon={CalendarCheck}>Valide jusqu&apos;au {date(doc.expiresAt)}</Badge>;
}
