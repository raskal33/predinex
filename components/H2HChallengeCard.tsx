"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';
import { 
  FaHandshake, 
  FaTimesCircle,
  FaTrophy,
  FaChartLine,
} from "react-icons/fa";
import Button from "@/components/button";
import { type Challenge, type CurrencyType } from "@/hooks/useH2H";

interface H2HChallengeCardProps {
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
  getStateBgColor: (challenge: Challenge) => string;
}

// Enhanced Challenge Card Component with Pro Glassmorphism
export function H2HChallengeCard({
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
  getStateBgColor,
}: H2HChallengeCardProps) {
  const isCreator = address && challenge.creator.toLowerCase() === address.toLowerCase();
  const isBidder = address && challenge.highestBidder.toLowerCase() === address.toLowerCase();
  const minBid = challenge.highestBidder === '0x0000000000000000000000000000000000000000'
    ? challenge.minBid
    : challenge.highestBid + 1n;

  const totalPot = challenge.makerStake + challenge.highestBid;
  const potentialWinnings = totalPot > 0n ? (totalPot * 97n) / 100n : 0n; // After 3% fee

  // Time until event starts
  const timeUntilEvent = Number(challenge.eventStartTime) * 1000 - Date.now();
  const hoursUntilEvent = Math.floor(timeUntilEvent / (1000 * 60 * 60));
  const daysUntilEvent = Math.floor(hoursUntilEvent / 24);

  const formatTimeUntilEvent = () => {
    if (timeUntilEvent <= 0) return 'Event Started';
    if (daysUntilEvent > 0) return `${daysUntilEvent}d ${hoursUntilEvent % 24}h`;
    if (hoursUntilEvent > 0) return `${hoursUntilEvent}h`;
    return `${Math.floor(timeUntilEvent / (1000 * 60))}m`;
  };

  // Determine card accent color based on state and user role
  const getCardAccent = () => {
    if (challenge.state === 2) { // Resolved
      if (challenge.creatorWon && isCreator) return 'from-green-500/20 to-emerald-500/20 border-green-500/40';
      if (!challenge.creatorWon && isBidder) return 'from-green-500/20 to-emerald-500/20 border-green-500/40';
      if (challenge.creatorWon && isBidder) return 'from-red-500/20 to-rose-500/20 border-red-500/40';
      if (!challenge.creatorWon && isCreator) return 'from-red-500/20 to-rose-500/20 border-red-500/40';
      return 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
    }
    if (challenge.state === 1 || challenge.highestBidder !== '0x0000000000000000000000000000000000000000') {
      return 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30'; // Matched
    }
    if (isCreator) return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
    return 'from-white/10 via-white/5 to-transparent border-white/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br ${getCardAccent()} p-6 transition-all hover:shadow-2xl hover:shadow-[#FFC107]/10`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Top corner glow effect */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFC107]/10 rounded-full blur-3xl opacity-0 group-hover:opacity-50 transition-opacity duration-500" />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">
              Challenge #{Number(challenge.id)}
            </span>
            {isCreator && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] font-bold uppercase">
                Your Challenge
              </span>
            )}
            {isBidder && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[10px] font-bold uppercase">
                You Bid
              </span>
            )}
          </div>
          <div className="text-base font-black text-white truncate mb-1">{challenge.marketId}</div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <FaChartLine className="text-white/40" />
              {formatTimeUntilEvent()}
            </span>
            <span className="text-white/30">•</span>
            <span className="font-semibold text-[#FFC107]">{getCurrencyName(challenge.currency)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-sm ${getStateColor(challenge)} ${getStateBgColor(challenge)} uppercase tracking-wide`}>
            {getStateLabel(challenge)}
          </span>
        </div>
      </div>

      {/* Prediction Badge - Large & Prominent */}
      <div className="relative mb-5">
        <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-[#FFC107]/15 via-[#F7B600]/10 to-transparent border border-[#FFC107]/30 p-4">
          <div className="text-xs text-[#FFC107]/80 mb-1 uppercase tracking-wider font-semibold">Creator Predicts</div>
          <div className="text-2xl font-black text-white">{challenge.creatorOutcome}</div>
          {challenge.state === 0 && (
            <div className="mt-2 text-xs text-white/60">
              <span className="text-white/80 font-semibold">You bet opposite</span> to challenge
            </div>
          )}
        </div>
      </div>

      {/* Stakes Grid - Enhanced */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 p-3 group-hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Creator Stake</span>
            {isCreator && <span className="text-yellow-400 text-xs">👤</span>}
          </div>
          <div className="font-black text-white text-lg">
            {formatEther(challenge.makerStake)}
          </div>
          <div className="text-xs text-white/40">{getCurrencyName(challenge.currency)}</div>
        </div>

        <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 p-3 group-hover:border-white/20 transition-colors">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">Highest Bid</span>
            {isBidder && <span className="text-cyan-400 text-xs">👤</span>}
          </div>
          <div className="font-black text-white text-lg">
            {challenge.highestBid > 0n 
              ? formatEther(challenge.highestBid)
              : '—'
            }
          </div>
          <div className="text-xs text-white/40">
            {challenge.highestBid > 0n 
              ? getCurrencyName(challenge.currency)
              : 'No bids yet'
            }
          </div>
        </div>
      </div>

      {/* Total Pot Display */}
      {totalPot > 0n && (
        <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border border-purple-500/30 p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-purple-300/80 mb-0.5 uppercase tracking-wider font-semibold">Total Pot</div>
              <div className="font-black text-white text-xl">{formatEther(totalPot)} {getCurrencyName(challenge.currency)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-purple-300/80 mb-0.5 uppercase tracking-wider font-semibold">Winner Gets</div>
              <div className="font-bold text-purple-300 text-lg">{formatEther(potentialWinnings)}</div>
              <div className="text-[10px] text-white/40">(97% after fee)</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Leader Info */}
      {challenge.highestBidder !== '0x0000000000000000000000000000000000000000' && (
        <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-cyan-500/10 border border-cyan-500/20 p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-cyan-300/80 mb-1 uppercase tracking-wider font-semibold flex items-center gap-1">
                <FaTrophy className="text-cyan-400" />
                Current Leader
              </div>
              <div className="font-mono text-xs text-white truncate">
                {challenge.highestBidder.slice(0, 10)}...{challenge.highestBidder.slice(-8)}
              </div>
            </div>
            {isBidder && (
              <div className="px-2 py-1 rounded-lg bg-cyan-400/20 border border-cyan-400/40">
                <span className="text-xs font-bold text-cyan-300">You</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Result Display - If Resolved */}
      {challenge.state === 2 && challenge.result && (
        <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-purple-500/15 via-violet-500/10 to-transparent border border-purple-500/30 p-4 mb-4">
          <div className="text-xs text-purple-300/80 mb-2 uppercase tracking-wider font-semibold">Final Result</div>
          <div className="font-black text-white text-lg mb-2">{challenge.result}</div>
          <div className="flex items-center gap-2">
            {challenge.creatorWon ? (
              <>
                <span className="px-2 py-1 rounded-lg bg-green-500/20 border border-green-500/40 text-green-400 text-xs font-bold flex items-center gap-1">
                  <FaTrophy />
                  Creator Won
                </span>
                {isCreator && <span className="text-xs text-green-400 font-semibold">🎉 You won!</span>}
                {isBidder && <span className="text-xs text-red-400 font-semibold">You lost</span>}
              </>
            ) : (
              <>
                <span className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-bold flex items-center gap-1">
                  <FaTrophy />
                  Bidder Won
                </span>
                {isBidder && <span className="text-xs text-green-400 font-semibold">🎉 You won!</span>}
                {isCreator && <span className="text-xs text-red-400 font-semibold">You lost</span>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Betting Closed Notice */}
      {!isBiddingOpen && challenge.state === 0 && (
        <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-orange-500/10 border border-orange-500/30 p-3 mb-4">
          <div className="flex items-center gap-2 text-xs text-orange-300">
            <FaTimesCircle />
            <span className="font-semibold">Betting Closed</span>
            <span className="text-white/50">• Event starts soon</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="relative flex gap-2 mt-auto pt-4 border-t border-white/10">
        {/* Bid Button - Only if bidding is open and not creator */}
        {isBiddingOpen && !isCreator && (
          <Button
            onClick={onBid}
            disabled={!isConnected}
            className="flex-1 relative overflow-hidden bg-gradient-to-r from-[#FFC107] via-[#F7B600] to-[#FFC107] hover:from-[#FFC107]/90 hover:to-[#F7B600]/90 text-black font-bold text-sm py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#FFC107]/20 hover:shadow-xl hover:shadow-[#FFC107]/30"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <FaHandshake />
              Bid {formatEther(minBid)}+ {getCurrencyName(challenge.currency)}
            </span>
          </Button>
        )}

        {/* Claim Button - Only if user can claim */}
        {canClaim && (
          <Button
            onClick={onClaim}
            className="flex-1 relative overflow-hidden bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-green-500/20 hover:shadow-xl hover:shadow-green-500/30"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <FaTrophy />
              Claim {formatEther(potentialWinnings)} {getCurrencyName(challenge.currency)}
            </span>
          </Button>
        )}

        {/* Cancel Button - Only creator can cancel if no bids */}
        {isCreator && challenge.state === 0 && challenge.highestBidder === '0x0000000000000000000000000000000000000000' && (
          <Button
            onClick={onCancel}
            className="flex-1 relative overflow-hidden bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-red-500/20"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <FaTimesCircle />
              Cancel Challenge
            </span>
          </Button>
        )}

        {/* Info message if user is creator and bidding is open */}
        {isCreator && isBiddingOpen && challenge.highestBidder === '0x0000000000000000000000000000000000000000' && (
          <div className="flex-1 flex items-center justify-center text-xs text-white/60">
            Waiting for opponents...
          </div>
        )}

        {/* Info message if creator and challenge is matched */}
        {isCreator && !isBiddingOpen && challenge.state === 0 && challenge.highestBidder !== '0x0000000000000000000000000000000000000000' && (
          <div className="flex-1 flex items-center justify-center text-xs text-cyan-400 font-semibold">
            <FaChartLine className="mr-1" />
            Challenge matched • Awaiting result
          </div>
        )}
      </div>

      {/* Minimum Bid Hint - If no bids yet */}
      {challenge.highestBidder === '0x0000000000000000000000000000000000000000' && !isCreator && isBiddingOpen && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-white/50">
            💡 Minimum bid: <span className="text-[#FFC107] font-semibold">{formatEther(challenge.minBid)} {getCurrencyName(challenge.currency)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

