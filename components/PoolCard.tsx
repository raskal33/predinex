"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Share2, Users, Clock } from "lucide-react";
import { formatEther } from "viem";
import { EnhancedPool } from "./EnhancedPoolCard";
import { getPoolImageUrlWithFallback, getCategorySpecificImageMetadata } from "@/services/poolImageService";
import { AbstractPoolCardImage } from "./AbstractPoolCardImage";

// Color Psychology: 
// - Red/Orange: Urgency, Hot markets, FOMO triggers
// - Green: Bullish, Success, Trust
// - Purple/Violet: Premium, Exclusive, High-value
// - Yellow/Gold: Attention, Energy, High-stakes
// - Cyan: Modern, Tech-forward, Active

interface PoolCardProps {
  pool: EnhancedPool & {
    imageUrl?: string;
    topPredictor?: string;
  };
  onClick?: () => void;
  variant?: "compact" | "full";
}

// Calculate time remaining with urgency indicators
const timeRemaining = (endsAt: number | Date) => {
  const now = new Date();
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt * 1000);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return { text: "Ended", urgent: false };
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  
  // Urgency: less than 1 hour = very urgent
  const urgent = hours < 1;
  const text = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  
  return { text, urgent };
};

// Helper function to safely convert stake values (handles both BigInt strings and decimal strings/numbers)
const parseStakeValue = (value: string | number | undefined): number => {
  if (!value) return 0;
  
  // If it's already a number, return it
  if (typeof value === 'number') {
    return value;
  }
  
  // If it's a string, check if it's a BigInt (wei format) or decimal
  const str = value.toString();
  
  // Check if it's a very large number (likely BigInt/wei format)
  // Wei values are typically very large integers (18+ digits)
  if (str.length > 15 && !str.includes('.')) {
    try {
      // It's likely a BigInt string, convert from wei
      return parseFloat(formatEther(BigInt(str)));
    } catch {
      // If BigInt conversion fails, try parsing as float
      return parseFloat(str) || 0;
    }
  }
  
  // Otherwise, it's likely already in decimal format
  return parseFloat(str) || 0;
};

// Calculate odds from pool data
const calculateOdds = (pool: EnhancedPool) => {
  // Odds are stored in basis points (150 = 1.50x)
  const yesOdds = pool.odds ? pool.odds / 100 : 2.0;
  
  // Calculate no odds from yes odds
  // If yes odds is 2.0x, no odds would be approximately 1 / (1 - 1/2.0) = 2.0x
  // But we need to account for the actual stake distribution
  const yesVolume = parseStakeValue(pool.totalCreatorSideStake);
  const noVolume = parseStakeValue(pool.totalBettorStake);
  const totalVolume = yesVolume + noVolume;
  
  let noOdds = 1.5; // Default
  if (totalVolume > 0) {
    // Calculate implied odds from volume distribution
    const noImplied = totalVolume / (noVolume || 1);
    noOdds = Math.max(1.1, Math.min(10, noImplied));
  }
  
  return { yesOdds, noOdds };
};

// Hype meter with psychological color gradients
const HypeMeter = ({ yesPct = 70, isHot = false }: { yesPct: number; isHot?: boolean }) => {
  const getGradient = () => {
    if (isHot && yesPct > 70) {
      // Hot market - red to orange gradient (urgency)
      return "linear-gradient(90deg, #ef4444, #f97316, #fbbf24)";
    } else if (yesPct > 60) {
      // Bullish - green gradient (trust, success)
      return "linear-gradient(90deg, #10b981, #34d399, #6ee7b7)";
    } else {
      // Balanced - purple to cyan (premium, modern)
      return "linear-gradient(90deg, #8b5cf6, #06b6d4, #3b82f6)";
    }
  };

  return (
    <div className="relative w-full bg-neutral-800/50 rounded-full h-2.5 overflow-hidden border border-neutral-700/50">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${yesPct}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="h-full rounded-full relative overflow-hidden"
        style={{ background: getGradient() }}
      >
        {/* Shimmer effect for hot markets */}
        {isHot && (
          <motion.div
            animate={{
              x: ["-100%", "200%"],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
          />
        )}
      </motion.div>
    </div>
  );
};

// Compact NFT-style card - Catalog view
export const PoolCardNFT = ({ pool, onClick }: PoolCardProps) => {
  const [imageError, setImageError] = React.useState(false);
  const [useAbstractCard, setUseAbstractCard] = React.useState(false);
  const [cardMetadata, setCardMetadata] = React.useState<any>(null);
  const [imageUrl, setImageUrl] = React.useState<string>("");
  
  // Load image with logos asynchronously
  React.useEffect(() => {
    const loadImage = async () => {
      try {
        // Try to get abstract card metadata with logos
        const metadata = await getCategorySpecificImageMetadata(pool);
        console.log('🎨 PoolCardNFT - Metadata received:', {
          poolId: pool.id,
          marketId: pool.marketId,
          fixtureId: (pool as any).fixtureId,
          category: pool.category,
          homeTeam: pool.homeTeam,
          awayTeam: pool.awayTeam,
          hasHomeLogo: !!metadata.homeLogo,
          hasAwayLogo: !!metadata.awayLogo,
          hasCoinLogo: !!metadata.coinLogo,
          hasLeagueLogo: !!metadata.leagueLogo,
          metadata,
        });
        
        // Use abstract card if we have any logos (team or coin)
        const hasLogos = metadata.homeLogo || metadata.awayLogo || metadata.coinLogo || metadata.leagueLogo;
        if (hasLogos) {
          console.log('✅ PoolCardNFT - Using abstract card with logos:', {
            poolId: pool.id,
            homeLogo: metadata.homeLogo,
            awayLogo: metadata.awayLogo,
            coinLogo: metadata.coinLogo,
            leagueLogo: metadata.leagueLogo,
          });
          setCardMetadata(metadata);
          setUseAbstractCard(true);
          return;
        } else {
          console.log('⚠️ PoolCardNFT - No logos found for pool:', {
            poolId: pool.id,
            category: pool.category,
            marketId: pool.marketId,
            fixtureId: (pool as any).fixtureId,
            homeTeam: pool.homeTeam,
            awayTeam: pool.awayTeam,
            title: pool.title,
          });
        }
      } catch (error) {
        console.warn('Failed to load abstract card metadata:', error);
      }
      
      // Fallback to regular image
      setImageUrl(getPoolImageUrlWithFallback(pool));
      setUseAbstractCard(false);
    };
    loadImage();
  }, [pool]);
  
  const yesVolume = parseStakeValue(pool.totalCreatorSideStake);
  const noVolume = parseStakeValue(pool.totalBettorStake);
  const totalVolume = yesVolume + noVolume;
  const yesPct = totalVolume > 0 ? Math.round((yesVolume / totalVolume) * 100) : 50;
  
  const { yesOdds } = calculateOdds(pool);
  const timeInfo = timeRemaining(pool.bettingEndTime || pool.eventEndTime);
  const participants = pool.indexedData?.participantCount || parseInt(pool.participants || "0") || 0;
  
  // Determine market status for color psychology
  const isHot = yesPct > 70 || (pool.indexedData?.isHot ?? false) || (pool.trending ?? false);
  const isContrarian = yesPct < 35;
  
  const getStatusBadge = () => {
    if (isHot) return { text: "🔥 HOT", color: "from-red-500 to-orange-500", glow: "shadow-red-500/50" };
    if (isContrarian) return { text: "⚡ CONTRARIAN", color: "from-purple-500 to-pink-500", glow: "shadow-purple-500/50" };
    if (timeInfo.urgent) return { text: "⏰ URGENT", color: "from-yellow-500 to-orange-500", glow: "shadow-yellow-500/50" };
    return { text: "📊 STABLE", color: "from-cyan-500 to-blue-500", glow: "shadow-cyan-500/50" };
  };

  // Category-specific glow colors
  const getCategoryGlow = () => {
    const category = (pool.category || '').toLowerCase();
    if (category === 'football' || category === 'soccer') {
      return { color: 'from-green-500/30 to-emerald-500/20', shadow: 'shadow-green-500/20' };
    }
    if (category === 'crypto' || category === 'cryptocurrency') {
      return { color: 'from-yellow-500/30 to-amber-500/20', shadow: 'shadow-yellow-500/20' };
    }
    return { color: 'from-cyan-500/20 to-blue-500/15', shadow: 'shadow-cyan-500/15' };
  };

  const status = getStatusBadge();
  const categoryGlow = getCategoryGlow();

  return (
    <motion.div
      onClick={onClick}
      whileHover={{ scale: 1.08, y: -8, zIndex: 50 }}
      whileTap={{ scale: 0.98 }}
      className="relative cursor-pointer group"
    >
      {/* Enhanced category-specific glow on hover - more visible */}
      <div className={`absolute -inset-1 bg-gradient-to-r ${categoryGlow.color} rounded-2xl opacity-0 group-hover:opacity-100 blur-md transition-all duration-300`} />
      
      {/* Additional shadow on hover for depth */}
      <div className={`absolute -inset-2 ${categoryGlow.shadow} rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300`} />
      
      <div className="relative w-full max-w-[176px] rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 border border-neutral-700/50 backdrop-blur-sm group-hover:border-cyan-500/50 transition-all duration-300 group-hover:shadow-2xl">
        {/* Image/Header Section */}
        <div className="relative h-32 overflow-hidden">
          {useAbstractCard && cardMetadata ? (
                <AbstractPoolCardImage
                  colors={cardMetadata.colors}
                  category={cardMetadata.category}
                  homeLogo={cardMetadata.homeLogo}
                  awayLogo={cardMetadata.awayLogo}
                  coinLogo={cardMetadata.coinLogo}
                  leagueLogo={cardMetadata.leagueLogo}
                  homeTeam={pool.homeTeam}
                  awayTeam={pool.awayTeam}
                  className="w-full h-full"
                />
          ) : !imageError && imageUrl ? (
            <Image 
              src={imageUrl} 
              alt={pool.title || `${pool.homeTeam || ""} vs ${pool.awayTeam || ""}` || "Pool"} 
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20" />
          )}
          
          {/* Overlay gradient for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          
          {/* Status badge - top right */}
          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-gradient-to-r ${status.color} text-white text-[10px] font-bold ${status.glow} shadow-lg whitespace-nowrap`}>
            {status.text}
          </div>
          
          {/* Odds badge - top left */}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/20">
            <div className="text-white text-xs font-bold">{yesOdds.toFixed(1)}x</div>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-3 space-y-2 bg-gradient-to-b from-neutral-900 to-neutral-950">
          {/* Title */}
          <h3 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-cyan-400 transition-colors">
            {pool.title || `${pool.homeTeam || ""} vs ${pool.awayTeam || ""}` || "Prediction Market"}
          </h3>

          {/* Hype Meter */}
          <div className="space-y-1">
            <HypeMeter yesPct={yesPct} isHot={isHot} />
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-green-400 font-semibold">BUY {yesPct}%</span>
              <span className="text-red-400 font-semibold">SELL {100 - yesPct}%</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between pt-1 border-t border-neutral-700/50">
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
              <Users className="w-3 h-3" />
              <span className="font-medium">{participants}</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-semibold ${timeInfo.urgent ? 'text-red-400' : 'text-neutral-400'}`}>
              <Clock className="w-3 h-3" />
              <span>{timeInfo.text}</span>
            </div>
          </div>

          {/* Volume indicator */}
          <div className="text-[10px] text-neutral-500 font-mono">
            {totalVolume.toFixed(2)} {pool.usesPrix ? "PRIX" : "SOL"}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Full card - Expanded view
export const PoolCardFull = ({ pool, onClick }: PoolCardProps) => {
  const [imageError, setImageError] = React.useState(false);
  const [useAbstractCard, setUseAbstractCard] = React.useState(false);
  const [cardMetadata, setCardMetadata] = React.useState<any>(null);
  const [imageUrl, setImageUrl] = React.useState<string>("");
  
  // Load image with logos asynchronously
  React.useEffect(() => {
    const loadImage = async () => {
      try {
        // Try to get abstract card metadata with logos
        const metadata = await getCategorySpecificImageMetadata(pool);
        console.log('🎨 PoolCardFull - Metadata received:', {
          poolId: pool.id,
          marketId: pool.marketId,
          fixtureId: (pool as any).fixtureId,
          category: pool.category,
          homeTeam: pool.homeTeam,
          awayTeam: pool.awayTeam,
          hasHomeLogo: !!metadata.homeLogo,
          hasAwayLogo: !!metadata.awayLogo,
          hasCoinLogo: !!metadata.coinLogo,
          hasLeagueLogo: !!metadata.leagueLogo,
          metadata,
        });
        
        // Use abstract card if we have any logos (team or coin)
        const hasLogos = metadata.homeLogo || metadata.awayLogo || metadata.coinLogo || metadata.leagueLogo;
        if (hasLogos) {
          console.log('✅ PoolCardFull - Using abstract card with logos:', {
            poolId: pool.id,
            homeLogo: metadata.homeLogo,
            awayLogo: metadata.awayLogo,
            coinLogo: metadata.coinLogo,
            leagueLogo: metadata.leagueLogo,
          });
          setCardMetadata(metadata);
          setUseAbstractCard(true);
          return;
        } else {
          console.log('⚠️ PoolCardFull - No logos found for pool:', {
            poolId: pool.id,
            category: pool.category,
            marketId: pool.marketId,
            fixtureId: (pool as any).fixtureId,
            homeTeam: pool.homeTeam,
            awayTeam: pool.awayTeam,
            title: pool.title,
          });
        }
      } catch (error) {
        console.warn('Failed to load abstract card metadata:', error);
      }
      
      // Fallback to regular image
      setImageUrl(getPoolImageUrlWithFallback(pool));
      setUseAbstractCard(false);
    };
    loadImage();
  }, [pool]);
  
  const yesVolume = parseStakeValue(pool.totalCreatorSideStake);
  const noVolume = parseStakeValue(pool.totalBettorStake);
  const totalVolume = yesVolume + noVolume;
  const yesPct = totalVolume > 0 ? Math.round((yesVolume / totalVolume) * 100) : 50;
  
  const { yesOdds, noOdds } = calculateOdds(pool);
  const timeInfo = timeRemaining(pool.bettingEndTime || pool.eventEndTime);
  const participants = pool.indexedData?.participantCount || parseInt(pool.participants || "0") || 0;
  
  // Market status
  const isHot = yesPct > 70 || (pool.indexedData?.isHot ?? false) || (pool.trending ?? false);
  const isContrarian = yesPct < 35;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="relative max-w-lg w-full"
    >
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/50 shadow-2xl">
        {/* Clean Image Section - Minimal Overlay */}
        <div className="relative h-64 overflow-hidden bg-neutral-950">
          {useAbstractCard && cardMetadata ? (
            <AbstractPoolCardImage
              colors={cardMetadata.colors}
              category={cardMetadata.category}
              homeLogo={cardMetadata.homeLogo}
              awayLogo={cardMetadata.awayLogo}
              coinLogo={cardMetadata.coinLogo}
              leagueLogo={cardMetadata.leagueLogo}
              homeTeam={pool.homeTeam}
              awayTeam={pool.awayTeam}
              className="w-full h-full"
            />
          ) : !imageError && imageUrl ? (
            <Image 
              src={imageUrl} 
              alt={pool.title || `${pool.homeTeam || ""} vs ${pool.awayTeam || ""}` || "Pool"} 
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
          )}
          
          {/* Subtle bottom gradient for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/95 via-neutral-900/50 to-transparent" />
          
          {/* Clean Header - Top Right Only */}
          <div className="absolute top-4 right-4">
            <div className={`px-3 py-1.5 rounded-lg bg-neutral-900/90 backdrop-blur-sm border ${timeInfo.urgent ? 'border-red-500/30' : 'border-neutral-700/50'}`}>
              <div className="flex items-center gap-1.5">
                <Clock className={`w-3.5 h-3.5 ${timeInfo.urgent ? 'text-red-400' : 'text-neutral-400'}`} />
                <span className={`text-xs font-medium ${timeInfo.urgent ? 'text-red-400' : 'text-neutral-300'}`}>
                  {timeInfo.text}
                </span>
              </div>
            </div>
          </div>
          
          {/* Title at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="mb-2">
              <span className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                {pool.category || pool.league || "Market"}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-white leading-tight">
              {pool.title || `${pool.homeTeam || ""} vs ${pool.awayTeam || ""}` || "Prediction Market"}
            </h3>
          </div>
        </div>

        {/* Clean Content Section */}
        <div className="p-6 space-y-6 bg-neutral-900">
          {/* Key Metrics - Clean Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Odds */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Odds</div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-neutral-400">Buy</span>
                  <span className="text-2xl font-bold text-emerald-400">{yesOdds.toFixed(2)}x</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-neutral-400">Sell</span>
                  <span className="text-2xl font-bold text-red-400">{noOdds.toFixed(2)}x</span>
                </div>
              </div>
            </div>
            
            {/* Volume */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">Volume</div>
              <div className="text-2xl font-bold text-white font-mono">
                {totalVolume.toFixed(2)}
              </div>
              <div className="text-xs text-neutral-500">{pool.usesPrix ? "PRIX" : "SOL"}</div>
            </div>
          </div>

          {/* Distribution Bar - Clean */}
          <div className="space-y-2">
            <HypeMeter yesPct={yesPct} isHot={isHot} />
            <div className="flex justify-between items-center text-xs">
              <span className="text-emerald-400 font-medium">Buy {yesPct}%</span>
              <span className="text-red-400 font-medium">Sell {100 - yesPct}%</span>
            </div>
          </div>

          {/* Single Status Badge - Only if significant */}
          {(isHot || isContrarian) && (
            <div className="flex items-center gap-2">
              {isHot && (
                <span className="px-3 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  Hot Market
                </span>
              )}
              {isContrarian && (
                <span className="px-3 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
                  Contrarian
                </span>
              )}
            </div>
          )}
        </div>

        {/* Clean Action Footer */}
        <div className="p-6 bg-neutral-950/50 border-t border-neutral-800/30">
          <div className="flex items-center justify-between gap-4">
            {/* Primary Actions */}
            <div className="flex items-center gap-3 flex-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                className="flex-1 px-6 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors"
              >
                Buy
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                className="flex-1 px-6 py-3 rounded-lg border border-red-500/50 hover:bg-red-500/10 text-red-400 font-semibold text-sm transition-colors"
              >
                Sell
              </motion.button>
            </div>
            
            {/* Minimal Social */}
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg hover:bg-neutral-800 transition-colors">
                <Share2 className="w-4 h-4 text-neutral-500 hover:text-neutral-300 transition-colors" />
              </button>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800/50">
                <Users className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-xs font-medium text-neutral-400">{participants}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Catalog view component - Grid of NFT cards
export const PoolCardCatalog = ({ 
  pools, 
  onPoolClick 
}: { 
  pools: PoolCardProps["pool"][]; 
  onPoolClick?: (pool: PoolCardProps["pool"]) => void;
}) => {
  const [hoveredPoolId, setHoveredPoolId] = React.useState<string | null>(null);

  return (
    <div className="w-full overflow-hidden">
      <div className="flex flex-wrap gap-3 p-2 justify-center items-start">
        {pools.map((pool, index) => {
          const isHovered = hoveredPoolId === pool.id.toString();
          return (
            <motion.div
              key={pool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: hoveredPoolId === null ? 1 : isHovered ? 1 : 0.3,
                scale: hoveredPoolId === null ? 1 : isHovered ? 1 : 0.95,
              }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
              className="relative flex-shrink-0"
              style={{ width: '176px' }}
              onMouseEnter={() => setHoveredPoolId(pool.id.toString())}
              onMouseLeave={() => setHoveredPoolId(null)}
            >
              <div className={hoveredPoolId && !isHovered ? 'blur-sm pointer-events-none' : ''}>
                <PoolCardNFT 
                  pool={pool} 
                  onClick={() => onPoolClick?.(pool)}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Modal/Overlay for full card view
export const PoolCardModal = ({ 
  pool, 
  isOpen, 
  onClose 
}: { 
  pool: PoolCardProps["pool"] | null; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  if (!pool) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="relative"
            >
              <PoolCardFull pool={pool} />
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700 transition-colors flex items-center justify-center shadow-lg z-10"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PoolCardFull;

