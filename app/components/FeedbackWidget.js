'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Share2, X } from 'lucide-react';

export default function FeedbackWidget({ scanId, companyName, totalMentions }) {
  const [step, setStep] = useState('initial'); // initial, comment, linkedin, success
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRating = async (selectedRating) => {
    setRating(selectedRating);
    
    if (selectedRating === 'positive') {
      setStep('linkedin');
    } else {
      setStep('comment');
    }
  };

  const handleSubmitFeedback = async () => {
    setSubmitting(true);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment,
          email,
          scanId,
          sharedOnLinkedin: false
        })
      });

      if (response.ok) {
        setStep('success');
        setTimeout(() => setStep('initial'), 5000);
      }
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Er ging iets mis. Probeer het opnieuw.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkedInShare = async (shared) => {
    if (shared) {
      // Save feedback with LinkedIn share = true
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: 'positive',
          scanId,
          sharedOnLinkedin: true
        })
      });

      // Open LinkedIn share
      const linkedInText = encodeURIComponent(
        `🎯 Zojuist mijn AI-zichtbaarheid getest met TEUN.AI\n\n` +
        `📊 Resultaat: ${totalMentions}/5 vermeldingen in AI-zoekmachines\n\n` +
        `Benieuwd hoe vaak ChatGPT, Perplexity en Claude jouw bedrijf vermelden? Test het gratis:\n` +
        `👉 https://teun.ai/tools/ai-visibility\n\n` +
        `#GEO #AISEO #ChatGPT #AIZichtbaarheid`
      );
      
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://teun.ai/tools/ai-visibility')}&summary=${linkedInText}`,
        '_blank',
        'width=600,height=600'
      );
    }

    setStep('success');
    setTimeout(() => setStep('initial'), 5000);
  };

  if (step === 'success') {
    return (
      <div className="backdrop-blur-sm bg-green-500/20 border border-green-400/30 rounded-xl p-4 mt-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 text-green-300">
          <span className="text-2xl">🎉</span>
          <p className="font-semibold">Bedankt voor je feedback!</p>
        </div>
      </div>
    );
  }

  if (step === 'linkedin') {
    return (
      <div className="backdrop-blur-sm bg-gradient-to-r from-blue-600/30 to-blue-500/20 border border-blue-400/30 rounded-xl p-6 mt-6 animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={() => setStep('initial')}
          className="absolute top-4 right-4 text-blue-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <Share2 className="w-12 h-12 text-blue-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            🚀 Deel je resultaat op LinkedIn!
          </h3>
          <p className="text-blue-200 mb-4">
            Help anderen hun AI-zichtbaarheid te ontdekken
          </p>
          
          <div className="backdrop-blur-sm bg-white/10 rounded-lg p-4 mb-6 text-left text-sm text-blue-100">
            <p className="italic">
              "🎯 Zojuist mijn AI-zichtbaarheid getest met TEUN.AI<br/>
              📊 Resultaat: {totalMentions}/5 vermeldingen in AI-zoekmachines..."
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleLinkedInShare(true)}
              className="flex-1 px-6 py-3 bg-[#0A66C2] text-white font-bold rounded-lg hover:bg-[#004182] transition"
            >
              Deel op LinkedIn
            </button>
            <button
              onClick={() => handleLinkedInShare(false)}
              className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition"
            >
              Sla over
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'comment') {
    return (
      <div className="backdrop-blur-sm bg-orange-500/20 border border-orange-400/30 rounded-xl p-6 mt-6 animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={() => setStep('initial')}
          className="absolute top-4 right-4 text-orange-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white mb-2">
          😔 Wat kunnen we verbeteren?
        </h3>
        <p className="text-orange-200 mb-4 text-sm">
          Je feedback helpt ons om de tool te verbeteren!
        </p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Vertel ons wat beter kan..."
          className="w-full h-32 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optioneel, voor follow-up)"
          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
        />

        <button
          onClick={handleSubmitFeedback}
          disabled={submitting || !comment}
          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50"
        >
          {submitting ? 'Versturen...' : 'Verstuur feedback'}
        </button>
      </div>
    );
  }

  // Initial state
  return (
    <div className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between">
        <p className="text-gray-300 text-sm sm:text-base">
          💭 Hoe vond je deze analyse?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleRating('positive')}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition flex items-center gap-2 text-green-300 font-semibold"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="hidden sm:inline">Handig</span>
          </button>
          <button
            onClick={() => handleRating('negative')}
            className="px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition flex items-center gap-2 text-orange-300 font-semibold"
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="hidden sm:inline">Kan beter</span>
          </button>
        </div>
      </div>
    </div>
  );
}