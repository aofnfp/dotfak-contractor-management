/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' - it breaks server-side features

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dotfak-contractor-management.netlify.app',
      },
    ],
  },

  // Environment variables validation
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
}

module.exports = nextConfig
