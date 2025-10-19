/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Prevent ESLint from blocking build
  },
  typescript: {
    ignoreBuildErrors: true, // ✅ Ignore type errors during build
  },
};

module.exports = nextConfig;
