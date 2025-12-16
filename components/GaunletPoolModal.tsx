"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { toast } from "@/utils/toast";
import { gaunletService, type GaunletPool, type GaunletMatch } from "@/services/gaunletService";
import { useGaunlet, BetType, type UserPrediction } from "@/hooks/useGaunlet";
import { 
  XMarkIcon,
  TrophyIcon,
  ShieldCheckIcon,
  BoltIcon,
  CheckCircleIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { FaSpinner } from "react-icons/fa";

interface GaunletPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  pool: GaunletPool | null;
}

interface Pick {
  matchId: number;
  matchIndex: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  pick: "home" | "draw" | "away" | "over" | "under";
  odd: number;
  betType: BetType;
  selection: string;
  selectedOdd: number;
  time: string;
}

export default function GaunletPoolModal({
  isOpen,
  onClose,
  pool
}: GaunletPoolModalProps) {
  const { isConnected } = useAccount();
  const { placeSlip, isPending, isConfirming, formatBNB } = useGaunlet();
  
  const [matches, setMatches] = useState<GaunletMatch[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch matches when modal opens
  useEffect(() => {
    if (!isOpen || !pool) return;

    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const poolMatches = await gaunletService.getPoolMatches(pool.poolId);
        setMatches(poolMatches);
        console.log(`✅ Loaded ${poolMatches.length} matches for pool ${pool.poolId}`);
      } catch (error) {
        console.error('Error fetching pool matches:', error);
        toast.error('Failed to load pool matches');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [isOpen, pool]);

  // Reset picks when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPicks([]);
    }
  }, [isOpen]);

  // Check if betting is open
  const isBettingOpen = useMemo(() => {
    if (!pool) return false;
    return gaunletService.isBettingOpen(pool);
  }, [pool]);

  // Calculate total odds
  const totalOdd = useMemo(() => {
    if (picks.length === 0) return 1;
    return picks.reduce((acc, pick) => acc * pick.odd, 1);
  }, [picks]);

  // Format time
  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  // Check if match has started
  const isMatchStarted = (startTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    return now >= startTime;
  };

  // Handle pick selection
  const handlePickSelection = (matchIndex: number, match: GaunletMatch, pickType: "home" | "draw" | "away" | "over" | "under") => {
    if (!pool) return;

    // Check if betting is open
    if (!isBettingOpen) {
      toast.error('Betting is closed for this pool');
      return;
    }

    // Check if match has started
    if (isMatchStarted(match.startTime)) {
      toast.error('This match has already started');
      return;
    }

    // Determine bet type and selection
    let betType: BetType;
    let selection: string;
    let odd: number;

    if (pickType === "home" || pickType === "draw" || pickType === "away") {
      betType = BetType.MONEYLINE;
      if (pickType === "home") {
        selection = "1";
        odd = match.oddsHome;
      } else if (pickType === "draw") {
        selection = "X";
        odd = match.oddsDraw;
      } else {
        selection = "2";
        odd = match.oddsAway;
      }
    } else {
      betType = BetType.OVER_UNDER;
      if (pickType === "over") {
        selection = "Over";
        odd = match.oddsOver;
      } else {
        selection = "Under";
        odd = match.oddsUnder;
      }
    }

    // Check if we already have a pick for this match
    const existingPickIndex = picks.findIndex(p => p.matchIndex === matchIndex);
    
    if (existingPickIndex >= 0) {
      // Replace existing pick
      const newPicks = [...picks];
      newPicks[existingPickIndex] = {
        matchId: Number(match.id),
        matchIndex,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        leagueName: match.leagueName,
        pick: pickType,
        odd,
        betType,
        selection,
        selectedOdd: Math.round(odd * 1000), // Scale by 1000 for contract
        time: formatTime(match.startTime)
      };
      setPicks(newPicks);
    } else {
      // Add new pick
      setPicks([...picks, {
        matchId: Number(match.id),
        matchIndex,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        leagueName: match.leagueName,
        pick: pickType,
        odd,
        betType,
        selection,
        selectedOdd: Math.round(odd * 1000), // Scale by 1000 for contract
        time: formatTime(match.startTime)
      }]);
    }
  };

  // Handle submit slip
  const handleSubmitSlip = async () => {
    if (!pool || !isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (picks.length !== pool.matchCount) {
      toast.error(`Please make predictions for all ${pool.matchCount} matches`);
      return;
    }

    if (!isBettingOpen) {
      toast.error('Betting is closed for this pool');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert picks to UserPrediction format
      // Sort by matchIndex to ensure correct order
      const sortedPicks = [...picks].sort((a, b) => a.matchIndex - b.matchIndex);
      
      const predictions: UserPrediction[] = sortedPicks.map(pick => ({
        matchId: BigInt(pick.matchId),
        betType: pick.betType,
        selection: pick.selection,
        selectedOdd: pick.selectedOdd
      }));

      await placeSlip(pool.poolId, predictions);
      
      // Reset picks after successful submission
      setPicks([]);
      toast.success('Slip placed successfully!');
    } catch (error: any) {
      console.error('Error placing slip:', error);
      toast.error(error.message || 'Failed to place slip');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !pool) return null;

  const progress = (picks.length / pool.matchCount) * 100;
  const canSubmit = picks.length === pool.matchCount && isBettingOpen && isConnected;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative overflow-hidden rounded-2xl backdrop-blur-md bg-gradient-to-br from-[#0A0E13] via-[#0F1419] to-[#0A0E13] border border-white/20 w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Pool #{pool.poolId}</h2>
                <p className="text-sm text-gray-400">
                  {pool.matchCount} matches • Entry Fee: {formatBNB(pool.entryFee)} BNB
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Pool Info Bar */}
          <div className="px-6 py-4 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-b border-yellow-500/20">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-400 mb-1">Entry Fee</p>
                <p className="text-sm font-bold text-yellow-400">{formatBNB(pool.entryFee)} BNB</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Target Jackpot</p>
                <p className="text-sm font-bold text-orange-400">{formatBNB(pool.creatorStake)} BNB</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Pool Fill</p>
                <p className="text-sm font-bold text-red-400">
                  {pool.slipCount} / {Number(pool.maxEntries)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Status</p>
                <p className={`text-sm font-bold ${
                  isBettingOpen ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isBettingOpen ? 'Betting Open' : 'Betting Closed'}
                </p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 bg-black/30 border-b border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-cyan-400" />
                <span className="text-sm font-semibold text-white">
                  {picks.length} / {pool.matchCount} predictions selected
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {pool.matchCount - picks.length} remaining
              </span>
            </div>
            <div className="relative h-2 bg-black/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-full ${
                  canSubmit
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500"
                }`}
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* Matches Table - Left Side */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-white/10">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
                  <span className="ml-3 text-gray-400">Loading matches...</span>
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No matches found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-2 mb-2 px-2">
                    <div className="col-span-1 text-center">
                      <div className="text-[10px] text-gray-400 font-semibold">Time</div>
                    </div>
                    <div className="col-span-4 text-center">
                      <div className="text-[10px] text-gray-400 font-semibold">Match</div>
                    </div>
                    <div className="col-span-3 text-center">
                      <div className="text-[10px] text-gray-400 font-semibold">1 X 2</div>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="text-[10px] text-gray-400 font-semibold">Over - Under</div>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="text-[10px] text-gray-400 font-semibold">League</div>
                    </div>
                  </div>
                  
                  {/* Match Rows */}
                  {matches.map((match, index) => {
                    const matchStarted = isMatchStarted(match.startTime);
                    const existingPick = picks.find(p => p.matchIndex === index);
                    const isDisabled = !isBettingOpen || matchStarted;

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`grid grid-cols-12 gap-2 p-3 rounded-lg backdrop-blur-md bg-gradient-to-br from-[#0F1419]/80 via-[#1A1F2E]/60 to-[#0F1419]/80 border ${
                          existingPick 
                            ? "border-cyan-500/40 bg-cyan-500/5" 
                            : "border-white/10 hover:border-white/20"
                        } transition-all duration-200 relative`}
                      >
                        {/* Time */}
                        <div className="col-span-1 flex items-center justify-center">
                          <div className={`text-xs font-mono px-2 py-1 rounded ${
                            matchStarted
                              ? "text-red-400 bg-red-500/10 border border-red-500/20"
                              : "text-gray-400 bg-white/5"
                          }`}>
                            <div className="font-bold text-[10px]">
                              {formatTime(match.startTime)}
                            </div>
                            {matchStarted ? (
                              <div className="text-[8px] text-red-400 font-bold">STARTED</div>
                            ) : (
                              <div className="text-[8px] text-gray-500">AM</div>
                            )}
                          </div>
                        </div>

                        {/* Match Teams */}
                        <div className="col-span-4 flex items-center justify-center">
                          <div className="text-xs font-semibold text-white text-center leading-tight">
                            <div className="truncate max-w-[140px]">{match.homeTeam}</div>
                            <div className="text-[10px] text-gray-500">vs</div>
                            <div className="truncate max-w-[140px]">{match.awayTeam}</div>
                          </div>
                        </div>

                        {/* 1X2 Market */}
                        <div className="col-span-3 flex items-center gap-1">
                          <button
                            onClick={() => handlePickSelection(index, match, "home")}
                            disabled={isDisabled}
                            className={`flex-1 px-2 py-1.5 text-center rounded transition-all duration-200 font-bold text-xs ${
                              isDisabled
                                ? "bg-[#0A0E13]/80 text-white/30 cursor-not-allowed opacity-50 border border-white/5"
                                : existingPick?.pick === "home"
                                ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white scale-105 shadow-lg shadow-cyan-500/30"
                                : "bg-white/5 text-white hover:bg-cyan-500/20 hover:text-cyan-300 border border-transparent hover:border-cyan-500/30"
                            }`}
                          >
                            <div className="text-[10px] opacity-75">1</div>
                            <div>{match.oddsHome.toFixed(2)}</div>
                          </button>
                          
                          <button
                            onClick={() => handlePickSelection(index, match, "draw")}
                            disabled={isDisabled}
                            className={`flex-1 px-2 py-1.5 text-center rounded transition-all duration-200 font-bold text-xs ${
                              isDisabled
                                ? "bg-[#0A0E13]/80 text-white/30 cursor-not-allowed opacity-50 border border-white/5"
                                : existingPick?.pick === "draw"
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white scale-105 shadow-lg shadow-purple-500/30"
                                : "bg-white/5 text-white hover:bg-purple-500/20 hover:text-purple-300 border border-transparent hover:border-purple-500/30"
                            }`}
                          >
                            <div className="text-[10px] opacity-75">X</div>
                            <div>{match.oddsDraw.toFixed(2)}</div>
                          </button>
                          
                          <button
                            onClick={() => handlePickSelection(index, match, "away")}
                            disabled={isDisabled}
                            className={`flex-1 px-2 py-1.5 text-center rounded transition-all duration-200 font-bold text-xs ${
                              isDisabled
                                ? "bg-[#0A0E13]/80 text-white/30 cursor-not-allowed opacity-50 border border-white/5"
                                : existingPick?.pick === "away"
                                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white scale-105 shadow-lg shadow-orange-500/30"
                                : "bg-white/5 text-white hover:bg-orange-500/20 hover:text-orange-300 border border-transparent hover:border-orange-500/30"
                            }`}
                          >
                            <div className="text-[10px] opacity-75">2</div>
                            <div>{match.oddsAway.toFixed(2)}</div>
                          </button>
                        </div>

                        {/* Over/Under Market */}
                        <div className="col-span-2 flex items-center gap-1">
                          <button
                            onClick={() => handlePickSelection(index, match, "over")}
                            disabled={isDisabled}
                            className={`flex-1 px-1.5 py-1.5 text-center rounded transition-all duration-200 font-bold text-xs ${
                              isDisabled
                                ? "bg-[#0A0E13]/80 text-white/30 cursor-not-allowed opacity-50 border border-white/5"
                                : existingPick?.pick === "over"
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white scale-105 shadow-lg shadow-blue-500/30"
                                : "bg-white/5 text-white hover:bg-blue-500/20 hover:text-blue-300 border border-transparent hover:border-blue-500/30"
                            }`}
                          >
                            <div className="text-[10px] opacity-75">O</div>
                            <div>{match.oddsOver.toFixed(2)}</div>
                          </button>
                          
                          <button
                            onClick={() => handlePickSelection(index, match, "under")}
                            disabled={isDisabled}
                            className={`flex-1 px-1.5 py-1.5 text-center rounded transition-all duration-200 font-bold text-xs ${
                              isDisabled
                                ? "bg-[#0A0E13]/80 text-white/30 cursor-not-allowed opacity-50 border border-white/5"
                                : existingPick?.pick === "under"
                                ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white scale-105 shadow-lg shadow-indigo-500/30"
                                : "bg-white/5 text-white hover:bg-indigo-500/20 hover:text-indigo-300 border border-transparent hover:border-indigo-500/30"
                            }`}
                          >
                            <div className="text-[10px] opacity-75">U</div>
                            <div>{match.oddsUnder.toFixed(2)}</div>
                          </button>
                        </div>

                        {/* League */}
                        <div className="col-span-2 flex items-center justify-center">
                          <div className="text-[10px] text-gray-400 truncate max-w-[100px]">
                            {match.leagueName}
                          </div>
                        </div>

                        {/* Selection Indicator */}
                        {existingPick && (
                          <div className="absolute top-1 right-1 z-10">
                            <div className="p-1 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full shadow-lg">
                              <CheckCircleIcon className="h-3 w-3 text-white" />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Slip Builder - Right Side */}
            <div className="w-96 border-l border-white/10 overflow-y-auto bg-black/20">
              <div className="p-6 sticky top-0 bg-black/40 backdrop-blur-md border-b border-white/10 z-10">
                <h3 className="text-lg font-bold text-white mb-4 text-center flex items-center justify-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-cyan-400" />
                  <span>Slip Builder</span>
                </h3>

                {/* Wallet Connection Prompt */}
                {!isConnected && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl"
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <BoltIcon className="h-5 w-5 text-cyan-400" />
                        <span className="font-semibold text-cyan-400">Connect Wallet</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Connect your wallet to place slips
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Picks List */}
                {picks.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                    {picks.sort((a, b) => a.matchIndex - b.matchIndex).map((pick, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="relative overflow-hidden rounded-lg backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-3 hover:border-white/30 transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs text-gray-400 mb-1">Match {pick.matchIndex + 1}</div>
                                    <div className="text-xs text-white font-medium mb-2 leading-tight truncate">
                                      {pick.homeTeam} vs {pick.awayTeam}
                                    </div>
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                pick.pick === "home" ? "bg-cyan-500/20 text-cyan-300" :
                                pick.pick === "draw" ? "bg-purple-500/20 text-purple-300" :
                                pick.pick === "away" ? "bg-orange-500/20 text-orange-300" :
                                pick.pick === "over" ? "bg-blue-500/20 text-blue-300" :
                                "bg-indigo-500/20 text-indigo-300"
                              }`}>
                                {pick.pick === "home" ? "1" :
                                 pick.pick === "draw" ? "X" :
                                 pick.pick === "away" ? "2" :
                                 pick.pick === "over" ? "O2.5" : "U2.5"}
                              </span>
                              <span className="text-white font-bold text-sm">{pick.odd.toFixed(2)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setPicks(picks.filter((_, idx) => idx !== i))}
                            className="ml-2 text-red-400 hover:text-red-300 transition-colors flex-shrink-0 p-1 hover:bg-red-500/10 rounded"
                          >
                            ×
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                    <div className="text-center py-8 mb-4">
                      <div className="text-6xl mb-4 opacity-50">⚽</div>
                      <h4 className="font-semibold text-white mb-2">Start Building Your Slip</h4>
                      <p className="text-gray-400 text-sm">
                        Click on any odds to add selections
                      </p>
                    </div>
                )}

                {/* Slip Summary */}
                {picks.length > 0 && (
                  <div className="border-t border-white/10 pt-4 space-y-2 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Selections:</span>
                      <span className="text-white font-bold">{picks.length}/{pool.matchCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Total Odds:</span>
                      <span className="text-cyan-400 font-bold">{totalOdd.toFixed(2)}x</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Entry Fee:</span>
                      <span className="text-white font-bold">{formatBNB(pool.entryFee)} BNB</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Potential Win:</span>
                      <span className="text-yellow-400 font-bold">
                        {(totalOdd * parseFloat(formatBNB(pool.entryFee))).toFixed(4)} BNB
                      </span>
                    </div>
                  </div>
                )}

                {/* Ready to Submit Indicator */}
                {canSubmit && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-semibold text-sm">Ready to Submit!</span>
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmitSlip}
                  disabled={!canSubmit || isSubmitting || isPending || isConfirming}
                  className={`w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-blue-500 ${
                    canSubmit && !isSubmitting && !isPending && !isConfirming ? 'animate-pulse' : ''
                  }`}
                >
                  {isSubmitting || isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <FaSpinner className="animate-spin" />
                      {isPending ? "Confirming..." : "Processing..."}
                    </span>
                  ) : isConfirming ? (
                    <span className="flex items-center justify-center gap-2">
                      <FaSpinner className="animate-spin" />
                      Processing Transaction...
                    </span>
                  ) : !isConnected ? (
                    "Connect Wallet"
                  ) : !isBettingOpen ? (
                    "Betting Closed"
                  ) : picks.length === 0 ? (
                    "Select Predictions"
                  ) : picks.length < pool.matchCount ? (
                    `Need ${pool.matchCount - picks.length} More`
                  ) : (
                    `Place Slip (${formatBNB(pool.entryFee)} BNB)`
                  )}
                </button>

                {/* Clear All Button */}
                {picks.length > 0 && (
                  <button
                    onClick={() => {
                      setPicks([]);
                      toast.success('All selections cleared');
                    }}
                    className="w-full text-gray-400 hover:text-red-400 transition-colors text-sm pt-2 mt-2"
                    disabled={isSubmitting || isPending || isConfirming}
                  >
                    Clear All Selections
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

