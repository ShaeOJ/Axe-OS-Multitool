import type {NextConfig} from 'next';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  // Only use static export for production builds (tauri:build)
  // Dev mode needs server for API routes
  ...(isProd && { output: 'export' }),
  /* config options here */
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
