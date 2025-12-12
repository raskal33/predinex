"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon,
  TrophyIcon,
  CheckCircleIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import Button from './button';
import { useNewClaimService, type OdysseyClaimablePosition } from '@/services/newClaimService';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { getAPIUrl } from '@/config/api';
import LoadingSpinner from './LoadingSpinner';

interface PrizeClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAddress?: string;
}

interface PoolClaimablePosition {
  poolId: number;
  league?: string;
  category?: string;
  predictedOutcome?: string;
  claimableAmount: number;
  stakeAmount: number;
  currency: string;
  claimed: boolean;
  settledAt?: string;
  txHash?: string;
}

type PrizeTab = 'all' | 'pool' | 'oddyssey';

export default function PrizeClaimModal({ isOpen, onClose, userAddress }: PrizeClaimModalProps) {
  const [activeTab, setActiveTab] = useState<PrizeTab>('all');
  const [poolPositions, setPoolPositions] = useState<PoolClaimablePosition[]>([]);
  const [odysseyPositions, setOdysseyPositions] = useState<OdysseyClaimablePosition[]>([]);
  const [selectedPoolPositions, setSelectedPoolPositions] = useState<Set<number>>(new Set());
  const [selectedOdysseyPositions, setSelectedOdysseyPositions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimProgress, setClaimProgress] = useState({ completed: 0, total: 0 });
  const [filter, setFilter] = useState<'all' | 'unclaimed' | 'claimed'>('unclaimed');
  
  // ✅ FIX: Use refs to prevent infinite loops and ensure stable state
  const isLoadingRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const isMountedRef = useRef(true);
  
  const {
    claimOdysseyPrize,
    batchClaimOdysseyPrizes,
    claimPoolPrize,
    getAllClaimableOdysseyPrizes,
    isConnected: isNewConnected
  } = useNewClaimService();
  
  const { connectWallet } = useWalletConnection();

  const loadPositions = useCallback(async () => {
    // ✅ FIX: Prevent multiple simultaneous loads
    if (!userAddress || isLoadingRef.current || !isMountedRef.current) {
      return;
    }
    
    // ✅ FIX: Ensure we're loading for the correct address
    const currentAddress = userAddress.toLowerCase();
    console.log(`[PrizeClaimModal] Loading positions for address: ${currentAddress}`);
    
    isLoadingRef.current = true;
    setIsLoading(true);
    
    try {
      // Load pool prizes from rewards API - using the current userAddress
      const rewardsResponse = await fetch(getAPIUrl(`/api/rewards/${currentAddress}`));
      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json();
        if (rewardsData.success && rewardsData.data) {
          const pools = rewardsData.data.rewards?.pools || [];
          console.log(`[PrizeClaimModal] Loaded ${pools.length} pool positions for ${currentAddress}`);
          
          // ✅ FIX: Backend now returns contract-verified data - no need for individual status calls!
          // ✅ VALIDATION: Filter out claimed pools and pools with 0 claimable amount
          const normalizedPools: PoolClaimablePosition[] = pools
            .filter((p: { poolId?: number; claimed?: boolean; claimableAmount?: number }) => {
              // Backend already filters claimed pools, but double-check
              // Also filter out pools with 0 claimable amount
              if (p.claimed) {
                console.log(`[PrizeClaimModal] Filtering out claimed pool #${p.poolId || 'unknown'}`);
                return false;
              }
              if ((p.claimableAmount || 0) <= 0) {
                console.log(`[PrizeClaimModal] Filtering out pool #${p.poolId || 'unknown'} with 0 claimable amount`);
                return false;
              }
              return true;
            })
            .map((p: PoolClaimablePosition & { poolId: number; claimed?: boolean; claimableAmount?: number; stakeAmount?: number; currency?: string; settledAt?: string; settled_at?: string; txHash?: string }) => {
              const currency = p.currency || 'BNB';
              // Backend returns amounts in token units (already normalized), not wei
              return {
                poolId: p.poolId,
                league: p.league,
                category: p.category,
                predictedOutcome: p.predictedOutcome,
                claimableAmount: typeof p.claimableAmount === 'number' ? p.claimableAmount : 0,
                stakeAmount: typeof p.stakeAmount === 'number' ? p.stakeAmount : 0,
                currency,
                claimed: false, // Already filtered out claimed pools
                settledAt: p.settled_at ?? p.settledAt,
                txHash: p.txHash
              };
            });

          console.log(`[PrizeClaimModal] Filtered to ${normalizedPools.length} claimable pools`);
          setPoolPositions(normalizedPools);
          
          // Auto-select all claimable pool positions (already filtered above)
          const unclaimedPools = normalizedPools.map((p: PoolClaimablePosition) => p.poolId);
          setSelectedPoolPositions(new Set(unclaimedPools));
        } else {
          console.warn(`[PrizeClaimModal] No pool data returned for ${currentAddress}`);
          setPoolPositions([]);
          setSelectedPoolPositions(new Set());
        }
      } else {
        console.error(`[PrizeClaimModal] Failed to fetch rewards for ${currentAddress}:`, rewardsResponse.status);
        setPoolPositions([]);
        setSelectedPoolPositions(new Set());
      }
      
      // Load Odyssey positions - use userAddress prop (not connected wallet)
      try {
        const odysseyPrizes = await getAllClaimableOdysseyPrizes();
        console.log(`[PrizeClaimModal] Loaded ${odysseyPrizes.length} odyssey positions for ${currentAddress}`, odysseyPrizes);
        
        if (isMountedRef.current) {
          // ✅ VALIDATION: Filter out already claimed prizes before processing
          const claimableOdysseyPrizes = odysseyPrizes.filter((p) => {
            if (p.claimed) {
              console.log(`[PrizeClaimModal] Filtering out already claimed prize: Cycle ${p.cycleId}, Slip ${p.slipId}`);
              return false;
            }
            if (!p.claimStatus || p.claimStatus !== 'eligible') {
              console.log(`[PrizeClaimModal] Filtering out non-claimable prize: Cycle ${p.cycleId}, Slip ${p.slipId}`);
              return false;
            }
            const prizeAmountNum = typeof p.prizeAmount === 'string' ? parseFloat(p.prizeAmount) : (parseFloat(p.prizeAmount) || 0);
            if (prizeAmountNum <= 0) {
              console.log(`[PrizeClaimModal] Filtering out prize with 0 amount: Cycle ${p.cycleId}, Slip ${p.slipId}`);
              return false;
            }
            return true;
          });
          
          console.log(`[PrizeClaimModal] Filtered to ${claimableOdysseyPrizes.length} claimable odyssey prizes`);
          
          setOdysseyPositions(claimableOdysseyPrizes);
          
          // Auto-select unclaimed winning Odyssey positions
          const unclaimedOdysseyWinning = claimableOdysseyPrizes
            .filter((p: OdysseyClaimablePosition) => !p.claimed && p.claimStatus === 'eligible')
            .map((p: OdysseyClaimablePosition) => `${p.cycleId}-${p.slipId}`);
          setSelectedOdysseyPositions(new Set(unclaimedOdysseyWinning));
        }
      } catch (odysseyError) {
        console.error('[PrizeClaimModal] Error loading odyssey positions:', odysseyError);
        if (isMountedRef.current) {
          setOdysseyPositions([]);
          setSelectedOdysseyPositions(new Set());
        }
      }
      
      hasLoadedRef.current = true;
      
    } catch (error) {
      console.error('[PrizeClaimModal] Error loading positions:', error);
      if (isMountedRef.current) {
        toast.error('Failed to load claimable positions');
      }
      hasLoadedRef.current = false;
      setPoolPositions([]);
      setOdysseyPositions([]);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }
  }, [userAddress, getAllClaimableOdysseyPrizes]);

  // ✅ FIX: Load claimable positions only when modal opens and userAddress is available
  useEffect(() => {
    if (isOpen && userAddress && !hasLoadedRef.current && !isLoadingRef.current) {
      loadPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userAddress]); // loadPositions is stable via useCallback, but we guard with refs to prevent loops

  // Track previous userAddress to detect changes
  const previousUserAddressRef = useRef<string | undefined>(userAddress);

  // ✅ FIX: Load claimable positions when modal opens or userAddress changes
  useEffect(() => {
    // Reset loaded state if userAddress changed
    if (previousUserAddressRef.current !== userAddress) {
      hasLoadedRef.current = false;
      previousUserAddressRef.current = userAddress;
    }

    if (isOpen && userAddress && !hasLoadedRef.current && !isLoadingRef.current) {
      loadPositions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userAddress]); // loadPositions is stable via useCallback, but we guard with refs

  // ✅ FIX: Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset refs and state when modal closes
      hasLoadedRef.current = false;
      isLoadingRef.current = false;
      previousUserAddressRef.current = undefined;
      setPoolPositions([]);
      setOdysseyPositions([]);
      setSelectedPoolPositions(new Set());
      setSelectedOdysseyPositions(new Set());
      setIsLoading(false);
      setIsClaiming(false);
      setClaimProgress({ completed: 0, total: 0 });
      setActiveTab('all');
      setFilter('unclaimed');
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClaimPoolSingle = async (poolId: number) => {
    if (!isNewConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    // ✅ VALIDATION: Check if prize exists and is already claimed before attempting claim
    const position = poolPositions.find(p => p.poolId === poolId);
    if (!position) {
      toast.error(`Pool #${poolId} not found. Please refresh and try again.`);
      return;
    }

    if (position.claimed) {
      toast.error(`Pool #${poolId} prize has already been claimed.`);
      // Remove from list since it's already claimed
      setPoolPositions(prev => prev.filter(p => p.poolId !== poolId));
      setSelectedPoolPositions(prev => {
        const newSet = new Set(prev);
        newSet.delete(poolId);
        return newSet;
      });
      return;
    }

    if (position.claimableAmount <= 0) {
      toast.error(`Pool #${poolId} has no claimable amount.`);
      return;
    }

    setIsClaiming(true);
    // Show pending toast with better error display
    const pendingToastId = toast.loading(`Claiming pool #${poolId} prize...`);
    
    try {
      const result = await claimPoolPrize(poolId);

      // Dismiss pending toast
      toast.dismiss(pendingToastId);

      if (result.success && result.transactionHash) {
        toast.success(`Pool prize claimed successfully! 🎉 Transaction: ${result.transactionHash.slice(0, 10)}...`, {
          duration: 5000
        });
        
        // ✅ FIX: Remove claimed pool immediately instead of marking as claimed
        setPoolPositions(prev => prev.filter(p => p.poolId !== poolId));
        
        // Remove from selected positions
        setSelectedPoolPositions(prev => {
          const newSet = new Set(prev);
          newSet.delete(poolId);
          return newSet;
        });
        
        // Reload positions to get updated state
        setTimeout(() => loadPositions(), 2000);
        
      } else {
        // ✅ IMPROVED ERROR DISPLAY
        const errorMsg = result.error || 'Failed to claim pool prize';
        const errorDetail = errorMsg.includes('already claimed') 
          ? 'This prize has already been claimed. Refreshing...'
          : errorMsg.includes('not eligible')
          ? 'You are not eligible to claim this prize.'
          : 'Please check your wallet and try again.';
        toast.error(`Claim Failed: ${errorMsg}. ${errorDetail}`, {
          duration: 7000
        });
        
        // If already claimed, refresh positions
        if (errorMsg.toLowerCase().includes('already claimed')) {
          setTimeout(() => loadPositions(), 1000);
        }
      }
    } catch (error) {
      toast.dismiss(pendingToastId);
      console.error('Pool claim error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to claim pool prize';
      toast.error(`Claim Error: ${errorMessage}. An unexpected error occurred. Please try again or contact support if the issue persists.`, {
        duration: 7000
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClaimOdysseySingle = async (position: OdysseyClaimablePosition) => {
    if (!isNewConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsClaiming(true);
    try {
      const result = await claimOdysseyPrize(position.cycleId, position.slipId);

      if (result.success && result.transactionHash) {
        toast.success(`Odyssey prize claimed successfully! 🎉 Transaction: ${result.transactionHash.slice(0, 10)}...`, {
          duration: 5000
        });
        
        // ✅ FIX: Update the position as claimed and immediately remove from list
        setOdysseyPositions(prev => prev.filter(p => 
          !(p.cycleId === position.cycleId && p.slipId === position.slipId)
        )); // Remove claimed position immediately
        
        // Remove from selected positions
        setSelectedOdysseyPositions(prev => {
          const newSet = new Set(prev);
          newSet.delete(`${position.cycleId}-${position.slipId}`);
          return newSet;
        });
        
        // Reload positions to get updated state
        setTimeout(() => loadPositions(), 2000);
        
      } else {
        // ✅ IMPROVED ERROR DISPLAY
        const errorMsg = result.error || 'Failed to claim Odyssey prize';
        const errorDetail = errorMsg.includes('already claimed') 
          ? 'This prize has already been claimed. Refreshing...'
          : errorMsg.includes('not eligible')
          ? 'You are not eligible to claim this prize.'
          : 'Please check your wallet and try again.';
        toast.error(`Claim Failed: ${errorMsg}. ${errorDetail}`, {
          duration: 7000
        });
        
        // If already claimed, refresh positions
        if (errorMsg.toLowerCase().includes('already claimed')) {
          setTimeout(() => loadPositions(), 1000);
        }
      }
    } catch (error) {
      console.error('Odyssey claim error:', error);
      toast.error('Failed to claim Odyssey prize');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleBatchClaim = async () => {
    if (!isNewConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    const selectedPools = poolPositions.filter(p => 
      selectedPoolPositions.has(p.poolId) && !p.claimed && p.claimableAmount > 0
    );
    
    const selectedOdysseyList = odysseyPositions.filter(p => 
      selectedOdysseyPositions.has(`${p.cycleId}-${p.slipId}`) && !p.claimed && p.claimStatus === 'eligible'
    );
    
    if (selectedPools.length === 0 && selectedOdysseyList.length === 0) {
      toast.error('No positions selected');
      return;
    }

    setIsClaiming(true);
    const total = selectedPools.length + selectedOdysseyList.length;
    setClaimProgress({ completed: 0, total });
    
    try {
      let completed = 0;
      
      // Claim pool prizes
      for (const pool of selectedPools) {
        try {
          // ✅ VALIDATION: Check if pool still exists and is claimable before claiming
          const existingPool = poolPositions.find(p => p.poolId === pool.poolId);
          if (!existingPool || existingPool.claimed || existingPool.claimableAmount <= 0) {
            console.log(`[Batch Claim] Skipping pool ${pool.poolId} - already claimed or not claimable`);
            continue;
          }
          
          const result = await claimPoolPrize(pool.poolId);
          if (result.success) {
            completed++;
            setClaimProgress({ completed, total });
            // ✅ FIX: Remove claimed pool immediately instead of marking as claimed
            setPoolPositions(prev => prev.filter(p => p.poolId !== pool.poolId));
            // Remove from selected
            setSelectedPoolPositions(prev => {
              const newSet = new Set(prev);
              newSet.delete(pool.poolId);
              return newSet;
            });
          } else {
            // ✅ IMPROVED ERROR: Show error for failed claim
            toast.error(`Failed to claim pool #${pool.poolId}: ${result.error || 'Unknown error'}`);
          }
        } catch (error) {
          console.error(`Failed to claim pool ${pool.poolId}:`, error);
          toast.error(`Error claiming pool #${pool.poolId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Claim Odyssey prizes
      if (selectedOdysseyList.length > 0) {
        // ✅ VALIDATION: Filter out already claimed prizes before batch claiming
        const claimableOdysseyList = selectedOdysseyList.filter(p => {
          const existing = odysseyPositions.find(pos => 
            pos.cycleId === p.cycleId && pos.slipId === p.slipId
          );
          if (!existing || existing.claimed || existing.claimStatus !== 'eligible') {
            console.log(`[Batch Claim] Skipping Odyssey prize: Cycle ${p.cycleId}, Slip ${p.slipId} - already claimed or not eligible`);
            return false;
          }
          return true;
        });
        
        if (claimableOdysseyList.length > 0) {
          const odysseyResult = await batchClaimOdysseyPrizes(
            claimableOdysseyList,
            (completedOdyssey) => {
              setClaimProgress({ completed: completed + completedOdyssey, total });
            }
          );
          completed += odysseyResult.successful;
          
          // ✅ FIX: Remove successfully claimed Odyssey positions immediately
          // Derive successful positions from results array
          odysseyResult.results.forEach((result, index) => {
            if (result.success && claimableOdysseyList[index]) {
              const pos = claimableOdysseyList[index];
              setOdysseyPositions(prev => prev.filter(p => 
                !(p.cycleId === pos.cycleId && p.slipId === pos.slipId)
              ));
              setSelectedOdysseyPositions(prev => {
                const newSet = new Set(prev);
                newSet.delete(`${pos.cycleId}-${pos.slipId}`);
                return newSet;
              });
            }
          });
        }
      }
      
      toast.success(`Batch claim completed! ${completed} of ${total} successful`);
      
      // Reload positions to get updated state
      await loadPositions();
      
    } catch (error) {
      console.error('Batch claim error:', error);
      toast.error('Batch claim failed');
    } finally {
      setIsClaiming(false);
      setClaimProgress({ completed: 0, total: 0 });
    }
  };

  const togglePoolPositionSelection = (poolId: number) => {
    setSelectedPoolPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(poolId)) {
        newSet.delete(poolId);
      } else {
        newSet.add(poolId);
      }
      return newSet;
    });
  };

  const toggleOdysseyPositionSelection = (cycleId: number, slipId: number) => {
    const key = `${cycleId}-${slipId}`;
    setSelectedOdysseyPositions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const claimablePools = poolPositions.filter(p => !p.claimed && p.claimableAmount > 0);
    const claimableOdyssey = odysseyPositions.filter(p => !p.claimed && p.claimStatus === 'eligible');
    setSelectedPoolPositions(new Set(claimablePools.map(p => p.poolId)));
    setSelectedOdysseyPositions(new Set(claimableOdyssey.map(p => `${p.cycleId}-${p.slipId}`)));
  };

  const deselectAll = () => {
    setSelectedPoolPositions(new Set());
    setSelectedOdysseyPositions(new Set());
  };

  const filteredPoolPositions = poolPositions.filter(position => {
    switch (filter) {
      case 'unclaimed':
        return !position.claimed && position.claimableAmount > 0;
      case 'claimed':
        return position.claimed;
      default:
        return true;
    }
  });

  const filteredOdysseyPositions = odysseyPositions.filter(position => {
    switch (filter) {
      case 'unclaimed':
        return !position.claimed && position.claimStatus === 'eligible';
      case 'claimed':
        return position.claimed;
      default:
        return true;
    }
  });

  const getFilteredPositions = () => {
    switch (activeTab) {
      case 'pool':
        return { pools: filteredPoolPositions, oddyssey: [] };
      case 'oddyssey':
        return { pools: [], oddyssey: filteredOdysseyPositions };
      default:
        return { pools: filteredPoolPositions, oddyssey: filteredOdysseyPositions };
    }
  };

  // ✅ FIX: Calculate totals separately by currency (PRIX vs BNB)
  const unclaimedPoolsBNB = poolPositions.filter(p => !p.claimed && p.claimableAmount > 0 && p.currency === 'BNB');
  const unclaimedPoolsPRIX = poolPositions.filter(p => !p.claimed && p.claimableAmount > 0 && p.currency === 'PRIX');
  const unclaimedOdyssey = odysseyPositions.filter(p => !p.claimed && p.claimStatus === 'eligible');
  
  const totalClaimableBNB = unclaimedPoolsBNB.reduce((sum, p) => sum + p.claimableAmount, 0) + 
    unclaimedOdyssey.reduce((sum, p) => sum + parseFloat(p.prizeAmount), 0); // Odyssey pays in BNB
  const totalClaimablePRIX = unclaimedPoolsPRIX.reduce((sum, p) => sum + p.claimableAmount, 0);

  const selectedPoolsBNB = poolPositions.filter(p => selectedPoolPositions.has(p.poolId) && p.currency === 'BNB');
  const selectedPoolsPRIX = poolPositions.filter(p => selectedPoolPositions.has(p.poolId) && p.currency === 'PRIX');
  const selectedOdysseyList = odysseyPositions.filter(p => selectedOdysseyPositions.has(`${p.cycleId}-${p.slipId}`));
  
  const selectedAmountBNB = selectedPoolsBNB.reduce((sum, p) => sum + p.claimableAmount, 0) +
    selectedOdysseyList.reduce((sum, p) => sum + parseFloat(p.prizeAmount), 0);
  const selectedAmountPRIX = selectedPoolsPRIX.reduce((sum, p) => sum + p.claimableAmount, 0);

  const totalUnclaimedCount = 
    poolPositions.filter(p => !p.claimed && p.claimableAmount > 0).length +
    odysseyPositions.filter(p => !p.claimed && p.claimStatus === 'eligible').length;

  const totalSelectedCount = selectedPoolPositions.size + selectedOdysseyPositions.size;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="glass-card rounded-2xl border border-border-card w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-card">
            <div className="flex items-center gap-3">
              <TrophyIcon className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold text-text-primary">Claim Prizes</h2>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Summary - Compact with currency breakdown */}
          <div className="px-4 py-3 border-b border-cyan-500/10 bg-black/30">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-sm font-bold text-green-400">
                  {totalClaimablePRIX > 0 && <span>{totalClaimablePRIX.toFixed(2)} PRIX</span>}
                  {totalClaimablePRIX > 0 && totalClaimableBNB > 0 && <span className="mx-1">+</span>}
                  {totalClaimableBNB > 0 && <span>{totalClaimableBNB.toFixed(2)} BNB</span>}
                  {totalClaimablePRIX === 0 && totalClaimableBNB === 0 && <span>0</span>}
                </div>
                <div className="text-xs text-white/50">Claimable</div>
              </div>
              <div>
                <div className="text-lg font-bold text-cyan-400">{totalUnclaimedCount}</div>
                <div className="text-xs text-white/50">Unclaimed</div>
              </div>
              <div>
                <div className="text-sm font-bold text-yellow-400">
                  {selectedAmountPRIX > 0 && <span>{selectedAmountPRIX.toFixed(2)} PRIX</span>}
                  {selectedAmountPRIX > 0 && selectedAmountBNB > 0 && <span className="mx-1">+</span>}
                  {selectedAmountBNB > 0 && <span>{selectedAmountBNB.toFixed(2)} BNB</span>}
                  {selectedAmountPRIX === 0 && selectedAmountBNB === 0 && <span>0</span>}
                </div>
                <div className="text-xs text-white/50">Selected</div>
              </div>
            </div>
          </div>

          {/* Tabs - Compact */}
          <div className="px-4 py-2 border-b border-cyan-500/10 bg-black/20">
            <div className="flex gap-1">
              {(['all', 'pool', 'oddyssey'] as PrizeTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all capitalize ${
                    activeTab === tab
                      ? 'bg-cyan-500 text-black'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="p-6 border-b border-border-card">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Filter */}
              <div className="flex gap-2">
                {(['all', 'unclaimed', 'claimed'] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      filter === filterType
                        ? 'bg-gradient-primary text-black'
                        : 'bg-bg-card text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
                    }`}
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </button>
                ))}
              </div>

              {/* Selection Controls */}
              <div className="flex gap-2">
                <Button
                  onClick={selectAll}
                  variant="outline"
                  size="sm"
                  disabled={odysseyPositions.filter(p => !p.claimed && p.claimStatus === 'eligible').length === 0}
                >
                  Select All
                </Button>
                <Button
                  onClick={deselectAll}
                  variant="outline"
                  size="sm"
                  disabled={selectedOdysseyPositions.size === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>
          </div>

          {/* Positions List - Compact */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 400px)', minHeight: '200px' }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <span className="text-white/60 mt-2 block text-xs">Loading...</span>
                </div>
              </div>
            ) : (() => {
              const { pools, oddyssey } = getFilteredPositions();
              if (pools.length === 0 && oddyssey.length === 0) {
                return (
                  <div className="flex items-center justify-center h-48">
                    <div className="text-center">
                      <TrophyIcon className="h-8 w-8 text-white/30 mx-auto mb-2" />
                      <p className="text-white/50 text-sm">No claimable positions</p>
                    </div>
                  </div>
                );
              }
              return (
                <div className="space-y-1 p-3">
                  {/* Pool Positions - Compact */}
                  {pools.map((position) => (
                    <div
                      key={`pool-${position.poolId}`}
                      className={`px-3 py-2 rounded border transition-all flex items-center justify-between gap-2 ${
                        position.claimed
                          ? 'bg-white/5 border-white/10 opacity-60'
                          : position.claimableAmount > 0
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-red-500/5 border-red-500/20'
                      } ${
                        selectedPoolPositions.has(position.poolId) && !position.claimed
                          ? 'ring-1 ring-cyan-400'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {!position.claimed && position.claimableAmount > 0 && (
                          <input
                            type="checkbox"
                            checked={selectedPoolPositions.has(position.poolId)}
                            onChange={() => togglePoolPositionSelection(position.poolId)}
                            className="w-3.5 h-3.5 text-cyan-400 bg-black/50 border-white/30 rounded focus:ring-cyan-400 flex-shrink-0"
                          />
                        )}
                        
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-white text-xs truncate">
                            Pool #{position.poolId} - {position.league || position.category || 'Market'}
                          </h4>
                          <div className="text-xs text-white/40 truncate">
                            {position.predictedOutcome || (position.settledAt && new Date(position.settledAt).toLocaleDateString())}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className={`font-bold text-xs ${
                            position.claimableAmount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {position.claimableAmount > 0 ? '+' : ''}{position.claimableAmount.toFixed(2)} {position.currency}
                          </div>
                          <div className="text-xs text-white/40">
                            Stake: {position.stakeAmount.toFixed(2)} {position.currency}
                          </div>
                        </div>

                        {position.claimed ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-400" />
                        ) : position.claimableAmount > 0 ? (
                          <Button
                            onClick={() => handleClaimPoolSingle(position.poolId)}
                            variant="primary"
                            size="sm"
                            disabled={isClaiming}
                            loading={isClaiming}
                            className="text-xs px-2 py-1"
                          >
                            Claim
                          </Button>
                        ) : (
                          <span className="text-red-400/60 text-xs">N/A</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Odyssey Positions - Compact */}
                  {oddyssey.map((position) => (
                    <div
                      key={`${position.cycleId}-${position.slipId}`}
                      className={`px-3 py-2 rounded border transition-all flex items-center justify-between gap-2 ${
                        position.claimed
                          ? 'bg-white/5 border-white/10 opacity-60'
                          : position.claimStatus === 'eligible'
                          ? 'bg-purple-500/10 border-purple-500/30'
                          : 'bg-red-500/5 border-red-500/20'
                      } ${
                        selectedOdysseyPositions.has(`${position.cycleId}-${position.slipId}`) && !position.claimed
                          ? 'ring-1 ring-purple-400'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {!position.claimed && position.claimStatus === 'eligible' && (
                          <input
                            type="checkbox"
                            checked={selectedOdysseyPositions.has(`${position.cycleId}-${position.slipId}`)}
                            onChange={() => toggleOdysseyPositionSelection(position.cycleId, position.slipId)}
                            className="w-3.5 h-3.5 text-purple-400 bg-black/50 border-white/30 rounded focus:ring-purple-400 flex-shrink-0"
                          />
                        )}
                        
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-white text-xs flex items-center gap-1">
                            <FireIcon className="h-3 w-3 text-purple-400 flex-shrink-0" />
                            Cycle {position.cycleId} · Slip {position.slipId}
                          </h4>
                          <div className="text-xs text-white/40">
                            {position.correctCount}/10 correct
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <div className={`font-bold text-xs ${
                            position.claimStatus === 'eligible' ? 'text-purple-400' : 'text-red-400'
                          }`}>
                            {position.claimStatus === 'eligible' ? '+' : ''}{parseFloat(position.prizeAmount).toFixed(2)} BNB
                          </div>
                          <div className="text-xs text-white/40">
                            {position.claimStatus === 'eligible' ? 'Prize' : 'N/A'}
                          </div>
                        </div>

                        {position.claimed ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-400" />
                        ) : position.claimStatus === 'eligible' ? (
                          <Button
                            onClick={() => handleClaimOdysseySingle(position)}
                            variant="primary"
                            size="sm"
                            disabled={isClaiming}
                            loading={isClaiming}
                            className="text-xs px-2 py-1"
                          >
                            Claim
                          </Button>
                        ) : (
                          <span className="text-red-400/60 text-xs">N/A</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border-card bg-bg-card/50">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="text-sm text-text-secondary">
                {isClaiming && claimProgress.total > 0 && (
                  <span>
                    Claiming {claimProgress.completed} of {claimProgress.total}...
                  </span>
                )}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={loadPositions}
                  variant="outline"
                  disabled={isLoading || isClaiming}
                >
                  Refresh
                </Button>
                
                {isNewConnected ? (
                  <Button
                    onClick={handleBatchClaim}
                    variant="primary"
                    disabled={totalSelectedCount === 0 || isClaiming}
                    loading={isClaiming}
                    className="text-xs px-3 py-1.5"
                  >
                    Claim ({totalSelectedCount})
                  </Button>
                ) : (
                  <Button
                    onClick={connectWallet}
                    variant="primary"
                    className="text-xs px-3 py-1.5"
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
