/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' - it breaks server-side features

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'q0c480kc0gcokkkk8ksggoso.172.190.9.72.sslip.io',
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
