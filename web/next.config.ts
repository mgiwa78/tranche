import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Self-contained server bundle (.next/standalone) for the Docker image (NEXT_OUTPUT=standalone).
  // Vercel and local builds use the default output.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // Monorepo root, so standalone tracing picks up the hoisted node_modules and @tranche/shared.
  outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
