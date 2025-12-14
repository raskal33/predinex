"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { toast } from "@/utils/toast";
import { useGaunlet, PoolState, type Match, type UserPrediction } from "@/hooks/useGaunlet";
import { gaunletService, type GaunletPool } from "@/services/gaunletService";
import { useTransactionFeedback, TransactionFeedback } from "@/components/TransactionFeedback";
import GaunletMatchSelection from "@/components/GaunletMatchSelection";
import { 
  FireIcon, 
  TrophyIcon, 
  CurrencyDollarIcon,
  UsersIcon,
  ClockIcon
} from "@heroicons/react/24/outline";
import { FaSpinner } from "react-icons/fa";

interface PoolCardProps {
  pool: GaunletPool;
  onSelect: (pool: GaunletPool) => void;
  isSelected?: boolean;
}

const PoolCard: React.FC<PoolCardProps> = ({ pool, onSelect, isSelected }) => {
  const { formatBNB, getFillPercentage, getTimeUntilBettingCloses, isBettingOpen } = useGaunlet();
  const fillPercentage = getFillPercentage(pool);
  const timeLeft = getTimeUntilBettingCloses(pool);
  const bettingOpen = isBettingOpen(pool);
  
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(pool)}
      className={`relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border ${
        isSelected ? 'border-cyan-400/50 shadow-lg shadow-cyan-500/20' : 'border-white/20'
      } p-6 cursor-pointer transition-all duration-300 hover:border-white/30`}
    >
      {/* Pool Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">Pool #{pool.poolId}</h3>
          <p className="text-sm text-gray-400">Created by {pool.creator.slice(0, 6)}...{pool.creator.slice(-4)}</p>
        </div>
        <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
          pool.state === PoolState.Active 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : pool.state === PoolState.Resolved
            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        }`}>
          {gaunletService.getPoolStateName(pool.state)}
        </div>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Entry Fee</p>
          <p className="text-lg font-bold text-cyan-400">{formatBNB(pool.entryFee)} BNB</p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Jackpot</p>
          <p className="text-lg font-bold text-yellow-400">{formatBNB(pool.creatorStake)} BNB</p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Matches</p>
          <p className="text-lg font-bold text-white">{pool.matchCount}</p>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">Slips</p>
          <p className="text-lg font-bold text-white">{pool.slipCount} / {Number(pool.maxEntries)}</p>
        </div>
      </div>

      {/* Fill Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-400">Pool Fill</span>
          <span className="text-cyan-400 font-semibold">{fillPercentage.toFixed(1)}%</span>
        </div>
        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${fillPercentage}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
          />
        </div>
      </div>

      {/* Time Until Close */}
      {bettingOpen && timeLeft > 0 && (
        <div className="flex items-center gap-2 text-sm text-yellow-400 mb-2">
          <ClockIcon className="w-4 h-4" />
          <span>Betting closes in: {hours}h {minutes}m {seconds}s</span>
        </div>
      )}

      {/* Winner Info */}
      {pool.winner && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-xs text-gray-400">Winner</p>
              <p className="text-sm font-semibold text-yellow-400">
                {pool.winner.slice(0, 6)}...{pool.winner.slice(-4)}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default function GaunletPage() {
  const { isConnected } = useAccount();
  const {
    pools,
    activePools,
    userPools,
    createPool,
    placeSlip,
    settlePool,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    refetchPools,
    formatBNB,
  } = useGaunlet();

  const { transactionStatus, showPending, showConfirming, showSuccess, showError, clearStatus } = useTransactionFeedback();

  const [activeTab, setActiveTab] = useState<"browse" | "create" | "my-pools" | "my-slips">("browse");
  const [selectedPool, setSelectedPool] = useState<GaunletPool | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSlipModal, setShowSlipModal] = useState(false);
  const [predictions] = useState<UserPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create pool form state
  const [entryFee, setEntryFee] = useState("0.1");
  const [matchCount, setMatchCount] = useState(6);
  const [creatorStake, setCreatorStake] = useState("100");

  // Load pools on mount
  useEffect(() => {
    const loadPools = async () => {
      setIsLoading(true);
      try {
        await refetchPools();
      } catch (error) {
        console.error('Error loading pools:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPools();
  }, [refetchPools]);

  // Transaction feedback
  useEffect(() => {
    if (isPending) {
      showPending("Transaction Pending", "Please confirm the transaction in your wallet");
    }
  }, [isPending, showPending]);

  useEffect(() => {
    if (isConfirming) {
      showConfirming("Processing Transaction", "Your transaction is being processed on the blockchain", hash);
    }
  }, [isConfirming, showConfirming, hash]);

  useEffect(() => {
    if (isConfirmed) {
      showSuccess("Transaction Confirmed", "Your transaction has been confirmed!");
      refetchPools();
      setShowCreateModal(false);
      setShowSlipModal(false);
    }
  }, [isConfirmed, showSuccess, refetchPools]);

  // Handle create pool
  const handleCreatePool = async (matches: any[]) => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!matches || matches.length !== matchCount) {
      toast.error(`Please select exactly ${matchCount} matches`);
      return;
    }

    // Convert fixtures to Match format for contract
    // ✅ CRITICAL FIX: Odds must be scaled by 1000 (ODDS_SCALING_FACTOR) as uint32
    // Contract expects: 2.1 odds → 2100, 1.5 odds → 1500, etc.
    const ODDS_SCALING_FACTOR = 1000;
    
    const contractMatches: Match[] = matches.map((fixture) => {
      // Parse odds as numbers and scale by 1000, then convert to uint32
      const scaleOdd = (odd: any): number => {
        const parsed = parseFloat(odd) || 1.0; // Default to 1.0 if invalid
        return Math.round(parsed * ODDS_SCALING_FACTOR);
      };
      
      return {
        id: BigInt(fixture.id),
        startTime: BigInt(Math.floor(new Date(fixture.matchDate).getTime() / 1000)),
        oddsHome: scaleOdd(fixture.odds?.home),
        oddsDraw: scaleOdd(fixture.odds?.draw),
        oddsAway: scaleOdd(fixture.odds?.away),
        oddsOver: scaleOdd(fixture.odds?.over25),
        oddsUnder: scaleOdd(fixture.odds?.under25),
        homeTeam: fixture.homeTeam.name,
        awayTeam: fixture.awayTeam.name,
        leagueName: fixture.league.name,
      };
    });

    try {
      await createPool(entryFee, matchCount, contractMatches);
      setShowCreateModal(false);
    } catch (error: any) {
      showError("Failed to Create Pool", error.message || "An error occurred");
    }
  };

  // Handle place slip
  const handlePlaceSlip = async () => {
    if (!selectedPool) return;
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    if (predictions.length !== selectedPool.matchCount) {
      toast.error(`Please make predictions for all ${selectedPool.matchCount} matches`);
      return;
    }

    try {
      await placeSlip(selectedPool.poolId, predictions);
    } catch (error: any) {
      showError("Failed to Place Slip", error.message || "An error occurred");
    }
  };

  // Handle settle pool
  const handleSettlePool = async (poolId: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      await settlePool(poolId);
    } catch (error: any) {
      showError("Failed to Settle Pool", error.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E13] via-[#0F1419] to-[#0A0E13] text-white">
      <TransactionFeedback
        status={transactionStatus}
        onClose={clearStatus}
        autoClose={true}
        autoCloseDelay={5000}
      />
      
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 animate-gradient-flow" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <TrophyIcon className="w-12 h-12 text-cyan-400" />
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                Gaunlet
              </h1>
            </div>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Creator-Funded Tournament Pools • Single Winner • Highest Odds Wins
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-cyan-500/20 rounded-lg">
                  <FireIcon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Pools</p>
                  <p className="text-2xl font-bold text-white">{pools.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Active Pools</p>
                  <p className="text-2xl font-bold text-white">{activePools.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <CurrencyDollarIcon className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Volume</p>
                  <p className="text-2xl font-bold text-white">
                    {pools.reduce((sum, p) => sum + Number(formatBNB(p.totalEntryRevenue)), 0).toFixed(1)} BNB
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-6"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <TrophyIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">My Pools</p>
                  <p className="text-2xl font-bold text-white">{userPools.length}</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 bg-[#0F1419]/80 backdrop-blur-md border border-white/5 rounded-2xl p-2 mb-8">
            <button
              onClick={() => setActiveTab("browse")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "browse"
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Browse Pools
            </button>
            <button
              onClick={() => setActiveTab("create")}
              className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                activeTab === "create"
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Create Pool
            </button>
            {isConnected && (
              <>
                <button
                  onClick={() => setActiveTab("my-pools")}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    activeTab === "my-pools"
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  My Pools
                </button>
                <button
                  onClick={() => setActiveTab("my-slips")}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                    activeTab === "my-slips"
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  My Slips
                </button>
              </>
            )}
          </div>

          {/* Content Area */}
          <div className="mt-8">
            <AnimatePresence mode="wait">
              {activeTab === "browse" && (
                <motion.div
                  key="browse"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {isLoading ? (
                    <div className="col-span-full flex items-center justify-center py-12">
                      <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
                    </div>
                  ) : activePools.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <p className="text-gray-400">No active pools available</p>
                    </div>
                  ) : (
                    activePools.map((pool) => (
                      <PoolCard
                        key={pool.poolId}
                        pool={pool}
                        onSelect={(pool) => {
                          setSelectedPool(pool);
                          setShowSlipModal(true);
                        }}
                      />
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === "create" && (
                <motion.div
                  key="create"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-2xl mx-auto"
                >
                  <div className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-6">
                    <h2 className="text-2xl font-bold mb-6">Create Tournament Pool</h2>
                    
                    {!isConnected ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 mb-4">Please connect your wallet to create a pool</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Entry Fee (BNB)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={entryFee}
                            onChange={(e) => setEntryFee(e.target.value)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                            placeholder="0.1"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Match Count (6-12)
                          </label>
                          <input
                            type="number"
                            min="6"
                            max="12"
                            value={matchCount}
                            onChange={(e) => setMatchCount(Number(e.target.value))}
                            className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Creator Stake / Target Jackpot (BNB)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={creatorStake}
                            onChange={(e) => setCreatorStake(e.target.value)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-400/50"
                            placeholder="100"
                          />
                          <p className="text-xs text-gray-400 mt-2">
                            This amount will be fully refunded when the pool ends. It represents the target jackpot.
                          </p>
                        </div>

                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                          <p className="text-sm text-yellow-400">
                            <strong>Note:</strong> You&apos;ll need to select {matchCount} matches when creating the pool. 
                            The hard cap will be calculated automatically to cover the jackpot + fees.
                          </p>
                        </div>

                        <button
                          onClick={() => setShowCreateModal(true)}
                          disabled={isPending}
                          className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPending ? (
                            <span className="flex items-center justify-center gap-2">
                              <FaSpinner className="animate-spin" />
                              Processing...
                            </span>
                          ) : (
                            "Continue to Match Selection"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === "my-pools" && (
                <motion.div
                  key="my-pools"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {!isConnected ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">Please connect your wallet to view your pools</p>
                    </div>
                  ) : userPools.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-gray-400">You haven&apos;t created any pools yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {userPools.map((pool) => (
                        <div key={pool.poolId} className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-6">
                          <PoolCard pool={pool} onSelect={() => {}} />
                          {pool.state === PoolState.Resolved && !pool.isSettled && (
                            <button
                              onClick={() => handleSettlePool(pool.poolId)}
                              className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                            >
                              Settle Pool
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "my-slips" && (
                <motion.div
                  key="my-slips"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div className="text-center py-12">
                    <p className="text-gray-400">My Slips feature coming soon</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Create Pool Modal - Match Selection */}
      <GaunletMatchSelection
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreatePool}
        requiredCount={matchCount}
        entryFee={entryFee}
        creatorStake={creatorStake}
      />

      {/* Place Slip Modal */}
      <AnimatePresence>
        {showSlipModal && selectedPool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSlipModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-[#0F1419] via-[#1A1F2E] to-[#0F1419] border border-white/20 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-4">Place Slip - Pool #{selectedPool.poolId}</h2>
              <p className="text-sm text-gray-400 mb-6">
                Make predictions for all {selectedPool.matchCount} matches. Prediction interface coming soon.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowSlipModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceSlip}
                  disabled={predictions.length !== selectedPool.matchCount || isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50"
                >
                  Place Slip ({formatBNB(selectedPool.entryFee)} BNB)
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

