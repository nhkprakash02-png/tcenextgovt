// Root layout — this is the App Router replacement for the old index.html.
// Everything that lived in that file's <head> is now either a Next `metadata`/`viewport`
// export (title, description, keywords, canonical, Open Graph, Twitter card, manifest, icons,
// theme colour) or a plain tag rendered below (the Google Fonts link, the SVG data-URI
// favicon). The inline splash-screen CSS + markup + bridge script are carried over verbatim,
// because they are what makes the site feel instant on first paint — that has to be real HTML
// the browser sees before any JS runs, which is exactly what this server component emits.
import React from 'react';
import './globals.css';
import { AppProvider } from '../context/AppContext';
import AppShell from '../components/AppShell';

const SITE = 'https://tcenahata.in';
const TITLE = 'TCE Nahata - The Competitive Edge | Mock Tests & Coaching';
const DESCRIPTION = 'TCE Nahata coaching for WBP, KP SI, SSC GD & Railway (RRB) exams in North 24 Parganas, West Bengal. Free mock tests, PYQs, quizzes & study materials.';

export const metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  keywords: 'TCE Nahata, The Competitive Edge, TCE Coaching Institute, The Competitive Edge Nahata, tcenahata, tce nahata.in, tce coaching, nahata coaching, tce competitive edge, tcenhata, tc nahata, tehatta competitive edge, tce nahata coaching, WBP exam preparation Nahata, KP SI coaching in Nahata, SSC GD coaching classes near me, Railway exam preparation institute, Competitive exam coaching in Tehatta / Nahata, Government job coaching center Nahata, Best coaching institute near me, Top coaching center in Nahata, Government job preparation near me, WBP coaching center near me, Competitive edge coaching institute address, government job, government job preparation near me, KP SI coaching, SSC GD coaching near me, WBP PSC coaching, best coaching, Prakash Sarkar, Maharup Tarafder, Pranab SadhuKhan, Tanujoy Mallick, Nahata college, Nahata Jogendranath Smriti Mahavidyalaya, Nahata high school, Nahata computer center, Nahata local coaching, Nahata market coaching centre, Nahata station road coaching, wbp coaching in bongaon, government job coaching near gopalnagar, best ssc coaching in north 24 parganas, railway coaching center in bongaon, wbp mock test in bengali, competitive exam coaching near nahata, online mock test portal in west bengal, kp si preparation online bengali, wb police constable preparation coaching, primary tet coaching in bongaon, group d exam preparation center, west bengal competitive exam classes, free mock test for wbp in bengali',
  authors: [{ name: 'TCE - The Competitive Edge' }],
  robots: { index: true, follow: true },
  alternates: { canonical: SITE + '/' },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    url: SITE + '/',
    title: TITLE,
    description: DESCRIPTION,
    // FIX: this previously declared 1200x630, but public/seo-banner.png is actually 647x423 —
    // a mismatch between declared and real dimensions can cause WhatsApp/Facebook to crop the
    // preview oddly or fall back to no image at all. Corrected to the file's real size. For the
    // sharpest possible preview, replacing this file with a proper 1200x630 image would still
    // be worth doing later, but this fix alone makes the current file behave correctly.
    images: [{ url: '/seo-banner.png', width: 647, height: 423 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/seo-banner.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'TCE',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: '/logo.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0B0B0B',
};

// Applies the saved light/dark choice to <html> before first paint, so switching to the light
// theme and refreshing never flashes the dark theme first. AppContext reads the same
// 'tce_theme' key on mount and stays the source of truth from then on.
const THEME_BOOT_SCRIPT = `
  (function () {
    try {
      var t = localStorage.getItem('tce_theme');
      var el = document.documentElement;
      if (t === 'light') { el.classList.add('light'); el.classList.remove('dark'); }
      else { el.classList.add('dark'); el.classList.remove('light'); }
    } catch (e) {}
  })();
`;

// Bridge between the plain-HTML splash below and the React app: AppContext calls
// window.hideAppSplash() once the initial Firestore load finishes. A minimum 500ms display
// time avoids an imperceptible flash on fast connections/repeat visits, where the splash
// would otherwise disappear almost as soon as it appeared.
const SPLASH_SCRIPT = `
  // Equivalent of the original inline onerror="this.style.display='none'" on the splash logo:
  // React can't emit an inline event attribute, so it's wired up here instead. The .complete
  // check covers the case where the image already failed before this script ran.
  (function () {
    var logo = document.querySelector('#app-splash .splash-logo');
    if (!logo) return;
    var hide = function () { logo.style.display = 'none'; };
    logo.addEventListener('error', hide);
    if (logo.complete && logo.naturalWidth === 0) hide();
  })();
  window.__splashShownAt = Date.now();
  window.hideAppSplash = function () {
    var el = document.getElementById('app-splash');
    if (!el) return;
    var elapsed = Date.now() - window.__splashShownAt;
    var wait = Math.max(0, 500 - elapsed);
    setTimeout(function () {
      el.classList.add('splash-hide');
      setTimeout(function () { el.remove(); }, 500);
    }, wait);
  };
  // Safety net: the app is expected to call hideAppSplash() itself once real data has loaded
  // (see AppContext.jsx). If that somehow never happens — a total backend outage, an
  // unexpected uncaught error before that point, anything — this guarantees the splash still
  // clears on its own after 8 seconds rather than permanently blocking the site.
  setTimeout(function () { window.hideAppSplash(); }, 8000);
`;

const SPLASH_CSS = `
  #app-splash {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: #0B0B0B;
    transition: opacity 0.4s ease, visibility 0.4s ease;
  }
  #app-splash.splash-hide { opacity: 0; visibility: hidden; pointer-events: none; }
  #app-splash .splash-logo {
    width: 84px; height: 84px; border-radius: 9999px; object-fit: cover;
    animation: splash-pulse 1.4s ease-in-out infinite;
    box-shadow: 0 0 32px rgba(245, 158, 11, 0.45);
  }
  #app-splash .splash-brand {
    margin-top: 18px; font-family: 'Poppins', 'Inter', sans-serif; font-weight: 800;
    font-size: 20px; letter-spacing: 0.02em;
    background: linear-gradient(135deg, #F59E0B, #D97706, #FBBF24);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    opacity: 0; animation: splash-fade-in 0.6s ease 0.2s forwards;
  }
  #app-splash .splash-ring {
    margin-top: 22px; width: 26px; height: 26px; border-radius: 9999px;
    border: 3px solid rgba(245, 158, 11, 0.25); border-top-color: #F59E0B;
    animation: splash-spin 0.8s linear infinite;
  }
  @keyframes splash-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
  @keyframes splash-fade-in { to { opacity: 1; } }
  @keyframes splash-spin { to { transform: rotate(360deg); } }
`;

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning is required on <html> because THEME_BOOT_SCRIPT below swaps the
    // dark/light class on it before React hydrates — an intentional difference from the
    // server-rendered markup, and the only way to avoid a flash of the wrong theme.
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22 fill=%22%23F59E0B%22>T</text></svg>"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@600;700;800&family=Noto+Sans+Bengali:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="no-tap-highlight">
        {/* App splash screen: pure inline CSS/markup, no external file, so this renders the
            instant the browser parses this HTML — well before React, the JS bundle, or any
            Firestore data has loaded. See AppContext.jsx for how React signals this to hide
            once real data is ready. */}
        <div id="app-splash">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="TCE" className="splash-logo" />
          <div className="splash-brand">TCE - The Competitive Edge</div>
          <div className="splash-ring" />
        </div>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
