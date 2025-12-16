"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";

const MobileImage = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 75,
  placeholder = "blur",
  objectFit = "cover",
  onLoad,
  onError,
  sizes = "100vw",
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [imageSrc, setImageSrc] = useState(null);
  
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Generate responsive image URLs
  const generateSrcSet = useCallback((baseSrc) => {
    if (!baseSrc) return "";
    
    const widths = [320, 640, 768, 1024, 1280, 1536];
    return widths
      .map(w => `${baseSrc}?w=${w}&q=${quality} ${w}w`)
      .join(", ");
  }, [quality]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: "50px", // Start loading 50px before image comes into view
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Load image when in view
  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      onLoad?.();
    };
    
    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      onError?.();
    };
    
    // Start loading with low quality first
    img.srcset = generateSrcSet(src);
    img.sizes = sizes;
    img.src = `${src}?w=${width || 800}&q=${quality}`;
  }, [isInView, src, width, quality, sizes, generateSrcSet, onLoad, onError]);

  // Generate low-quality placeholder
  const getPlaceholderSrc = useCallback(() => {
    if (placeholder === "blur" && src) {
      return `${src}?w=20&blur=10&q=30`;
    }
    return null;
  }, [placeholder, src]);

  const containerStyle = {
    width: width || "100%",
    height: height || "auto",
    position: "relative",
    overflow: "hidden",
  };

  const imageStyle = {
    width: "100%",
    height: "100%",
    objectFit,
    transition: "opacity 0.3s ease-in-out",
  };

  if (hasError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted border border-border rounded-lg",
          className
        )}
        style={containerStyle}
        {...props}
      >
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn("relative", className)}
      style={containerStyle}
      {...props}
    >
      {/* Low-quality placeholder */}
      {placeholder === "blur" && isLoading && (
        <img
          src={getPlaceholderSrc()}
          alt=""
          className="absolute inset-0 w-full h-full object-cover filter blur-md scale-110"
          style={{
            opacity: isLoading ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
          aria-hidden="true"
        />
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          </div>
        </div>
      )}

      {/* Actual image */}
      {imageSrc && (
        <img
          src={imageSrc}
          srcSet={generateSrcSet(imageSrc)}
          sizes={sizes}
          alt={alt}
          style={{
            ...imageStyle,
            opacity: isLoading ? 0 : 1,
          }}
          loading={priority ? "eager" : "lazy"}
        />
      )}

      {/* Fallback icon for empty src */}
      {!src && (
        <div className="flex items-center justify-center h-full bg-muted border border-border rounded-lg">
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

// Optimized image component for different use cases
export const MobileAvatar = ({ src, alt, size = 48, className, ...props }) => {
  return (
    <MobileImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      objectFit="cover"
      {...props}
    />
  );
};

export const MobileThumbnail = ({ src, alt, width = 80, height = 80, className, ...props }) => {
  return (
    <MobileImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("rounded-lg object-cover", className)}
      objectFit="cover"
      {...props}
    />
  );
};

export const MobileHeroImage = ({ src, alt, className, ...props }) => {
  return (
    <MobileImage
      src={src}
      alt={alt}
      width={800}
      height={400}
      priority={true}
      quality={85}
      className={cn("w-full h-64 md:h-96 object-cover", className)}
      objectFit="cover"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
      {...props}
    />
  );
};

export const MobileGalleryImage = ({ src, alt, onClick, className, ...props }) => {
  return (
    <div
      className={cn("relative cursor-pointer group", className)}
      onClick={onClick}
    >
      <MobileImage
        src={src}
        alt={alt}
        width={300}
        height={200}
        className="w-full h-48 object-cover rounded-lg"
        objectFit="cover"
        {...props}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 rounded-lg flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2">
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export { MobileImage };