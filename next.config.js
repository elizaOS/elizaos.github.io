/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/op-hiscores" : "",
  images: {
    unoptimized: true, // Required for static export
  },
  typescript: {
    // Using a custom tsconfig for the Next.js app
    tsconfigPath: "tsconfig.nextjs.json",
  },
};

export default nextConfig;
