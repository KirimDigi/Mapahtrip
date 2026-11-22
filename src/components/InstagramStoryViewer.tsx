import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck
} from 'lucide-react';
import type { StoryHighlight } from '../data/storyHighlights';
import { resolveStoryAssetUrl } from '../data/storyHighlights';

interface InstagramStoryViewerProps {
  highlights: StoryHighlight[];
  activeHighlightId: string | null;
  onClose: () => void;
  onSelectHighlight?: (id: string) => void;
}

export const InstagramStoryViewer: React.FC<InstagramStoryViewerProps> = ({
  highlights,
  activeHighlightId,
  onClose,
  onSelectHighlight,
}) => {
  const currentHighlightIndex = highlights.findIndex((h) => h.id === activeHighlightId);
  const currentHighlight = currentHighlightIndex !== -1 ? highlights[currentHighlightIndex] : null;

  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false); // Suara otomatis ON saat story dibuka
  const [isPaused, setIsPaused] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSoundToast, setShowSoundToast] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const isHoldingRef = useRef<boolean>(false);

  // Stop & pause video helper (guarantees no background audio leak)
  const stopCurrentVideo = useCallback(() => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        videoRef.current.muted = true;
        videoRef.current.currentTime = 0;
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      } catch (e) {
        console.warn('Video stop error:', e);
      }
    }
  }, []);

  // Safe Close Handler
  const handleClose = useCallback(() => {
    stopCurrentVideo();
    setIsPaused(true);
    setIsMuted(true);
    onClose();
  }, [stopCurrentVideo, onClose]);

  // Cleanup on Component Unmount (ensures sound stops 100% when modal closes)
  useEffect(() => {
    return () => {
      stopCurrentVideo();
    };
  }, [stopCurrentVideo]);

  // Tab visibility change: pause when user changes browser tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current) {
        videoRef.current.pause();
        setIsPaused(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Reset to first slide whenever activeHighlightId changes & ensure sound is ON
  useEffect(() => {
    setCurrentMediaIndex(0);
    setImageProgress(0);
    setIsLoading(true);
    setIsPaused(false);
    setIsMuted(false);
    setShowSoundToast(true);
    const toastTimer = setTimeout(() => setShowSoundToast(false), 2200);
    return () => clearTimeout(toastTimer);
  }, [activeHighlightId]);

  const currentItem = currentHighlight ? currentHighlight.items[currentMediaIndex] : null;

  // Cleanup old video before switching slide
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        try {
          videoRef.current.pause();
        } catch {}
      }
    };
  }, [currentItem]);

  // Handle Next Slide
  const handleNext = useCallback(() => {
    if (!currentHighlight) return;
    setImageProgress(0);
    setIsLoading(true);

    if (currentMediaIndex < currentHighlight.items.length - 1) {
      setCurrentMediaIndex((prev) => prev + 1);
    } else {
      if (currentHighlightIndex < highlights.length - 1) {
        const nextH = highlights[currentHighlightIndex + 1];
        if (onSelectHighlight) onSelectHighlight(nextH.id);
      } else {
        handleClose();
      }
    }
  }, [currentHighlight, currentMediaIndex, currentHighlightIndex, highlights, onSelectHighlight, handleClose]);

  // Handle Previous Slide
  const handlePrev = useCallback(() => {
    if (!currentHighlight) return;
    setImageProgress(0);
    setIsLoading(true);

    if (currentMediaIndex > 0) {
      setCurrentMediaIndex((prev) => prev - 1);
    } else {
      if (currentHighlightIndex > 0) {
        const prevH = highlights[currentHighlightIndex - 1];
        if (onSelectHighlight) {
          onSelectHighlight(prevH.id);
          setCurrentMediaIndex(Math.max(0, prevH.items.length - 1));
        }
      }
    }
  }, [currentHighlight, currentMediaIndex, currentHighlightIndex, highlights, onSelectHighlight]);

  // Video Autoplay & Unmute Execution
  useEffect(() => {
    if (!currentItem || currentItem.type !== 'video') return;

    let isSubscribed = true;

    const tryPlayVideo = async () => {
      if (!videoRef.current || !isSubscribed) return;
      try {
        videoRef.current.muted = isMuted;
        if (!isPaused && isSubscribed) {
          await videoRef.current.play();
          if (isSubscribed) setIsLoading(false);
        }
      } catch (err) {
        console.warn('Autoplay unmuted blocked, falling back to muted autoplay:', err);
        if (videoRef.current && isSubscribed) {
          videoRef.current.muted = true;
          setIsMuted(true);
          try {
            await videoRef.current.play();
            if (isSubscribed) setIsLoading(false);
          } catch (e) {
            console.error('Autoplay fallback error:', e);
          }
        }
      }
    };

    tryPlayVideo();

    return () => {
      isSubscribed = false;
    };
  }, [currentItem, currentMediaIndex, isMuted, isPaused]);

  // Timer for Image items (5 seconds duration)
  useEffect(() => {
    if (!currentItem || currentItem.type !== 'image' || isPaused || !currentHighlight) {
      return;
    }

    const duration = 5000;
    const interval = 50;
    const step = (interval / duration) * 100;

    const timer = setInterval(() => {
      setImageProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [currentItem, isPaused, currentHighlight, handleNext]);

  // Video Time Update
  const handleVideoTimeUpdate = () => {
    if (videoRef.current && currentItem?.type === 'video') {
      const dur = videoRef.current.duration;
      const curr = videoRef.current.currentTime;
      if (dur > 0) {
        setImageProgress((curr / dur) * 100);
      }
    }
  };

  // Keyboard controls
  useEffect(() => {
    if (!currentHighlight) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPaused((p) => {
          const next = !p;
          if (videoRef.current) {
            if (next) videoRef.current.pause();
            else videoRef.current.play().catch(() => {});
          }
          return next;
        });
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((m) => {
          const next = !m;
          if (videoRef.current) videoRef.current.muted = next;
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentHighlight, handleNext, handlePrev, handleClose]);

  // Touch hold handlers
  const handleTouchStart = () => {
    touchStartTimeRef.current = Date.now();
    isHoldingRef.current = false;
    setTimeout(() => {
      if (touchStartTimeRef.current > 0) {
        isHoldingRef.current = true;
        setIsPaused(true);
        if (videoRef.current) videoRef.current.pause();
      }
    }, 180);
  };

  const handleTouchEnd = (_e: React.MouseEvent | React.TouchEvent, isRightSide: boolean) => {
    const elapsed = Date.now() - touchStartTimeRef.current;
    touchStartTimeRef.current = 0;

    if (isHoldingRef.current || elapsed > 300) {
      isHoldingRef.current = false;
      setIsPaused(false);
      if (videoRef.current) videoRef.current.play().catch(() => {});
    } else {
      if (isRightSide) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  if (!currentHighlight || !currentItem) return null;

  const totalItems = currentHighlight.items.length;
  const progressPercent = Math.min(100, Math.max(0, imageProgress));

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(0, 0, 0, 0.94)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .story-desktop-control {
            display: none !important;
          }
          .story-phone-frame {
            border-radius: 0px !important;
            max-height: 100vh !important;
            height: 100vh !important;
            max-width: 100vw !important;
            width: 100vw !important;
          }
        }
      `}</style>

      {/* Top Right Desktop Close Button */}
      <button
        onClick={handleClose}
        aria-label="Tutup Story"
        className="story-desktop-control"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#FFFFFF',
          borderRadius: '50%',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
          e.currentTarget.style.transform = 'scale(1.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <X size={22} color="#FFFFFF" />
      </button>

      {/* Desktop Prev Arrow */}
      {(currentHighlightIndex > 0 || currentMediaIndex > 0) && (
        <button
          onClick={handlePrev}
          aria-label="Sebelumnya"
          className="story-desktop-control"
          style={{
            position: 'absolute',
            left: '24px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#FFFFFF',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 30,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          }}
        >
          <ChevronLeft size={28} color="#FFFFFF" />
        </button>
      )}

      {/* Desktop Next Arrow */}
      <button
        onClick={handleNext}
        aria-label="Selanjutnya"
        className="story-desktop-control"
        style={{
          position: 'absolute',
          right: '24px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'rgba(255, 255, 255, 0.12)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#FFFFFF',
          borderRadius: '50%',
          width: '48px',
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 30,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
        }}
      >
        <ChevronRight size={28} color="#FFFFFF" />
      </button>

      {/* Main Story Container (9:16 mobile frame) */}
      <div 
        className="story-phone-frame"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '430px',
          height: '100vh',
          maxHeight: '840px',
          backgroundColor: '#000000',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
        }}
      >
        {/* TOP OVERLAY: Progress bars & Header */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 30,
            padding: '12px 14px 28px',
            background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)',
            pointerEvents: 'none',
          }}
        >
          {/* Progress Bars */}
          <div style={{ display: 'flex', gap: '3px', width: '100%', marginBottom: '10px' }}>
            {currentHighlight.items.map((item, idx) => {
              let fill = 0;
              if (idx < currentMediaIndex) fill = 100;
              else if (idx === currentMediaIndex) fill = progressPercent;

              return (
                <div 
                  key={item.id} 
                  style={{
                    height: '2.5px',
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.28)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                  }}
                >
                  <div 
                    style={{
                      height: '100%',
                      backgroundColor: '#FFFFFF',
                      width: `${fill}%`,
                      transition: 'width 0.08s linear',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Header Info */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pointerEvents: 'auto',
            }}
          >
            {/* Account & Highlight Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  padding: '2px',
                  background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img 
                  src={resolveStoryAssetUrl(currentHighlight.coverImage)} 
                  alt={currentHighlight.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    backgroundColor: '#000000',
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                    {currentHighlight.title}
                  </span>
                  <span 
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                    }}
                  >
                    <ShieldCheck size={11} color="#FFFFFF" />
                    Official
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', marginTop: '1px' }}>
                  <span>@mapahtrip.id</span>
                  <span style={{ margin: '0 4px' }}>•</span>
                  <span>{currentMediaIndex + 1} dari {totalItems}</span>
                </div>
              </div>
            </div>

            {/* Top Action Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Mute / Unmute Toggle */}
              {currentItem.type === 'video' && (
                <button
                  onClick={() => {
                    const next = !isMuted;
                    setIsMuted(next);
                    if (videoRef.current) {
                      videoRef.current.muted = next;
                    }
                  }}
                  style={{
                    background: isMuted ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                    border: isMuted ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
                    padding: '6px',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}
                  aria-label={isMuted ? 'Nyalakan Suara (Muted)' : 'Bisukan Suara (Sound ON)'}
                  title={isMuted ? 'Suara Mati (Klik untuk Nyalakan)' : 'Suara Nyala (Klik untuk Matikan)'}
                >
                  {isMuted ? (
                    <VolumeX size={18} color="#EF4444" />
                  ) : (
                    <Volume2 size={18} color="#10B981" />
                  )}
                </button>
              )}

              {/* Pause / Play Toggle */}
              <button
                onClick={() => {
                  setIsPaused((p) => {
                    const next = !p;
                    if (videoRef.current) {
                      if (next) videoRef.current.pause();
                      else videoRef.current.play().catch(() => {});
                    }
                    return next;
                  });
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '6px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label={isPaused ? 'Lanjutkan' : 'Jeda'}
              >
                {isPaused ? <Play size={18} color="#FFFFFF" /> : <Pause size={18} color="#FFFFFF" />}
              </button>

              {/* Close Button */}
              <button
                onClick={handleClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '6px',
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: '2px',
                }}
                aria-label="Tutup"
              >
                <X size={18} color="#FFFFFF" />
              </button>
            </div>
          </div>
        </div>

        {/* Floating Sound Status Toast */}
        {showSoundToast && currentItem.type === 'video' && (
          <div
            style={{
              position: 'absolute',
              top: '84px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 35,
              backgroundColor: isMuted ? 'rgba(15, 23, 42, 0.88)' : 'rgba(5, 150, 105, 0.92)',
              color: '#FFFFFF',
              padding: '5px 12px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              pointerEvents: 'none',
            }}
          >
            {isMuted ? (
              <>
                <VolumeX size={13} color="#EF4444" />
                <span>Audio dibisukan (Klik ikon speaker di atas)</span>
              </>
            ) : (
              <>
                <Volume2 size={13} color="#FFFFFF" />
                <span>🔊 Audio Otomatis Nyala (ON)</span>
              </>
            )}
          </div>
        )}

        {/* MEDIA DISPLAY AREA */}
        <div 
          style={{
            position: 'relative',
            flex: 1,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            overflow: 'hidden',
          }}
        >
          {/* Loading Indicator */}
          {isLoading && (
            <div 
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.5)',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '12px',
                gap: '8px',
              }}
            >
              <div 
                style={{
                  width: '28px',
                  height: '28px',
                  border: '2.5px solid rgba(255,255,255,0.2)',
                  borderTopColor: '#FFFFFF',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }} 
              />
              <span>Memuat bukti...</span>
            </div>
          )}

          {/* Video or Image */}
          {currentItem.type === 'video' ? (
            <video
              ref={videoRef}
              key={currentItem.url}
              src={resolveStoryAssetUrl(currentItem.url)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
              playsInline
              autoPlay
              muted={isMuted}
              preload="auto"
              onLoadedData={() => {
                setIsLoading(false);
                if (!isPaused && videoRef.current) {
                  videoRef.current.muted = isMuted;
                  videoRef.current.play().catch(() => {});
                }
              }}
              onCanPlay={() => setIsLoading(false)}
              onPlaying={() => setIsLoading(false)}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleNext}
            />
          ) : (
            <img
              key={currentItem.url}
              src={resolveStoryAssetUrl(currentItem.url)}
              alt={`${currentHighlight.title} slide ${currentMediaIndex + 1}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
              onLoad={() => setIsLoading(false)}
            />
          )}

          {/* TAP NAVIGATION ZONES (Left 35% prev, Right 65% next, Hold to pause) */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex' }}>
            <div
              style={{ width: '35%', height: '100%', cursor: 'pointer' }}
              onMouseDown={handleTouchStart}
              onMouseUp={(e) => handleTouchEnd(e, false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, false)}
              aria-label="Slide sebelumnya"
            />
            <div
              style={{ width: '65%', height: '100%', cursor: 'pointer' }}
              onMouseDown={handleTouchStart}
              onMouseUp={(e) => handleTouchEnd(e, true)}
              onTouchStart={handleTouchStart}
              onTouchEnd={(e) => handleTouchEnd(e, true)}
              aria-label="Slide selanjutnya"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
