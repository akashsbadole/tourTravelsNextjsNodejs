"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MobileSwipeCarousel = ({
  children,
  className,
  items = [],
  showArrows = true,
  showDots = true,
  autoplay = false,
  autoplayInterval = 3000,
  loop = true,
  slidesPerView = 1,
  spaceBetween = 16,
  onSlideChange,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const containerRef = useRef(null);
  const intervalRef = useRef(null);

  const totalSlides = items.length || React.Children.count(children);
  const maxIndex = Math.max(0, totalSlides - slidesPerView);

  const goToSlide = useCallback(
    (index) => {
      if (loop) {
        const normalizedIndex = ((index % totalSlides) + totalSlides) % totalSlides;
        setCurrentIndex(normalizedIndex);
      } else {
        const clampedIndex = Math.max(0, Math.min(index, maxIndex));
        setCurrentIndex(clampedIndex);
      }
      onSlideChange?.(currentIndex);
    },
    [currentIndex, loop, maxIndex, totalSlides, onSlideChange]
  );

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1);
  }, [currentIndex, goToSlide]);

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1);
  }, [currentIndex, goToSlide]);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 50; // Minimum swipe distance
    if (Math.abs(translateX) > threshold) {
      if (translateX > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    } else {
      // Snap back to current slide
      setTranslateX(0);
    }
    
    setIsDragging(false);
    setTranslateX(0);
    
    // Resume autoplay if enabled
    if (autoplay) {
      startAutoplay();
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.clientX);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const currentX = e.clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const threshold = 50;
    if (Math.abs(translateX) > threshold) {
      if (translateX > 0) {
        prevSlide();
      } else {
        nextSlide();
      }
    } else {
      setTranslateX(0);
    }
    
    setIsDragging(false);
    setTranslateX(0);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const startAutoplay = useCallback(() => {
    if (autoplay && !isDragging) {
      intervalRef.current = setInterval(() => {
        nextSlide();
      }, autoplayInterval);
    }
  }, [autoplay, autoplayInterval, isDragging, nextSlide]);

  const stopAutoplay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  useEffect(() => {
    if (autoplay) {
      startAutoplay();
    }
    
    return () => {
      stopAutoplay();
    };
  }, [autoplay, startAutoplay, stopAutoplay]);

  const slideWidth = `calc((100% - ${(slidesPerView - 1) * spaceBetween}px) / ${slidesPerView})`;
  
  const transformStyle = {
    transform: `translateX(calc(-${currentIndex * 100}% - ${currentIndex * spaceBetween}px + ${translateX}px))`,
    transition: isDragging ? "none" : "transform 0.3s ease-out",
  };

  const renderSlides = () => {
    if (items.length > 0) {
      return items.map((item, index) => (
        <div
          key={index}
          className="flex-shrink-0"
          style={{
            width: slideWidth,
            marginRight: index < items.length - 1 ? `${spaceBetween}px` : "0",
          }}
        >
          {item}
        </div>
      ));
    }
    
    return React.Children.map(children, (child, index) => (
      <div
        key={index}
        className="flex-shrink-0"
        style={{
          width: slideWidth,
          marginRight: index < React.Children.count(children) - 1 ? `${spaceBetween}px` : "0",
        }}
      >
        {child}
      </div>
    ));
  };

  return (
    <div className={cn("relative w-full", className)}>
      {/* Carousel Container */}
      <div
        ref={containerRef}
        className="overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div
          className="flex"
          style={transformStyle}
        >
          {renderSlides()}
        </div>
      </div>

      {/* Navigation Arrows */}
      {showArrows && totalSlides > slidesPerView && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed md:flex"
            disabled={!loop && currentIndex === 0}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-lg transition-all hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed md:flex"
            disabled={!loop && currentIndex >= maxIndex}
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {showDots && totalSlides > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {Array.from({ length: totalSlides }).map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "h-2 rounded-full transition-all duration-200",
                currentIndex === index
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/60"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export { MobileSwipeCarousel };