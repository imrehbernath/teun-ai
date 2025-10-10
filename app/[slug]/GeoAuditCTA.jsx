'use client';

import { useState } from 'react';

// Early Access Popup Component
function EarlyAccessPopup({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setStatus('success');
        setEmail('');
        setTimeout(() => {
          setStatus('idle');
          onClose();
        }, 3000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (error) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Sluiten"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            GEO Audit - Binnenkort!
          </h3>
          <p className="text-gray-600">
            Meld je aan voor early access en krijg als eerste toegang tot onze GEO Audit tool.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Vul je emailadres in *"
            required
            disabled={status === 'loading'}
            className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-purple-500 focus:outline-none transition-colors disabled:opacity-50"
          />
          
          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {status === 'loading' ? 'Verzenden...' : 'Aanmelden voor Early Access'}
          </button>
        </form>

        {status === 'success' && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
            ✓ Bedankt! Je ontvangt binnenkort meer informatie.
          </div>
        )}
        
        {status === 'error' && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
            ✗ Er ging iets mis. Probeer het opnieuw.
          </div>
        )}
      </div>
    </div>
  );
}

// Main CTA Component
export default function GeoAuditCTA() {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <div className="mt-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-4">
          Klaar om je GEO te verbeteren?
        </h3>
        <p className="text-purple-100 mb-6 text-lg">
          Start vandaag nog met een gratis GEO audit en ontdek hoe zichtbaar jouw merk is in AI-antwoorden.
        </p>
        <button
          onClick={() => setShowPopup(true)}
          className="inline-block bg-white text-purple-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 transition shadow-lg cursor-pointer"
        >
          Start Gratis GEO Audit
        </button>
      </div>

      <EarlyAccessPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
    </>
  );
}