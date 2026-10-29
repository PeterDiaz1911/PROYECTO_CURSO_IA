import type { NextConfig } from "next";
import path from "node:path";
const basePath = process.env.DEPLOY_TARGET === "github-pages" ? "/PROYECTO_CURSO_IA" : "";
const nextConfig: NextConfig = {
  output: "export", trailingSlash: true, typedRoutes: true, basePath,
  distDir: process.env.NEXT_BUILD_DIST_DIR ?? ".next",
  outputFileTracingRoot: path.resolve(process.cwd()),
  images: { unoptimized: true }, poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};
export default nextConfig;
