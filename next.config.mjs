/**
 * GitHub Pages serves this repo as a *project site* at
 *   https://romeokoduah.github.io/CarLab/
 * so a static export with a basePath is required. The basePath/assetPrefix are
 * only applied when building in the Pages workflow (GITHUB_PAGES=true), so local
 * `npm run dev` / `npm run build` still work at the root.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const repo = "CarLab";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  basePath: isPages ? `/${repo}` : undefined,
  assetPrefix: isPages ? `/${repo}/` : undefined,
  images: {
    // No image optimization server on static hosts.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;
