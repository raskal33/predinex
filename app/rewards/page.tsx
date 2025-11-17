"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrophyIcon, 
  SparklesIcon,
  CheckCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import PrizeClaimModal from '@/components/PrizeClaimModal';
import { toast } from 'react-hot-toast';

interface Reward {
  type: 'pool' | 'combo' | 'oddyssey';
  id: string | number;
  poolId?: number;
  comboPoolId?: number;
  cycleId?: number;
  slipId?: number;
  league?: string;
  category?: string;
  title?: string;
  predictedOutcome?: string;
  stakeAmount: number;
  claimableAmount: number;
  prizeAmount?: number;
  currency: string;
  settledAt?: string;
  claimed: boolean;
  txHash?: string;
  finalScore?: number;
  correctCount?: number;
  leaderboardRank?: number;
}

interface RewardsData {
  rewards: {
    pools: Reward[];
    combos: Reward[];
    oddyssey: Reward[];
    all: Reward[];
  };
  summary: {
    totalClaimable: number;
    poolCount: number;
    comboCount: number;
    oddysseyCount: number;
    totalCount: number;
  };
}

export default function RewardsPage() {
  const { address, isConnected } = useAccount();
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pool' | 'combo' | 'oddyssey'>('all');
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  
  const fetchRewards = useCallback(async () => {
    if (!address) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/rewards/${address}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRewards(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
      toast.error('Failed to load rewards');
    } finally {
      setIsLoading(false);
    }
  }, [address]);
  
  // Initial fetch
  useEffect(() => {
    if (isConnected && address) {
      fetchRewards();
    }
  }, [isConnected, address, fetchRewards]);
  
  // Poll for updates every 10 seconds
  useEffect(() => {
    if (!address || !isConnected) return;
    
    const interval = setInterval(() => {
      fetchRewards();
    }, 10000); // Poll every 10 seconds
    
    return () => clearInterval(interval);
  }, [address, isConnected, fetchRewards]);
  
  const filteredRewards = rewards?.rewards.all.filter(reward => {
    if (filter === 'all') return true;
    return reward.type === filter;
  }) || [];
  
  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toFixed(4)} ${currency}`;
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (!isConnected || !address) {
    return (
      <div className="container-nav section-padding min-h-screen flex items-center justify-center">
        <div className="text-center">
          <TrophyIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">Connect Your Wallet</h2>
          <p className="text-text-secondary">Please connect your wallet to view your rewards</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container-nav section-padding min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <TrophyIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-text-primary">Rewards</h1>
        </motion.div>
        <p className="text-text-secondary">View and claim your winnings from pools and Oddyssey</p>
      </div>
      
      {/* Summary Cards */}
      {rewards && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="glass-card p-6 border border-border-card">
            <div className="flex items-center gap-3 mb-2">
              <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              <span className="text-text-secondary text-sm">Total Claimable</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {formatAmount(rewards.summary.totalClaimable, 'BNB')}
            </div>
          </div>
          
          <div className="glass-card p-6 border border-border-card">
            <div className="flex items-center gap-3 mb-2">
              <TrophyIcon className="h-6 w-6 text-primary" />
              <span className="text-text-secondary text-sm">Pool Rewards</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {rewards.summary.poolCount}
            </div>
          </div>
          
          <div className="glass-card p-6 border border-border-card">
            <div className="flex items-center gap-3 mb-2">
              <SparklesIcon className="h-6 w-6 text-secondary" />
              <span className="text-text-secondary text-sm">Combo Rewards</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {rewards.summary.comboCount}
            </div>
          </div>
          
          <div className="glass-card p-6 border border-border-card">
            <div className="flex items-center gap-3 mb-2">
              <TrophyIcon className="h-6 w-6 text-accent" />
              <span className="text-text-secondary text-sm">Oddyssey Prizes</span>
            </div>
            <div className="text-2xl font-bold text-text-primary">
              {rewards.summary.oddysseyCount}
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pool', 'combo', 'oddyssey'] as const).map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === filterType
                ? 'bg-gradient-primary text-black'
                : 'bg-bg-card text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Rewards List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <SparklesIcon className="h-12 w-12 text-primary animate-spin mx-auto mb-2" />
            <span className="text-text-secondary">Loading rewards...</span>
          </div>
        </div>
      ) : filteredRewards.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <TrophyIcon className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-primary mb-2">No Rewards Yet</h3>
            <p className="text-text-secondary">Start betting to earn rewards!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredRewards.map((reward) => (
              <motion.div
                key={`${reward.type}-${reward.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card p-6 border border-border-card hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {reward.type === 'pool' && (
                        <TrophyIcon className="h-5 w-5 text-primary" />
                      )}
                      {reward.type === 'combo' && (
                        <SparklesIcon className="h-5 w-5 text-secondary" />
                      )}
                      {reward.type === 'oddyssey' && (
                        <TrophyIcon className="h-5 w-5 text-accent" />
                      )}
                      <h3 className="text-lg font-bold text-text-primary">
                        {reward.type === 'pool' && `${reward.league} - ${reward.category}`}
                        {reward.type === 'combo' && reward.title}
                        {reward.type === 'oddyssey' && `Cycle ${reward.cycleId} - Slip ${reward.slipId}`}
                      </h3>
                      {reward.claimed && (
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-text-secondary">Stake:</span>
                        <div className="font-semibold text-text-primary">
                          {formatAmount(reward.stakeAmount, reward.currency)}
                        </div>
                      </div>
                      <div>
                        <span className="text-text-secondary">Reward:</span>
                        <div className="font-semibold text-green-400">
                          {formatAmount(reward.claimableAmount || reward.prizeAmount || 0, reward.currency)}
                        </div>
                      </div>
                      {reward.type === 'oddyssey' && (
                        <>
                          <div>
                            <span className="text-text-secondary">Correct:</span>
                            <div className="font-semibold text-text-primary">
                              {reward.correctCount}/10
                            </div>
                          </div>
                          <div>
                            <span className="text-text-secondary">Rank:</span>
                            <div className="font-semibold text-text-primary">
                              #{reward.leaderboardRank}
                            </div>
                          </div>
                        </>
                      )}
                      {reward.settledAt && (
                        <div>
                          <span className="text-text-secondary">Settled:</span>
                          <div className="font-semibold text-text-primary">
                            {formatDate(reward.settledAt)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    {reward.claimed ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        <span className="text-green-400 font-medium">Claimed</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsClaimModalOpen(true)}
                        className="px-6 py-2 bg-gradient-primary text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Claim
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {/* Claim Modal */}
      <PrizeClaimModal
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        userAddress={address}
      />
    </div>
  );
}

