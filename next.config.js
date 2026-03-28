/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'localhost',
      'vfetch-mvp-images-test.s3.eu-west-1.amazonaws.com', // Added S3 bucket
    ],
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://vfetch-alb-1445534297.eu-west-1.elb.amazonaws.com';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig