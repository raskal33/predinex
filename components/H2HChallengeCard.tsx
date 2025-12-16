"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { formatTokenAmount } from '@/utils/number-helpers';
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
  onBid: (e?: React.MouseEvent) => void;
  onClaim: (e?: React.MouseEvent) => void;
  onCancel: (e?: React.MouseEvent) => void;
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

  // Image error states for fallback handling
  const [homeTeamImageError, setHomeTeamImageError] = useState(false);
  const [awayTeamImageError, setAwayTeamImageError] = useState(false);
  const [cryptoImageError, setCryptoImageError] = useState(false);

  const totalPot = challenge.makerStake + challenge.highestBid;
  const potentialWinnings = totalPot > 0n ? (totalPot * 97n) / 100n : 0n; // After 3% fee

  // Live countdown to event start (bidding closes at event start)
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  useEffect(() => {
    const updateCountdown = () => {
      const eventTime = Number(challenge.eventStartTime) * 1000;
      const now = Date.now();
      const remaining = Math.max(0, eventTime - now);
      setTimeRemaining(remaining);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, [challenge.eventStartTime]);

  const formatCountdown = () => {
    if (timeRemaining <= 0) return 'Bidding Closed';
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  // Determine card accent color based on state and user role - Harmonized palette
  const getCardAccent = () => {
    if (challenge.state === 2) { // Resolved
      if (challenge.creatorWon && isCreator) return 'from-emerald-500/15 to-green-500/10 border-emerald-500/30';
      if (!challenge.creatorWon && isBidder) return 'from-emerald-500/15 to-green-500/10 border-emerald-500/30';
      if (challenge.creatorWon && isBidder) return 'from-rose-500/15 to-red-500/10 border-rose-500/30';
      if (!challenge.creatorWon && isCreator) return 'from-rose-500/15 to-red-500/10 border-rose-500/30';
      return 'from-violet-500/15 to-purple-500/10 border-violet-500/25';
    }
    if (challenge.state === 1 || challenge.highestBidder !== '0x0000000000000000000000000000000000000000') {
      return 'from-cyan-500/15 to-blue-500/10 border-cyan-500/25'; // Matched
    }
    if (isCreator) return 'from-amber-500/15 to-yellow-500/10 border-amber-500/25';
    return 'from-white/8 via-white/4 to-transparent border-white/15';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ duration: 0.2 }}
      className={`group relative overflow-hidden rounded-2xl backdrop-blur-xl bg-gradient-to-br ${getCardAccent()} p-6 transition-all hover:shadow-2xl hover:shadow-[#FFC107]/10`}
    >
      {/* Animated background gradient - Subtle */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/3 via-transparent to-white/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Top corner glow effect - Harmonized */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FFC107]/8 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />

      {/* Header */}
      <div className="relative flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-white/50 uppercase tracking-wider font-semibold">
              Challenge #{Number(challenge.id)}
            </span>
            {isCreator && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wide">
                Your Challenge
              </span>
            )}
            {isBidder && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 text-[10px] font-bold uppercase tracking-wide">
                You Bid
              </span>
            )}
          </div>
          {/* Display engaging title if available, otherwise marketId */}
          <div className="text-base font-black text-white mb-1" title={challenge.title || challenge.marketId}>
            {challenge.title || challenge.marketId}
          </div>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <FaChartLine className="text-white/40" />
              {challenge.state === 0 && isBiddingOpen ? (
                <span className="font-mono text-[#FFC107] font-bold">{formatCountdown()}</span>
              ) : (
                <span>{timeRemaining <= 0 ? 'Bidding Closed' : formatCountdown()}</span>
              )}
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

      {/* Team Logos / Crypto Logo Display */}
      {(challenge.homeTeamLogo || challenge.awayTeamLogo || challenge.cryptoLogo) && (
        <div className="relative mb-3">
          <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-white/5 via-white/3 to-transparent border border-white/10 p-3">
            {challenge.homeTeamLogo && challenge.awayTeamLogo ? (
              // Football: Display team logos
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-white/5">
                    {homeTeamImageError && challenge.homeTeam ? (
                      <Image 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(challenge.homeTeam)}&background=22C7FF&color=000&size=64&font-size=0.4&bold=true`}
                        alt={challenge.homeTeam || 'Home Team'}
                        width={48}
                        height={48}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <Image 
                        src={challenge.homeTeamLogo} 
                        alt={challenge.homeTeam || 'Home Team'}
                        width={48}
                        height={48}
                        className="object-cover"
                        unoptimized
                        onError={() => setHomeTeamImageError(true)}
                      />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white truncate max-w-[80px] text-center">
                    {challenge.homeTeam}
                  </span>
                </div>
                <div className="text-white/40 font-bold text-lg">VS</div>
                <div className="flex flex-col items-center gap-1.5">
                  <div className="relative w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-white/5">
                    {awayTeamImageError && challenge.awayTeam ? (
                      <Image 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(challenge.awayTeam)}&background=22C7FF&color=000&size=64&font-size=0.4&bold=true`}
                        alt={challenge.awayTeam || 'Away Team'}
                        width={48}
                        height={48}
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <Image 
                        src={challenge.awayTeamLogo} 
                        alt={challenge.awayTeam || 'Away Team'}
                        width={48}
                        height={48}
                        className="object-cover"
                        unoptimized
                        onError={() => setAwayTeamImageError(true)}
                      />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-white truncate max-w-[80px] text-center">
                    {challenge.awayTeam}
                  </span>
                </div>
              </div>
            ) : challenge.cryptoLogo && !cryptoImageError ? (
              // Crypto: Display coin logo
              <div className="flex items-center justify-center gap-3">
                <div className="relative w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden bg-white/5">
                  <Image 
                    src={challenge.cryptoLogo} 
                    alt="Crypto"
                    width={48}
                    height={48}
                    className="object-cover"
                    unoptimized
                    onError={() => setCryptoImageError(true)}
                  />
                </div>
                <div className="text-xs text-white/60">
                  Cryptocurrency Market
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Creator Info & Prediction - Compact */}
      <div className="relative mb-3">
        <div className="relative overflow-hidden rounded-xl backdrop-blur-sm bg-gradient-to-br from-[#FFC107]/12 via-[#F7B600]/8 to-transparent border border-[#FFC107]/25 p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="text-[10px] text-[#FFC107]/60 mb-0.5 uppercase tracking-wider font-semibold">Creator</div>
              <div className="font-mono text-xs text-white/80 truncate">
                {challenge.creator.slice(0, 6)}...{challenge.creator.slice(-4)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#FFC107]/60 mb-0.5 uppercase tracking-wider font-semibold">Predicts</div>
              <div className="text-sm font-black text-white">
                {challenge.title || challenge.creatorOutcome}
              </div>
            </div>
          </div>
          {challenge.state === 0 && (
            <div className="text-[10px] text-white/45 border-t border-white/5 pt-2">
              <span className="text-white/60 font-semibold">You bet opposite</span> to win
            </div>
          )}
        </div>
      </div>

      {/* Stakes Grid - Compact */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-white/4 border border-white/8 p-2 group-hover:border-white/15 transition-colors">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Creator Stake</span>
            {isCreator && <span className="text-amber-400/80 text-xs">👤</span>}
          </div>
          <div className="font-black text-white text-base">
            {formatTokenAmount(challenge.makerStake)} <span className="text-xs text-white/30">{getCurrencyName(challenge.currency)}</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-white/4 border border-white/8 p-2 group-hover:border-white/15 transition-colors">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">Highest Bid</span>
            {isBidder && <span className="text-cyan-400/80 text-xs">👤</span>}
          </div>
          <div className="font-black text-white text-base">
            {challenge.highestBid > 0n 
              ? <>{formatTokenAmount(challenge.highestBid)} <span className="text-xs text-white/30">{getCurrencyName(challenge.currency)}</span></>
              : <span className="text-xs text-white/30">No bids</span>
            }
          </div>
        </div>
      </div>

      {/* Total Pot & Leader - Compact Combined */}
      {totalPot > 0n && (
        <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-gradient-to-r from-violet-500/8 via-purple-500/8 to-violet-500/8 border border-violet-500/20 p-2 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-[10px] text-violet-300/60 mb-0.5 uppercase tracking-wider font-semibold">Total Pot</div>
              <div className="font-black text-white text-base">{formatTokenAmount(totalPot)} <span className="text-xs text-white/30">{getCurrencyName(challenge.currency)}</span></div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-violet-300/60 mb-0.5 uppercase tracking-wider font-semibold">Winner Gets</div>
              <div className="font-bold text-violet-200 text-sm">{formatTokenAmount(potentialWinnings)} <span className="text-[10px] text-white/30">(97%)</span></div>
            </div>
          </div>
          {challenge.highestBidder !== '0x0000000000000000000000000000000000000000' && (
            <div className="flex items-center justify-between border-t border-white/5 pt-2">
              <div className="flex items-center gap-1">
                <FaTrophy className="text-cyan-400/60 text-xs" />
                <span className="text-[10px] text-cyan-300/60 uppercase tracking-wider font-semibold">Leader</span>
                <span className="font-mono text-xs text-white/80">
                  {challenge.highestBidder.slice(0, 6)}...{challenge.highestBidder.slice(-4)}
                </span>
              </div>
              {isBidder && (
                <div className="px-1.5 py-0.5 rounded bg-cyan-400/15 border border-cyan-400/30">
                  <span className="text-[10px] font-bold text-cyan-300">You</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Result Display - Compact */}
      {challenge.state === 2 && challenge.result && (
        <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-gradient-to-br from-violet-500/12 via-purple-500/8 to-transparent border border-violet-500/25 p-2 mb-3">
          <div className="text-[10px] text-violet-300/60 mb-1 uppercase tracking-wider font-semibold">Final Result</div>
          <div className="font-black text-white text-sm mb-1.5">{challenge.result}</div>
          <div className="flex items-center gap-2">
            {challenge.creatorWon ? (
              <>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                  <FaTrophy className="text-xs" />
                  Creator Won
                </span>
                {isCreator && <span className="text-[10px] text-emerald-300 font-semibold">🎉 You won!</span>}
                {isBidder && <span className="text-[10px] text-rose-300 font-semibold">You lost</span>}
              </>
            ) : (
              <>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold flex items-center gap-1">
                  <FaTrophy className="text-xs" />
                  Bidder Won
                </span>
                {isBidder && <span className="text-[10px] text-emerald-300 font-semibold">🎉 You won!</span>}
                {isCreator && <span className="text-[10px] text-rose-300 font-semibold">You lost</span>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Betting Closed Notice - Compact */}
      {!isBiddingOpen && challenge.state === 0 && (
        <div className="relative overflow-hidden rounded-lg backdrop-blur-sm bg-orange-500/8 border border-orange-500/25 p-2 mb-3">
          <div className="flex items-center gap-2 text-[10px] text-orange-300/80">
            <FaTimesCircle className="text-xs" />
            <span className="font-semibold">Betting Closed</span>
            <span className="text-white/40">• Event starts soon</span>
          </div>
        </div>
      )}

      {/* Action Buttons - Harmonized Colors */}
      <div className="relative flex gap-2 mt-auto pt-4 border-t border-white/8">
        {/* Bid Button - Only if bidding is open and not creator */}
        {isBiddingOpen && !isConnected && (
          <Button
            onClick={() => {
              onBid();
            }}
            className="flex-1 relative overflow-hidden bg-gradient-to-r from-[#FFC107] via-[#F7B600] to-[#FFC107] hover:from-[#FFC107]/90 hover:to-[#F7B600]/90 text-black font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-[#FFC107]/15 hover:shadow-xl hover:shadow-[#FFC107]/25"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <FaHandshake />
              Connect to Bid
            </span>
          </Button>
        )}
        {isBiddingOpen && !isCreator && isConnected && (
          <Button
            onClick={() => {
              onBid();
            }}
            className="flex-1 relative overflow-hidden bg-gradient-to-r from-[#FFC107] via-[#F7B600] to-[#FFC107] hover:from-[#FFC107]/90 hover:to-[#F7B600]/90 text-black font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-[#FFC107]/15 hover:shadow-xl hover:shadow-[#FFC107]/25"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <FaHandshake />
              Bid {formatTokenAmount(minBid)}+ {getCurrencyName(challenge.currency)}
            </span>
          </Button>
        )}

        {/* Claim Button - Only if user can claim */}
        {canClaim && (
          <Button
            onClick={() => {
              onClaim();
            }}
            className="flex-1 relative overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/15 hover:shadow-xl hover:shadow-emerald-500/25"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <FaTrophy />
              Claim {formatTokenAmount(potentialWinnings)} {getCurrencyName(challenge.currency)}
            </span>
          </Button>
        )}

        {/* Cancel Button - Only creator can cancel if no bids */}
        {isCreator && challenge.state === 0 && challenge.highestBidder === '0x0000000000000000000000000000000000000000' && (
          <Button
            onClick={() => {
              onCancel();
            }}
            className="flex-1 relative overflow-hidden bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-lg shadow-rose-500/15"
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
            💡 Minimum bid: <span className="text-[#FFC107] font-semibold">{formatTokenAmount(challenge.minBid)} {getCurrencyName(challenge.currency)}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

