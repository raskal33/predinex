"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import { formatEther, parseEther } from "viem";
import { toast } from "react-hot-toast";
import {
  FaHandshake, 
  FaCheckCircle, 
  FaTimesCircle,
  FaPlus,
  FaSpinner
} from "react-icons/fa";
import { useH2H, type Challenge, type CurrencyType as H2HCurrencyType } from "@/hooks/useH2H";
import { CurrencySelector } from "@/components/CurrencySelector";
import { usePRIXToken } from "@/hooks/usePRIXToken";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { CONTRACT_ADDRESSES } from "@/config/wagmi";
import AmountInput from "@/components/AmountInput";
import Button from "@/components/button";

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

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterState, setFilterState] = useState<FilterState>('all');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [showBidModal, setShowBidModal] = useState(false);

  // Create challenge form state
  const [createForm, setCreateForm] = useState({
    marketId: '',
    outcome: '',
    makerStake: '',
    minBid: '',
    eventStartTime: '',
    currency: 0 as H2HCurrencyType, // 0=BNB, 1=PRIX, 2=USDT
  });

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
        ? 'text-green-400' 
        : 'text-blue-400';
    }
    if (challenge.state === 2) return 'text-purple-400';
    return 'text-gray-400';
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
      toast.error('Market ID is required');
      return;
    }
    if (!createForm.outcome.trim()) {
      toast.error('Outcome is required');
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

    const eventTime = new Date(createForm.eventStartTime).getTime() / 1000;
    const currentTime = Math.floor(Date.now() / 1000);
    if (eventTime <= currentTime + AUCTION_CLOSE_BUFFER) {
      toast.error(`Event must start at least ${AUCTION_CLOSE_BUFFER / 60} minutes from now`);
      return;
    }

    const currency: H2HCurrencyType = createForm.currency as H2HCurrencyType; // Already a H2HCurrencyType (0|1|2)

    // Check token approval for PRIX/USDT
    if (currency === 1) {
      const allowance = await token.getAllowance(CONTRACT_ADDRESSES.H2H as `0x${string}`);
      const stakeAmount = parseEther(createForm.makerStake);
      if (!allowance || allowance < stakeAmount) {
        toast.loading('Approving PRIX tokens...', { id: 'approve-prix' });
        try {
          await token.approve(CONTRACT_ADDRESSES.H2H as `0x${string}`, stakeAmount.toString());
          toast.success('PRIX approved!', { id: 'approve-prix' });
        } catch (error) {
          toast.error('Failed to approve PRIX', { id: 'approve-prix' });
          return;
        }
      }
    }

    const hash = await createChallenge(
      createForm.marketId,
      createForm.outcome,
      createForm.makerStake,
      createForm.minBid,
      eventTime,
      currency
    );

    if (hash) {
      setViewMode('list');
      setCreateForm({
        marketId: '',
        outcome: '',
        makerStake: '',
        minBid: '',
        eventStartTime: '',
        currency: 0 as H2HCurrencyType, // 0=BNB, 1=PRIX, 2=USDT
      });
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

    // Check token approval for PRIX/USDT
    if (selectedChallenge.currency !== 0) {
      const allowance = await token.getAllowance(CONTRACT_ADDRESSES.H2H as `0x${string}`);
      const bidAmountBigInt = parseEther(bidAmount);
      if (!allowance || allowance < bidAmountBigInt) {
        toast.loading('Approving tokens...', { id: 'approve-bid' });
        try {
          await token.approve(CONTRACT_ADDRESSES.H2H as `0x${string}`, bidAmount);
          toast.success('Tokens approved!', { id: 'approve-bid' });
        } catch (error) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <FaHandshake className="text-[var(--bsc-yellow)]" />
                Head-to-Head Challenges
              </h1>
              <p className="text-gray-400">
                Create challenges or bid to be the opponent. Highest bidder wins the action!
              </p>
            </div>
            {isConnected && (
              <div className="text-right">
                <div className="text-sm text-gray-400">Your Stats</div>
                <div className="text-lg font-semibold">
                  {userTotalChallenges} Challenges • {userTotalWins} Wins
                </div>
              </div>
            )}
          </motion.div>

          {/* Pending Refunds */}
          {((pendingRefundBNB && typeof pendingRefundBNB === 'bigint' && pendingRefundBNB > 0n) || (pendingRefundPRIX && typeof pendingRefundPRIX === 'bigint' && pendingRefundPRIX > 0n) || (pendingRefundUSDT && typeof pendingRefundUSDT === 'bigint' && pendingRefundUSDT > 0n)) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-yellow-400 mb-1">Pending Refunds Available</div>
                  <div className="text-sm text-gray-300">
                    {(pendingRefundBNB && typeof pendingRefundBNB === 'bigint' && pendingRefundBNB > 0n) && `${formatEther(pendingRefundBNB)} BNB `}
                    {(pendingRefundPRIX && typeof pendingRefundPRIX === 'bigint' && pendingRefundPRIX > 0n) && `${formatEther(pendingRefundPRIX)} PRIX `}
                    {(pendingRefundUSDT && typeof pendingRefundUSDT === 'bigint' && pendingRefundUSDT > 0n) && `${formatEther(pendingRefundUSDT)} USDT`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {(pendingRefundBNB && typeof pendingRefundBNB === 'bigint' && pendingRefundBNB > 0n) && (
                    <Button
                      onClick={() => withdrawRefund(0)}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      Withdraw BNB
                    </Button>
                  )}
                  {(pendingRefundPRIX && typeof pendingRefundPRIX === 'bigint' && pendingRefundPRIX > 0n) && (
                    <Button
                      onClick={() => withdrawRefund(1)}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      Withdraw PRIX
                    </Button>
                  )}
                  {(pendingRefundUSDT && typeof pendingRefundUSDT === 'bigint' && pendingRefundUSDT > 0n) && (
                    <Button
                      onClick={() => withdrawRefund(2)}
                      className="bg-yellow-500 hover:bg-yellow-600"
                    >
                      Withdraw USDT
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setViewMode('list')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-[var(--bsc-yellow)] text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Challenges
            </button>
            <button
              onClick={() => setViewMode('create')}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                viewMode === 'create'
                  ? 'bg-[var(--bsc-yellow)] text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <FaPlus /> Create Challenge
            </button>
            {isConnected && (
              <button
                onClick={() => setViewMode('my-challenges')}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  viewMode === 'my-challenges'
                    ? 'bg-[var(--bsc-yellow)] text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                My Challenges
              </button>
            )}
          </div>
        </div>

        {/* Create Challenge Form */}
        {viewMode === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 mb-8"
          >
            <h2 className="text-2xl font-bold mb-6">Create New Challenge</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Market ID</label>
                <input
                  type="text"
                  value={createForm.marketId}
                  onChange={(e) => setCreateForm({ ...createForm, marketId: e.target.value })}
                  placeholder="e.g., match_12345"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:border-[var(--bsc-yellow)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Your Prediction (Outcome)</label>
                <input
                  type="text"
                  value={createForm.outcome}
                  onChange={(e) => setCreateForm({ ...createForm, outcome: e.target.value })}
                  placeholder="e.g., HOME_WIN, AWAY_WIN, OVER_2.5"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:border-[var(--bsc-yellow)]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Your Stake</label>
                  <AmountInput
                    value={createForm.makerStake}
                    onChange={(value) => setCreateForm({ ...createForm, makerStake: value })}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Minimum Bid</label>
                  <AmountInput
                    value={createForm.minBid}
                    onChange={(value) => setCreateForm({ ...createForm, minBid: value })}
                    placeholder="0.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Currency</label>
                <CurrencySelector
                  value={(createForm.currency === 0 ? 'BNB' : createForm.currency === 1 ? 'PRIX' : 'USDT') as 'BNB' | 'PRIX' | 'USDT'}
                  onChange={(currency: 'BNB' | 'PRIX' | 'USDT') => {
                    const currencyType: H2HCurrencyType = currency === 'BNB' ? 0 : currency === 'PRIX' ? 1 : 2;
                    setCreateForm({ ...createForm, currency: currencyType });
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Event Start Time</label>
                <input
                  type="datetime-local"
                  value={createForm.eventStartTime}
                  onChange={(e) => setCreateForm({ ...createForm, eventStartTime: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:border-[var(--bsc-yellow)]"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Bidding closes 5 minutes before event start
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-400 mb-2">Creation Fee</div>
                <div className="text-lg font-bold">{formatEther(CREATION_FEE)} BNB</div>
                <div className="text-xs text-gray-400 mt-1">
                  Creation fee is always paid in BNB, regardless of challenge currency
                </div>
              </div>

              <Button
                onClick={handleCreateChallenge}
                disabled={!isConnected}
                className="w-full bg-[var(--bsc-yellow)] hover:bg-[var(--bsc-yellow)]/90 text-black font-bold py-3"
              >
                {!isConnected ? 'Connect Wallet' : 'Create Challenge'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Challenges List */}
        {viewMode !== 'create' && (
          <>
            {/* Filters */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setFilterState('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterState === 'all'
                    ? 'bg-[var(--bsc-yellow)] text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterState('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterState === 'active'
                    ? 'bg-[var(--bsc-yellow)] text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterState('matched')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterState === 'matched'
                    ? 'bg-[var(--bsc-yellow)] text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Matched
              </button>
              <button
                onClick={() => setFilterState('resolved')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  filterState === 'resolved'
                    ? 'bg-[var(--bsc-yellow)] text-black'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Resolved
              </button>
            </div>

            {/* Challenges Grid */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <FaSpinner className="animate-spin text-4xl text-[var(--bsc-yellow)]" />
              </div>
            ) : filteredChallenges.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <FaHandshake className="text-6xl mx-auto mb-4 opacity-50" />
                <p className="text-xl">No challenges found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChallenges.map((challenge) => (
                  <ChallengeCard
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
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Bid Modal */}
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
    </div>
  );
}

// Challenge Card Component
function ChallengeCard({
  challenge,
  address,
  isConnected,
  onBid,
  onClaim,
  onCancel,
  isBiddingOpen,
  canClaim,
  getCurrencyName,
  getStateLabel,
  getStateColor,
}: {
  challenge: Challenge;
  address: string | undefined;
  isConnected: boolean;
  onBid: () => void;
  onClaim: () => void;
  onCancel: () => void;
  isBiddingOpen: boolean;
  canClaim: boolean;
  getCurrencyName: (currency: CurrencyType) => string;
  getStateLabel: (challenge: Challenge) => string;
  getStateColor: (challenge: Challenge) => string;
}) {
  const isCreator = address && challenge.creator.toLowerCase() === address.toLowerCase();
  const isBidder = address && challenge.highestBidder.toLowerCase() === address.toLowerCase();
  const minBid = challenge.highestBidder === '0x0000000000000000000000000000000000000000'
    ? challenge.minBid
    : challenge.highestBid + 1n;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-[var(--bsc-yellow)]/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm text-gray-400">Challenge #{Number(challenge.id)}</div>
          <div className="text-lg font-bold mt-1">{challenge.marketId}</div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStateColor(challenge)} bg-gray-900`}>
          {getStateLabel(challenge)}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <div className="text-sm text-gray-400">Creator Prediction</div>
          <div className="font-semibold">{challenge.creatorOutcome}</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">Stake</div>
            <div className="font-semibold">
              {formatEther(challenge.makerStake)} {getCurrencyName(challenge.currency)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400">Highest Bid</div>
            <div className="font-semibold">
              {challenge.highestBid > 0n 
                ? `${formatEther(challenge.highestBid)} ${getCurrencyName(challenge.currency)}`
                : 'No bids'
              }
            </div>
          </div>
        </div>

        {challenge.highestBidder !== '0x0000000000000000000000000000000000000000' && (
          <div>
            <div className="text-sm text-gray-400">Current Leader</div>
            <div className="font-semibold text-sm truncate">
              {challenge.highestBidder.slice(0, 6)}...{challenge.highestBidder.slice(-4)}
            </div>
          </div>
        )}

        {challenge.state === 2 && challenge.result && (
          <div>
            <div className="text-sm text-gray-400">Result</div>
            <div className="font-semibold">{challenge.result}</div>
            <div className="text-sm mt-1">
              {challenge.creatorWon ? (
                <span className="text-green-400">Creator Won</span>
              ) : (
                <span className="text-blue-400">Bidder Won</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        {isBiddingOpen && !isCreator && (
          <Button
            onClick={onBid}
            disabled={!isConnected}
            className="flex-1 bg-[var(--bsc-yellow)] hover:bg-[var(--bsc-yellow)]/90 text-black font-semibold"
          >
            Bid ({formatEther(minBid)}+ {getCurrencyName(challenge.currency)})
          </Button>
        )}

        {canClaim && (
          <Button
            onClick={onClaim}
            className="flex-1 bg-green-500 hover:bg-green-600 font-semibold"
          >
            Claim Winnings
          </Button>
        )}

        {isCreator && challenge.state === 0 && challenge.highestBidder === '0x0000000000000000000000000000000000000000' && (
          <Button
            onClick={onCancel}
            className="flex-1 bg-red-500 hover:bg-red-600 font-semibold"
          >
            Cancel
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// Bid Modal Component
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Place Bid</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <FaTimesCircle className="text-2xl" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-400 mb-1">Challenge #{Number(challenge.id)}</div>
            <div className="font-semibold">{challenge.creatorOutcome}</div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
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
              className="flex-1 bg-gray-700 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!bidAmount || parseFloat(bidAmount) < parseFloat(formatEther(minBid))}
              className="flex-1 bg-[var(--bsc-yellow)] hover:bg-[var(--bsc-yellow)]/90 text-black font-semibold"
            >
              Place Bid
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

