import Image from 'next/image'

export default function ServerResponsiveImage({
  desktopImage,
  mobileImage,
  alt,
  priority = false,
  className = '',
  sizes = "(max-width: 768px) 100vw, 50vw"
}) {
  if (!mobileImage?.sourceUrl && !desktopImage?.sourceUrl) {
    return (
      <div className="bp-img-fallback">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
          <circle cx="9" cy="9" r="2"/>
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
        </svg>
      </div>
    )
  }

  const hasMobileImage = Boolean(mobileImage?.sourceUrl)
  const hasDesktopImage = Boolean(desktopImage?.sourceUrl)

  return (
    <>
      {hasMobileImage && (
        <div className="bp-img-mobile" style={{ position: 'relative' }}>
          <Image
            src={mobileImage.sourceUrl}
            alt={mobileImage.altText || alt || 'Mobile featured image'}
            fill
            priority={priority}
            quality={90}
            className="bp-img"
            sizes="100vw"
          />
        </div>
      )}

      {hasDesktopImage && (
        <div className={`bp-img-desktop ${hasMobileImage ? 'has-mobile' : ''}`} style={{ position: 'relative' }}>
          <Image
            src={desktopImage.sourceUrl}
            alt={desktopImage.altText || alt || 'Desktop featured image'}
            fill
            priority={priority}
            quality={90}
            className="bp-img"
            sizes={sizes}
          />
        </div>
      )}
    </>
  )
}
