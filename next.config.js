/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

// Dev hits the API + socket.io over http://localhost:5000.
const connectSrc = isDev
  ? "'self' http: https: ws: wss: blob:"
  : "'self' https: wss: ws: blob:";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "media-src 'self' blob: data: https:",
  "worker-src 'self' blob:",
  `connect-src ${connectSrc}`,
  "object-src 'none'",
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  images: {
    domains: [
      "remwzcalhvoaubuhuzan.supabase.co",
      "lh3.googleusercontent.com",
      "googleusercontent.com",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;