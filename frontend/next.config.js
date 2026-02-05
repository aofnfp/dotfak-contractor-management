/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dotfak-contractor-management.onrender.com',
      },
    ],
  },
}

module.exports = nextConfig
