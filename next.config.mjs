/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'www.gamerclock.com',
          },
        ],
        destination: 'https://gamerclock.com/:path*',
        permanent: true,
      },
      {
        source: '/newtitle',
        destination: '/new-releases',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
