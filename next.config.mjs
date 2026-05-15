/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'zolnlzzlsknppcnljycd.supabase.co' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: 'pub-1a4b31b5f4d14e308d3ea68b8ad64c8a.r2.dev' },
    ],
  },
};

export default nextConfig;
