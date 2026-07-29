import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // A stray lockfile in the home directory otherwise makes Next infer the wrong root.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
