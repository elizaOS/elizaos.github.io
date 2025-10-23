/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true, // Required for static export
  },
  typescript: {
    // Using a custom tsconfig for the Next.js app
    tsconfigPath: "tsconfig.nextjs.json",
  },
};

export default nextConfig;
