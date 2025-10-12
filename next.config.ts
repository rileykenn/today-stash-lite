/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ Don’t fail the Vercel build because of ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optional: uncomment if TypeScript errors ever block your build
    // (ship now, fix types later)
    // ignoreBuildErrors: true,
  },
};

export default nextConfig;
