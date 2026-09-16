import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chowk: buy and sell near you",
    short_name: "Chowk",
    description: "Free marketplace for India. Sell what you do not use. Find what you need from people near you.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf8f3",
    theme_color: "#2b3a8c",
    lang: "en-IN",
    categories: ["shopping", "lifestyle"],
    // ponytail: one SVG icon covers every size in current browsers; add PNG icons if an old Android launcher needs them.
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
