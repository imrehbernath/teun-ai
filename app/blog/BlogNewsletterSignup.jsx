'use client';

import { useState } from 'react';

export default function BlogNewsletterSignup() {
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
        setTimeout(() => setStatus('idle'), 5000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 5000);
      }
    } catch (error) {
      console.error('Subscribe error:', error);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 5000);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Vul je emailadres in *"
          required
          disabled={status === 'loading'}
          className="flex-1 px-6 py-4 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-white/30 disabled:opacity-50 shadow-lg"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-10 py-4 bg-white text-purple-600 font-bold rounded-xl hover:bg-gray-50 hover:shadow-2xl hover:scale-105 transition-all shadow-lg whitespace-nowrap disabled:opacity-50 disabled:scale-100 cursor-pointer"
        >
          {status === 'loading' ? 'Bezig...' : 'Aanmelden'}
        </button>
      </form>

      {/* Status Messages */}
      {status === 'success' && (
        <div className="mt-6 p-4 bg-green-500/20 backdrop-blur-sm border-2 border-green-300 rounded-xl">
          <p className="text-white font-semibold">
            ✓ Bedankt! Je ontvangt een bevestigingsmail.
          </p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="mt-6 p-4 bg-red-500/20 backdrop-blur-sm border-2 border-red-300 rounded-xl">
          <p className="text-white font-semibold">
            ✗ Er ging iets mis. Probeer het opnieuw.
          </p>
        </div>
      )}
    </div>
  );
}