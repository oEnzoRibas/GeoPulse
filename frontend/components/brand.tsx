import Link from "next/link";
import { Activity } from "lucide-react";

export function Brand() {
  return <Link prefetch={false} href="/" className="brand" aria-label="GeoPulse, início">
    <span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>
    <span>Geo<span>Pulse</span></span>
  </Link>;
}
