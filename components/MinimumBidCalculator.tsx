"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCalculator, FaInfoCircle, FaTimes } from 'react-icons/fa';

interface MinimumBidCalculatorProps {
  makerStake: string;
  selectedOutcome?: {
    value: string;
    odds: number;
    marketType: string;
  };
  fixtureOdds?: {
    home?: number;
    draw?: number;
    away?: number;
    over25?: number;
    under25?: number;
  };
  onMinBidCalculated?: (minBid: string) => void;
}

export const MinimumBidCalculator: React.FC<MinimumBidCalculatorProps> = ({
  makerStake,
  selectedOutcome,
  fixtureOdds,
  onMinBidCalculated
}) => {
  const [showExplanation, setShowExplanation] = useState(false);
  const [calculatedMinBid, setCalculatedMinBid] = useState<string>('0');
  const [fairRatio, setFairRatio] = useState<number>(1);

  useEffect(() => {
    if (!makerStake || !selectedOutcome || !fixtureOdds) {
      setCalculatedMinBid('0');
      return;
    }

    const stake = parseFloat(makerStake);
    if (isNaN(stake) || stake <= 0) {
      setCalculatedMinBid('0');
      return;
    }

    const creatorOdds = selectedOutcome.odds;
    let opponentOdds = 0;

    // Calculate opponent's odds based on market type
    if (selectedOutcome.marketType === 'home_away') {
      // For home/away, opponent gets draw + opposite outcome
      if (selectedOutcome.value === 'HOME_WIN') {
        // Opponent gets: Draw OR Away Win
        // Combined probability = 1 - (1 / home_odds)
        // Implied opponent odds ≈ home_odds / (home_odds - 1)
        opponentOdds = fixtureOdds.home ? fixtureOdds.home / (fixtureOdds.home - 1) : 2.0;
      } else if (selectedOutcome.value === 'AWAY_WIN') {
        opponentOdds = fixtureOdds.away ? fixtureOdds.away / (fixtureOdds.away - 1) : 2.0;
      }
    } else if (selectedOutcome.marketType === 'over_under') {
      // For over/under, opponent gets opposite
      if (selectedOutcome.value === 'OVER_2.5') {
        opponentOdds = fixtureOdds.under25 || 2.0;
      } else if (selectedOutcome.value === 'UNDER_2.5') {
        opponentOdds = fixtureOdds.over25 || 2.0;
      }
    }

    // Calculate fair minimum bid
    // minBid = makerStake * (opponentOdds / creatorOdds)
    const ratio = opponentOdds / creatorOdds;
    setFairRatio(ratio);
    
    const fairMinBid = stake * ratio;
    
    // Suggest slightly lower to attract bidders (e.g., 90% of fair value)
    const suggestedMinBid = fairMinBid * 0.9;
    
    const finalMinBid = Math.max(suggestedMinBid, stake * 0.5).toFixed(4);
    setCalculatedMinBid(finalMinBid);

    if (onMinBidCalculated) {
      onMinBidCalculated(finalMinBid);
    }
  }, [makerStake, selectedOutcome, fixtureOdds, onMinBidCalculated]);

  if (!selectedOutcome || calculatedMinBid === '0') {
    return null;
  }

  return (
    <div className="relative">
      {/* Calculator Result */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FaCalculator className="text-cyan-400 text-lg" />
            <div>
              <p className="text-xs text-gray-400 mb-1">Suggested Minimum Bid</p>
              <p className="text-2xl font-bold text-cyan-400">
                {calculatedMinBid} {selectedOutcome.value.includes('BNB') ? 'BNB' : 'BNB'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Based on {selectedOutcome.odds.toFixed(2)}x odds (ratio: {fairRatio.toFixed(2)}x)
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <FaInfoCircle className="text-cyan-400" />
          </button>
        </div>

        {/* Quick Tips */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-gray-400">
            💡 <span className="font-semibold text-white">Lower minimum bid</span> = attracts more bidders<br />
            💡 <span className="font-semibold text-white">Higher minimum bid</span> = better odds for you
          </p>
        </div>
      </motion.div>

      {/* Detailed Explanation Modal */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExplanation(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl border border-cyan-500/30 p-6 max-h-[80vh] overflow-y-auto"
            >
              <button
                onClick={() => setShowExplanation(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <FaTimes className="text-white" />
              </button>

              <h3 className="text-2xl font-bold text-cyan-400 mb-4 flex items-center gap-2">
                <FaCalculator />
                How Minimum Bid is Calculated
              </h3>

              <div className="space-y-4 text-sm">
                {/* Your Challenge */}
                <div className="p-4 bg-white/5 rounded-lg border border-cyan-500/20">
                  <h4 className="font-semibold text-white mb-2">Your Challenge</h4>
                  <div className="space-y-1 text-gray-300">
                    <p>• You predict: <span className="text-cyan-400 font-semibold">{selectedOutcome.value.replace(/_/g, ' ')}</span></p>
                    <p>• Your odds: <span className="text-cyan-400 font-semibold">{selectedOutcome.odds.toFixed(2)}x</span></p>
                    <p>• Your stake: <span className="text-cyan-400 font-semibold">{makerStake} BNB</span></p>
                  </div>
                </div>

                {/* Opponent's Side */}
                <div className="p-4 bg-white/5 rounded-lg border border-orange-500/20">
                  <h4 className="font-semibold text-white mb-2">Opponent&apos;s Side</h4>
                  <div className="space-y-1 text-gray-300">
                    <p>• Opponent bets: <span className="text-orange-400 font-semibold">OPPOSITE of your prediction</span></p>
                    <p>• Implied odds ratio: <span className="text-orange-400 font-semibold">{fairRatio.toFixed(2)}x</span></p>
                    <p>• Fair minimum bid: <span className="text-orange-400 font-semibold">{(parseFloat(makerStake) * fairRatio).toFixed(4)} BNB</span></p>
                  </div>
                </div>

                {/* Formula */}
                <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30">
                  <h4 className="font-semibold text-white mb-2">Formula</h4>
                  <div className="font-mono text-xs bg-black/30 p-3 rounded">
                    <p className="text-purple-400">minBid = yourStake × (opponentOdds / yourOdds)</p>
                    <p className="text-gray-400 mt-2">
                      = {makerStake} × {fairRatio.toFixed(2)} = {(parseFloat(makerStake) * fairRatio).toFixed(4)} BNB
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    💡 We suggest 90% of fair value to attract bidders: <span className="text-cyan-400 font-semibold">{calculatedMinBid} BNB</span>
                  </p>
                </div>

                {/* Examples */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <h4 className="font-semibold text-white mb-2">Examples</h4>
                  
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-green-500/10 rounded border-l-2 border-green-500">
                      <p className="font-semibold text-green-400 mb-1">✅ If you&apos;re CORRECT:</p>
                      <p className="text-gray-300">
                        You win: ({makerStake} + {calculatedMinBid}) × 0.97 = <span className="text-green-400 font-semibold">
                          {(parseFloat(makerStake || '0') + parseFloat(calculatedMinBid || '0') * 0.97).toFixed(4)} BNB
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">(3% fee deducted)</p>
                    </div>

                    <div className="p-3 bg-red-500/10 rounded border-l-2 border-red-500">
                      <p className="font-semibold text-red-400 mb-1">❌ If you&apos;re WRONG:</p>
                      <p className="text-gray-300">
                        Opponent wins pot, you lose your stake: <span className="text-red-400 font-semibold">-{makerStake} BNB</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tips */}
                <div className="p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/30">
                  <h4 className="font-semibold text-white mb-2">💡 Tips</h4>
                  <ul className="space-y-1 text-xs text-gray-300">
                    <li>• <span className="text-yellow-400">Lower minimum bid</span> = More likely to get matched quickly</li>
                    <li>• <span className="text-yellow-400">Higher minimum bid</span> = Better payout if you win</li>
                    <li>• <span className="text-yellow-400">Fair ratio {fairRatio.toFixed(2)}x</span> = Balanced risk/reward</li>
                    <li>• You can adjust the minimum bid to any value you want</li>
                  </ul>
                </div>
              </div>

              <button
                onClick={() => setShowExplanation(false)}
                className="w-full mt-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-lg font-semibold transition-all"
              >
                Got it!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

