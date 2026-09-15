import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { photoBase } from "@/lib/listings";

type Cover = { demo_image_url: string | null; images: { thumb_path: string; position: number }[] };

export function coverUrl(listing: Cover) {
  const first = [...listing.images].sort((a, b) => a.position - b.position)[0];
  return first ? photoBase + first.thumb_path : listing.demo_image_url;
}

export function AdStrip({ id, title, price, status, imageUrl }: { id: string; title: string; price: string; status: string; imageUrl: string | null }) {
  return (
    <Link href={`/l/${id}`} className="flex items-center gap-3 rounded-card bg-surface p-2 ring-1 ring-line hover:bg-surface-2">
      <span className="size-12 shrink-0 overflow-hidden rounded-field bg-surface-2">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- photos arrive resized from the browser
          <img src={imageUrl} alt="" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-ink-2">
            <ImageOff className="size-5" aria-hidden />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink">{title}</span>
        <span className="font-display font-bold text-ink">{price}</span>
      </span>
      {status === "sold" && <Badge tone="success">Sold</Badge>}
      {status === "reserved" && <Badge tone="accent">Reserved</Badge>}
    </Link>
  );
}
