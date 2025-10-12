'use client';

import { useState, useEffect } from 'react';
import { Search, TrendingUp, Zap, BarChart3, CheckCircle2, AlertCircle, Loader2, Eye, Award, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AIVisibilityTool() {
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    companyName: '',
    companyCategory: '',
    queries: ''
  });

  // Check if user is logged in
  useEffect(() => {
    const supabase = createClient();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const downloadPDF = () => {
    if (!results) {
      alert('Geen resultaten om te downloaden');
      return;
    }

    try {
      console.log('📄 Starting PDF generation...');
      
      // Check if jsPDF is loaded
      if (typeof jsPDF === 'undefined') {
        console.error('❌ jsPDF is not loaded!');
        alert('PDF library niet geladen. Ververs de pagina en probeer opnieuw.');
        return;
      }

      const doc = new jsPDF();
      console.log('✅ jsPDF instance created');

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header
      doc.setFillColor(124, 58, 237);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Zichtbaarheidsanalyse', 20, 25);
      console.log('✅ Header added');

      // Company info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Bedrijf: ' + formData.companyName, 20, 55);
      doc.text('Categorie: ' + formData.companyCategory, 20, 62);
      doc.text('Datum: ' + new Date().toLocaleDateString('nl-NL'), 20, 69);
      console.log('✅ Company info added');

      // Stats boxes
      const stats = [
        { label: 'Vermeldingen', value: results.total_company_mentions },
        { label: 'Analyses', value: results.analysis_results.length },
        { label: 'Concurrenten', value: [...new Set(results.analysis_results.flatMap(r => r.competitors_mentioned || []))].length }
      ];

      let xPos = 20;
      stats.forEach((stat) => {
        doc.setFillColor(237, 233, 254);
        doc.roundedRect(xPos, 80, 50, 30, 3, 3, 'F');
        
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(124, 58, 237);
        doc.text(String(stat.value), xPos + 25, 95, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(stat.label.toUpperCase(), xPos + 25, 105, { align: 'center' });
        
        xPos += 60;
      });
      console.log('✅ Stats boxes added');

      // Table with results
      const tableData = results.analysis_results.map((result, idx) => [
        idx + 1,
        result.company_mentioned ? '✓' : '✗',
        result.ai_prompt.substring(0, 60) + '...',
        result.competitors_mentioned ? result.competitors_mentioned.slice(0, 3).join(', ') : '-'
      ]);

      // Check if autoTable exists
      if (typeof doc.autoTable !== 'function') {
        console.error('❌ autoTable is not available!');
        // Try to manually attach it
        if (typeof autoTable === 'function') {
          console.log('🔧 Manually attaching autoTable...');
          doc.autoTable = autoTable;
        } else {
          alert('PDF table functie niet beschikbaar. Ververs de pagina en probeer opnieuw.');
          return;
        }
      }

      doc.autoTable({
        startY: 120,
        head: [['#', 'Vermeld', 'AI Prompt', 'Concurrenten']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [124, 58, 237],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 90 },
          3: { cellWidth: 60 }
        }
      });
      console.log('✅ Table added');

      // Footer
      const finalY = doc.lastAutoTable.finalY || 120;
      if (finalY < pageHeight - 30) {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Gegenereerd door TEUN.AI - AI Zichtbaarheidsanalyse Tool', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
      console.log('✅ Footer added');

      // Save PDF
      const fileName = 'AI-Zichtbaarheid-' + formData.companyName.replace(/\s+/g, '-') + '-' + new Date().toISOString().split('T')[0] + '.pdf';
      console.log('💾 Saving PDF as:', fileName);
      
      doc.save(fileName);
      console.log('✅ PDF download triggered!');
      
    } catch (error) {
      console.error('❌ PDF Generation Error:', error);
      alert('Er ging iets mis bij het genereren van de PDF: ' + error.message);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setProgress(0);
    setError(null);
    setCurrentStep('Voorbereiden...');

    try {
      const queriesArray = formData.queries
        .split(/[,\n]/)
        .map(q => q.trim())
        .filter(q => q.length > 0);

      // Step 1: Preparing
      setProgress(5);
      setCurrentStep('AI-prompts genereren...');

      // Start progress simulation - slower and more realistic
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) return prev; // Stop at 85%, wait for actual completion
          if (prev < 30) return prev + 3; // Fast start (5% -> 30%)
          if (prev < 60) return prev + 2; // Medium speed (30% -> 60%)
          return prev + 1; // Slow down as we approach completion (60% -> 85%)
        });
      }, 800); // Slower interval: 800ms instead of 500ms

      // Update step messages based on progress
      const stepInterval = setInterval(() => {
        setProgress(current => {
          if (current >= 10 && current < 25) {
            setCurrentStep('AI-prompts genereren...');
          } else if (current >= 25 && current < 40) {
            setCurrentStep('Analyseren met AI-zoekmachine (1/5)...');
          } else if (current >= 40 && current < 55) {
            setCurrentStep('Analyseren met AI-zoekmachine (2/5)...');
          } else if (current >= 55 && current < 70) {
            setCurrentStep('Analyseren met AI-zoekmachine (3/5)...');
          } else if (current >= 70 && current < 85) {
            setCurrentStep('Analyseren met AI-zoekmachine (4/5)...');
          } else if (current >= 85 && current < 95) {
            setCurrentStep('Analyseren met AI-zoekmachine (5/5)...');
          }
          return current;
        });
      }, 500);

      const response = await fetch('/api/ai-visibility-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          companyCategory: formData.companyCategory,
          identifiedQueriesSummary: queriesArray.length > 0 ? queriesArray : [],
          userId: user?.id || null // Send user ID if logged in
        })
      });

      if (!response.ok) {
        clearInterval(progressInterval);
        clearInterval(stepInterval);
        const errorData = await response.json();
        throw new Error(errorData.error || 'Er is iets misgegaan');
      }

      const data = await response.json();
      
      // Clear intervals and complete
      clearInterval(progressInterval);
      clearInterval(stepInterval);
      
      // Final step
      setProgress(100);
      setCurrentStep('Voltooid!');
      setResults(data);

      setTimeout(() => {
        setAnalyzing(false);
        setStep(4);
      }, 500);

    } catch (err) {
      setError(err.message);
      setAnalyzing(false);
      setProgress(0);
      setCurrentStep('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#001233] via-[#1a0b3d] to-[#2d1654]" suppressHydrationWarning>
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-12 text-white">
        
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-white via-blue-200 to-purple-200 text-transparent bg-clip-text leading-tight px-4">
            AI Zichtbaarheidsanalyse
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-300 px-4">
            Ontdek hoe AI-modellen jouw bedrijf vermelden bij commerciële zoekvragen
          </p>
        </header>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          {[
            { num: 1, label: 'Zoekopdrachten' },
            { num: 2, label: 'Bedrijfsinfo' },
            { num: 3, label: 'Analyse' },
            { num: 4, label: 'Rapport' }
          ].map(({ num, label }) => (
            <div
              key={num}
              className={'px-4 py-2 rounded-lg text-sm font-semibold transition ' + (
                step === num
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                  : step > num
                  ? 'bg-purple-600/30 text-purple-200'
                  : 'bg-white/5 text-gray-400'
              )}
            >
              {num}. {label}
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="backdrop-blur-sm bg-red-500/20 border border-red-400/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">Er is een fout opgetreden</p>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Main Card */}
        <section className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mb-8">
          {/* Step 1: Zoekopdrachten */}
          {step === 1 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                  <Search className="w-5 h-5 text-blue-300" />
                </div>
                <h2 className="text-2xl font-bold">1. Geef belangrijkste zoekwoorden op</h2>
              </div>

              <div className="space-y-4">
                <div className="backdrop-blur-sm bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <p className="font-semibold mb-1">Tip: Eerste zoekwoord is het belangrijkst</p>
                      <p className="text-blue-300/80">Dit wordt gebruikt om relevante AI-prompts te genereren die matchen met waar jouw klanten naar zoeken.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30 rounded-lg text-blue-200 text-sm font-medium">
                    Handmatig invoeren
                  </button>
                  <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm hover:bg-white/10 transition">
                    Upload CSV
                  </button>
                </div>

                <textarea
                  value={formData.queries}
                  onChange={(e) => setFormData({...formData, queries: e.target.value})}
                  placeholder="Bijv. Linnen gordijnen, Linnen gordijnen op maat, Inbetween gordijnen&#10;&#10;Voer je belangrijkste zoekwoorden in, gescheiden door komma's of nieuwe regels"
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                  suppressHydrationWarning
                />

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStep(2)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg ml-auto"
                  >
                    Volgende →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Bedrijfsgegevens */}
          {step === 2 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center border border-purple-400/30">
                  <TrendingUp className="w-5 h-5 text-purple-300" />
                </div>
                <h2 className="text-2xl font-bold">2. Voer je bedrijfsgegevens in</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-2">
                    Bedrijfsnaam *
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                    placeholder="Bijv. Jouw Gordijnwinkel (zoals vermeld in Google Bedrijfsprofiel)"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 text-white placeholder-gray-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    suppressHydrationWarning
                  />
                </div>

                <div>
                  <label htmlFor="companyCategory" className="block text-sm font-medium text-gray-300 mb-2">
                    Bedrijfscategorie *
                  </label>
                  <input
                    id="companyCategory"
                    type="text"
                    value={formData.companyCategory}
                    onChange={(e) => setFormData({...formData, companyCategory: e.target.value})}
                    placeholder="Bijv. Gordijnwinkel, Raamdecoraties, Woninginrichting"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 text-white placeholder-gray-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-purple-400"
                    suppressHydrationWarning
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Deze info helpt met het genereren van relevante AI-prompts
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => setStep(1)}
                    className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
                  >
                    ← Terug
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!formData.companyName || !formData.companyCategory}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition disabled:opacity-50 shadow-lg"
                  >
                    Volgende →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Start Analyse */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex items-center justify-center border border-yellow-400/30">
                  <Zap className="w-5 h-5 text-yellow-300" />
                </div>
                <h2 className="text-2xl font-bold">3. Start de Analyse</h2>
              </div>

              {analyzing ? (
                <div className="space-y-6">
                  {/* Time estimate banner */}
                  <div className="backdrop-blur-md bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-300 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-blue-200 mb-1">Geschatte duur: 1-2 minuten</p>
                      <p className="text-blue-300/80">Je kunt ondertussen in een andere tab doorwerken. De resultaten verschijnen hier automatisch.</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-purple-600/30 via-purple-500/20 to-indigo-600/30 border border-purple-400/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Loader2 className="w-5 h-5 text-purple-300 animate-spin" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-purple-100">{currentStep}</span>
                          <span className="text-sm text-purple-200">{progress}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: progress + '%' }}
                      />
                    </div>
                  </div>

                  {/* Processing steps */}
                  <div className="space-y-2 text-sm mt-6">
                    <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress >= 20 ? 'text-green-300' : progress > 5 ? 'text-purple-300' : 'text-gray-500')}>
                      {progress >= 20 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                      <span>AI-prompts genereren op basis van jouw zoekwoorden...</span>
                    </div>
                    <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress >= 90 ? 'text-green-300' : progress > 20 ? 'text-purple-300' : 'text-gray-500')}>
                      {progress >= 90 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                      <span>Analyseren via geavanceerde AI-zoekmachine...</span>
                    </div>
                    <div className={'flex items-center gap-2 transition-colors duration-300 ' + (progress === 100 ? 'text-green-300' : progress > 90 ? 'text-purple-300' : 'text-gray-500')}>
                      {progress === 100 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 rounded-full border-2 border-current" />}
                      <span>Resultaten verwerken en rapport genereren...</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-2 text-sm border border-white/10">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bedrijfsnaam:</span>
                      <span className="text-white font-medium">{formData.companyName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Categorie:</span>
                      <span className="text-white font-medium">{formData.companyCategory}</span>
                    </div>
                    {formData.queries && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Belangrijkste zoekwoord:</span>
                        <span className="text-white font-medium">
                          {formData.queries.split(/[,\n]/)[0]?.trim() || 'Geen opgegeven'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Te analyseren:</span>
                      <span className="text-white font-medium">5 AI-prompts</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setStep(2)}
                      className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
                    >
                      ← Terug
                    </button>
                    <button
                      onClick={handleAnalyze}
                      className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg flex items-center gap-2"
                    >
                      <Zap className="w-5 h-5" />
                      Start Analyse
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && results && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center border border-green-400/30">
                  <BarChart3 className="w-5 h-5 text-green-300" />
                </div>
                <h2 className="text-2xl font-bold">4. AI Zichtbaarheidsrapport</h2>
              </div>

              <div className="backdrop-blur-md bg-gradient-to-br from-green-600/30 via-green-500/20 to-emerald-600/30 border border-green-400/30 rounded-2xl p-6 text-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">Analyse voltooid!</h3>
                <p className="text-green-100">Je AI-zichtbaarheidsrapport is klaar</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="backdrop-blur-sm border-2 border-purple-400/40 rounded-xl p-4 text-center bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <div className="text-3xl font-bold mb-1 bg-gradient-to-br from-purple-300 via-blue-300 to-purple-200 bg-clip-text text-transparent">
                    {results.total_company_mentions}
                  </div>
                  <div className="text-xs text-purple-200 uppercase tracking-wider font-semibold">
                    VERMELDINGEN
                  </div>
                </div>
                <div className="backdrop-blur-sm border-2 border-purple-400/40 rounded-xl p-4 text-center bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <div className="text-3xl font-bold mb-1 bg-gradient-to-br from-purple-300 via-blue-300 to-purple-200 bg-clip-text text-transparent">
                    {results.analysis_results.length}
                  </div>
                  <div className="text-xs text-purple-200 uppercase tracking-wider font-semibold">
                    ANALYSES
                  </div>
                </div>
                <div className="backdrop-blur-sm border-2 border-purple-400/40 rounded-xl p-4 text-center bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
                  <div className="text-3xl font-bold mb-1 bg-gradient-to-br from-purple-300 via-blue-300 to-purple-200 bg-clip-text text-transparent">
                    {[...new Set(results.analysis_results.flatMap(r => r.competitors_mentioned || []))].length}
                  </div>
                  <div className="text-xs text-purple-200 uppercase tracking-wider font-semibold">
                    CONCURRENTEN
                  </div>
                </div>
              </div>

              {/* Results list */}
              <div className="space-y-3 mb-6">
                {results.analysis_results.map((result, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex gap-3">
                      <div className={'w-8 h-8 rounded flex items-center justify-center flex-shrink-0 font-bold text-sm ' + (
                        result.company_mentioned
                          ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                          : 'bg-white/10 text-gray-400'
                      )}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-blue-300 mb-2 font-medium">{result.ai_prompt}</p>
                        <p className="text-sm text-gray-300">{result.simulated_ai_response_snippet}</p>
                        {result.competitors_mentioned?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs text-gray-400">Concurrenten:</span>
                            {result.competitors_mentioned.map((comp, i) => (
                              <span key={i} className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded border border-purple-400/30">
                                {comp}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {result.company_mentioned && <Award className="w-5 h-5 text-green-300 flex-shrink-0" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setStep(1);
                    setFormData({ companyName: '', companyCategory: '', queries: '' });
                    setResults(null);
                  }}
                  className="flex-1 px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition"
                >
                  Nieuwe analyse
                </button>
                <button 
                  onClick={downloadPDF}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-lg hover:from-purple-600 hover:to-indigo-700 transition shadow-lg flex items-center justify-center gap-2"
                >
                  <Eye className="w-5 h-5" />
                  Download PDF
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Bottom CTA - Only show when NOT analyzing */}
        {!analyzing && (
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              {user ? 'Ingelogd als ' + user.email : 'Meer analyses nodig?'}
            </p>
            {!user && (
              <Link 
                href="/signup"
                className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg font-semibold hover:bg-white/20 transition text-white inline-block"
              >
                Meld je aan voor meer scans
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}