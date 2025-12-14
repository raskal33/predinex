"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import { toast } from "react-hot-toast";
import {
  FaHandshake, 
  FaTimesCircle,
  FaPlus,
  FaSpinner,
  FaTrophy,
  FaChartLine,
  FaList,
  FaUser,
} from "react-icons/fa";
import { useH2H, type Challenge, type CurrencyType as H2HCurrencyType } from "@/hooks/useH2H";
import { useH2HWithBiconomy } from '@/hooks/useH2HWithBiconomy';
import { useBiconomy } from '@/hooks/useBiconomy';
import { CurrencySelector } from "@/components/CurrencySelector";
import { usePRIXToken } from "@/hooks/usePRIXToken";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { CONTRACT_ADDRESSES } from "@/config/wagmi";
import AmountInput from "@/components/AmountInput";
import Button from "@/components/button";
import H2HMatchSelector from "@/components/H2HMatchSelector";
import H2HCryptoSelector from "@/components/H2HCryptoSelector";
import SessionKeyManager from "@/components/SessionKeyManager";
import { MinimumBidCalculator } from '@/components/MinimumBidCalculator';
import { H2HChallengeCard } from '@/components/H2HChallengeCard';

const CREATION_FEE = parseEther('0.005');
const AUCTION_CLOSE_BUFFER = 5 * 60; // 5 minutes

type ViewMode = 'list' | 'create' | 'my-challenges';
type FilterState = 'all' | 'active' | 'matched' | 'resolved';
type CurrencyType = H2HCurrencyType; // Alias for compatibility

export default function H2HPage() {
  const { address, isConnected } = useAccount();
  const { connectWallet } = useWalletConnection();
  const token = usePRIXToken();
  const {
    challenges,
    loading,
    userTotalChallenges,
    userTotalWins,
    pendingRefundBNB,
    pendingRefundPRIX,
    pendingRefundUSDT,
    createChallenge,
    placeBid,
    claim,
    cancelChallenge,
    withdrawRefund,
  } = useH2H();
  
  const {
    createChallengeWithToken,
    placeBidWithToken,
    biconomyReady
  } = useH2HWithBiconomy({
    apiKey: process.env.NEXT_PUBLIC_BICONOMY_API_KEY,
  });
  
  const {
    hasActiveSession,
    executeWithSession,
    buildComposable
  } = useBiconomy({
    apiKey: process.env.NEXT_PUBLIC_BICONOMY_API_KEY,
  });

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterState, setFilterState] = useState<FilterState>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [showBidModal, setShowBidModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  // Create challenge form state
  const [createForm, setCreateForm] = useState({
    category: 'football' as 'football' | 'cryptocurrency',
    marketId: '',
    outcome: '',
    makerStake: '',
    minBid: '',
    eventStartTime: '',
    currency: 0 as H2HCurrencyType, // 0=BNB, 1=PRIX, 2=USDT
  });

  // Selected match/crypto state
  const [selectedFixture, setSelectedFixture] = useState<any>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null);

  // Filter challenges
  const filteredChallenges = useMemo(() => {
    let filtered = challenges;

    // Filter by state
    if (filterState === 'active') {
      filtered = filtered.filter(c => c.state === 0);
    } else if (filterState === 'matched') {
      filtered = filtered.filter(c => c.state === 1 || (c.state === 0 && c.highestBidder !== '0x0000000000000000000000000000000000000000'));
    } else if (filterState === 'resolved') {
      filtered = filtered.filter(c => c.state === 2);
    }

    // Filter by user if viewing my challenges
    if (viewMode === 'my-challenges' && address) {
      filtered = filtered.filter(c => 
        c.creator.toLowerCase() === address.toLowerCase() || 
        c.highestBidder.toLowerCase() === address.toLowerCase()
      );
    }

    // Sort by creation time (newest first)
    return filtered.sort((a, b) => Number(b.creationTime) - Number(a.creationTime));
  }, [challenges, filterState, viewMode, address]);

  // Get currency name
  const getCurrencyName = (currency: CurrencyType) => {
    return currency === 0 ? 'BNB' : currency === 1 ? 'PRIX' : 'USDT';
  };

  // Get state label
  const getStateLabel = (challenge: Challenge) => {
    if (challenge.state === 0) {
      return challenge.highestBidder !== '0x0000000000000000000000000000000000000000' ? 'Matched' : 'Active';
    }
    if (challenge.state === 1) return 'Matched';
    if (challenge.state === 2) return 'Resolved';
    return 'Cancelled';
  };

  // Get state color
  const getStateColor = (challenge: Challenge) => {
    if (challenge.state === 0) {
      return challenge.highestBidder !== '0x0000000000000000000000000000000000000000' 
        ? 'text-[#10B981]' 
        : 'text-[#3B82F6]';
    }
    if (challenge.state === 2) return 'text-[#8B5CF6]';
    return 'text-white/50';
  };

  // Get state bg color
  const getStateBgColor = (challenge: Challenge) => {
    if (challenge.state === 0) {
      return challenge.highestBidder !== '0x0000000000000000000000000000000000000000' 
        ? 'bg-[#10B981]/20 border-[#10B981]/30' 
        : 'bg-[#3B82F6]/20 border-[#3B82F6]/30';
    }
    if (challenge.state === 2) return 'bg-[#8B5CF6]/20 border-[#8B5CF6]/30';
    return 'bg-white/5 border-white/10';
  };

  // Check if bidding is open
  const isBiddingOpen = (challenge: Challenge) => {
    if (challenge.state !== 0) return false;
    const currentTime = Math.floor(Date.now() / 1000);
    return Number(challenge.eventStartTime) > currentTime + AUCTION_CLOSE_BUFFER;
  };

  // Check if user can claim
  const canClaim = (challenge: Challenge) => {
    if (challenge.state !== 2 || !address) return false;
    if (challenge.highestBidder === '0x0000000000000000000000000000000000000000') {
      return challenge.creator.toLowerCase() === address.toLowerCase();
    }
    const winner = challenge.creatorWon ? challenge.creator : challenge.highestBidder;
    return winner.toLowerCase() === address.toLowerCase();
  };

  // Handle create challenge
  const handleCreateChallenge = async () => {
    if (!isConnected) {
      connectWallet();
      return;
    }

    // Validation
    if (!createForm.marketId.trim()) {
      toast.error('Please select a match or cryptocurrency');
      return;
    }
    if (!createForm.outcome.trim()) {
      toast.error('Please select an outcome');
      return;
    }
    if (!createForm.makerStake || parseFloat(createForm.makerStake) <= 0) {
      toast.error('Maker stake must be greater than 0');
      return;
    }
    if (!createForm.minBid || parseFloat(createForm.minBid) <= 0) {
      toast.error('Minimum bid must be greater than 0');
      return;
    }
    if (parseFloat(createForm.minBid) >= parseFloat(createForm.makerStake)) {
      toast.error('Minimum bid should be less than maker stake');
      return;
    }

    if (!createForm.eventStartTime) {
      toast.error('Event start time is required');
      return;
    }

    const eventTime = new Date(createForm.eventStartTime).getTime() / 1000;
    const currentTime = Math.floor(Date.now() / 1000);
    if (eventTime <= currentTime + AUCTION_CLOSE_BUFFER) {
      toast.error(`Event must start at least ${AUCTION_CLOSE_BUFFER / 60} minutes from now`);
      return;
    }

    const currency: H2HCurrencyType = createForm.currency as H2HCurrencyType; // Already a H2HCurrencyType (0|1|2)

    // For PRIX tokens (currency === 1), check for active session first
    if (currency === 1 && hasActiveSession(CONTRACT_ADDRESSES.H2H as `0x${string}`, parseEther(createForm.makerStake))) {
      try {
        toast.loading('Creating challenge with session key (no signature needed)...', { id: 'create-challenge' });
        
        const instruction = await buildComposable({
          to: CONTRACT_ADDRESSES.H2H as `0x${string}`,
          abi: [],
          functionName: 'createChallenge',
          args: [createForm.marketId, createForm.outcome, parseEther(createForm.minBid), BigInt(eventTime), currency],
          value: parseEther(createForm.makerStake),
        });

        const { hash } = await executeWithSession({
          instruction,
          contractAddress: CONTRACT_ADDRESSES.H2H as `0x${string}`,
          value: parseEther(createForm.makerStake),
        });

        if (hash) {
          toast.success('Challenge created with session key!', { id: 'create-challenge' });
          setViewMode('list');
          setCreateForm({
            category: 'football',
            marketId: '',
            outcome: '',
            makerStake: '',
            minBid: '',
            eventStartTime: '',
            currency: 0 as H2HCurrencyType,
          });
          setSelectedFixture(null);
          setSelectedCrypto(null);
        }
        return;
      } catch (_sessionError) {
        console.log('Session execution failed, trying Biconomy:', _sessionError);
        toast.dismiss('create-challenge');
      }
    }

    // Try Biconomy if session not available
    if (currency === 1 && biconomyReady) {
      try {
        toast.loading('Creating challenge with single signature...', { id: 'create-challenge' });
        
        const hash = await createChallengeWithToken({
          marketId: createForm.marketId,
          outcome: createForm.outcome,
          makerStake: parseEther(createForm.makerStake),
          minBid: parseEther(createForm.minBid),
          eventTime: BigInt(eventTime),
          tokenAddress: CONTRACT_ADDRESSES.PRIX_TOKEN as `0x${string}`,
        });

        if (hash) {
          toast.success('Challenge created! (Biconomy)', { id: 'create-challenge' });
          setViewMode('list');
          setCreateForm({
            category: 'football',
            marketId: '',
            outcome: '',
            makerStake: '',
            minBid: '',
            eventStartTime: '',
            currency: 0 as H2HCurrencyType,
          });
          setSelectedFixture(null);
          setSelectedCrypto(null);
        }
        return; // Exit early if Biconomy succeeds
      } catch (biconomyError) {
        console.log('Biconomy failed, falling back to standard flow:', biconomyError);
        toast.dismiss('create-challenge');
        // Fall through to standard flow below
      }
    }

    // Standard flow: Check token approval for PRIX/USDT
    if (currency === 1) {
      const allowance = await token.getAllowance(CONTRACT_ADDRESSES.H2H as `0x${string}`);
      const stakeAmount = parseEther(createForm.makerStake);
      if (!allowance || allowance < stakeAmount) {
        toast.loading('Approving PRIX tokens...', { id: 'approve-prix' });
        try {
          await token.approve(CONTRACT_ADDRESSES.H2H as `0x${string}`, stakeAmount.toString());
          toast.success('PRIX approved!', { id: 'approve-prix' });
        } catch (_error) {
          toast.error('Failed to approve PRIX', { id: 'approve-prix' });
          return;
        }
      }
    }

    const hash = await createChallenge(
      createForm.marketId,
      createForm.outcome, // This will be encoded in the hook
      createForm.makerStake,
      createForm.minBid,
      eventTime,
      currency
    );

    if (hash) {
      setViewMode('list');
      setCreateForm({
        category: 'football',
        marketId: '',
        outcome: '',
        makerStake: '',
        minBid: '',
        eventStartTime: '',
        currency: 0 as H2HCurrencyType, // 0=BNB, 1=PRIX, 2=USDT
      });
      setSelectedFixture(null);
      setSelectedCrypto(null);
    }
  };

  // Handle place bid
  const handlePlaceBid = async () => {
    if (!selectedChallenge || !bidAmount) return;

    const bidAmountFloat = parseFloat(bidAmount);
    if (bidAmountFloat <= 0) {
      toast.error('Bid amount must be greater than 0');
      return;
    }

    const minBid = selectedChallenge.highestBidder === '0x0000000000000000000000000000000000000000'
      ? selectedChallenge.minBid
      : selectedChallenge.highestBid + 1n;

    if (parseEther(bidAmount) < minBid) {
      toast.error(`Bid must be at least ${formatEther(minBid)} ${getCurrencyName(selectedChallenge.currency)}`);
      return;
    }

    // For PRIX tokens (currency !== 0), try Biconomy first if available
    if (selectedChallenge.currency !== 0 && biconomyReady) {
      try {
        toast.loading('Placing bid with single signature...', { id: 'place-bid' });
        
        const hash = await placeBidWithToken({
          challengeId: Number(selectedChallenge.id),
          bidAmount: parseEther(bidAmount),
          tokenAddress: CONTRACT_ADDRESSES.PRIX_TOKEN as `0x${string}`,
        });

        if (hash) {
          toast.success('Bid placed! (Biconomy)', { id: 'place-bid' });
          setShowBidModal(false);
          setBidAmount('');
          setSelectedChallenge(null);
        }
        return; // Exit early if Biconomy succeeds
      } catch (biconomyError) {
        console.log('Biconomy failed, falling back to standard flow:', biconomyError);
        toast.dismiss('place-bid');
        // Fall through to standard flow below
      }
    }

    // Standard flow: Check token approval for PRIX/USDT
    if (selectedChallenge.currency !== 0) {
      const allowance = await token.getAllowance(CONTRACT_ADDRESSES.H2H as `0x${string}`);
      const bidAmountBigInt = parseEther(bidAmount);
      if (!allowance || allowance < bidAmountBigInt) {
        toast.loading('Approving tokens...', { id: 'approve-bid' });
        try {
          await token.approve(CONTRACT_ADDRESSES.H2H as `0x${string}`, bidAmount);
          toast.success('Tokens approved!', { id: 'approve-bid' });
        } catch (_error) {
          toast.error('Failed to approve tokens', { id: 'approve-bid' });
          return;
        }
      }
    }

    const hash = await placeBid(Number(selectedChallenge.id), bidAmount, selectedChallenge.currency);
    if (hash) {
      setShowBidModal(false);
      setBidAmount('');
      setSelectedChallenge(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0E13] via-[#0F1419] to-[#0A0E13] text-white">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header - Compact Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#FFC107]/20 to-[#F7B600]/20 border border-[#FFC107]/30">
                  <FaHandshake className="h-5 w-5 text-[#FFC107]" />
                </div>
                <div>
                  <h1 className="text-2xl font-black bg-gradient-to-r from-[#FFC107] via-[#F7B600] to-[#FFC107] bg-clip-text text-transparent">
                    Head-to-Head Challenges
                  </h1>
                  <p className="text-xs text-white/60 mt-0.5">
                    Create challenges or bid to be the opponent
                  </p>
                </div>
              </div>
              
              {isConnected && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10">
                    <FaChartLine className="h-3.5 w-3.5 text-[#FFC107]" />
                    <div>
                      <div className="text-xs text-white/60">Challenges</div>
                      <div className="text-sm font-black text-white">{userTotalChallenges || 0}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-sm bg-white/5 border border-white/10">
                    <FaTrophy className="h-3.5 w-3.5 text-[#10B981]" />
                    <div>
                      <div className="text-xs text-white/60">Wins</div>
                      <div className="text-sm font-black text-white">{userTotalWins || 0}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pending Refunds - Glassmorphism */}
          {((pendingRefundBNB && typeof pendingRefundBNB === 'bigint' && pendingRefundBNB > 0n) || (pendingRefundPRIX && typeof pendingRefundPRIX === 'bigint' && pendingRefundPRIX > 0n) || (pendingRefundUSDT && typeof pendingRefundUSDT === 'bigint' && pendingRefundUSDT > 0n)) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-[#FFC107]/10 via-[#F7B600]/5 to-transparent border border-[#FFC107]/20 p-4 mb-6"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <div className="font-semibold text-[#FFC107] mb-1 text-sm">Pending Refunds Available</div>
                  <div className="text-xs text-white/70">
                    {(pendingRefundBNB && typeof pendingRefundBNB === 'bigint' && pendingRefundBNB > 0n) && `${formatEther(pendingRefundBNB)} BNB `}
                    {(pendingRefundPRIX && typeof pendingRefundPRIX === 'bigint' && pendingRefundPRIX > 0n) && `${formatEther(pendingRefundPRIX)} PRIX `}
                    {(pendingRefundUSDT && typeof pendingRefundUSDT === 'bigint' && pendingRefundUSDT > 0n) && `${formatEther(pendingRefundUSDT)} USDT`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {(pendingRefundBNB && typeof pendingRefundBNB === 'bigint' && pendingRefundBNB > 0n) && (
                    <Button
                      onClick={() => withdrawRefund(0)}
                      className="bg-gradient-to-r from-[#FFC107] to-[#F7B600] hover:from-[#FFC107]/90 hover:to-[#F7B600]/90 text-black font-semibold text-xs px-3 py-1.5"
                    >
                      Withdraw BNB
                    </Button>
                  )}
                  {(pendingRefundPRIX && typeof pendingRefundPRIX === 'bigint' && pendingRefundPRIX > 0n) && (
                    <Button
                      onClick={() => withdrawRefund(1)}
                      className="bg-gradient-to-r from-[#FFC107] to-[#F7B600] hover:from-[#FFC107]/90 hover:to-[#F7B600]/90 text-black font-semibold text-xs px-3 py-1.5"
                    >
                      Withdraw PRIX
                    </Button>
                  )}
                  {(pendingRefundUSDT && typeof pendingRefundUSDT === 'bigint' && pendingRefundUSDT > 0n) && (
                    <Button
                      onClick={() => withdrawRefund(2)}
                      className="bg-gradient-to-r from-[#FFC107] to-[#F7B600] hover:from-[#FFC107]/90 hover:to-[#F7B600]/90 text-black font-semibold text-xs px-3 py-1.5"
                    >
                      Withdraw USDT
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Tabs - Icon-based Glassmorphism */}
          <div className="flex items-center justify-center gap-2 bg-[#0F1419]/80 backdrop-blur-md border border-white/5 rounded-2xl p-2 mb-6">
            <motion.button
              onClick={() => setViewMode('list')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                viewMode === 'list'
                  ? 'bg-gradient-to-r from-[#FFC107] to-[#F7B600] text-black'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <FaList className="h-4 w-4" />
              <span className="hidden sm:inline">All Challenges</span>
            </motion.button>
            <motion.button
              onClick={() => setViewMode('create')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                viewMode === 'create'
                  ? 'bg-gradient-to-r from-[#FFC107] to-[#F7B600] text-black'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <FaPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </motion.button>
            {isConnected && (
              <motion.button
                onClick={() => setViewMode('my-challenges')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  viewMode === 'my-challenges'
                    ? 'bg-gradient-to-r from-[#FFC107] to-[#F7B600] text-black'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <FaUser className="h-4 w-4" />
                <span className="hidden sm:inline">My Challenges</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Create Challenge Form - Glassmorphism */}
        {viewMode === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-6 mb-8"
          >
            <h2 className="text-xl font-black mb-6 bg-gradient-to-r from-[#FFC107] via-[#F7B600] to-[#FFC107] bg-clip-text text-transparent">
              Create New Challenge
            </h2>
            
            <div className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">Category</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateForm({ ...createForm, category: 'football', marketId: '', outcome: '', eventStartTime: '' });
                      setSelectedFixture(null);
                      setSelectedCrypto(null);
                    }}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                      createForm.category === 'football'
                        ? 'bg-gradient-to-r from-[#FFC107] to-[#F7B600] text-black'
                        : 'bg-[#0A0E13]/80 border border-white/10 text-white/70 hover:text-white hover:border-white/20'
                    }`}
                  >
                    ⚽ Football
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateForm({ ...createForm, category: 'cryptocurrency', marketId: '', outcome: '', eventStartTime: '' });
                      setSelectedFixture(null);
                      setSelectedCrypto(null);
                    }}
                    className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                      createForm.category === 'cryptocurrency'
                        ? 'bg-gradient-to-r from-[#FFC107] to-[#F7B600] text-black'
                        : 'bg-[#0A0E13]/80 border border-white/10 text-white/70 hover:text-white hover:border-white/20'
                    }`}
                  >
                    💰 Cryptocurrency
                  </button>
                </div>
              </div>

              {/* Match/Crypto Selector */}
              {createForm.category === 'football' ? (
                <div>
                  <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">Select Match & Outcome</label>
                  <H2HMatchSelector
                    onSelect={(fixture, marketId, outcome, eventStartTime) => {
                      if (fixture) {
                        setSelectedFixture(fixture);
                        setCreateForm({
                          ...createForm,
                          marketId,
                          outcome,
                          eventStartTime: new Date(eventStartTime * 1000).toISOString().slice(0, 16),
                        });
                      } else {
                        setSelectedFixture(null);
                        setCreateForm({
                          ...createForm,
                          marketId: '',
                          outcome: '',
                          eventStartTime: '',
                        });
                      }
                    }}
                    selectedFixture={selectedFixture}
                    selectedOutcome={createForm.outcome}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">Select Cryptocurrency & Prediction</label>
                  <H2HCryptoSelector
                    onSelect={(crypto, marketId, outcome, eventStartTime, _timeframe) => {
                      if (crypto) {
                        setSelectedCrypto(crypto);
                        setCreateForm({
                          ...createForm,
                          marketId,
                          outcome,
                          eventStartTime: new Date(eventStartTime * 1000).toISOString().slice(0, 16),
                        });
                      } else {
                        setSelectedCrypto(null);
                        setCreateForm({
                          ...createForm,
                          marketId: '',
                          outcome: '',
                          eventStartTime: '',
                        });
                      }
                    }}
                    selectedCrypto={selectedCrypto}
                    selectedOutcome={createForm.outcome}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">Your Stake</label>
                  <AmountInput
                    value={createForm.makerStake}
                    onChange={(value) => setCreateForm({ ...createForm, makerStake: value })}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">Minimum Bid</label>
                  <AmountInput
                    value={createForm.minBid}
                    onChange={(value) => setCreateForm({ ...createForm, minBid: value })}
                    placeholder="0.0"
                  />
                </div>
              </div>

              {/* Minimum Bid Calculator */}
              {selectedFixture && createForm.outcome && createForm.makerStake && (
                <MinimumBidCalculator
                  makerStake={createForm.makerStake}
                  selectedOutcome={{
                    value: createForm.outcome,
                    odds: selectedFixture.odds?.[
                      createForm.outcome === 'HOME_WIN' ? 'home' :
                      createForm.outcome === 'AWAY_WIN' ? 'away' :
                      createForm.outcome === 'OVER_2.5' ? 'over25' :
                      createForm.outcome === 'UNDER_2.5' ? 'under25' : 'draw'
                    ] || 2.0,
                    marketType: createForm.outcome.includes('OVER') || createForm.outcome.includes('UNDER') ? 'over_under' : 'home_away'
                  }}
                  fixtureOdds={selectedFixture.odds}
                  onMinBidCalculated={(minBid) => {
                    // Auto-fill if field is empty or 0
                    if (!createForm.minBid || parseFloat(createForm.minBid) === 0) {
                      setCreateForm({ ...createForm, minBid });
                    }
                  }}
                />
              )}

              <div>
                <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">Currency</label>
                <CurrencySelector
                  value={(createForm.currency === 0 ? 'BNB' : createForm.currency === 1 ? 'PRIX' : 'USDT') as 'BNB' | 'PRIX' | 'USDT'}
                  onChange={(currency: 'BNB' | 'PRIX' | 'USDT') => {
                    const currencyType: H2HCurrencyType = currency === 'BNB' ? 0 : currency === 'PRIX' ? 1 : 2;
                    setCreateForm({ ...createForm, currency: currencyType });
                  }}
                />
              </div>

              {(!selectedFixture && !selectedCrypto) && (
                <div>
                  <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">Event Start Time</label>
                  <input
                    type="datetime-local"
                    value={createForm.eventStartTime}
                    onChange={(e) => setCreateForm({ ...createForm, eventStartTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#0A0E13]/80 backdrop-blur-sm border border-white/10 rounded-lg focus:outline-none focus:border-[#FFC107]/50 text-white transition-all"
                  />
                  <p className="text-xs text-white/50 mt-1.5">
                    Bidding closes 5 minutes before event start
                  </p>
                </div>
              )}

              {createForm.eventStartTime && (selectedFixture || selectedCrypto) && (
                <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-gradient-to-br from-[#3B82F6]/10 via-[#3B82F6]/5 to-transparent border border-[#3B82F6]/20 p-3">
                  <div className="text-xs font-semibold text-[#3B82F6] mb-1 uppercase tracking-wider">Event Start Time</div>
                  <div className="text-sm font-semibold text-white">
                    {new Date(createForm.eventStartTime).toLocaleString()}
                  </div>
                  <p className="text-xs text-white/50 mt-1">
                    Auto-set from selected {createForm.category === 'football' ? 'match' : 'cryptocurrency'}
                  </p>
                </div>
              )}

              <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-gradient-to-br from-[#3B82F6]/10 via-[#3B82F6]/5 to-transparent border border-[#3B82F6]/20 p-4">
                <div className="text-xs font-semibold text-[#3B82F6] mb-1 uppercase tracking-wider">Creation Fee</div>
                <div className="text-lg font-black text-white">{formatEther(CREATION_FEE)} BNB</div>
                <div className="text-xs text-white/50 mt-1">
                  Creation fee is always paid in BNB, regardless of challenge currency
                </div>
              </div>

              <Button
                onClick={handleCreateChallenge}
                disabled={!isConnected}
                className="w-full bg-gradient-to-r from-[#FFC107] to-[#F7B600] hover:from-[#FFC107]/90 hover:to-[#F7B600]/90 text-black font-black py-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!isConnected ? 'Connect Wallet' : 'Create Challenge'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Challenges List */}
        {viewMode !== 'create' && (
          <>
            {/* Filters - Glassmorphism */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {(['all', 'active', 'matched', 'resolved'] as FilterState[]).map((state) => (
                <motion.button
                  key={state}
                  onClick={() => setFilterState(state)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all uppercase tracking-wider ${
                    filterState === state
                      ? 'bg-gradient-to-r from-[#FFC107] to-[#F7B600] text-black'
                      : 'bg-[#0F1419]/80 backdrop-blur-sm border border-white/10 text-white/70 hover:text-white hover:border-white/20'
                  }`}
                >
                  {state}
                </motion.button>
              ))}
            </div>

            {/* Challenges Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <FaSpinner className="animate-spin text-4xl text-[#FFC107]" />
              </div>
            ) : filteredChallenges.length === 0 ? (
              <div className="text-center py-20">
                <div className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-12 inline-block">
                  <FaHandshake className="text-6xl mx-auto mb-4 text-white/30" />
                  <p className="text-lg font-semibold text-white/60">No challenges found</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChallenges.map((challenge) => (
                  <H2HChallengeCard
                    key={Number(challenge.id)}
                    challenge={challenge}
                    address={address}
                    isConnected={isConnected}
                    onBid={() => {
                      setSelectedChallenge(challenge);
                      setShowBidModal(true);
                    }}
                    onClaim={() => claim(Number(challenge.id))}
                    onCancel={() => cancelChallenge(Number(challenge.id))}
                    isBiddingOpen={isBiddingOpen(challenge)}
                    canClaim={canClaim(challenge)}
                    getCurrencyName={getCurrencyName}
                    getStateLabel={getStateLabel}
                    getStateColor={getStateColor}
                    getStateBgColor={getStateBgColor}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Bid Modal - Glassmorphism */}
        <AnimatePresence>
          {showBidModal && selectedChallenge && (
            <BidModal
              challenge={selectedChallenge}
              bidAmount={bidAmount}
              setBidAmount={setBidAmount}
              onClose={() => {
                setShowBidModal(false);
                setBidAmount('');
                setSelectedChallenge(null);
              }}
              onConfirm={handlePlaceBid}
              getCurrencyName={getCurrencyName}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Session Key Manager Modal */}
      <SessionKeyManager 
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
      />
    </div>
  );
}

// Bid Modal Component - Glassmorphism
function BidModal({
  challenge,
  bidAmount,
  setBidAmount,
  onClose,
  onConfirm,
  getCurrencyName,
}: {
  challenge: Challenge;
  bidAmount: string;
  setBidAmount: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  getCurrencyName: (currency: CurrencyType) => string;
}) {
  const minBid = challenge.highestBidder === '0x0000000000000000000000000000000000000000'
    ? challenge.minBid
    : challenge.highestBid + 1n;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative overflow-hidden rounded-xl backdrop-blur-md bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 p-6 max-w-md w-full"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black bg-gradient-to-r from-[#FFC107] via-[#F7B600] to-[#FFC107] bg-clip-text text-transparent">
            Place Bid
          </h3>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <FaTimesCircle className="text-2xl" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-[#0A0E13]/60 border border-white/10 p-3">
            <div className="text-xs text-white/50 mb-1 uppercase tracking-wider">Challenge #{Number(challenge.id)}</div>
            <div className="font-semibold text-white">{challenge.creatorOutcome}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2 text-white/80 uppercase tracking-wider">
              Bid Amount (Min: {formatEther(minBid)} {getCurrencyName(challenge.currency)})
            </label>
            <AmountInput
              value={bidAmount}
              onChange={setBidAmount}
              placeholder="0.0"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={onClose}
              className="flex-1 bg-[#0F1419]/80 backdrop-blur-sm border border-white/10 hover:border-white/20 text-white font-semibold text-sm py-2.5 rounded-lg transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!bidAmount || parseFloat(bidAmount) < parseFloat(formatEther(minBid))}
              className="flex-1 bg-gradient-to-r from-[#FFC107] to-[#F7B600] hover:from-[#FFC107]/90 hover:to-[#F7B600]/90 text-black font-semibold text-sm py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Place Bid
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
