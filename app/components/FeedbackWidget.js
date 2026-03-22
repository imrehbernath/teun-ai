'use client';

import { useState } from 'react';
import { Rocket, Lightbulb, Send, X, ExternalLink } from 'lucide-react';
import { useLocale } from 'next-intl';

export default function FeedbackWidget({ scanId, companyName, totalMentions }) {
  const [showTips, setShowTips] = useState(false);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [tipsSent, setTipsSent] = useState(false);
  const locale = useLocale();
  const isNL = locale === 'nl';

  const handleLinkedInShare = () => {
    const text = isNL
      ? `🎯 Net mijn AI-zichtbaarheid getest met Teun.ai\n\nBen jij zichtbaar in ChatGPT, Perplexity en Google AI? Test het gratis:\n👉 https://teun.ai/tools/ai-visibility\n\n#AI #SEO #GEO #ChatGPT #AIZichtbaarheid`
      : `🎯 Just tested my AI visibility with Teun.ai\n\nAre you visible in ChatGPT, Perplexity and Google AI? Test it for free:\n👉 https://teun.ai/tools/ai-visibility\n\n#AI #SEO #GEO #ChatGPT #AIVisibility`;

    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://teun.ai/tools/ai-visibility')}&summary=${encodeURIComponent(text)}`,
      '_blank',
      'width=600,height=600'
    );
  };

  const handleSubmitTips = async () => {
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: 'neutral',
          comment: comment || 'Tips aangevraagd',
          email,
          scanId,
          companyName,
          totalMentions,
          sharedOnLinkedin: false,
          proRaffle: false,
          source: 'ai-visibility'
        })
      });
    } catch (error) {
      console.error('Feedback error:', error);
    }
    setSubmitting(false);
    setTipsSent(true);
  };

  return (
    <div className="mt-6 space-y-3">
      
      {/* ====================================
          PRIMARY: LinkedIn PRO Deal
          ==================================== */}
      <div className="bg-white border border-emerald-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Rocket className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-base text-slate-800">
              {isNL 
                ? 'Deel op LinkedIn en ontvang een maand gratis PRO' 
                : 'Share on LinkedIn and get a free month of PRO'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {isNL
                ? 'Stuur de link naar je post naar hallo@onlinelabs.nl. We controleren gedurende de maand of je post online blijft.'
                : 'Send the link to your post to hallo@onlinelabs.nl. We check during the month that your post stays online.'}
            </p>
            <button
              onClick={handleLinkedInShare}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A66C2] text-white font-bold rounded-lg hover:bg-[#004182] transition cursor-pointer text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              {isNL ? 'Deel op LinkedIn' : 'Share on LinkedIn'}
            </button>
            <p className="text-xs text-slate-400 mt-2">
              {isNL ? 'Minimaal 200 volgers.' : 'Minimum 200 followers.'}
            </p>
          </div>
        </div>
      </div>

      {/* ====================================
          SECONDARY: Free Tips (collapsed)
          ==================================== */}
      {!tipsSent ? (
        !showTips ? (
          <button
            onClick={() => setShowTips(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition py-2 cursor-pointer"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            {isNL 
              ? 'Of ontvang gratis tips voor je website' 
              : 'Or receive free tips for your website'}
          </button>
        ) : (
          <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-4">
            <button
              onClick={() => setShowTips(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-[#292956]" />
              <p className="text-sm font-semibold text-[#292956]">
                {isNL 
                  ? 'Ontvang gratis tips voor je website' 
                  : 'Receive free tips for your website'}
              </p>
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={isNL 
                ? 'Optioneel: wat vond je van de scan?' 
                : 'Optional: what did you think of the scan?'}
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none mb-3"
            />

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isNL ? 'Je e-mailadres' : 'Your email address'}
              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 mb-3"
            />

            <button
              onClick={handleSubmitTips}
              disabled={submitting || !email}
              className="w-full px-4 py-2.5 bg-[#292956] text-white font-semibold rounded-lg hover:bg-[#1E1E3F] transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting 
                ? (isNL ? 'Versturen...' : 'Sending...') 
                : (isNL ? 'Stuur mij tips' : 'Send me tips')
              }
            </button>
          </div>
        )
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-xl">🎉</span>
            <p className="font-semibold text-sm">
              {isNL 
                ? 'Bedankt! We sturen je binnenkort persoonlijke tips.' 
                : "Thanks! We'll send you personalized tips soon."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
