'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';

import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AuthErrorPage() {
  const t = useTranslations('auth');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
          <div className="flex justify-center mb-4">
            <Image
              src="/Teun-ai_welkom.png"
              alt="Teun"
              width={100}
              height={125}
              className="drop-shadow-xl opacity-60"
            />
          </div>

          <div className="w-16 h-16 bg-red-50 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {t('error.title')}
          </h2>
          
          <p className="text-slate-600 mb-6">
            {t('error.description')}
          </p>

          <div className="flex gap-3">
            <Link
              href="/login"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-[#1E1E3F] to-[#2D2D5F] text-white font-semibold rounded-xl hover:shadow-lg transition text-center"
            >
              {t('error.backToLogin')}
            </Link>
            <Link
              href="/signup"
              className="flex-1 px-6 py-3 bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition text-center"
            >
              {t('error.register')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
