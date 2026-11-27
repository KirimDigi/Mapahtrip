import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { type StoryHighlight, resolveStoryAssetUrl } from '../data/storyHighlights';

interface StoryHighlightsBarProps {
  highlights: StoryHighlight[];
  onSelectHighlight: (id: string) => void;
}

export const StoryHighlightsBar: React.FC<StoryHighlightsBarProps> = ({
  highlights,
  onSelectHighlight,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [highlights]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <section
      id="sorotan-testimoni"
      style={{
        width: '100%',
        padding: '36px 16px 40px',
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        borderBottom: '1px solid #E2E8F0',
      }}
    >
      <style>{`
        .story-bubble-btn {
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2px 4px;
          transition: transform 0.2s ease;
          flex-shrink: 0;
          width: 78px;
        }
        @media (min-width: 640px) {
          .story-bubble-btn {
            width: 88px;
          }
        }
        .story-bubble-btn:hover {
          transform: translateY(-3px);
        }
        .story-ring-circle {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
          padding: 2.8px;
          box-shadow: 0 4px 12px rgba(220, 39, 67, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 640px) {
          .story-ring-circle {
            width: 82px;
            height: 82px;
            padding: 3px;
          }
        }
        .story-scroll-container {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          overflow-x: auto;
          padding: 8px 12px 14px;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE & Edge */
        }
        @media (min-width: 640px) {
          .story-scroll-container {
            gap: 20px;
            padding: 8px 18px 16px;
          }
        }
        .story-scroll-container::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
          width: 0;
          height: 0;
        }
        .story-nav-arrow {
          position: absolute;
          top: 24px;
          z-index: 10;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(6px);
          border: 1.5px solid #CBD5E1;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        @media (min-width: 640px) {
          .story-nav-arrow {
            top: 28px;
            width: 38px;
            height: 38px;
          }
        }
        .story-nav-arrow:hover {
          background: #FFFFFF;
          transform: scale(1.1);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
        }
        .story-nav-arrow-left {
          left: -4px;
        }
        .story-nav-arrow-right {
          right: -4px;
        }
        @media (min-width: 768px) {
          .story-nav-arrow-left {
            left: -12px;
          }
          .story-nav-arrow-right {
            right: -12px;
          }
        }
      `}</style>

      <div style={{ maxWidth: '1080px', margin: '0 auto', textAlign: 'center' }}>
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '9999px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            color: '#1D4ED8',
            fontSize: '0.725rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '10px',
          }}
        >
          <Sparkles size={13} color="#2563EB" />
          <span>Real Bukti &amp; Approval Visa</span>
        </div>

        {/* Title */}
        <h2
          className="font-serif"
          style={{
            fontSize: '1.85rem',
            fontWeight: 800,
            color: '#0F172A',
            margin: '0 0 8px 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            textAlign: 'center',
          }}
        >
          Bukti Nyata Approval Visa
          <span
            style={{
              display: 'block',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#0047BA',
              marginTop: '4px',
            }}
          >
            @mapahtrip.id
          </span>
        </h2>

        {/* Subtitle (Rata Kanan & Kiri / Justify) */}
        <p
          style={{
            color: '#64748B',
            fontSize: '0.875rem',
            maxWidth: '520px',
            margin: '0 auto 24px auto',
            lineHeight: 1.6,
            textAlign: 'justify',
            padding: '0 16px',
          }}
        >
          Klik lingkaran untuk menonton video &amp; foto bukti approval paspor pemohon yang telah selesai kami urus. Geser untuk melihat kategori lainnya.
        </p>

        {/* Highlights Carousel with navigation buttons */}
        <div style={{ position: 'relative', width: '100%' }}>
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              onClick={() => handleScroll('left')}
              className="story-nav-arrow story-nav-arrow-left"
              aria-label="Geser ke kiri"
              title="Lihat kategori sebelumnya"
            >
              <ChevronLeft size={18} color="#0F172A" />
            </button>
          )}

          {/* Right Arrow Button */}
          {canScrollRight && (
            <button
              onClick={() => handleScroll('right')}
              className="story-nav-arrow story-nav-arrow-right"
              aria-label="Geser ke kanan"
              title="Lihat kategori berikutnya"
            >
              <ChevronRight size={18} color="#005BB5" />
            </button>
          )}

          {/* Highlights Row */}
          <div
            ref={scrollContainerRef}
            className="story-scroll-container"
            onScroll={checkScroll}
          >
            {highlights.map((highlight) => (
              <button
                key={highlight.id}
                onClick={() => onSelectHighlight(highlight.id)}
                className="story-bubble-btn"
                aria-label={`Buka story highlight ${highlight.title}`}
              >
                {/* Instagram Gradient Ring */}
                <div className="story-ring-circle">
                  {/* White Inner Gap */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      padding: '2.5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Photo Container */}
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        position: 'relative',
                        backgroundColor: '#F1F5F9',
                      }}
                    >
                      <img
                        src={resolveStoryAssetUrl(highlight.coverImage)}
                        alt={highlight.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                        loading="lazy"
                        onError={(e) => {
                          const fallbackItem = highlight.items.find((item) => item.type === 'image');
                          if (fallbackItem) {
                            const fallbackUrl = resolveStoryAssetUrl(fallbackItem.url);
                            if (e.currentTarget.src !== fallbackUrl) {
                              e.currentTarget.src = fallbackUrl;
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Title Underneath (Clean, fixed-height, centered, consistent 2-line baseline) */}
                <span
                  style={{
                    marginTop: '8px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#0F172A',
                    letterSpacing: '-0.01em',
                    textAlign: 'center',
                    width: '100%',
                    lineHeight: 1.25,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    wordBreak: 'break-word',
                    minHeight: '2.5em',
                  }}
                >
                  {highlight.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
