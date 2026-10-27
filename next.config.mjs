/** @type {import('next').NextConfig} */
const nextConfig = {
  // Parallel agents build into their own dir: NEXT_DIST_DIR=.next-a npx next build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
