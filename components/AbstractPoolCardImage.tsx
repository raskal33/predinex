"use client";

import React, { useState } from "react";
import Image from "next/image";

interface AbstractPoolCardImageProps {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  category: string;
  homeLogo?: string;
  awayLogo?: string;
  coinLogo?: string;
  leagueLogo?: string;
  className?: string;
  homeTeam?: string;
  awayTeam?: string;
}

/**
 * Professional pool card image component inspired by sports scoreboards
 * Modern, clean design with team/coin logos
 */
export const AbstractPoolCardImage: React.FC<AbstractPoolCardImageProps> = ({
  colors,
  category,
  homeLogo,
  awayLogo,
  coinLogo,
  leagueLogo,
  className = "",
  homeTeam,
  awayTeam,
}) => {
  const [homeLogoError, setHomeLogoError] = useState(false);
  const [awayLogoError, setAwayLogoError] = useState(false);
  const [coinLogoError, setCoinLogoError] = useState(false);
  const [leagueLogoError, setLeagueLogoError] = useState(false);

  const isFootball = category === 'football' || category === 'soccer';
  const isCrypto = category === 'crypto' || category === 'cryptocurrency';

  // Debug logging
  React.useEffect(() => {
    if (isFootball) {
      console.log('🎨 AbstractPoolCardImage - Football pool props:', {
        category,
        homeLogo,
        awayLogo,
        homeTeam,
        awayTeam,
        hasHomeLogo: !!homeLogo,
        hasAwayLogo: !!awayLogo,
        homeLogoError,
        awayLogoError,
      });
    }
  }, [category, homeLogo, awayLogo, homeTeam, awayTeam, homeLogoError, awayLogoError, isFootball]);

  return (
    <div 
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 100%)`,
      }}
    >
      {/* Subtle grid pattern - cleaner */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />
      
      {/* Professional Football/Sports Layout */}
      {isFootball && (homeLogo || awayLogo) && (
        <div className="relative w-full h-full flex items-center justify-center p-1">
          {/* Subtle background glow - green for football - cleaner */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              background: `radial-gradient(ellipse at center, #10b98115 0%, transparent 70%)`,
            }}
          />
          
          {/* Team Sections - Compact layout to fit within bounds */}
          <div className="flex items-center justify-center w-full gap-1 max-w-full">
            {/* Home Team */}
            <div className="flex flex-col items-center space-y-1 flex-shrink-0 flex-1 min-w-0">
              {homeLogo && !homeLogoError ? (
                <div 
                  className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border border-white/10 overflow-hidden flex-shrink-0"
                  style={{ 
                    boxShadow: `0 0 6px ${colors.primary}20`,
                  }}
                >
                  <Image
                    src={homeLogo}
                    alt={homeTeam || 'Home team'}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain p-0.5"
                    onError={() => {
                      console.warn('❌ Failed to load home logo:', homeLogo);
                      setHomeLogoError(true);
                    }}
                    onLoad={() => {
                      console.log('✅ Home logo loaded successfully:', homeLogo);
                    }}
                    crossOrigin="anonymous"
                    unoptimized
                  />
                </div>
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[10px] border-2 flex-shrink-0"
                  style={{ 
                    borderColor: colors.primary,
                    background: `linear-gradient(135deg, ${colors.primary}80, ${colors.secondary}60)`,
                  }}
                >
                  {homeTeam?.slice(0, 2).toUpperCase() || 'H'}
                </div>
              )}
              {homeTeam && (
                <div className="text-white/80 text-[9px] font-medium text-center truncate w-full px-0.5">
                  {homeTeam.length > 5 ? homeTeam.slice(0, 5) + '...' : homeTeam}
                </div>
              )}
            </div>
            
            {/* VS Section */}
            <div className="flex flex-col items-center space-y-0.5 flex-shrink-0 px-0.5">
              <div 
                className="text-white font-bold text-xs px-1.5 py-0.5 rounded border border-white/20"
                style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                VS
              </div>
              <div className="text-white/60 text-[8px] font-medium uppercase tracking-wider">
                {category.slice(0, 4)}
              </div>
            </div>
            
            {/* Away Team */}
            <div className="flex flex-col items-center space-y-1 flex-shrink-0 flex-1 min-w-0">
              {awayLogo && !awayLogoError ? (
                <div 
                  className="relative w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-white/15 to-white/5 backdrop-blur-sm border border-white/10 overflow-hidden flex-shrink-0"
                  style={{ 
                    boxShadow: `0 0 6px ${colors.accent}20`,
                  }}
                >
                  <Image
                    src={awayLogo}
                    alt={awayTeam || 'Away team'}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain p-0.5"
                    onError={() => {
                      console.warn('❌ Failed to load away logo:', awayLogo);
                      setAwayLogoError(true);
                    }}
                    onLoad={() => {
                      console.log('✅ Away logo loaded successfully:', awayLogo);
                    }}
                    crossOrigin="anonymous"
                    unoptimized
                  />
                </div>
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[10px] border-2 flex-shrink-0"
                  style={{ 
                    borderColor: colors.accent,
                    background: `linear-gradient(135deg, ${colors.accent}80, ${colors.primary}60)`,
                  }}
                >
                  {awayTeam?.slice(0, 2).toUpperCase() || 'A'}
                </div>
              )}
              {awayTeam && (
                <div className="text-white/80 text-[9px] font-medium text-center truncate w-full px-0.5">
                  {awayTeam.length > 5 ? awayTeam.slice(0, 5) + '...' : awayTeam}
                </div>
              )}
            </div>
          </div>
          
          {/* Professional accent line */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-0.5"
            style={{
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
            }}
          />
        </div>
      )}
      
      {/* Crypto Layout */}
      {isCrypto && coinLogo && !coinLogoError && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Subtle crypto glow - yellow/gold - cleaner */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              background: `radial-gradient(circle at center, #f59e0b15 0%, transparent 70%)`,
            }}
          />
          
          <div className="flex flex-col items-center space-y-3">
            <div 
              className="relative w-16 h-16 flex items-center justify-center rounded-full border-2 overflow-hidden"
              style={{ 
                borderColor: '#f59e0b',
                background: `linear-gradient(135deg, #f59e0b15, #fbbf2410)`,
                boxShadow: `0 0 8px #f59e0b20`,
              }}
            >
              <Image
                src={coinLogo}
                alt="Cryptocurrency"
                width={64}
                height={64}
                className="w-full h-full object-contain p-2"
                onError={() => setCoinLogoError(true)}
                unoptimized
              />
            </div>
            
            <div 
              className="text-white/90 text-sm font-semibold px-3 py-1 rounded-lg border border-white/20"
              style={{ 
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {category.toUpperCase()}
            </div>
          </div>
          
          {/* Crypto accent line */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
            }}
          />
        </div>
      )}
      
      {/* Fallback Layout for other categories or when no logos */}
      {(!isFootball || (!homeLogo && !awayLogo)) && (!isCrypto || !coinLogo || coinLogoError) && (
        <div className="relative w-full h-full flex items-center justify-center">
          <div 
            className="text-white/80 text-2xl font-bold px-4 py-2 rounded-lg border border-white/20"
            style={{ 
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {category.toUpperCase()}
          </div>
          
          <div 
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
            }}
          />
        </div>
      )}
      
      {/* Corner accent */}
      <div 
        className="absolute top-0 right-0 w-8 h-8 opacity-60"
        style={{
          background: `linear-gradient(225deg, ${colors.accent}, transparent)`,
          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
        }}
      />
      
      {/* League logo (if available) */}
      {leagueLogo && !leagueLogoError && (
        <div className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center opacity-70">
          <Image
            src={leagueLogo}
            alt="League"
            width={32}
            height={32}
            className="w-full h-full object-contain"
            onError={() => setLeagueLogoError(true)}
            unoptimized
          />
        </div>
      )}
    </div>
  );
};