'use client';

import { Facebook, Twitter, Mail, MessageCircle } from 'lucide-react';

export default function SocialShareButtons({ title, url }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=Ik vond dit interessant: ${encodedUrl}`
  };

  const handleShare = (platform, link) => {
    // Track share event (optional)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'share', {
        method: platform,
        content_type: 'article',
        item_id: url
      });
    }

    // Open share window
    if (platform !== 'email') {
      window.open(link, '_blank', 'width=600,height=400');
    } else {
      window.location.href = link;
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-semibold text-gray-700">Delen:</span>
      
      {/* Facebook */}
      <button
        onClick={() => handleShare('facebook', shareLinks.facebook)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-blue-600 transition-all duration-200"
        aria-label="Deel op Facebook"
      >
        <Facebook className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </button>

      {/* Twitter/X */}
      <button
        onClick={() => handleShare('twitter', shareLinks.twitter)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-black transition-all duration-200"
        aria-label="Deel op X (Twitter)"
      >
        <Twitter className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </button>

      {/* WhatsApp */}
      <button
        onClick={() => handleShare('whatsapp', shareLinks.whatsapp)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-green-500 transition-all duration-200"
        aria-label="Deel via WhatsApp"
      >
        <MessageCircle className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </button>

      {/* Email */}
      <button
        onClick={() => handleShare('email', shareLinks.email)}
        className="group flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-700 transition-all duration-200"
        aria-label="Deel via e-mail"
      >
        <Mail className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </button>
    </div>
  );
}