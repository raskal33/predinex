'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrophyIcon, 
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  UserGroupIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

interface ComboCondition {
  index: number;
  marketType: string;
  expectedOutcome: string;
  actualOutcome?: string;
  isResolved: boolean;
  isCorrect?: boolean;
  homeTeam?: string;
  awayTeam?: string;
  symbol?: string;
}

interface ComboPoolCardProps {
  poolId: string;
  title: string;
  description?: string;
  creator: string;
  creatorStake: string;
  combinedOdds: number;
  conditions: ComboCondition[];
  totalCreatorSideStake: string;
  totalBettorStake: string;
  bettorCount: number;
  lpCount: number;
  currencySymbol: 'tBNB' | 'PRIX' | 'USDT';
  isSettled: boolean;
  creatorWon?: boolean;
  eventStartTime: Date;
  eventEndTime: Date;
  bettingEndTime: Date;
  isPrivate?: boolean;
}

export default function ComboPoolCard({
  poolId,
  title,
  description,
  creator: _creator,
  creatorStake,
  combinedOdds,
  conditions,
  totalCreatorSideStake,
  totalBettorStake,
  bettorCount,
  lpCount: _lpCount,
  currencySymbol,
  isSettled,
  creatorWon,
  eventStartTime,
  eventEndTime,
  bettingEndTime,
  isPrivate = false,
}: ComboPoolCardProps) {
  const now = new Date();
  const isBettingOpen = now < bettingEndTime;
  const isLive = now >= eventStartTime && now < eventEndTime;
  const resolvedCount = conditions.filter(c => c.isResolved).length;
  const correctCount = conditions.filter(c => c.isCorrect).length;
  
  const _potentialPayout = parseFloat(totalBettorStake) * (combinedOdds / 100);
  const totalVolume = parseFloat(totalCreatorSideStake) + parseFloat(totalBettorStake);

  // Get status badge
  const getStatusBadge = () => {
    if (isSettled) {
      return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          creatorWon
            ? 'bg-error/20 text-error border border-error/30'
            : 'bg-success/20 text-success border border-success/30'
        }`}>
          {creatorWon ? (
            <>
              <XCircleIcon className="h-3.5 w-3.5" />
              Creator Won
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Bettors Won
            </>
          )}
        </div>
      );
    }
    
    if (isLive) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-error/20 text-error border border-error/30 animate-pulse">
          <div className="h-2 w-2 rounded-full bg-error" />
          LIVE
        </div>
      );
    }
    
    if (isBettingOpen) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-success/20 text-success border border-success/30">
          <CheckCircleIcon className="h-3.5 w-3.5" />
          Open
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-warning/20 text-warning border border-warning/30">
        <ClockIcon className="h-3.5 w-3.5" />
        Pending
      </div>
    );
  };

  return (
    <Link href={`/combo-pools/${poolId}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="relative glass-card p-6 border border-border-card hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden group"
      >
        {/* Background gradient on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-success/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Content */}
        <div className="relative z-10 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TrophyIcon className="h-5 w-5 text-primary flex-shrink-0" />
                <h3 className="text-lg font-bold text-text-primary line-clamp-1">
                  {title}
                </h3>
                {isPrivate && (
                  <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded-full border border-warning/30">
                    Private
                  </span>
                )}
              </div>
              {description && (
                <p className="text-sm text-text-secondary line-clamp-2">{description}</p>
              )}
            </div>
            {getStatusBadge()}
          </div>

          {/* Combined Odds - Big and Bold */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-success/10 rounded-xl border border-primary/20">
            <div>
              <div className="text-xs text-text-muted mb-1">Combined Odds</div>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFC107] to-[#10B981]">
                {(combinedOdds / 100).toFixed(2)}x
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-muted mb-1">{conditions.length} Conditions</div>
              <div className="text-lg font-bold text-text-primary">
                {resolvedCount}/{conditions.length} Resolved
              </div>
              {resolvedCount > 0 && (
                <div className="text-xs text-success mt-0.5">
                  {correctCount} Correct
                </div>
              )}
            </div>
          </div>

          {/* Conditions Grid */}
          <div className="grid grid-cols-1 gap-2">
            {conditions.slice(0, 3).map((condition) => (
              <div
                key={condition.index}
                className="flex items-center justify-between p-3 bg-bg-card/50 rounded-lg border border-border-input"
              >
                <div className="flex-1">
                  <div className="text-xs text-text-muted mb-0.5">{condition.marketType}</div>
                  <div className="text-sm font-semibold text-text-primary">
                    {condition.homeTeam && condition.awayTeam
                      ? `${condition.homeTeam} vs ${condition.awayTeam}`
                      : condition.symbol || 'Market'}
                  </div>
                  <div className="text-xs text-primary mt-0.5">
                    Prediction: {condition.expectedOutcome}
                  </div>
                </div>
                {condition.isResolved && (
                  <div className="flex items-center gap-2">
                    {condition.isCorrect ? (
                      <CheckCircleIcon className="h-5 w-5 text-success" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-error" />
                    )}
                  </div>
                )}
              </div>
            ))}
            {conditions.length > 3 && (
              <div className="text-center text-xs text-text-muted py-2">
                +{conditions.length - 3} more condition{conditions.length - 3 > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Pool Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border-input">
            <div>
              <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
                <FireIcon className="h-3.5 w-3.5" />
                Creator Stake
              </div>
              <div className="text-sm font-bold text-text-primary">
                {parseFloat(creatorStake).toLocaleString()} {currencySymbol}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
                <UserGroupIcon className="h-3.5 w-3.5" />
                Bettors
              </div>
              <div className="text-sm font-bold text-text-primary">
                {bettorCount}
              </div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1 flex items-center gap-1">
                <SparklesIcon className="h-3.5 w-3.5" />
                Total Volume
              </div>
              <div className="text-sm font-bold text-text-primary">
                {totalVolume.toLocaleString()} {currencySymbol}
              </div>
            </div>
          </div>

          {/* Time Info */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3.5 w-3.5" />
              {isBettingOpen
                ? `Betting closes ${new Date(bettingEndTime).toLocaleString()}`
                : `Ends ${new Date(eventEndTime).toLocaleString()}`}
            </div>
            <div className="text-right">
              Pool #{poolId}
            </div>
          </div>

          {/* Hover action hint */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="text-xs text-primary font-semibold flex items-center gap-1">
              View Details
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

