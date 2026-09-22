'use client';

// This is the old src/App.jsx, converted into the App Router's persistent shell. It keeps
// exactly the same chrome, in the same order, with the same conditional-on-Home behaviour:
// Navbar, Ticker, (Home only) HeroCarousel, the page body, (Home only) Mentors, Footer,
// BackButton, the two floating action buttons, and the modal stack.
//
// The single change from App.jsx: the PAGES lookup table and `const Page = PAGES[activeTab]`
// are gone. Under the App Router each section is a real route with its own app/<path>/page.js,
// and Next hands the matching page in as `children`. `isHome` still comes from activeTab, which
// AppContext derives from the URL — so HeroCarousel and Mentors appear on exactly the same
// screen they always did.
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

  return (
    <>
      <Navbar />
      <Ticker />
      {isHome && <HeroCarousel />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="fade-in">
          {children}
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
