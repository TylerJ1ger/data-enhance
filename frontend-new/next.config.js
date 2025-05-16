/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // 添加默认API URL，防止undefined
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    return [
      {
        source: '/api/:path*',
        destination: apiUrl + '/:path*',
      },
    ];
  },
}

module.exports = nextConfig; // 改用CommonJS导出语法