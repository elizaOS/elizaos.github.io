/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: "/elizaos.github.io",
  assetPrefix: "/elizaos.github.io",
  images: {
    unoptimized: true, // Required for static export
  },
  typescript: {
    // Using a custom tsconfig for the Next.js app
    tsconfigPath: "tsconfig.nextjs.json",
  },
};

export default nextConfig;
