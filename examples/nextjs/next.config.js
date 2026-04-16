/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@srawad/trpc-studio"],
  },
};

module.exports = nextConfig;
