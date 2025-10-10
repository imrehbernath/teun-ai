'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Linkedin } from 'lucide-react';

export default function AuthorBio() {
  return (
    <section className="mt-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 lg:p-10 border border-gray-200">
      {/* Header met Social Links */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-2xl font-bold text-gray-900">Over de auteur</p>
        <div className="flex items-center gap-2">
          <a
            href="https://nl.linkedin.com/in/imrebernath"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-blue-600 transition-all duration-200 shadow-sm group"
            aria-label="LinkedIn profiel van Imre Bernáth"
          >
            <Linkedin className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
          </a>
        </div>
      </div>

      {/* Author Card */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Avatar */}
        <Link href="/auteur/imre" className="flex-shrink-0 group">
          <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-2xl overflow-hidden ring-4 ring-white shadow-lg group-hover:ring-purple-500 transition-all duration-300">
            <Image
              src="/Imre-Bernath-oprichter-Teun.ai.webp"
              alt="Imre Bernáth - Oprichter van Teun.ai"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 128px, 160px"
            />
          </div>
        </Link>

        {/* Bio Content */}
        <div className="flex-1">
          <Link href="/auteur/imre" className="group">
            <p className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
              Imre Bernáth
            </p>
          </Link>
          <p className="text-sm text-purple-600 font-semibold mb-4">
            Eigenaar van OnlineLabs & oprichter van Teun.ai
          </p>
          
          <div className="prose prose-sm text-gray-600 leading-relaxed mb-4">
            <p>
              Imre Bernáth is een ervaren SEO- en AI-visibility specialist uit Nederland met meer dan 15 jaar bewezen expertise in online marketing, technische SEO en contentstrategie. Hij helpt bedrijven groeien via strategisch advies, duurzame optimalisatie en AI-zichtbaarheid.
            </p>
          </div>

          {/* CTA */}
          <div>
            <Link 
              href="/auteur/imre"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold text-sm group"
            >
              Lees verder
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}