/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.todaysstash.com.au' }],
        destination: 'https://todaysstash.com.au/:path*',
        permanent: true,
      },
    ];
  },

  eslint: {
    // ✅ Don’t fail the Vercel build because of ESLint errors
    ignoreDuringBuilds: true,
  },

  typescript: {
    // Optional: uncomment if TypeScript errors ever block your build
    // ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ufxmucwtywfavsmorkpr.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
