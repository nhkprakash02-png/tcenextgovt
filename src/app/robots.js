// Next.js App Router's native robots file: this file, at src/app/robots.js, is automatically
// served at /robots.txt. Replaces the static public/robots.txt (deleted alongside this file;
// Next.js build fails if a static file and a generated route both resolve to the same path).
// Content is unchanged from the previous static file: allow everything except the private,
// login-required dashboard, and point crawlers at the sitemap above.
export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/dashboard',
    },
    sitemap: 'https://tcenahata.in/sitemap.xml',
  };
}
