import React from 'react';
import heroImageLocal from '../assets/images/hero_image_local.png';

// Central source of truth for the primary branding/owner artwork of Heldin's Bet.
// Future replacements in transparent PNG, WebP, or high-definition JPG formats can
// be applied directly to this single constant without needing to alter any application code.
export const HERO_IMAGE_URL = heroImageLocal;

interface HeroContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  aspectClass?: string; // Customizable aspect ratio wrapper (e.g. 3/4 poster style)
}

/**
 * HeroContainer: A standardized frame wrapper that enforces premium design guidelines, 
 * glowing shadow highlights themed around Brazil colors, and a clean gold border.
 */
export const HeroContainer: React.FC<HeroContainerProps> = ({ 
  children, 
  aspectClass = "aspect-[3/4]", 
  className = "",
  ...props 
}) => {
  return (
    <div 
      className={`relative w-full rounded-2xl overflow-hidden shadow-[0_15px_50px_rgba(0,109,52,0.25)] bg-[#0c1524] border border-[#fabd00]/20 p-2.5 transition-all duration-300 ${className}`} 
      {...props}
    >
      <div className={`relative ${aspectClass} w-full rounded-xl overflow-hidden bg-[#090d16]`}>
        {children}
      </div>
    </div>
  );
};

interface HeroImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

/**
 * HeroImage: Renders the highly performant image element with anti-referrer issues mitigation,
 * cover fit properties, and flexible styling to handle transparent or background-merged artwork seamlessly.
 */
export const HeroImage: React.FC<HeroImageProps> = ({ 
  src = HERO_IMAGE_URL, 
  alt = "Heldin's Bet 2026 Official Hero Art", 
  className = "",
  ...props 
}) => {
  return (
    <img 
      src={src} 
      alt={alt} 
      className={`w-full h-full object-cover object-center pointer-events-none select-none transition-all duration-300 ${className}`} 
      referrerPolicy="no-referrer"
      {...props}
    />
  );
};

interface HeroOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  themeColor?: string;
}

/**
 * HeroOverlay: A subtle gradient vignette overlay guaranteeing readable typography 
 * and perfect visual blending regardless of underlying image brightness or color grading.
 */
export const HeroOverlay: React.FC<HeroOverlayProps> = ({ 
  className = "", 
  ...props 
}) => {
  return (
    <div 
      className={`absolute inset-0 bg-gradient-to-t from-[#090d16] via-[#090d16]/30 to-transparent opacity-95 pointer-events-none transition-all duration-300 ${className}`} 
      {...props}
    />
  );
};
