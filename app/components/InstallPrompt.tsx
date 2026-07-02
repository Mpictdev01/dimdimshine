"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [isReadyForInstall, setIsReadyForInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsReadyForInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsReadyForInstall(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function downloadApp() {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsReadyForInstall(false);
  }

  if (!isReadyForInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white border border-zinc-200 shadow-2xl rounded-xl p-4 z-50 flex flex-col sm:flex-row items-center gap-4 transition-all duration-500 ease-out transform translate-y-0">
      <div className="bg-zinc-100 p-3 rounded-lg flex-shrink-0">
        <img src="/OKAX.png" alt="Okax Icon" className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
        {/* Fallback icon if image fails to load */}
        <Download className="w-8 h-8 text-zinc-900 absolute top-3 left-3 opacity-0" style={{ zIndex: -1 }} />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <h3 className="font-semibold text-zinc-900 text-sm">Install Okax App</h3>
        <p className="text-xs text-zinc-500 mt-1">Akses lebih cepat dan lancar dari layar beranda Anda.</p>
      </div>
      <div className="flex items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
        <button
          onClick={() => setIsReadyForInstall(false)}
          className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-lg flex justify-center items-center"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={downloadApp}
          className="bg-black text-white px-4 py-2 text-sm rounded-lg font-medium hover:bg-zinc-800 transition-colors flex-1"
        >
          Install
        </button>
      </div>
    </div>
  );
}
