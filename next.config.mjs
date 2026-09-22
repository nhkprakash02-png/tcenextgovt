/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Plain <img> tags are kept from the original React build so the UI renders pixel-identically;
  // next/image is deliberately not used anywhere.
  images: { unoptimized: true },
};

export default nextConfig;
