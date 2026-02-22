'use client';

import { Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function ReadingTime({ content }) {
  const t = useTranslations('blogPost');

  const calculateReadingTime = (text) => {
    if (!text) return 0;
    const plainText = text.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    return Math.ceil(wordCount / 225);
  };

  const minutes = calculateReadingTime(content);

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-medium">
        {t('readingTime', { minutes })}
      </span>
    </div>
  );
}
