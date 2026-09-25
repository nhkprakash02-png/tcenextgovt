/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Plain <img> tags are kept from the original React build so the UI renders pixel-identically;
  // next/image is deliberately not used anywhere.
  images: { unoptimized: true },

  // Permanent (308) redirect so Google treats www and non-www as one single site, with
  // tcenahata.in (no www) as the canonical version — matches the canonical tag on every page.
  // Uses a `source: '/:path*'` wildcard with a `host` match condition, which is how Next.js
  // scopes a redirect to requests arriving on a specific hostname rather than every request.
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.tcenahata.in' }],
        destination: 'https://tcenahata.in/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
