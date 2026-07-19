/**
 * Eclipse Motors runs as a Node server (next start) behind nginx on the VPS.
 * (Previously a static export for GitHub Pages — now backed by PostgreSQL, so
 * pages render dynamically at request time.)
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Uploads are served directly by nginx from /uploads/; no image server.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
    ],
  },
};

export default nextConfig;
