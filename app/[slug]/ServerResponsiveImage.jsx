import Image from 'next/image';

export default function ServerResponsiveImage({ 
  desktopImage, 
  mobileImage, 
  alt,
  priority = false,
  className = '',
  sizes = "(max-width: 768px) 100vw, 50vw"
}) {
  // Fallback: geen images beschikbaar
  if (!mobileImage?.sourceUrl && !desktopImage?.sourceUrl) {
    return (
      <div className="w-full h-full min-h-[400px] bg-gradient-to-br from-indigo-900 via-blue-900 to-indigo-800 flex items-center justify-center">
        <svg className="w-32 h-32 text-white/50" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
        </svg>
      </div>
    );
  }

  const hasMobileImage = Boolean(mobileImage?.sourceUrl);
  const hasDesktopImage = Boolean(desktopImage?.sourceUrl);

  return (
    <>
      {/* Mobile Image - Portrait 800x1200 */}
      {hasMobileImage && (
        <div className="block lg:hidden relative w-full" style={{ aspectRatio: '2/3' }}>
          <Image
            src={mobileImage.sourceUrl}
            alt={mobileImage.altText || alt || 'Mobile featured image'}
            fill
            priority={priority}
            quality={90}
            className="object-cover"
            sizes="100vw"
          />
        </div>
      )}
      
      {/* Desktop Image - Landscape 1200x675 */}
      {hasDesktopImage && (
        <div className={`${hasMobileImage ? 'hidden lg:block' : 'block'} relative w-full min-h-[400px]`}>
          <Image
            src={desktopImage.sourceUrl}
            alt={desktopImage.altText || alt || 'Desktop featured image'}
            fill
            priority={priority}
            quality={90}
            className="object-cover"
            sizes={sizes}
          />
        </div>
      )}
    </>
  );
}