import { useState, useEffect } from 'react';
import { HiX } from 'react-icons/hi';
import { Download } from 'lucide-react';

export default function PwaInstallPrompt({ deferredPrompt, setDeferredPrompt }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (deferredPrompt) {
      if (sessionStorage.getItem('pwaPromptShown')) {
        return;
      }
      // Small delay for smooth entry animation
      const timer = setTimeout(() => {
        setShow(true);
        sessionStorage.setItem('pwaPromptShown', 'true');
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
      setTimeout(() => setDeferredPrompt(null), 300); // Wait for exit animation
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setTimeout(() => setDeferredPrompt(null), 300);
  };

  if (!deferredPrompt && !show) return null;

  return (
    <>
      {/* Mobile-optimized Backdrop (Optional, but focuses user attention on mobile) */}
      <div 
        className={`fixed inset-0 bg-black/40 z-[90] transition-opacity duration-300 md:hidden ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={handleDismiss}
      />
      
      {/* Prompt Card */}
      <div 
        className={`fixed z-[100] transition-all duration-500 ease-out flex
          bottom-0 left-0 right-0 p-4 md:bottom-6 md:right-6 md:left-auto md:w-[400px] md:p-0
          ${show ? 'translate-y-0 opacity-100' : 'translate-y-full md:translate-y-10 opacity-0 pointer-events-none'}
        `}
      >
        <div className="bg-white w-full rounded-2xl md:rounded-xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col relative">
          
          {/* Close Button */}
          <button 
            onClick={handleDismiss} 
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors z-10"
          >
            <HiX className="w-5 h-5" />
          </button>

          <div className="p-5 flex items-start gap-4">
            {/* App Icon Graphic */}
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-white/20 to-transparent"></div>
              <span className="text-white font-black text-2xl drop-shadow-md">L</span>
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <h4 className="font-bold text-gray-900 text-base leading-tight">Install Lucohire App</h4>
              <p className="text-xs text-gray-500 mt-1.5 pr-4 leading-relaxed">
                Add to your home screen for a fast, native, full-screen experience (under 2MB).
              </p>
            </div>
          </div>

          {/* Action Area */}
          <div className="bg-gray-50/80 p-4 border-t border-gray-100 flex gap-3">
            <button 
              onClick={handleDismiss} 
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 shadow-xs hover:bg-gray-50 active:scale-95 transition-all"
            >
              Not Now
            </button>
            <button 
              onClick={handleInstallClick} 
              className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Install App
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
