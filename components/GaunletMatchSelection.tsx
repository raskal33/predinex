"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  XMarkIcon, 
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import { FaSpinner } from "react-icons/fa";

interface Fixture {
  id: number;
  name: string;
  homeTeam: {
    id: number;
    name: string;
    logoUrl?: string;
  };
  awayTeam: {
    id: number;
    name: string;
    logoUrl?: string;
  };
  league: {
    id: number;
    name: string;
    country?: string;
  };
  matchDate: string;
  startingAt: string;
  timeOnly?: string;
  odds?: {
    home?: number;
    draw?: number;
    away?: number;
    over25?: number;
    under25?: number;
  };
}

interface GaunletMatchSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedMatches: Fixture[]) => void;
  requiredCount: number;
  entryFee: string;
  creatorStake: string;
}

export default function GaunletMatchSelection({
  isOpen,
  onClose,
  onConfirm,
  requiredCount,
  entryFee,
  creatorStake,
}: GaunletMatchSelectionProps) {
  const [matches, setMatches] = useState<Fixture[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLeague, setFilterLeague] = useState<string>("all");

  // Fetch upcoming matches
  useEffect(() => {
    if (!isOpen) return;

    const fetchMatches = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/fixtures/upcoming?limit=100");
        const data = await response.json();
        
        if (data.success && data.data?.fixtures) {
          setMatches(data.data.fixtures);
        } else {
          console.error("Failed to fetch matches:", data);
        }
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [isOpen]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedMatches(new Set());
      setSearchTerm("");
      setFilterLeague("all");
    }
  }, [isOpen]);

  // Get unique leagues for filter
  const leagues = Array.from(new Set(matches.map(m => m.league.name))).sort();

  // Filter matches
  const filteredMatches = matches.filter(match => {
    const matchesSearch = 
      match.homeTeam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.awayTeam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      match.league.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLeague = filterLeague === "all" || match.league.name === filterLeague;
    
    return matchesSearch && matchesLeague;
  });

  // Toggle match selection
  const toggleMatch = (matchId: number) => {
    setSelectedMatches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(matchId)) {
        newSet.delete(matchId);
      } else {
        if (newSet.size < requiredCount) {
          newSet.add(matchId);
        }
      }
      return newSet;
    });
  };

  // Get selected match objects
  const getSelectedMatchObjects = (): Fixture[] => {
    return matches.filter(m => selectedMatches.has(m.id));
  };

  // Handle confirm
  const handleConfirm = () => {
    if (selectedMatches.size === requiredCount) {
      onConfirm(getSelectedMatchObjects());
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format time
  const formatTime = (dateString: string, timeOnly?: string) => {
    if (timeOnly) return timeOnly;
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  if (!isOpen) return null;

  const selectedCount = selectedMatches.size;
  const progress = (selectedCount / requiredCount) * 100;
  const canConfirm = selectedCount === requiredCount;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative glass-card rounded-2xl border border-border-card w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border-card bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg">
                <TrophyIcon className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Select Tournament Matches</h2>
                <p className="text-sm text-text-secondary">Choose {requiredCount} matches for your tournament pool</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary transition-colors p-2 hover:bg-white/5 rounded-lg"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 bg-black/30 border-b border-border-card">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-cyan-400" />
                <span className="text-sm font-semibold text-text-primary">
                  {selectedCount} / {requiredCount} matches selected
                </span>
              </div>
              <span className="text-xs text-text-secondary">
                {requiredCount - selectedCount} remaining
              </span>
            </div>
            <div className="relative h-2 bg-black/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-full ${
                  canConfirm
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500"
                }`}
              />
            </div>
          </div>

          {/* Pool Info Summary */}
          <div className="px-6 py-3 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 border-b border-yellow-500/20">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-text-secondary mb-1">Entry Fee</p>
                <p className="text-sm font-bold text-yellow-400">{entryFee} BNB</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Target Jackpot</p>
                <p className="text-sm font-bold text-orange-400">{creatorStake} BNB</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Match Count</p>
                <p className="text-sm font-bold text-red-400">{requiredCount}</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 bg-black/20 border-b border-border-card">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search teams or leagues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 bg-black/30 border border-border-input rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-muted"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* League Filter */}
              <div className="sm:w-64">
                <select
                  value={filterLeague}
                  onChange={(e) => setFilterLeague(e.target.value)}
                  className="w-full px-4 py-2 bg-black/30 border border-border-input rounded-lg text-text-primary focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                >
                  <option value="all">All Leagues</option>
                  {leagues.map(league => (
                    <option key={league} value={league}>{league}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Matches List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="ml-3 text-text-secondary">Loading matches...</span>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary">No matches found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredMatches.map((match) => {
                  const isSelected = selectedMatches.has(match.id);
                  const isDisabled = !isSelected && selectedCount >= requiredCount;

                  return (
                    <motion.div
                      key={match.id}
                      whileHover={!isDisabled ? { scale: 1.02 } : {}}
                      whileTap={!isDisabled ? { scale: 0.98 } : {}}
                      onClick={() => !isDisabled && toggleMatch(match.id)}
                      className={`relative overflow-hidden rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 border-cyan-500/50 shadow-lg shadow-cyan-500/20"
                          : isDisabled
                          ? "bg-white/5 border-white/10 opacity-50 cursor-not-allowed"
                          : "bg-white/5 border-white/20 hover:border-cyan-500/30 hover:bg-white/10"
                      }`}
                    >
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10">
                          <div className="p-1.5 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full shadow-lg">
                            <CheckCircleIcon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}

                      <div className="p-4">
                        {/* League & Date */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                            {match.league.name}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-text-secondary">
                            <ClockIcon className="h-3 w-3" />
                            <span>{formatDate(match.matchDate)}</span>
                            <span className="mx-1">•</span>
                            <span>{formatTime(match.matchDate, match.timeOnly)}</span>
                          </div>
                        </div>

                        {/* Teams */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center overflow-hidden">
                              {match.homeTeam.logoUrl ? (
                                <Image
                                  src={match.homeTeam.logoUrl}
                                  alt={match.homeTeam.name}
                                  width={32}
                                  height={32}
                                  className="object-contain"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-xs font-bold text-text-primary">
                                  {match.homeTeam.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-text-primary flex-1">
                              {match.homeTeam.name}
                            </span>
                          </div>
                          {match.odds?.home && (
                            <span className="text-xs text-text-secondary bg-white/5 px-2 py-1 rounded">
                              {match.odds.home.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <div className="text-center text-xs text-text-muted mb-3">VS</div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center overflow-hidden">
                              {match.awayTeam.logoUrl ? (
                                <Image
                                  src={match.awayTeam.logoUrl}
                                  alt={match.awayTeam.name}
                                  width={32}
                                  height={32}
                                  className="object-contain"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-xs font-bold text-text-primary">
                                  {match.awayTeam.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-text-primary flex-1">
                              {match.awayTeam.name}
                            </span>
                          </div>
                          {match.odds?.away && (
                            <span className="text-xs text-text-secondary bg-white/5 px-2 py-1 rounded">
                              {match.odds.away.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-card bg-black/30">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-text-secondary">
                {canConfirm ? (
                  <span className="text-green-400 font-semibold">✓ Ready to create pool</span>
                ) : (
                  <span>Select {requiredCount - selectedCount} more match{requiredCount - selectedCount !== 1 ? "es" : ""}</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-white/5 border border-white/20 text-text-primary rounded-lg hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-cyan-500 disabled:hover:to-blue-500"
                >
                  Create Tournament Pool
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

