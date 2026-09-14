import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the home folder confuses workspace detection. Pin the root to this repo.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
