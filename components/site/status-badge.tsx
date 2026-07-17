import { Badge } from "@/components/ui/badge";
import type { CarStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: CarStatus }) {
  if (status === "Available") {
    return <Badge variant="success">Available</Badge>;
  }
  if (status === "Reserved") {
    return <Badge variant="warning">Reserved</Badge>;
  }
  return <Badge variant="muted">Sold</Badge>;
}
