'use client';

// This is the old src/App.jsx, converted into the App Router's persistent shell. It keeps
// exactly the same chrome, in the same order, with the same conditional-on-Home behaviour:
// Navbar, Ticker, (Home only) HeroCarousel, the page body, (Home only) Mentors, Footer,
// BackButton, the two floating action buttons, and the modal stack.
//
// Tab switching is client-side only (AppContext updates the URL with the History API, no server
// request, no reload). `children` is the server-rendered page for the route the visitor first
// landed on — kept as-is so the initial HTML, metadata and JSON-LD are unchanged. Once the
// visitor switches to a different tab, the matching view is rendered directly from PAGES below,
// exactly like the original Vite App.jsx did. `isHome` still comes from activeTab, which
// AppContext derives from the URL.
import React, { useEffect, useState } from 'react';
import { Download, MessageCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Navbar from './Navbar';
import Footer from './Footer';
import Ticker from './Ticker';
import HeroCarousel from './HeroCarousel';
import Mentors from './Mentors';
import Modal from './Modal';
import BackButton from './BackButton';
import AuthModal, { GoogleRegisterModal } from './AuthModal';
import EnrollModal from './EnrollModal';
import AdminLoginModal from './AdminLoginModal';
import AdminPanel from '../views/AdminPanel';
import Home from '../views/Home';
import MockTest from '../views/MockTest';
import Quiz from '../views/Quiz';
import PyqHub from '../views/PyqHub';
import StudyMaterials from '../views/StudyMaterials';
import Batches from '../views/Batches';
import Dashboard from '../views/Dashboard';
import Notices from '../views/Notices';

const PAGES = {
  home: Home,
  mocks: MockTest,
  quiz: Quiz,
  pyq: PyqHub,
  materials: StudyMaterials,
  batches: Batches,
  dashboard: Dashboard,
  notices: Notices,
};

function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferred(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const trigger = () => { if (deferred) { deferred.prompt(); setDeferred(null); } };
  return { canInstall: !!deferred, trigger };
}

export default function AppShell({ children }) {
  const { activeTab, modal } = useApp();
  const { canInstall, trigger } = useInstallPrompt();
  const isHome = activeTab === 'home';
  const [initialTab] = useState(activeTab); // the tab whose server-rendered page is in `children`
  const Page = PAGES[activeTab] || Home;

  return (
    <>
      <Navbar />
      <Ticker />
      {isHome && <HeroCarousel />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="fade-in">
          {activeTab === initialTab ? children : <Page />}
        </div>
      </main>

      {isHome && <Mentors />}
      <Footer />
      <BackButton />

      {/* Floating action buttons — ported from index.html lines ~229-238 */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-3">
        {canInstall && (
          <button onClick={trigger} className="flex items-center gap-2 px-4 py-3 rounded-full btn-gold shadow-lg text-xs font-bold">
            <Download className="w-4 h-4" /> 📲 Install App
          </button>
        )}
        <a
          href="https://wa.me/919749587349?text=Hello%20Sir%2C%20I%20want%20to%20know%20more%20about%20TCE%20batches"
          target="_blank" rel="noreferrer"
          className="flex items-center gap-2 px-4 py-3 rounded-full bg-[#25D366] text-white shadow-lg text-xs font-bold"
        >
          <MessageCircle className="w-4 h-4" /> WhatsApp Support
        </a>
      </div>

      {modal?.type === 'login' && <AuthModal />}
      {modal?.type === 'googleRegister' && <GoogleRegisterModal {...modal.props} />}
      {modal?.type === 'enroll' && <EnrollModal {...modal.props} />}
      {modal?.type === 'adminLogin' && <AdminLoginModal />}
      {modal?.type === 'adminPanel' && (
        <Modal title="Admin Panel" wide>
          <AdminPanel />
        </Modal>
      )}
    </>
  );
}
