'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Share2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function FeedbackWidget({ scanId, companyName, totalMentions }) {
  const [step, setStep] = useState('initial'); // initial, comment, linkedin, success
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations('feedback');

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
      alert(t('submitError'));
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
        `🎯 ${t('linkedin.text1')}\n\n` +
        `📊 ${t('linkedin.text2', { mentions: totalMentions })}\n\n` +
        `${t('linkedin.text3')}\n` +
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
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-2 text-green-700">
          <span className="text-2xl">🎉</span>
          <p className="font-semibold">{t('thankYou')}</p>
        </div>
      </div>
    );
  }

  if (step === 'linkedin') {
    return (
      <div className="relative bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 mt-6 animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={() => setStep('initial')}
          className="absolute top-4 right-4 text-blue-400 hover:text-blue-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="text-center">
          <Share2 className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {t('linkedin.title')}
          </h3>
          <p className="text-blue-700 mb-4">
            {t('linkedin.subtitle')}
          </p>
          
          <div className="bg-white rounded-lg p-4 mb-6 text-left text-sm text-slate-600 border border-blue-100">
            <p className="italic">
              &ldquo;🎯 {t('linkedin.text1')}<br/>
              📊 {t('linkedin.text2', { mentions: totalMentions })}...&rdquo;
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleLinkedInShare(true)}
              className="flex-1 px-6 py-3 bg-[#0A66C2] text-white font-bold rounded-lg hover:bg-[#004182] transition cursor-pointer"
            >
              {t('linkedin.shareButton')}
            </button>
            <button
              onClick={() => handleLinkedInShare(false)}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
            >
              {t('linkedin.skip')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'comment') {
    return (
      <div className="relative bg-orange-50 border border-orange-200 rounded-xl p-6 mt-6 animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={() => setStep('initial')}
          className="absolute top-4 right-4 text-orange-400 hover:text-orange-600"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-slate-900 mb-2">
          {t('negative.title')}
        </h3>
        <p className="text-orange-700 mb-4 text-sm">
          {t('negative.subtitle')}
        </p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t('negative.placeholder')}
          className="w-full h-32 bg-white border border-orange-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('negative.emailPlaceholder')}
          className="w-full bg-white border border-orange-200 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 mb-4"
        />

        <button
          onClick={handleSubmitFeedback}
          disabled={submitting || !comment}
          className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-lg hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50 cursor-pointer"
        >
          {submitting ? t('negative.submitting') : t('negative.submit')}
        </button>
      </div>
    );
  }

  // Initial state
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-600 text-sm sm:text-base">
          {t('question')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => handleRating('positive')}
            className="px-4 py-2 bg-green-100 hover:bg-green-200 border border-green-300 rounded-lg transition flex items-center gap-2 text-green-700 font-semibold cursor-pointer"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="hidden sm:inline">{t('helpful')}</span>
          </button>
          <button
            onClick={() => handleRating('negative')}
            className="px-4 py-2 bg-orange-100 hover:bg-orange-200 border border-orange-300 rounded-lg transition flex items-center gap-2 text-orange-700 font-semibold cursor-pointer"
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="hidden sm:inline">{t('canImprove')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
