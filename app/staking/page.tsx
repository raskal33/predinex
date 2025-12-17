"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import Button from "@/components/button";
import LoadingSpinner from "@/components/LoadingSpinner";
import AmountInput from "@/components/AmountInput";
import { useStaking, DurationOption, StakeWithRewards } from "@/hooks/useStaking";
import { usePRIXToken } from "@/hooks/usePRIXToken";
import { useTransactionFeedback, TransactionFeedback } from "@/components/TransactionFeedback";
import { CONTRACTS } from "@/contracts";
import { parseUnits } from "viem";
import { IoMdLock } from "react-icons/io";
import { isBigIntZero } from "@/utils/bigint-helpers";
import { formatPercentage } from "@/utils/number-helpers";
import {
  FaTrophy,
  FaChartLine,
  FaCoins,
  FaCrown,
  FaStar,
  FaGem,
  FaClock,
  FaMoneyBillWave
} from "react-icons/fa";
import { BoltIcon as BoltSolid, SparklesIcon as SparklesIconSolid } from "@heroicons/react/24/solid";

const TIER_ICONS = [FaCoins, FaStar, FaTrophy, FaCrown, FaGem];
const TIER_COLORS = [
  "text-orange-400", // Bronze
  "text-gray-400",   // Silver  
  "text-yellow-400", // Gold
  "text-purple-400", // Platinum
  "text-blue-400"    // Diamond
];

export default function StakingPage() {
  const { isConnected } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedTier, setSelectedTier] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DurationOption.THIRTY_DAYS);
  const [needsApproval, setNeedsApproval] = useState(false);
  const isMountedRef = useRef(true);

  // Smart contract hooks
  const staking = useStaking();
  const token = usePRIXToken();

  // Transaction feedback system
  const { transactionStatus, showSuccess, showError, showInfo, clearStatus } = useTransactionFeedback();

  // Comprehensive safety check for all staking data
  const isDataLoaded = () => {
    return staking.tiers &&
      Array.isArray(staking.tiers) &&
      staking.tiers.length > 0 &&
      staking.durationOptions &&
      Array.isArray(staking.durationOptions) &&
      staking.durationOptions.length > 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Check if approval is needed
  useEffect(() => {
    if (stakeAmount && token.balance && isMountedRef.current) {
      const allowance = token.getAllowance(CONTRACTS.PREDINEX_STAKING.address);
      const stakeAmountWei = parseUnits(stakeAmount, 18);
      setNeedsApproval(!allowance || (allowance as bigint) < stakeAmountWei);
    }
  }, [stakeAmount, token, token.balance, token.stakingAllowance]);

  // Auto tier selection based on stake amount
  useEffect(() => {
    if (stakeAmount && staking.tiers && staking.tiers.length > 0 && isMountedRef.current) {
      const amount = parseFloat(stakeAmount);
      if (amount > 0) {
        // Find the highest tier the user can access
        let selectedTierIndex = 0;
        for (let i = staking.tiers.length - 1; i >= 0; i--) {
          const tier = staking.tiers[i];
          if (tier && tier.minStake) {
            const minStakeAmount = parseFloat(staking.formatAmount(tier.minStake));
            if (amount >= minStakeAmount) {
              selectedTierIndex = i;
              break;
            }
          }
        }
        setSelectedTier(selectedTierIndex);
      }
    }
  }, [stakeAmount, staking.tiers, staking]);

  // Refresh allowance when approval is confirmed
  useEffect(() => {
    if (token.isConfirmed && isMountedRef.current) {
      token.refetchAll();
      toast.success("Approval confirmed! 🎉");
      setNeedsApproval(false);
    }
  }, [token.isConfirmed, token]);

  // Watch for successful transactions with proper cleanup
  useEffect(() => {
    if (staking.isConfirmed && isMountedRef.current) {
      // Determine which transaction was confirmed based on the transaction state
      if (staking.claimingStakeIndex !== null) {
        toast.success("Rewards claimed successfully! 🎉");
      } else if (staking.unstakingStakeIndex !== null) {
        toast.success("Stake unstaked successfully! 🎉");
      } else if (staking.isClaimingRevenue) {
        toast.success("Revenue share claimed successfully! 🎉");
      } else if (staking.isStaking) {
        toast.success("Stake created successfully! 🎉");
      } else {
        toast.success("Transaction confirmed! 🎉");
      }

      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          try {
            token.refetchBalance();
          } catch (error) {
            console.error('Error refetching token balance:', error);
          }
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }
  }, [staking.isConfirmed, staking.claimingStakeIndex, staking.unstakingStakeIndex, staking.isClaimingRevenue, staking.isStaking, token]);

  // Handle transaction state changes with proper cleanup
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (staking.isPending) {
      showInfo("Transaction Pending", "Please confirm the transaction in your wallet...");
    } else if (staking.isConfirmed && staking.hash) {
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          showSuccess("Transaction Successful", "Transaction completed successfully!", staking.hash);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [staking.isPending, staking.isConfirmed, staking.hash, showInfo, showSuccess]);

  // Handle token approval state changes
  useEffect(() => {
    if (token.isPending && isMountedRef.current) {
      showInfo("Approval Pending", "Please confirm the approval transaction in your wallet...");
    } else if (token.isConfirmed && isMountedRef.current) {
      showSuccess("Approval Successful", "Successfully approved PRIX for staking", token.hash);
    }
  }, [token.isPending, token.isConfirmed, token.hash, showInfo, showSuccess]);

  // Show loading state if data is not ready
  if (!isDataLoaded()) {
    return (
      <div className="min-h-screen bg-[#0F1419] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-lg rounded-3xl p-12 border border-white/10 text-center shadow-2xl"
        >
          <LoadingSpinner size="lg" />
          <h2 className="text-2xl font-bold text-white mt-6">Loading Staking Data</h2>
          <p className="text-gray-400 mt-2">
            Synchronizing with the blockchain...
          </p>
        </motion.div>
      </div>
    );
  }

  // Handle revenue share claim
  const handleClaimRevenueShare = async () => {
    try {
      await staking.claimRevenueShare();
    } catch (error: unknown) {
      showError("Revenue Share Claim Failed", (error as Error).message || "Failed to claim revenue share. Please try again.");
    }
  };

  // Handle PRIX approval for staking
  const handleApprove = async () => {
    try {
      if (!stakeAmount) {
        showError("Approval Failed", "Please enter a stake amount first.");
        return;
      }

      const stakeAmountWei = parseUnits(stakeAmount, 18);
      await token.approve(CONTRACTS.PREDINEX_STAKING.address, stakeAmountWei.toString());
      showSuccess("Approval Successful", "PRIX tokens approved for staking. You can now create your stake.");
      setNeedsApproval(false);
    } catch (error: unknown) {
      showError("Approval Failed", (error as Error).message || "Failed to approve PRIX tokens. Please try again.");
    }
  };

  // Handle staking
  const handleStake = async () => {
    try {
      if (!stakeAmount) {
        showError("Staking Failed", "Please enter a stake amount.");
        return;
      }

      if (!staking.canStakeInTier(selectedTier, stakeAmount)) {
        showError("Staking Failed", "Stake amount does not meet the minimum requirement for the selected tier.");
        return;
      }

      await staking.stake(stakeAmount, selectedTier, selectedDuration);
      showSuccess("Staking Successful", "Your stake has been created successfully!");
      setStakeAmount("");
      setSelectedTier(0);
      setSelectedDuration(DurationOption.THIRTY_DAYS);
    } catch (error: unknown) {
      showError("Staking Failed", (error as Error).message || "Failed to create stake. Please try again.");
    }
  };

  const handleClaimStakeRewards = async (stakeIndex: number) => {
    try {
      console.log('Claim button clicked for stake:', stakeIndex);
      if (staking.userStakesWithRewards[stakeIndex]) {
        console.log('Pending rewards:', staking.userStakesWithRewards[stakeIndex].pendingRewards.toString());
      }
      await staking.claimStakeRewards(stakeIndex);
    } catch (error: unknown) {
      console.error('Error claiming stake rewards:', error);
      showError("Claim Failed", (error as Error).message || "Failed to claim rewards. Please try again.");
    }
  };

  const handleUnstakeSpecific = async (stakeIndex: number) => {
    try {
      console.log('Unstake button clicked for stake:', stakeIndex);
      await staking.unstakeSpecific(stakeIndex);
    } catch (error: unknown) {
      console.error('Error unstaking:', error);
      showError("Unstake Failed", (error as Error).message || "Failed to unstake. Please try again.");
    }
  };

  const TierIcon = TIER_ICONS[staking.userTier] || FaCoins;
  const tierColor = TIER_COLORS[staking.userTier] || "text-gray-400";

  const getProgressToNextTier = (): number => {
    if (!staking.tiers || staking.tiers.length === 0 || staking.userTier >= staking.tiers.length - 1) {
      return 100;
    }

    const currentTier = staking.tiers[staking.userTier];
    const nextTier = staking.tiers[staking.userTier + 1];

    if (!currentTier || !nextTier) {
      return 100;
    }

    const currentThreshold = currentTier.minStake;
    const nextThreshold = nextTier.minStake;
    const currentStaked = parseUnits(staking.totalUserStaked || "0", 18);

    if (currentStaked <= currentThreshold) return 0;

    const progress = Number(currentStaked - currentThreshold) / Number(nextThreshold - currentThreshold);
    return Math.min(100, progress * 100);
  };

  const formatTimeRemaining = (unlockTime: number): string => {
    const now = Date.now();
    if (now >= unlockTime) return "Unlocked";

    const remaining = unlockTime - now;
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0F1419] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0F1419] to-[#0F1419] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#191f28]/60 backdrop-blur-xl rounded-3xl p-12 border border-white/5 text-center max-w-md w-full shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-yellow-400/20 to-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8 ring-1 ring-white/10">
              <BoltSolid className="h-10 w-10 text-yellow-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Connect Wallet</h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Connect your wallet to access the Staking Vault and start earning rewards on your PRIX tokens.
            </p>
            <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-sm text-gray-400">
              Please use the Connect button in the top right
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1419] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0F1419] to-[#0F1419] text-white selection:bg-indigo-500/30">
      <TransactionFeedback
        status={transactionStatus}
        onClose={clearStatus}
        autoClose={true}
        autoCloseDelay={5000}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-16 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-white/5 rounded-2xl ring-1 ring-white/10 backdrop-blur-xl"
          >
            <BoltSolid className="w-8 h-8 text-yellow-400" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-gray-500 tracking-tight text-center"
          >
            Staking Vault
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl text-center text-lg leading-relaxed"
          >
            Maximize your yield. Stake PRIX to unlock tiers, earn platform revenue shares, and boost your returns with flexible lock-up periods.
          </motion.p>
        </div>

        {/* Global Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          <div className="bg-[#191f28]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">My Total Staked</span>
              <FaCoins className="text-yellow-500/50 h-5 w-5" />
            </div>
            <div className="text-2xl font-bold">{staking.totalUserStaked} <span className="text-sm font-normal text-gray-500">PRIX</span></div>
          </div>

          <div className="bg-[#191f28]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">Pending Rewards</span>
              <FaChartLine className="text-green-500/50 h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-green-400">{staking.totalPendingRewards} <span className="text-sm font-normal text-gray-500">PRIX</span></div>
          </div>

          <div className="bg-[#191f28]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">Current Tier</span>
              <TierIcon className={`h-5 w-5 ${tierColor}`} />
            </div>
            <div className="text-2xl font-bold">{staking.userTierName}</div>
          </div>

          <div className="bg-[#191f28]/60 backdrop-blur-md rounded-2xl p-6 border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm font-medium">Active Stakes</span>
              <IoMdLock className="text-blue-500/50 h-5 w-5" />
            </div>
            <div className="text-2xl font-bold">{staking.userStakesWithRewards?.length || 0}</div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Create Stake Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-5"
          >
            <div className="bg-[#151a21] rounded-3xl border border-white/5 overflow-hidden sticky top-6 shadow-2xl">
              <div className="p-6 md:p-8 space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
                    Create New Stake
                  </h3>
                  <p className="text-sm text-gray-400 pl-3">Configure your staking parameters</p>
                </div>

                <div className="space-y-6">
                  {/* Amount */}
                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <AmountInput
                      label="Amount to Stake"
                      value={stakeAmount}
                      onChange={(value) => setStakeAmount(value)}
                      onValueChange={(numValue) => setStakeAmount(numValue.toString())}
                      placeholder="0.00"
                      currency="PRIX"
                      min={1}
                      max={parseFloat(token.balance) || 0}
                      decimals={18}
                      size="lg"
                      showMaxButton={true}
                      maxValue={parseFloat(token.balance) || 0}
                      help={`Available: ${token.balance} PRIX`}
                      variant="outlined"
                      required
                    />
                  </div>

                  {/* Tier Selector */}
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-3 block px-1">Select Tier</label>
                    <div className="grid grid-cols-1 gap-3">
                      {staking.tiers?.map((tier, index) => {
                        const canSelect = staking.canStakeInTier(index, stakeAmount || "0");
                        const TierIconComponent = TIER_ICONS[index] || FaCoins;
                        const tColor = TIER_COLORS[index] || "text-gray-400";
                        const isSelected = selectedTier === index;

                        return (
                          <button
                            key={index}
                            onClick={() => setSelectedTier(index)}
                            disabled={!canSelect}
                            className={`group relative w-full p-4 rounded-xl border transition-all duration-300 text-left ${isSelected
                              ? "border-purple-500/50 bg-purple-500/10"
                              : canSelect
                                ? "border-white/5 bg-white/5 hover:border-white/10 hover:bg-white/10"
                                : "border-transparent bg-white/5 opacity-40 cursor-not-allowed"
                              }`}
                          >
                            {isSelected && <div className="absolute inset-0 bg-purple-500/5 rounded-xl pointer-events-none" />}
                            <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-500/20' : 'bg-black/30'}`}>
                                  <TierIconComponent className={`h-5 w-5 ${tColor}`} />
                                </div>
                                <div>
                                  <div className="font-semibold text-white group-hover:text-purple-400 transition-colors">
                                    {staking.getTierName(index)}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    Min: {staking.formatAmount(tier.minStake)} PRIX
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className={`font-bold ${isSelected ? 'text-purple-400' : 'text-gray-300'}`}>
                                  {formatPercentage((typeof tier.baseAPY === 'bigint' ? Number(tier.baseAPY) / 100 : tier.baseAPY / 100))}
                                </div>
                                <div className="text-xs text-gray-500">Base APY</div>
                              </div>
                            </div>
                          </button>
                        );
                      }) || (
                          <div className="text-center py-4 text-gray-400 bg-white/5 rounded-xl">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Duration Selector */}
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-3 block px-1">Lock Duration</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[DurationOption.THIRTY_DAYS, DurationOption.SIXTY_DAYS, DurationOption.NINETY_DAYS].map((duration) => {
                        const isSelected = selectedDuration === duration;
                        return (
                          <button
                            key={duration}
                            onClick={() => setSelectedDuration(duration)}
                            className={`relative p-3 rounded-xl border text-center transition-all ${isSelected
                              ? "border-blue-500/50 bg-blue-500/10 text-white"
                              : "border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
                              }`}
                          >
                            <div className="font-bold text-sm">{staking.getDurationName(duration)}</div>
                            <div className={`text-xs mt-1 ${isSelected ? 'text-blue-400' : 'text-gray-500'}`}>
                              +{staking.getDurationBonus(duration)}%
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Est. Returns Summary */}
                  {stakeAmount && staking.tiers && staking.tiers[selectedTier] && (
                    <div className="bg-gradient-to-r from-gray-900 to-black p-4 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-400">Total Est. APY</span>
                        <span className="font-bold text-green-400">
                          {formatPercentage(((Number(staking.tiers[selectedTier].baseAPY) / 100) + staking.getDurationBonus(selectedDuration)))}
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 h-1 rounded-full mt-2 mb-2 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 w-full animate-pulse" />
                      </div>
                      <div className="text-xs text-gray-500 text-center">
                        Locking for {staking.getDurationName(selectedDuration)}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-2">
                    {needsApproval ? (
                      <Button
                        onClick={handleApprove}
                        disabled={!stakeAmount || token.isPending}
                        className="w-full h-14 rounded-xl font-bold text-lg shadow-lg shadow-orange-900/20 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 transition-all active:scale-[0.98]"
                      >
                        {token.isPending ? <div className="flex items-center justify-center gap-2"><LoadingSpinner size="sm" /> Approving...</div> : "Approve PRIX"}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleStake}
                        disabled={!stakeAmount || !staking.canStakeInTier(selectedTier, stakeAmount) || staking.isStaking || staking.isPending || staking.isConfirming}
                        className="w-full h-14 rounded-xl font-bold text-lg shadow-lg shadow-purple-900/20 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                      >
                        {staking.isStaking ? <div className="flex items-center justify-center gap-2"><LoadingSpinner size="sm" /> Creating...</div> : staking.isPending ? <div className="flex items-center justify-center gap-2"><LoadingSpinner size="sm" /> Confirm Wallet...</div> : staking.isConfirming ? <div className="flex items-center justify-center gap-2"><LoadingSpinner size="sm" /> Processing...</div> : "Stake Tokens"}
                      </Button>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Dashboard & Info */}
          <div className="lg:col-span-7 space-y-8">

            {/* Revenue Share Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-[#151a21] rounded-3xl border border-white/5 p-8 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <FaMoneyBillWave className="w-48 h-48" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Revenue Share</h3>
                    <p className="text-sm text-gray-400">Claim your share of platform fees</p>
                  </div>
                  {staking.userTier > 0 && (
                    <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-bold">
                      Active
                    </div>
                  )}
                </div>

                {/* Revenue Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="text-sm text-gray-400 mb-1">Pending PRIX</div>
                    <div className="text-xl font-bold text-white">{staking.pendingRevenuePRIX || '0'}</div>
                  </div>
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                    <div className="text-sm text-gray-400 mb-1">Pending BNB</div>
                    <div className="text-xl font-bold text-white">{staking.pendingRevenueBNB || '0'}</div>
                  </div>
                </div>

                <Button
                  onClick={handleClaimRevenueShare}
                  disabled={
                    (parseFloat(staking.pendingRevenuePRIX) === 0 && parseFloat(staking.pendingRevenueBNB) === 0) ||
                    staking.isClaimingRevenue ||
                    staking.isPending ||
                    staking.isConfirming
                  }
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                >
                  {staking.isClaimingRevenue ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" /> Claiming...
                    </div>
                  ) : "Claim Revenue"}
                </Button>
              </div>
            </motion.div>

            {/* My Stakes List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center justify-between mb-6 px-2">
                <h3 className="text-xl font-bold text-white">Your Stakes</h3>
                <div className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">
                  Start Staking to see entries
                </div>
              </div>

              {staking.userStakesWithRewards.length === 0 ? (
                <div className="bg-[#151a21]/50 rounded-3xl border border-white/5 p-12 text-center border-dashed border-gray-800">
                  <IoMdLock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h4 className="text-white font-medium mb-1">No Active Stakes</h4>
                  <p className="text-gray-500 text-sm">Use the form to create your first stake</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {staking.userStakesWithRewards.map((stake: StakeWithRewards) => (
                    <div key={stake.index} className="bg-[#151a21] rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                        {/* Stake Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                              <FaCoins className="text-blue-400 w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-white">{staking.formatAmount(stake.amount)} PRIX</div>
                              <div className="text-xs text-gray-400">
                                {staking.getTierName(stake.tierId)} • {staking.getDurationName(stake.durationOption)} • {formatPercentage(stake.currentAPY, 2)} APY
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5 text-gray-500 bg-black/20 px-2 py-1 rounded">
                              <FaClock className="w-3 h-3" />
                              {stake.canUnstake ? "Unlocked" : formatTimeRemaining(stake.unlockTime)}
                            </div>
                            <div className="flex items-center gap-1.5 text-green-400/80 bg-green-500/5 px-2 py-1 rounded">
                              <SparklesIconSolid className="w-3 h-3" />
                              {staking.formatReward(stake.pendingRewards)} Pending
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleClaimStakeRewards(stake.index)}
                            disabled={isBigIntZero(stake.pendingRewards) || staking.claimingStakeIndex !== null || staking.isPending || staking.isConfirming}
                            className="bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/20 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {staking.claimingStakeIndex === stake.index ? <LoadingSpinner size="sm" /> : "Claim"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleUnstakeSpecific(stake.index)}
                            disabled={!stake.canUnstake || staking.unstakingStakeIndex !== null || staking.isPending || staking.isConfirming}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors border ${stake.canUnstake
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                              : "bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed"
                              }`}
                          >
                            {staking.unstakingStakeIndex === stake.index ? <LoadingSpinner size="sm" /> : "Unstake"}
                          </Button>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Progress to Next Tier */}
            {staking.userTier < (staking.tiers?.length || 0) - 1 && (
              <div className="bg-[#151a21] rounded-2xl border border-white/5 p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-white">Next Tier: {staking.getTierName(staking.userTier + 1)}</span>
                  <span className="text-sm font-bold text-gray-400">{formatPercentage(getProgressToNextTier())}</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${getProgressToNextTier()}%` }} />
                </div>
              </div>
            )}

            {/* Info footer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              {[
                { icon: FaChartLine, label: "Daily Rewards", desc: "Compound Interest" },
                { icon: FaMoneyBillWave, label: "Revenue Share", desc: "Platform Fees" },
                { icon: IoMdLock, label: "Secure Vault", desc: "Audited Contracts" },
                { icon: FaCrown, label: "VIP Tiers", desc: "Exclusive Perks" }
              ].map((item, i) => (
                <div key={i} className="text-center p-3">
                  <item.icon className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-gray-400">{item.label}</div>
                  <div className="text-[10px] text-gray-600">{item.desc}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
