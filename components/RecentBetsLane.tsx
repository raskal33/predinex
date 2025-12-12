"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getPoolIcon } from "@/services/crypto-icons";
import { optimizedPoolService } from "@/services/optimizedPoolService";
import websocketClient from "@/services/websocket-client";
import Link from "next/link";
import { 
  SparklesIcon,
  CurrencyDollarIcon,
  UserIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

interface RecentBet {
  id: number;
  poolId: string;
  bettorAddress: string;
  amount: string;
  amountFormatted: string;
  isForOutcome: boolean;
  createdAt: string;
  timeAgo: string;
  eventType?: 'bet' | 'pool_created' | 'liquidity_added';
  action?: string;
  icon?: string;
  odds?: number;
  currency?: string;
  pool: {
    predictedOutcome: string;
    league: string;
    category: string;
    homeTeam: string;
    awayTeam: string;
    title: string;
    usePrix: boolean;
    odds: number;
    creatorAddress: string;
  };
}

interface RecentBetsLaneProps {
  className?: string;
}

export default function RecentBetsLane({ className = "" }: RecentBetsLaneProps) {
  const [apiData, setApiData] = useState<RecentBet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Transform API data to component format
  const transformBets = (bets: any[]): RecentBet[] => {
    return bets.map((bet, index) => ({
      id: index + 1,
      poolId: bet.poolId.toString(),
      bettorAddress: bet.bettor,
      amount: bet.amount,
      amountFormatted: parseFloat(bet.amount).toFixed(2),
      isForOutcome: bet.isForOutcome,
      eventType: bet.eventType || 'bet',
      action: bet.action || (bet.eventType === 'liquidity_added' ? 'Added liquidity' : 'Placed bet'),
      icon: bet.icon || (bet.eventType === 'liquidity_added' ? '💧' : '🎯'),
      odds: bet.odds,
      currency: bet.currency || 'BNB',
      createdAt: new Date(bet.timestamp * 1000).toISOString(),
      timeAgo: `${Math.floor((Date.now() - bet.timestamp * 1000) / 60000)}m ago`,
      pool: {
        predictedOutcome: '',
        league: bet.league || 'Unknown',
        category: bet.category,
        homeTeam: '',
        awayTeam: '',
        title: bet.poolTitle,
        usePrix: false,
        odds: bet.odds || 0,
        creatorAddress: ''
      }
    }));
  };

  // Fetch recent bets using optimized API service
  const fetchRecentBets = useCallback(async () => {
    try {
      setIsLoading(true);
      const bets = await optimizedPoolService.getRecentBets(30);
      const transformedBets = transformBets(bets);
      setApiData(transformedBets);
    } catch (error) {
      console.error('Failed to fetch recent bets:', error);
      setApiData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Use WebSocket for real-time updates + fallback polling
  useEffect(() => {
    fetchRecentBets();
    
    const unsubscribe = websocketClient.subscribeToRecentBets((data: any) => {
      if (data.type === 'bet_placed' || data.type === 'liquidity_added') {
        if (fetchTimeoutRef.current) {
          clearTimeout(fetchTimeoutRef.current);
        }
        fetchTimeoutRef.current = setTimeout(() => {
          fetchRecentBets();
        }, 2000);
      } else if (data.bets) {
        const transformedBets = transformBets(data.bets);
        setApiData(transformedBets);
      } else {
        fetchRecentBets();
      }
    });
    
    const interval = setInterval(fetchRecentBets, 30000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchRecentBets]);

  const bets = apiData;

  const getCategoryIcon = (category: string, homeTeam?: string) => {
    const poolIcon = getPoolIcon(category, homeTeam);
    return poolIcon.icon;
  };

  const getEventIcon = (eventType?: string) => {
    switch (eventType) {
      case 'pool_created':
        return <SparklesIcon className="h-3 w-3 text-emerald-400" />;
      case 'liquidity_added':
        return <CurrencyDollarIcon className="h-3 w-3 text-purple-400" />;
      default:
        return <UserIcon className="h-3 w-3 text-cyan-400" />;
    }
  };

  const getEventColor = (eventType?: string, isForOutcome?: boolean) => {
    if (eventType === 'pool_created') return 'text-emerald-400';
    if (eventType === 'liquidity_added') return 'text-purple-400';
    return isForOutcome ? 'text-cyan-400' : 'text-orange-400';
  };

  if (isLoading && bets.length === 0) {
    return (
      <div className={`w-full bg-slate-900/40 backdrop-blur-sm border-b border-slate-800/50 py-2 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-b border-cyan-400"></div>
          <span>Loading activity...</span>
        </div>
      </div>
    );
  }

  // Always show the lane, even if empty (for better UX)
  // If no bets, show placeholder message
  if (bets.length === 0) {
    return (
      <div className={`w-full bg-slate-900/30 backdrop-blur-sm border-b border-slate-800/30 py-2 overflow-hidden ${className}`}>
        <div className="relative flex items-center gap-1">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Live</span>
          </div>
          {/* Divider */}
          <div className="w-px h-4 bg-slate-700/50 flex-shrink-0"></div>
          {/* Placeholder message */}
          <div className="flex-1 px-3">
            <span className="text-[11px] text-gray-500">No recent activity yet. Be the first to place a bet!</span>
          </div>
        </div>
      </div>
    );
  }

  // Duplicate bets for seamless loop
  const duplicatedBets = [...bets, ...bets];

  return (
    <div className={`w-full bg-slate-900/30 backdrop-blur-sm border-b border-slate-800/30 py-2 overflow-hidden ${className}`}>
      <div className="relative flex items-center gap-1">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-3 flex-shrink-0">
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Live</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-slate-700/50 flex-shrink-0"></div>

        {/* Scrolling ticker */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-hidden"
        >
          <div 
            className="flex gap-3"
            style={{
              animation: `scroll ${Math.max(bets.length * 8, 60)}s linear infinite`,
            }}
          >
            {duplicatedBets.map((bet: RecentBet, index: number) => (
              <Link
                key={`${bet.id}-${index}`}
                href={`/markets?pool=${bet.poolId}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/20 hover:border-slate-700/40 transition-all duration-200 flex-shrink-0 group"
              >
                {/* Event Icon */}
                <div className="flex-shrink-0">
                  {getEventIcon(bet.eventType)}
                </div>

                {/* User Address */}
                <span className="text-[11px] font-mono text-gray-300 group-hover:text-white transition-colors">
                  {bet.bettorAddress.slice(0, 4)}...{bet.bettorAddress.slice(-4)}
                </span>

                {/* Action */}
                <span className={`text-[11px] font-medium ${getEventColor(bet.eventType, bet.isForOutcome)}`}>
                  {bet.eventType === 'pool_created' ? 'created' : 
                   bet.eventType === 'liquidity_added' ? 'added liquidity' : 
                   bet.isForOutcome ? 'predicted YES' : 'predicted NO'}
                </span>

                {/* Pool Icon */}
                <span className="text-xs flex-shrink-0">
                  {getCategoryIcon(bet.pool.category, bet.pool.homeTeam)}
                </span>

                {/* Pool Title (truncated) */}
                <span className="text-[11px] text-gray-400 group-hover:text-gray-300 transition-colors max-w-[120px] truncate">
                  {bet.pool.title}
                </span>

                {/* Amount */}
                <span className="text-[11px] font-semibold text-white flex-shrink-0">
                  {bet.amountFormatted} {bet.currency || (bet.pool.usePrix ? 'PRIX' : 'BNB')}
                </span>

                {/* Odds */}
                {bet.odds && (
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    @{(bet.odds / 100).toFixed(2)}x
                  </span>
                )}

                {/* Time */}
                <div className="flex items-center gap-1 text-[10px] text-gray-500 flex-shrink-0">
                  <ClockIcon className="h-2.5 w-2.5" />
                  <span>{bet.timeAgo}</span>
                </div>

                {/* Separator */}
                <div className="w-px h-3 bg-slate-700/30 flex-shrink-0"></div>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
