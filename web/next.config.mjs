import { fileURLToPath } from "node:url";

// Export statique pour GitHub Pages : le site est servi sous /<nom-du-depot>.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // shared/ (types et règles communes avec collector/) est hors de web/ : la racine doit le couvrir
  turbopack: { root: fileURLToPath(new URL("..", import.meta.url)) },
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
