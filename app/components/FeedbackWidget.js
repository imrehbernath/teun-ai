'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, X, Gift, Send } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

export default function FeedbackWidget({ scanId, companyName, totalMentions }) {
  const [step, setStep] = useState('initial'); // initial, expand, success
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const locale = useLocale();
  const isNL = locale === 'nl';

  const handleRating = async (selectedRating) => {
    setRating(selectedRating);
    setStep('expand');

    // Stuur rating direct naar Slack (zonder te wachten)
    sendToSlack({ rating: selectedRating, step: 'quick-rating' }).catch(() => {});
  };

  const sendToSlack = async (extraData = {}) => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: extraData.rating || rating,
          comment: extraData.comment || comment,
          email: extraData.email || email,
          scanId,
          companyName,
          totalMentions,
          sharedOnLinkedin: false,
          proRaffle: !!(extraData.email || email),
          source: 'ai-visibility'
        })
      });
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const handleSubmitExpand = async () => {
    setSubmitting(true);
    await sendToSlack({ comment, email });
    setSubmitting(false);
    setStep('success');
  };

  // ====================================
  // SUCCESS STATE
  // ====================================
  if (step === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 text-green-700">
          <span className="text-2xl">🎉</span>
          <p className="font-semibold">
            {isNL ? 'Bedankt voor je feedback!' : 'Thanks for your feedback!'}
            {email && (
              <span className="font-normal text-green-600 block text-sm mt-1">
                {isNL 
                  ? 'Je doet mee aan de maandelijkse PRO verloting.' 
                  : "You're entered in the monthly PRO raffle."}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  // ====================================
  // EXPANDED: comment + PRO raffle
  // ====================================
  if (step === 'expand') {
    return (
      <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-5 mt-6 animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={() => setStep('initial')}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Rating bevestiging */}
        <div className="flex items-center gap-2 mb-4">
          {rating === 'positive' 
            ? <ThumbsUp className="w-4 h-4 text-green-600" />
            : <ThumbsDown className="w-4 h-4 text-orange-600" />
          }
          <span className="text-sm text-slate-600">
            {rating === 'positive'
              ? (isNL ? 'Blij dat je het nuttig vond!' : 'Glad you found it useful!')
              : (isNL ? 'Hoe kunnen we het verbeteren?' : 'How can we improve?')
            }
          </span>
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={rating === 'positive'
            ? (isNL ? 'Optioneel: wat vond je het meest waardevol?' : 'Optional: what did you find most valuable?')
            : (isNL ? 'Wat miste je of wat kan beter?' : 'What was missing or could be better?')
          }
          rows={2}
          className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none mb-3"
        />

        {/* PRO Verloting */}
        <div className="bg-gradient-to-r from-[#1E1E3F]/5 to-[#2D2D5F]/5 border border-[#292956]/10 rounded-lg p-3 mb-3">
          <div className="flex items-start gap-2.5">
            <Gift className="w-4 h-4 text-[#292956] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#292956]">
                {isNL 
                  ? 'Maak kans op een maand gratis PRO' 
                  : 'Win a free month of PRO'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {isNL 
                  ? 'Elke maand verloten we een PRO account onder de feedbackgevers.' 
                  : 'Every month we raffle a PRO account among feedback submitters.'}
              </p>
            </div>
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isNL ? 'Je e-mailadres (optioneel)' : 'Your email (optional)'}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#292956]/20 mt-2.5"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmitExpand}
          disabled={submitting || (!comment && !email)}
          className="w-full px-4 py-2.5 bg-[#292956] text-white font-semibold rounded-lg hover:bg-[#1E1E3F] transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 text-sm"
        >
          <Send className="w-3.5 h-3.5" />
          {submitting 
            ? (isNL ? 'Versturen...' : 'Sending...') 
            : (isNL ? 'Verstuur feedback' : 'Send feedback')
          }
        </button>
      </div>
    );
  }

  // ====================================
  // INITIAL: compact thumbs rating
  // ====================================
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 text-sm font-medium">
            {isNL ? 'Hoe nuttig vond je deze scan?' : 'How useful was this scan?'}
          </p>
          <p className="text-slate-400 text-xs mt-0.5 hidden sm:block">
            {isNL 
              ? 'Geef feedback en maak kans op een maand gratis PRO' 
              : 'Give feedback and win a free month of PRO'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => handleRating('positive')}
            className="px-3 sm:px-4 py-2 bg-green-100 hover:bg-green-200 border border-green-300 rounded-lg transition flex items-center gap-1.5 text-green-700 font-semibold cursor-pointer text-sm"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="hidden sm:inline">{isNL ? 'Nuttig' : 'Useful'}</span>
          </button>
          <button
            onClick={() => handleRating('negative')}
            className="px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition flex items-center gap-1.5 text-slate-600 font-semibold cursor-pointer text-sm"
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="hidden sm:inline">{isNL ? 'Kan beter' : 'Can improve'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
