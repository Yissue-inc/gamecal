/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/newtitle',
        destination: '/new-releases',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
