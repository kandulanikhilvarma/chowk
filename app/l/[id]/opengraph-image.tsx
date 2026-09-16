import { ImageResponse } from "next/og";
import { priceLabel } from "@/lib/format";
import { photoBase } from "@/lib/listings";
import { supabasePublic } from "@/lib/supabase/public";

export const alt = "Ad on Chowk";
// WhatsApp skips preview images above about 600 KB. A photo PNG at 1200 x 630 is larger, so the card is 800 x 420.
export const size = { width: 800, height: 420 };
export const contentType = "image/png";
export const revalidate = 3600;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Google Fonts sends TrueType to a client that does not ask for WOFF2. `text` keeps the file to the glyphs used.
async function font(family: string, weight: number, text: string) {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`,
  ).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error(`no TrueType file for ${family}`);
  return fetch(url).then((r) => r.arrayBuffer());
}

// The renderer reads PNG and JPEG only. Uploaded photos are WebP, so the image falls back to a colour panel.
// ponytail: add a JPEG copy at upload time if shares of real ads need the photo.
async function photo(src: string | undefined) {
  if (!src) return null;
  const res = await fetch(src);
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !/image\/(png|jpe?g)/.test(type)) return null;
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: listing } = UUID.test(id)
    ? await supabasePublic
        .from("listings")
        .select("title, price_paise, price_type, kind, locality, is_demo, demo_image_url, city:cities(name), images:listing_images(path, position)")
        .eq("id", id)
        .maybeSingle()
    : { data: null };

  const title = listing?.title ?? "Buy and sell near you";
  const price = listing ? priceLabel(listing.price_paise, listing.price_type) : "Free for everyone";
  const place = listing ? [listing.locality, listing.city?.name].filter(Boolean).join(", ") : "India";
  const cover = listing && [...listing.images].sort((a, b) => a.position - b.position)[0];
  const src = cover
    ? photoBase + cover.path
    : listing?.demo_image_url?.replace("auto=format", "fm=jpg").replace("w=800&h=600", "w=420&h=420");
  const image = await photo(src).catch(() => null);
  const label = listing?.kind === "wanted" ? "WANTED" : listing?.is_demo ? "DEMO AD" : "ON CHOWK";

  const text = `${title}${price}${place}${label}chowkSell it. Find it. Around the corner.`;
  const [display, body] = await Promise.all([font("Anek Latin", 800, text), font("Inter", 500, text)]).catch(() => [null, null]);

  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#FBF8F3", fontFamily: "Inter" }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- rendered into a PNG, not the page
          <img src={image} alt="" width={420} height={420} style={{ objectFit: "cover" }} />
        ) : (
          <div style={{ display: "flex", width: 420, height: 420, background: "#2B3A8C", alignItems: "center", justifyContent: "center" }}>
            <svg width="170" height="170" viewBox="0 0 200 200">
              <path d="M85 0h30v200H85zM0 85h200v30H0z" fill="#FBF8F3" fillOpacity="0.25" />
              <rect x="62" y="62" width="76" height="76" rx="18" fill="#2B3A8C" stroke="#FBF8F3" strokeWidth="14" />
            </svg>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "32px 32px 28px", color: "#16182B" }}>
          <div style={{ display: "flex", fontSize: 15, fontWeight: 500, color: "#2B3A8C", letterSpacing: 1.5 }}>{label}</div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              fontFamily: "Anek Latin",
              fontSize: 48,
              fontWeight: 800,
              lineHeight: 1,
              color: listing?.price_type === "free" ? "#1F8A5B" : "#16182B",
            }}
          >
            {price}
          </div>
          <div style={{ display: "flex", marginTop: 14, fontSize: 25, fontWeight: 500, lineHeight: 1.2, maxHeight: 90, overflow: "hidden" }}>
            {title}
          </div>
          <div style={{ display: "flex", marginTop: 10, fontSize: 17, color: "#555A6E" }}>{place}</div>
          <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontFamily: "Anek Latin", fontSize: 30, fontWeight: 800, color: "#2B3A8C" }}>chowk</div>
            <div style={{ display: "flex", fontSize: 13, color: "#555A6E" }}>Sell it. Find it. Around the corner.</div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts:
        display && body
          ? [
              { name: "Anek Latin", data: display, weight: 800, style: "normal" },
              { name: "Inter", data: body, weight: 500, style: "normal" },
            ]
          : undefined,
    },
  );
}
