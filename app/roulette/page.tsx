"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { 
  ArrowRightIcon, 
  ArrowLeftIcon,
  BoltIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";
import { 
  FireIcon as FireSolid,
  SparklesIcon as SparklesSolid
} from "@heroicons/react/24/solid";
import { usePools } from "@/hooks/usePools";
import { toast } from "react-hot-toast";
import { EnhancedPool } from "@/components/EnhancedPoolCard";
import { AbstractPoolCardImage } from "@/components/AbstractPoolCardImage";
import { getCategorySpecificImageMetadata } from "@/services/poolImageService";

interface CardMetadata {
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
}

interface RoulettePool extends EnhancedPool {
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  leagueLogo?: string;
}

export default function PoolRoulettePage() {
  const { address } = useAccount();
  const router = useRouter();
  const { placeBet } = usePools();
  
  const [pools, setPools] = useState<RoulettePool[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewedPoolIds, setViewedPoolIds] = useState<number[]>([]);
  const [streak, setStreak] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [quickBetAmount, setQuickBetAmount] = useState<string>("10");
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [cardMetadata, setCardMetadata] = useState<CardMetadata | null>(null);
  
  // Fetch pools for roulette
  const fetchPools = useCallback(async () => {
    try {
      setLoading(true);
      const excludeIds = viewedPoolIds.length > 0 ? viewedPoolIds.join(',') : undefined;
      const url = `/api/pool-roulette/pools${excludeIds ? `?excludePoolIds=${excludeIds}` : ''}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success && data.data.pools) {
        setPools(data.data.pools);
        setCurrentIndex(0);
      } else {
        toast.error('Failed to load pools');
      }
    } catch (error) {
      console.error('Error fetching pools:', error);
      toast.error('Failed to load pools');
    } finally {
      setLoading(false);
    }
  }, [viewedPoolIds]);
  
  useEffect(() => {
    fetchPools();
  }, [fetchPools]);
  
  // Track interaction
  const trackInteraction = useCallback(async (poolId: number, interactionType: 'view' | 'skip' | 'bet', betAmount?: string) => {
    if (!address) return;
    
    try {
      await fetch('/api/pool-roulette/track-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          poolId,
          interactionType,
          betAmount
        })
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  }, [address]);
  
  // Track view when pool changes
  useEffect(() => {
    if (pools.length > 0 && currentIndex < pools.length) {
      const currentPool = pools[currentIndex];
      if (currentPool && !viewedPoolIds.includes(currentPool.id)) {
        trackInteraction(currentPool.id, 'view');
        setViewedPoolIds(prev => [...prev, currentPool.id]);
        setTotalViews(prev => prev + 1);
      }
    }
  }, [currentIndex, pools, viewedPoolIds, trackInteraction]);

  // Load card metadata when pool changes
  useEffect(() => {
    const loadMetadata = async () => {
      if (pools.length > 0 && currentIndex < pools.length) {
        const currentPool = pools[currentIndex];
        if (currentPool) {
          try {
            const metadata = await getCategorySpecificImageMetadata(currentPool);
            setCardMetadata(metadata);
          } catch (error) {
            console.error('Error loading card metadata:', error);
            setCardMetadata(null);
          }
        }
      }
    };
    loadMetadata();
  }, [currentIndex, pools]);
  
  // Next pool
  const handleNext = useCallback(() => {
    if (currentIndex < pools.length - 1) {
      const currentPool = pools[currentIndex];
      if (currentPool) {
        trackInteraction(currentPool.id, 'skip');
      }
      setCurrentIndex(prev => prev + 1);
      setStreak(0); // Reset streak on skip
    } else {
      // Load more pools
      fetchPools();
    }
  }, [currentIndex, pools, trackInteraction, fetchPools]);
  
  // Previous pool
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);
  
  // Quick bet
  const handleQuickBet = useCallback(async (pool: RoulettePool) => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    
    const betAmount = parseFloat(quickBetAmount);
    if (isNaN(betAmount) || betAmount <= 0) {
      toast.error('Invalid bet amount');
      return;
    }
    
    try {
      setIsPlacingBet(true);
      toast.loading('Placing bet...', { id: 'quick-bet' });
      
      await placeBet(pool.id, quickBetAmount, pool.usesPrix);
      
      trackInteraction(pool.id, 'bet', quickBetAmount);
      setStreak(prev => prev + 1);
      
      toast.success('Bet placed successfully!', { id: 'quick-bet' });
      
      // Move to next pool after bet
      setTimeout(() => {
        handleNext();
      }, 1500);
    } catch (error) {
      console.error('Error placing bet:', error);
      toast.error('Failed to place bet', { id: 'quick-bet' });
    } finally {
      setIsPlacingBet(false);
    }
  }, [address, quickBetAmount, placeBet, trackInteraction, handleNext]);
  
  // View pool details
  const handleViewDetails = useCallback((pool: RoulettePool) => {
    router.push(`/bet/${pool.id}`);
  }, [router]);
  
  const currentPool = pools[currentIndex];
  const progress = pools.length > 0 ? ((currentIndex + 1) / pools.length) * 100 : 0;
  
  if (loading && pools.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading pools...</p>
        </div>
      </div>
    );
  }
  
  if (pools.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">No pools available</p>
          <button
            onClick={fetchPools}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header with stats */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <SparklesSolid className="w-6 h-6 text-purple-400" />
                Pool Roulette
              </h1>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-purple-300">
                  <FireSolid className="w-4 h-4" />
                  <span>Streak: {streak}</span>
                </div>
                <div className="text-gray-300">
                  Viewed: {totalViews}
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/markets')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-purple-900/30 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {currentPool && (
              <motion.div
                key={currentPool.id}
                initial={{ opacity: 0, x: 300, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -300, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                {/* Pool Card */}
                <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-purple-500/20">
                  {/* Pool Image */}
                  <div className="relative h-64 bg-gradient-to-br from-purple-600 to-pink-600">
                    {cardMetadata ? (
                      <AbstractPoolCardImage
                        colors={cardMetadata.colors}
                        category={cardMetadata.category}
                        homeLogo={cardMetadata.homeLogo}
                        awayLogo={cardMetadata.awayLogo}
                        coinLogo={cardMetadata.coinLogo}
                        leagueLogo={cardMetadata.leagueLogo}
                        homeTeam={currentPool.homeTeam}
                        awayTeam={currentPool.awayTeam}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Pool Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-3 py-1 bg-purple-500/80 backdrop-blur-sm rounded-full text-white text-sm font-semibold">
                          {currentPool.category?.toUpperCase() || 'SPORTS'}
                        </span>
                        {currentPool.boostTier !== 'NONE' && (
                          <span className="px-3 py-1 bg-yellow-500/80 backdrop-blur-sm rounded-full text-white text-sm font-semibold flex items-center gap-1">
                            <BoltIcon className="w-4 h-4" />
                            {currentPool.boostTier}
                          </span>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        {currentPool.title || `${currentPool.homeTeam} vs ${currentPool.awayTeam}`}
                      </h2>
                      {currentPool.league && (
                        <p className="text-purple-200 text-sm">{currentPool.league}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Pool Details */}
                  <div className="p-6 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {(currentPool.odds / 100).toFixed(2)}x
                        </div>
                        <div className="text-xs text-gray-400">Odds</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-pink-400">
                          {parseFloat((currentPool.indexedData?.fillPercentage?.toString() || (currentPool as { fillPercentage?: { toString: () => string } }).fillPercentage?.toString() || '0')).toFixed(0)}%
                        </div>
                        <div className="text-xs text-gray-400">Filled</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {currentPool.participants || 0}
                        </div>
                        <div className="text-xs text-gray-400">Bettors</div>
                      </div>
                    </div>
                    
                    {/* Quick Bet Section */}
                    <div className="pt-4 border-t border-purple-500/20">
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Quick Bet Amount ({currentPool.usesPrix ? 'PRIX' : 'BNB'})
                      </label>
                      <div className="flex gap-2 mb-4">
                        {['10', '25', '50', '100'].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setQuickBetAmount(amount)}
                            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                              quickBetAmount === amount
                                ? 'bg-purple-600 text-white scale-105'
                                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                            }`}
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleQuickBet(currentPool)}
                          disabled={isPlacingBet}
                          className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {isPlacingBet ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                              <span>Placing...</span>
                            </>
                          ) : (
                            <>
                              <BoltIcon className="w-5 h-5" />
                              <span>Quick Bet {quickBetAmount} {currentPool.usesPrix ? 'PRIX' : 'BNB'}</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleViewDetails(currentPool)}
                          className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/30 backdrop-blur-md border-t border-purple-500/20">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="flex-1 py-4 px-6 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Previous</span>
            </button>
            
            <div className="text-center text-sm text-gray-400">
              {currentIndex + 1} / {pools.length}
            </div>
            
            <button
              onClick={handleNext}
              className="flex-1 py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span>Next</span>
              <ArrowRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

