"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  TrophyIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  StarIcon,
  UsersIcon,
  AcademicCapIcon,
  RocketLaunchIcon,
  SparklesIcon,
  ShareIcon
} from "@heroicons/react/24/outline";
import {
  TrophyIcon as TrophySolid,
  ShieldCheckIcon as ShieldSolid
} from "@heroicons/react/24/solid";
import { optimizedPoolService, type OptimizedPool } from "@/services/optimizedPoolService";
import { frontendCache } from "@/services/frontendCache";
import { EnhancedPool } from "@/components/EnhancedPoolCard";
import { PoolCardModal } from "@/components/PoolCard";

interface Creator {
  address: string;
  username: string;
  totalVolume: string;
  totalPools: number;
  avatar?: string;
}

interface Win {
  userAddress: string;
  poolTitle: string;
  amount: string;
  currency: string;
  timeAgo: string;
  type: 'bettor' | 'creator';
}

export default function HomePage() {
  const [trendingPools, setTrendingPools] = useState<EnhancedPool[]>([]);
  const [topCreators, setTopCreators] = useState<Creator[]>([]);
  const [latestWins, setLatestWins] = useState<Win[]>([]);
  const [selectedPool, setSelectedPool] = useState<EnhancedPool | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [stats, setStats] = useState({
    totalVolume: "0",
    prixVolume: "0", 
    bnbVolume: "0",
    activePools: 0,
    participants: 0,
    totalPools: 0,
    boostedPools: 0,
    trendingPools: 0
  });
  const [loading, setLoading] = useState(true);

  // Convert OptimizedPool to EnhancedPool format
  const convertOptimizedToEnhanced = useCallback(async (pool: OptimizedPool): Promise<EnhancedPool> => {
    const isSettled = pool.isSettled === true || 
                     (typeof pool.isSettled === 'string' && pool.isSettled === 'true') || 
                     (typeof pool.isSettled === 'number' && pool.isSettled === 1);
    const creatorSideWon = pool.creatorSideWon === true || 
                           (typeof pool.creatorSideWon === 'string' && pool.creatorSideWon === 'true') || 
                           (typeof pool.creatorSideWon === 'number' && pool.creatorSideWon === 1);
    
    return {
      id: pool.id,
      creator: pool.creator.address,
      odds: pool.odds,
      settled: isSettled,
      creatorSideWon: creatorSideWon,
      isPrivate: false,
      usesPrix: pool.currency === 'PRIX',
      filledAbove60: pool.fillPercentage >= 60,
      oracleType: 'GUIDED' as const,
      creatorStake: pool.creatorStake,
      totalCreatorSideStake: pool.creatorStake,
      maxBettorStake: pool.maxPoolSize,
      totalBettorStake: pool.totalBettorStake,
      predictedOutcome: pool.predictedOutcome || 'Unknown',
      result: '',
      marketId: pool.marketId || pool.id.toString(),
      ...(pool.fixtureId && { fixtureId: pool.fixtureId }),
      ...(pool.homeTeamLogo && { homeTeamLogo: pool.homeTeamLogo }),
      ...(pool.awayTeamLogo && { awayTeamLogo: pool.awayTeamLogo }),
      ...(pool.leagueLogo && { leagueLogo: pool.leagueLogo }),
      eventStartTime: pool.eventStartTime,
      eventEndTime: pool.eventEndTime,
      bettingEndTime: pool.bettingEndTime,
      resultTimestamp: 0,
      arprixationDeadline: pool.eventEndTime + 86400,
      league: pool.league || 'Unknown',
      category: pool.category,
      region: pool.region || 'Unknown',
      title: pool.title,
      homeTeam: pool.homeTeam,
      awayTeam: pool.awayTeam,
      maxBetPerUser: pool.maxPoolSize,
      boostTier: pool.boostTier === 'GOLD' ? 'GOLD' : 
                 pool.boostTier === 'SILVER' ? 'SILVER' : 
                 pool.boostTier === 'BRONZE' ? 'BRONZE' : 'NONE',
      boostExpiry: 0,
      trending: pool.trending,
      socialStats: pool.socialStats,
      isComboPool: false,
      indexedData: {
        participantCount: pool.participants,
        fillPercentage: pool.fillPercentage,
        totalVolume: pool.totalBettorStake,
        betCount: pool.totalBets || 0,
        avgBetSize: pool.avgBet ? pool.avgBet.toString() : '0',
        creatorReputation: pool.creator.successRate,
        categoryRank: 0,
        isHot: pool.trending,
        lastActivity: new Date()
      },
      totalBets: pool.totalBets || 0,
      avgBet: pool.avgBet ? pool.avgBet.toString() : '0'
    };
  }, []);

  // Fetch platform stats
  const fetchPlatformStats = useCallback(async () => {
    try {
      const analyticsData = await frontendCache.get(
        'analytics',
        () => optimizedPoolService.getAnalytics()
      );
      setStats(analyticsData);
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      setStats({
        totalVolume: "2840000",
        prixVolume: "1420000",
        bnbVolume: "1420000", 
        activePools: 156,
        participants: 8924,
        totalPools: 247,
        boostedPools: 23,
        trendingPools: 12
      });
    }
  }, []);

  // Fetch trending pools
  const fetchTrendingPools = useCallback(async () => {
    try {
      const poolsData = await frontendCache.get(
        'trendingPools:list:newest:limit=20',
        () => optimizedPoolService.getPools({ 
          limit: 20,
          sortBy: 'newest'
        })
      );
      
      // Filter for trending pools and take top 6
      const enhanced = await Promise.all(
        poolsData.pools
          .filter((pool: OptimizedPool) => pool.trending)
          .slice(0, 6)
          .map(async (pool: OptimizedPool) => {
            return await convertOptimizedToEnhanced(pool);
          })
      );
      
      setTrendingPools(enhanced);
    } catch (error) {
      console.error('Error fetching trending pools:', error);
      setTrendingPools([]);
    }
  }, [convertOptimizedToEnhanced]);

  // Fetch top creators
  const fetchTopCreators = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/leaderboard/creators?limit=5');
      const data = await response.json();
      if (data.success) {
        setTopCreators(data.data.map((creator: any) => ({
          address: creator.address,
          username: creator.shortAddress || `${creator.address.slice(0, 6)}...${creator.address.slice(-4)}`,
          totalVolume: (parseFloat(creator.stats.totalVolume) / 1e18).toFixed(2),
          totalPools: creator.stats.totalPools
        })));
      }
    } catch (error) {
      console.error('Error fetching top creators:', error);
      setTopCreators([]);
    }
  }, []);

  // Fetch latest wins
  const fetchLatestWins = useCallback(async () => {
    try {
      // Fetch recent settled pools where bettors won
      const response = await fetch('/api/optimized-pools?status=settled&limit=10');
      const data = await response.json();
      if (data.success && data.data?.pools) {
        const wins: Win[] = [];
        data.data.pools.forEach((pool: any) => {
          if (!pool.creatorSideWon && pool.isSettled) {
            wins.push({
              userAddress: pool.creator?.address || 'Unknown',
              poolTitle: pool.title,
              amount: (parseFloat(pool.totalBettorStake || '0') / 1e18).toFixed(2),
              currency: pool.currency || 'BNB',
              timeAgo: 'Recently',
              type: 'bettor'
            });
          }
        });
        setLatestWins(wins.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching latest wins:', error);
      setLatestWins([]);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPlatformStats(),
        fetchTrendingPools(),
        fetchTopCreators(),
        fetchLatestWins()
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchPlatformStats, fetchTrendingPools, fetchTopCreators, fetchLatestWins]);

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Subtle grid pattern background */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6"
      >
        {/* A) Hero Section - Compact Design */}
        <div className="text-center max-w-4xl mx-auto pt-4 sm:pt-6 pb-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight">
              <span className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-400 bg-clip-text text-transparent">
                Challenge a Creator.
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-teal-400 bg-clip-text text-transparent">
                Beat the Crowd.
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 bg-clip-text text-transparent">
                Earn Crypto.
              </span>
            </h1>
            <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed mb-4 sm:mb-5 px-4">
              Social prediction pools where creators set the odds — and bettors try to outsmart them.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-center">
              <Link href="/markets" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <RocketLaunchIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  Start Predicting
                </motion.button>
              </Link>
              
              <Link href="/create-prediction" className="w-full sm:w-auto">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  Become a Creator
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* B) Trending Markets Carousel - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                🔥 Trending Markets
              </span>
            </h2>
            <Link href="/markets" className="text-cyan-400 hover:text-cyan-300 text-xs font-medium">
              View All →
            </Link>
          </div>
          
          {loading ? (
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex-shrink-0 w-64 bg-slate-800/30 rounded-lg p-3 animate-pulse">
                  <div className="h-32 bg-slate-700/50 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : trendingPools.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory">
              {trendingPools.map((pool, index) => (
                <motion.div
                  key={pool.id}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.03, y: -3 }}
                  className="flex-shrink-0 w-64 snap-start"
                >
                  <div 
                    className="relative group bg-gradient-to-br from-slate-800/40 via-slate-800/30 to-slate-900/40 backdrop-blur-xl border border-slate-700/30 rounded-xl p-3 hover:border-cyan-500/40 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => {
                      setSelectedPool(pool);
                      setIsModalOpen(true);
                    }}
                  >
                    {/* Animated gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-blue-500/0 to-cyan-600/0 group-hover:from-cyan-500/10 group-hover:via-blue-500/10 group-hover:to-cyan-600/10 transition-all duration-500"></div>
                    
                    {/* Glow effect */}
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-600/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                            <span className="text-white text-[10px] font-bold">
                              {pool.creator.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide">Creator</p>
                            <p className="text-xs font-semibold text-white">
                              {pool.creator.slice(0, 5)}...{pool.creator.slice(-3)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                          Live
                        </div>
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-sm font-bold text-white mb-2.5 line-clamp-2 leading-snug group-hover:text-cyan-300 transition-colors">
                        {pool.title}
                      </h3>
                      
                      {/* Stats Row */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-md flex items-center justify-center border border-cyan-500/20">
                            <span className="text-xs">{(pool.odds / 100).toFixed(1)}x</span>
                          </div>
                          <div className="text-left">
                            <p className="text-[9px] text-gray-500 uppercase">Odds</p>
                            <p className="text-xs font-bold text-cyan-400">{(pool.odds / 100).toFixed(2)}x</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-gray-500 uppercase">Pool</p>
                          <p className="text-xs font-bold text-white">
                            {((parseFloat(pool.totalBettorStake) + parseFloat(pool.creatorStake)) / 1e18).toFixed(1)} {pool.usesPrix ? 'PRIX' : 'BNB'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="relative w-full bg-slate-900/50 rounded-full h-1.5 mb-2.5 overflow-hidden">
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pool.indexedData?.fillPercentage || 0}%` }}
                        >
                          <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <UsersIcon className="w-3 h-3" />
                          <span>{pool.indexedData?.participantCount || 0}</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Share functionality
                          }}
                          className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                        >
                          <ShareIcon className="w-3 h-3 text-gray-400 hover:text-cyan-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <p className="text-sm text-gray-400">No trending markets at the moment</p>
            </div>
          )}
        </motion.div>

        {/* C) Creator Spotlight - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              <span className="bg-gradient-to-r from-[#FFC107] to-[#10B981] bg-clip-text text-transparent">
                ⭐ Top Creators This Week
              </span>
            </h2>
            <Link href="/leaderboard" className="text-[#FFC107] hover:text-[#F7B600] text-xs font-medium">
              View Leaderboard →
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-slate-800/30 rounded-lg p-3 animate-pulse">
                  <div className="h-24 bg-slate-700/50 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : topCreators.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {topCreators.map((creator, index) => (
                <motion.div
                  key={creator.address}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, y: -3 }}
                  className="relative group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/30 rounded-lg p-3 text-center hover:border-purple-500/40 transition-all duration-300 overflow-hidden"
                >
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 transition-all duration-300"></div>
                  
                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-2 flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <span className="text-white text-sm font-bold">
                        {creator.username.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-xs font-semibold text-white mb-1 truncate">{creator.username}</h3>
                    <p className="text-[10px] text-gray-400 mb-1.5">{creator.totalPools} pools</p>
                    <p className="text-sm font-bold text-purple-400 mb-2">{creator.totalVolume} BNB</p>
                    <Link href={`/profile?address=${creator.address}`}>
                      <button className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-400 py-1.5 rounded-md text-[10px] font-medium transition-all border border-purple-500/20">
                        View Profile
                      </button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <p className="text-sm text-gray-400">No creators data available</p>
            </div>
          )}
        </motion.div>

        {/* D) Why Predinex? (3 Pillars) - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-6 sm:mb-8"
        >
          <div className="text-center mb-5">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Why Predinex?
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: "Creator-Powered Pools",
                description: "Open your own prediction markets and set the odds. Earn yield by being right or creative.",
                icon: SparklesIcon,
                color: "from-purple-500 to-pink-500"
              },
              {
                title: "Gamified Odds & Yield",
                description: "Earn by being right… or by being creative. The more unlikely the prediction, the higher the rewards.",
                icon: TrophySolid,
                color: "from-yellow-500 to-orange-500"
              },
              {
                title: "Trustless & Transparent",
                description: "All pools settle with on-chain validation. Everything is verifiable and transparent.",
                icon: ShieldSolid,
                color: "from-green-500 to-emerald-500"
              }
            ].map((pillar, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -3, scale: 1.02 }}
                className="relative group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/30 rounded-lg p-4 text-center hover:border-cyan-500/40 transition-all duration-300 overflow-hidden"
              >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                    pillar.color.includes('purple') ? 'bg-purple-500/10' : 
                    pillar.color.includes('yellow') ? 'bg-yellow-500/10' : 
                    'bg-green-500/10'
                  }`}></div>
                <div className="relative z-10">
                  <div className="flex justify-center mb-3">
                    <div className={`p-3 bg-gradient-to-r ${pillar.color} rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <pillar.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">{pillar.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{pillar.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* E) Latest Wins Feed - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                🎉 Latest Wins
              </span>
            </h2>
          </div>
          
          {loading ? (
            <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-700/50 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : latestWins.length > 0 ? (
            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/30 rounded-lg p-4 space-y-2.5">
              {latestWins.map((win, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="group flex items-center justify-between p-3 bg-slate-700/20 rounded-lg hover:bg-slate-700/40 border border-slate-700/20 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <TrophySolid className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {win.userAddress.slice(0, 5)}...{win.userAddress.slice(-3)} won <span className="text-emerald-400">{win.amount} {win.currency}</span>
                      </p>
                      <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{win.poolTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-500">{win.timeAgo}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-800/30 rounded-lg border border-slate-700/50">
              <p className="text-sm text-gray-400">No recent wins to display</p>
            </div>
          )}
        </motion.div>


        {/* Platform Stats - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl border border-slate-700/30 rounded-lg p-4 mb-6 sm:mb-8"
        >
          <div className="text-center mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Live Platform Stats
              </span>
            </h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: CurrencyDollarIcon, label: "Total Volume", value: `$${(parseFloat(stats.totalVolume) / 1000).toFixed(0)}k` },
              { icon: TrophyIcon, label: "Active Pools", value: stats.activePools },
              { icon: UsersIcon, label: "Participants", value: stats.participants },
              { icon: StarIcon, label: "Total Pools", value: stats.totalPools },
              { icon: AcademicCapIcon, label: "Boosted", value: stats.boostedPools },
              { icon: ChartBarIcon, label: "Trending", value: stats.trendingPools }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-slate-700/20 backdrop-blur-sm border border-slate-600/30 rounded-lg p-3 text-center group hover:border-cyan-500/40 hover:bg-slate-700/30 transition-all duration-300"
              >
                <div className="flex justify-center mb-1.5">
                  <div className="p-1.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-md shadow-md">
                    <stat.icon className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="text-base font-bold text-white mb-0.5">
                  {typeof stat.value === 'string' ? stat.value : stat.value.toLocaleString()}
                </div>
                <div className="text-[10px] text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {/* Pool Card Modal */}
      <PoolCardModal
        pool={selectedPool}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
    </>
  );
}
