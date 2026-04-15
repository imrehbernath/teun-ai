'use client';

import { Facebook, Mail, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

// X (formerly Twitter) icon - lucide-react doesn't have it
function XIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export default function SocialShareButtons({ title, url }) {
  const t = useTranslations('blogPost');
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(t('shareEmailBody'))}%20${encodedUrl}`
  };

  const handleShare = (platform, link) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'share', {
        method: platform,
        content_type: 'article',
        item_id: url
      });
    }

    if (platform !== 'email') {
      window.open(link, '_blank', 'width=600,height=400');
    } else {
      window.location.href = link;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-gray-700">{t('share')}:</span>
      
      <button
        onClick={() => handleShare('facebook', shareLinks.facebook)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-blue-600 transition-all duration-200"
        aria-label={t('shareFacebook')}
      >
        <Facebook className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </button>

      <button
        onClick={() => handleShare('x', shareLinks.x)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-black transition-all duration-200"
        aria-label="Deel op X"
      >
        <XIcon className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
      </button>

      <button
        onClick={() => handleShare('whatsapp', shareLinks.whatsapp)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-green-500 transition-all duration-200"
        aria-label={t('shareWhatsApp')}
      >
        <MessageCircle className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </button>

      <button
        onClick={() => handleShare('email', shareLinks.email)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-700 transition-all duration-200"
        aria-label={t('shareEmail')}
      >
        <Mail className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </button>
    </div>
  );
}
