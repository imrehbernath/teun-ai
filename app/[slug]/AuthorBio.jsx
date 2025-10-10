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
            <h4 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
              Imre Bernáth
            </h4>
          </Link>
          <p className="text-sm text-purple-600 font-semibold mb-4">
            Eigenaar van OnlineLabs & oprichter van Teun.ai
          </p>
          
          <div className="prose prose-sm text-gray-600 leading-relaxed space-y-3">
            <p>
              Imre Bernáth is een ervaren SEO- en AI-visibility specialist uit Nederland met meer dan 15 jaar bewezen expertise in online marketing, technische SEO en contentstrategie. Hij helpt bedrijven groeien via strategisch advies, duurzame optimalisatie en AI-zichtbaarheid in systemen zoals ChatGPT, Google AI, Gemini en Perplexity.
            </p>
            <p>
              Als oprichter van <a href="https://www.onlinelabs.nl" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:text-purple-700 font-medium">OnlineLabs</a> en initiatiefnemer van <Link href="/" className="text-purple-600 hover:text-purple-700 font-medium">Teun.ai</Link> – het eerste Nederlandse platform voor GEO-audits (Generative Engine Optimisation) – ontwikkelt hij strategieën waarmee merken zichtbaar worden in zowel zoekmachines als AI-gegenereerde antwoorden.
            </p>
          </div>

          {/* Expertise Grid */}
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {/* Specialisaties */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-purple-600">🎯</span> Specialisaties
              </h5>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>GEO-optimalisatie (Generative Engine Optimization)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Technische SEO & site audits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>AI visibility in ChatGPT, Gemini & Perplexity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Contentstrategie & E-E-A-T</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Structured data & Schema.org</span>
                </li>
              </ul>
            </div>

            {/* Projecten */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-purple-600">🚀</span> Projecten
              </h5>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span><strong>Teun.ai</strong> - Platform voor GEO-audits</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span><strong>OnlineLabs</strong> - SEO & AI-visibility bureau</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>150+ organisaties geholpen met digitale autoriteit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Diepgaande kennis van WordPress, structured data en AI-overviews</span>
                </li>
              </ul>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6">
            <Link 
              href="/auteur/imre"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold text-sm group"
            >
              Meer over Imre lezen
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}