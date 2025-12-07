"use client";

import React from "react";
import Button from "@/components/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { toast } from "react-hot-toast";
import { formatEther } from "viem";

import { gauntletService, type GauntletMatch, type CycleInfo } from "@/services/gauntletService";
import { useTransactionFeedback, TransactionFeedback } from "@/components/TransactionFeedback";
import { safeStartTimeToISOString } from "@/utils/time-helpers";
import GauntletMatchResults from "@/components/GauntletMatchResults";
import GauntletLeaderboard from "@/components/GauntletLeaderboard";
import EnhancedSlipDisplay from "@/components/EnhancedSlipDisplay";
import PrizeClaimModal from "@/components/PrizeClaimModal";
import StatsDashboard from "@/components/StatsDashboard";
import {
  FireIcon,
  TrophyIcon,
  BoltIcon,
  ShieldCheckIcon,
  GiftIcon,
  TicketIcon,
  ChartBarIcon,
  BanknotesIcon,
  CalendarIcon,
  RocketLaunchIcon
} from "@heroicons/react/24/outline";
import { FaSpinner } from "react-icons/fa";

interface Pick {
  id: number;
  time: string;
  match: string;
  pick: "home" | "draw" | "away" | "over" | "under";
  odd: number;
  team1: string;
  team2: string;
  slipId?: number;
  cycleId?: number;
  finalScore?: number;
  correctCount?: number;
  isEvaluated?: boolean;
  placedAt?: string;
  status?: string;
  totalOdds?: number;
  potentialPayout?: number;
  leaderboardRank?: number;
  prizeClaimed?: boolean;
  isCorrect?: boolean | null;
  actualResult?: string;
  matchResult?: {
    homeScore?: number;
    awayScore?: number;
    result?: string;
    status?: string;
  };
}

interface EnhancedSlip {
  id: number;
  cycleId: number;
  placedAt: number;
  predictions: {
    matchId: number;
    betType: number;
    selection: string;
    selectedOdd: number;
    homeTeam: string;
    awayTeam: string;
    leagueName: string;
    isCorrect?: boolean;
  }[];
  finalScore: number;
  correctCount: number;
  isEvaluated: boolean;
  status: 'pending' | 'evaluated' | 'won' | 'lost';
  cycleResolved?: boolean;
}

export default function GauntletPage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  // State management
  const [activeTab, setActiveTab] = useState<"matches" | "slips" | "results" | "leaderboard" | "claim" | "analytics">("matches");
  const [picks, setPicks] = useState<Pick[]>([]);
  const [currentMatches, setCurrentMatches] = useState<GauntletMatch[]>([]);
  const [allSlips, setAllSlips] = useState<EnhancedSlip[]>([]);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [entryFee, setEntryFee] = useState<string>("0.01");
  const [isExpired, _setIsExpired] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    transactionStatus,
    showSuccess,
    showError,
    showPending,
    showConfirming,
    clearStatus
  } = useTransactionFeedback();

  // Calculate total odds
  const calculateTotalOdds = (picks: Pick[]) => {
    const total = picks.reduce((acc, pick) => acc * (pick.odd || 1), 1);
    return total.toFixed(2);
  };

  const totalOdd = calculateTotalOdds(picks);

  // Check if any matches have started
  const hasStartedMatches = picks.some(pick => {
    const match = currentMatches.find(m => Number(m.id) === pick.id);
    if (!match) return false;
    const startTime = new Date(safeStartTimeToISOString(match.startTime));
    return startTime <= new Date();
  });

  // Fetch data on mount and when address changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cycleData, matchesData, feeData] = await Promise.all([
          gauntletService.getCurrentCycleInfo(),
          gauntletService.getMatches(),
          gauntletService.getEntryFee()
        ]);

        if (cycleData) setCycleInfo(cycleData);
        if (matchesData && Array.isArray(matchesData)) {
          setCurrentMatches(matchesData);
        } else {
          setCurrentMatches([]);
        }
        if (feeData) setEntryFee(formatEther(BigInt(feeData)));

        setIsInitialized(true);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load Gauntlet data");
      }
    };

    fetchData();
  }, [address]);

  // Fetch user slips
  useEffect(() => {
    const fetchSlips = async () => {
      if (!address || !cycleInfo) return;

      try {
        const result = await gauntletService.getUserSlipsForCycleFromBackend(Number(cycleInfo.cycleId), address);
        if (result.success && result.data && Array.isArray(result.data)) {
          setAllSlips(result.data);
        }
      } catch (error) {
        console.error("Error fetching slips:", error);
      }
    };

    fetchSlips();
  }, [address, cycleInfo]);

  // Handle pick selection
  const handlePickSelection = (matchId: number, selection: "home" | "draw" | "away" | "over" | "under") => {
    const match = currentMatches.find(m => Number(m.id) === matchId);
    if (!match) return;

    const existingPickIndex = picks.findIndex(p => p.id === matchId);

    if (existingPickIndex >= 0) {
      if (picks[existingPickIndex].pick === selection) {
        // Remove pick if clicking same selection
        setPicks(picks.filter((_, i) => i !== existingPickIndex));
        toast.success("Selection removed");
      } else {
        // Update pick
        const newPicks = [...picks];
        newPicks[existingPickIndex] = {
          ...newPicks[existingPickIndex],
          pick: selection,
          odd: selection === "home" ? match.oddsHome :
            selection === "draw" ? match.oddsDraw :
              selection === "away" ? match.oddsAway :
                selection === "over" ? match.oddsOver : match.oddsUnder
        };
        setPicks(newPicks);
        toast.success("Selection updated");
      }
    } else {
      if (picks.length >= 10) {
        toast.error("Maximum 10 matches allowed");
        return;
      }

      const newPick: Pick = {
        id: matchId,
        time: new Date(safeStartTimeToISOString(match.startTime)).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        match: `${match.homeTeam} vs ${match.awayTeam}`,
        pick: selection,
        odd: selection === "home" ? match.oddsHome :
          selection === "draw" ? match.oddsDraw :
            selection === "away" ? match.oddsAway :
              selection === "over" ? match.oddsOver : match.oddsUnder,
        team1: match.homeTeam,
        team2: match.awayTeam
      };

      setPicks([...picks, newPick]);
      toast.success("Selection added");
    }
  };

  // Handle slip submission
  const handleSubmitSlip = async () => {
    if (picks.length !== 10) {
      toast.error("Please select exactly 10 matches");
      return;
    }

    if (!isConnected || !address || !walletClient) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!cycleInfo) {
      toast.error("No active cycle");
      return;
    }

    try {
      setIsPending(true);
      showPending("Submitting Slip", "Please confirm the transaction in your wallet...");

      const hash = await gauntletService.placeSlip(
        picks.map(p => ({
          matchId: p.id,
          prediction: p.pick === "home" ? "1" : p.pick === "draw" ? "X" : p.pick === "away" ? "2" : p.pick === "over" ? "Over" : "Under",
          odds: p.odd
        }))
      );

      if (hash) {
        setIsConfirming(true);
        showConfirming("Processing", "Transaction submitted! Waiting for confirmation...", hash);

        // Wait a bit for the transaction to be mined
        await new Promise(resolve => setTimeout(resolve, 2000));

        showSuccess("Success!", "Slip submitted successfully!", hash);
        setPicks([]);

        // Refresh slips
        const result = await gauntletService.getUserSlipsForCycleFromBackend(Number(cycleInfo.cycleId), address);
        if (result.success && result.data && Array.isArray(result.data)) {
          setAllSlips(result.data);
        }
      }
    } catch (error: any) {
      console.error("Error submitting slip:", error);
      showError("Error", error.message || "Failed to submit slip");
    } finally {
      setIsPending(false);
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Transaction Feedback */}
      <TransactionFeedback
        status={transactionStatus}
        onClose={clearStatus}
        autoClose={true}
        autoCloseDelay={5000}
        showProgress={true}
      />

      {/* Prize Claim Modal */}
      <PrizeClaimModal
        isOpen={showPrizeModal}
        onClose={() => setShowPrizeModal(false)}
        userAddress={address}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <div className="text-center space-y-4">
            {/* Title - Smaller */}
            <motion.h1
              className="text-4xl md:text-5xl font-black tracking-tight"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-600 bg-clip-text text-transparent">
                GAUNTLET
              </span>
            </motion.h1>

            {/* Compact Prize Pool & Stats Card */}
            {!isInitialized ? (
              <div className="h-20 w-full max-w-2xl mx-auto bg-slate-800/30 rounded-xl animate-pulse" />
            ) : cycleInfo ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block"
              >
                <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-orange-500/20 rounded-2xl px-8 py-4 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 transition-all duration-300">
                  <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
                    {/* Cycle Number */}
                    <div className="text-center group">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 group-hover:text-orange-400 transition-colors">Cycle</div>
                      <div className="text-xl font-bold text-white font-mono">#{cycleInfo.cycleId.toString()}</div>
                    </div>

                    <div className="hidden sm:block h-10 w-px bg-gradient-to-b from-transparent via-gray-700 to-transparent" />

                    {/* Prize Pool */}
                    <div className="text-center group">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 group-hover:text-yellow-400 transition-colors">Prize Pool</div>
                      <div className="text-xl font-black bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                        {parseFloat(formatEther(cycleInfo.prizePool)).toFixed(2)} BNB
                      </div>
                    </div>

                    <div className="hidden sm:block h-10 w-px bg-gradient-to-b from-transparent via-gray-700 to-transparent" />

                    {/* Number of Slips */}
                    <div className="text-center group">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 group-hover:text-blue-400 transition-colors">Slips</div>
                      <div className="text-xl font-bold text-white">{cycleInfo.slipCount?.toString() || '0'}</div>
                    </div>

                    <div className="hidden sm:block h-10 w-px bg-gradient-to-b from-transparent via-gray-700 to-transparent" />

                    {/* Number of Participants */}
                    <div className="text-center group">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 group-hover:text-purple-400 transition-colors">Players</div>
                      <div className="text-xl font-bold text-white">
                        {new Set(allSlips.map((slip: any) => slip.user || slip.userAddress)).size || '0'}
                      </div>
                    </div>

                    <div className="hidden sm:block h-10 w-px bg-gradient-to-b from-transparent via-gray-700 to-transparent" />

                    {/* Entry Fee */}
                    <div className="text-center group">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1 group-hover:text-emerald-400 transition-colors">Entry</div>
                      <div className="text-xl font-bold text-emerald-400">{entryFee} BNB</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="inline-block px-6 py-4 bg-slate-900/50 rounded-xl border border-slate-700/50"
              >
                <div className="flex items-center gap-3 text-gray-400">
                  <CalendarIcon className="h-5 w-5" />
                  <span>No active cycle currently running. Check back soon!</span>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Tab Navigation - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center"
        >
          <div className="inline-flex bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-2 gap-2">
            {[
              { id: "matches", label: "Matches", icon: FireIcon },
              { id: "slips", label: "My Slips", icon: TicketIcon },
              { id: "results", label: "Results", icon: TrophyIcon },
              { id: "leaderboard", label: "Leaderboard", icon: ChartBarIcon },
              { id: "analytics", label: "Analytics", icon: RocketLaunchIcon },
              { id: "claim", label: "Claim", icon: BanknotesIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${activeTab === tab.id
                  ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-500/25"
                  : "text-gray-400 hover:text-white hover:bg-slate-700/50"
                  }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Main Content Area */}
        <AnimatePresence mode="wait">
          {/* Matches Tab */}
          {activeTab === "matches" && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Matches List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <FireIcon className="h-6 w-6 text-orange-500" />
                    Current Matches
                  </h2>

                  {currentMatches.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <CalendarIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>No matches available</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Array.isArray(currentMatches) && currentMatches.slice(0, 10).map((match, index) => {
                        const matchId = Number(match.id);
                        const selectedPick = picks.find(p => p.id === matchId);
                        const isStarted = new Date(safeStartTimeToISOString(match.startTime)) <= new Date();

                        return (
                          <motion.div
                            key={matchId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 hover:border-orange-500/30 transition-all"
                          >
                            {/* Match Header */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="text-sm text-gray-400">
                                {new Date(safeStartTimeToISOString(match.startTime)).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-xs text-gray-500">{match.leagueName}</div>
                            </div>

                            {/* Teams */}
                            <div className="text-center mb-4">
                              <div className="text-lg font-semibold text-white">
                                {match.homeTeam} <span className="text-gray-500">vs</span> {match.awayTeam}
                              </div>
                            </div>

                            {/* Betting Options */}
                            <div className="grid grid-cols-5 gap-2">
                              {/* 1X2 */}
                              {["home", "draw", "away"].map((type) => (
                                <button
                                  key={type}
                                  onClick={() => handlePickSelection(matchId, type as any)}
                                  disabled={isStarted || isExpired}
                                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${selectedPick?.pick === type
                                    ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg scale-105"
                                    : "bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 hover:text-white"
                                    } ${(isStarted || isExpired) ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <div className="text-xs opacity-75">
                                    {type === "home" ? "1" : type === "draw" ? "X" : "2"}
                                  </div>
                                  <div>
                                    {type === "home" ? match.oddsHome.toFixed(2) :
                                      type === "draw" ? match.oddsDraw.toFixed(2) :
                                        match.oddsAway.toFixed(2)}
                                  </div>
                                </button>
                              ))}

                              {/* O/U */}
                              {["over", "under"].map((type) => (
                                <button
                                  key={type}
                                  onClick={() => handlePickSelection(matchId, type as any)}
                                  disabled={isStarted || isExpired}
                                  className={`px-3 py-2 rounded-lg font-bold text-sm transition-all ${selectedPick?.pick === type
                                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg scale-105"
                                    : "bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 hover:text-white"
                                    } ${(isStarted || isExpired) ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <div className="text-xs opacity-75">
                                    {type === "over" ? "O2.5" : "U2.5"}
                                  </div>
                                  <div>
                                    {type === "over" ? match.oddsOver.toFixed(2) : match.oddsUnder.toFixed(2)}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Slip Builder - Redesigned */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 sticky top-24">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <ShieldCheckIcon className="h-6 w-6 text-orange-500" />
                    Slip Builder
                  </h3>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Selections</span>
                      <span className={`font-bold ${picks.length === 10 ? 'text-green-400' : 'text-orange-500'}`}>
                        {picks.length}/10
                      </span>
                    </div>
                    <div className="w-full bg-slate-700/30 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${picks.length === 10 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-yellow-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(picks.length / 10) * 100}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>

                  {/* Picks List */}
                  {picks.length > 0 ? (
                    <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                      {picks.map((pick, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="text-xs text-gray-400 mb-1">{pick.time}</div>
                              <div className="text-sm text-white font-medium">{pick.match}</div>
                            </div>
                            <button
                              onClick={() => setPicks(picks.filter((_, index) => index !== i))}
                              className="text-red-400 hover:text-red-300 ml-2"
                            >
                              ×
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-orange-400">
                              {pick.pick === "home" ? "1" :
                                pick.pick === "draw" ? "X" :
                                  pick.pick === "away" ? "2" :
                                    pick.pick === "over" ? "O2.5" : "U2.5"}
                            </span>
                            <span className="text-sm font-bold text-white">{pick.odd.toFixed(2)}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <RocketLaunchIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">Select 10 matches to build your slip</p>
                    </div>
                  )}

                  {/* Summary */}
                  {picks.length > 0 && (
                    <div className="space-y-3 mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Odds</span>
                        <span className="font-bold text-orange-400">{totalOdd}x</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Entry Fee</span>
                        <span className="font-bold text-white">{entryFee} BNB</span>
                      </div>
                      <div className="flex justify-between text-sm pt-3 border-t border-slate-700/50">
                        <span className="text-gray-400">Potential Win</span>
                        <span className="font-bold text-green-400">
                          {(parseFloat(totalOdd) * parseFloat(entryFee)).toFixed(2)} BNB
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    fullWidth
                    variant="primary"
                    size="lg"
                    leftIcon={isPending || isConfirming ? <FaSpinner className="animate-spin" /> : <BoltIcon className="h-5 w-5" />}
                    onClick={handleSubmitSlip}
                    disabled={picks.length !== 10 || hasStartedMatches || isPending || isConfirming || !isInitialized}
                    className={`${picks.length === 10 && !hasStartedMatches && !isPending && !isConfirming ? 'animate-pulse' : ''}`}
                  >
                    {isPending ? "Confirming..." :
                      isConfirming ? "Processing..." :
                        picks.length !== 10 ? `Need ${10 - picks.length} More` :
                          hasStartedMatches ? "Betting Closed" :
                            "Place Slip"}
                  </Button>

                  {picks.length > 0 && (
                    <button
                      onClick={() => setPicks([])}
                      className="w-full mt-3 text-sm text-gray-400 hover:text-red-400 transition-colors"
                      disabled={isPending || isConfirming}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* My Slips Tab */}
          {activeTab === "slips" && (
            <motion.div
              key="slips"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <TicketIcon className="h-6 w-6 text-orange-500" />
                  My Submitted Slips
                </h2>
                <EnhancedSlipDisplay slips={allSlips} />
              </div>
            </motion.div>
          )}

          {/* Results Tab */}
          {activeTab === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <TrophyIcon className="h-6 w-6 text-orange-500" />
                  Match Results
                </h2>
                <GauntletMatchResults cycleId={cycleInfo ? Number(cycleInfo.cycleId) : undefined} />
              </div>
            </motion.div>
          )}

          {/* Leaderboard Tab */}
          {activeTab === "leaderboard" && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <ChartBarIcon className="h-6 w-6 text-yellow-500" />
                  Leaderboard
                </h2>
                <GauntletLeaderboard />
              </div>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-slate-800/30 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <RocketLaunchIcon className="h-6 w-6 text-purple-500" />
                  Analytics Dashboard
                </h2>
                <StatsDashboard />
              </div>
            </motion.div>
          )}

          {/* Claim Tab */}
          {activeTab === "claim" && (
            <motion.div
              key="claim"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-12 text-center">
                <div className="max-w-2xl mx-auto">
                  <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                    <BanknotesIcon className="h-12 w-12 text-emerald-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4">Claim Your Winnings</h2>
                  <p className="text-gray-300 mb-8 text-lg">
                    Check if you have any unclaimed prizes from previous cycles
                  </p>

                  <button
                    onClick={() => setShowPrizeModal(true)}
                    className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-emerald-500/25 hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
                  >
                    <GiftIcon className="h-6 w-6" />
                    Open Prize Portal
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
