'use client';

import { Clock } from 'lucide-react';

export default function ReadingTime({ content }) {
  // Calculate reading time based on word count
  // Average reading speed: 200-250 words per minute (we use 225)
  const calculateReadingTime = (text) => {
    if (!text) return 0;
    
    // Remove HTML tags and count words
    const plainText = text.replace(/<[^>]*>/g, '');
    const wordCount = plainText.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 225);
    
    return readingTime;
  };

  const minutes = calculateReadingTime(content);

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4" />
      <span className="text-sm font-medium">
        {minutes} {minutes === 1 ? 'minuut' : 'minuten'} leestijd
      </span>
    </div>
  );
}