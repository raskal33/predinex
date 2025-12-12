"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  XMarkIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  TrophyIcon
} from "@heroicons/react/24/outline";
import { FaSpinner } from "react-icons/fa";
import { GuidedMarketService, type FootballMatch } from "@/services/guidedMarketService";
import { formatLeagueName, getTeamDisplayName } from "@/utils/teamUtils";

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
    logoUrl?: string;
    country?: string;
  };
  matchDate: string;
  odds?: {
    home?: number;
    draw?: number;
    away?: number;
    over25?: number;
    under25?: number;
  };
}

interface H2HMatchSelectorProps {
  onSelect: (fixture: Fixture | null, marketId: string, outcome: string, eventStartTime: number) => void;
  selectedFixture?: Fixture | null;
  selectedOutcome?: string;
}

export default function H2HMatchSelector({
  onSelect,
  selectedFixture,
  selectedOutcome,
}: H2HMatchSelectorProps) {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const [showOutcomeSelector, setShowOutcomeSelector] = useState(false);
  const [tempSelectedFixture, setTempSelectedFixture] = useState<Fixture | null>(null);

  // Fetch fixtures
  useEffect(() => {
    const loadFixtures = async () => {
      setIsLoading(true);
      try {
        const fixturesData = await GuidedMarketService.getFootballMatches(7, 500);
        const currentTime = new Date();
        const thirtyMinutesFromNow = new Date(currentTime.getTime() + 30 * 60 * 1000);

        const filteredFixtures = fixturesData
          .filter((fixture) => {
            const matchDate = new Date(fixture.matchDate || new Date().toISOString());
            return matchDate > thirtyMinutesFromNow;
          })
          .map((fixture) => {
            const homeTeamLogo = (fixture as FootballMatch & { home_team_logo?: string }).home_team_logo || fixture.homeTeam?.logoUrl;
            const awayTeamLogo = (fixture as FootballMatch & { away_team_logo?: string }).away_team_logo || fixture.awayTeam?.logoUrl;
            const leagueCountry = (fixture as FootballMatch & { league?: { country?: string } }).league?.country || '';
            const fullLeagueName = leagueCountry ? `${leagueCountry} ${fixture.league?.name || 'Unknown'}` : (fixture.league?.name || 'Unknown');

            return {
              id: typeof fixture.id === 'string' ? parseInt(fixture.id, 10) || Math.floor(Math.random() * 1000000) : (fixture.id || Math.floor(Math.random() * 1000000)),
              name: `${fixture.homeTeam?.name || 'Unknown'} vs ${fixture.awayTeam?.name || 'Unknown'}`,
              homeTeam: {
                id: fixture.homeTeam?.id ? Number(fixture.homeTeam.id) : 0,
                name: fixture.homeTeam?.name || 'Unknown',
                logoUrl: homeTeamLogo
              },
              awayTeam: {
                id: fixture.awayTeam?.id ? Number(fixture.awayTeam.id) : 0,
                name: fixture.awayTeam?.name || 'Unknown',
                logoUrl: awayTeamLogo
              },
              league: {
                id: fixture.league?.id ? Number(fixture.league.id) : 0,
                name: fullLeagueName,
                logoUrl: fixture.league?.logoUrl,
                country: leagueCountry
              },
              matchDate: fixture.matchDate || new Date().toISOString(),
              odds: fixture.odds ? {
                home: fixture.odds.home,
                draw: fixture.odds.draw,
                away: fixture.odds.away,
                over25: fixture.odds.over25,
                under25: fixture.odds.under25,
              } : undefined
            };
          }) as Fixture[];

        setFixtures(filteredFixtures);
      } catch (error) {
        console.error('Error loading fixtures:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFixtures();
  }, []);

  // Get unique leagues
  const leagues = useMemo(() => 
    Array.from(new Set(fixtures.map(f => f.league?.name).filter(Boolean))),
    [fixtures]
  );

  // Filter fixtures
  const filteredFixtures = useMemo(() => {
    let filtered = fixtures;

    if (leagueFilter !== 'all') {
      filtered = filtered.filter(f => f.league?.name === leagueFilter);
    }

    if (timeFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      filtered = filtered.filter(f => {
        if (!f.matchDate) return false;
        const matchDate = new Date(f.matchDate);
        
        switch (timeFilter) {
          case 'today':
            return matchDate >= today && matchDate < tomorrow;
          case 'tomorrow':
            const dayAfterTomorrow = new Date(tomorrow);
            dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
            return matchDate >= tomorrow && matchDate < dayAfterTomorrow;
          case 'week':
            const weekFromNow = new Date(today);
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            return matchDate >= today && matchDate < weekFromNow;
          default:
            return true;
        }
      });
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(f => {
        const homeName = f.homeTeam?.name?.toLowerCase() || '';
        const awayName = f.awayTeam?.name?.toLowerCase() || '';
        const leagueName = f.league?.name?.toLowerCase() || '';
        return homeName.includes(lowerSearch) || awayName.includes(lowerSearch) || leagueName.includes(lowerSearch);
      });
    }

    return filtered;
  }, [fixtures, leagueFilter, timeFilter, searchTerm]);

  const handleFixtureClick = (fixture: Fixture) => {
    setTempSelectedFixture(fixture);
    setShowOutcomeSelector(true);
  };

  const handleOutcomeSelect = (outcome: string, marketType: string) => {
    if (!tempSelectedFixture) return;

    // Generate marketId (format: fixture_{id}_{marketType})
    const marketId = `fixture_${tempSelectedFixture.id}_${marketType}`;
    
    // Convert outcome to bytes32 format (for contract)
    const outcomeBytes32 = outcome.toUpperCase().replace(/\s+/g, '_');
    
    // Get event start time
    const eventStartTime = Math.floor(new Date(tempSelectedFixture.matchDate).getTime() / 1000);

    onSelect(tempSelectedFixture, marketId, outcomeBytes32, eventStartTime);
    setShowOutcomeSelector(false);
    setTempSelectedFixture(null);
  };

  const getOutcomeOptions = (fixture: Fixture) => {
    const options: { value: string; label: string; marketType: string; odds?: number }[] = [];

    // Moneyline
    if (fixture.odds?.home) options.push({ value: 'HOME_WIN', label: `${getTeamDisplayName(fixture.homeTeam.name)} Win`, marketType: 'moneyline', odds: fixture.odds.home });
    if (fixture.odds?.draw) options.push({ value: 'DRAW', label: 'Draw', marketType: 'moneyline', odds: fixture.odds.draw });
    if (fixture.odds?.away) options.push({ value: 'AWAY_WIN', label: `${getTeamDisplayName(fixture.awayTeam.name)} Win`, marketType: 'moneyline', odds: fixture.odds.away });

    // Over/Under
    if (fixture.odds?.over25) options.push({ value: 'OVER_2.5', label: 'Over 2.5 Goals', marketType: 'over_under', odds: fixture.odds.over25 });
    if (fixture.odds?.under25) options.push({ value: 'UNDER_2.5', label: 'Under 2.5 Goals', marketType: 'over_under', odds: fixture.odds.under25 });

    return options;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
        <span className="ml-3 text-gray-400">Loading matches...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by team or league..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={leagueFilter}
            onChange={(e) => setLeagueFilter(e.target.value)}
            className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Leagues</option>
            {leagues.map((league) => (
              <option key={league} value={league}>{league}</option>
            ))}
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500/50"
          >
            <option value="all">All Times</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="week">This Week</option>
          </select>
        </div>
      </div>

      {/* Selected Match Display */}
      {selectedFixture && (
        <div className="glass-card border border-cyan-500/30 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedFixture.homeTeam.name} vs {selectedFixture.awayTeam.name}
                </p>
                <p className="text-xs text-gray-400">{selectedFixture.league.name}</p>
                {selectedOutcome && (
                  <p className="text-xs text-cyan-400 mt-1">Outcome: {selectedOutcome}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => onSelect(null, '', '', 0)}
              className="text-gray-400 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Fixtures List */}
      {!selectedFixture && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredFixtures.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No matches found
            </div>
          ) : (
            filteredFixtures.map((fixture) => (
              <motion.div
                key={fixture.id}
                whileHover={{ scale: 1.02 }}
                className="glass-card border border-white/10 p-4 rounded-xl cursor-pointer hover:border-cyan-500/30 transition-all"
                onClick={() => handleFixtureClick(fixture)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {fixture.homeTeam.logoUrl && (
                          <Image
                            src={fixture.homeTeam.logoUrl}
                            alt={fixture.homeTeam.name}
                            width={24}
                            height={24}
                            className="rounded-full flex-shrink-0"
                            unoptimized
                          />
                        )}
                        <span className="text-sm font-semibold text-white truncate">
                          {getTeamDisplayName(fixture.homeTeam.name)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 mx-2">vs</span>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {fixture.awayTeam.logoUrl && (
                          <Image
                            src={fixture.awayTeam.logoUrl}
                            alt={fixture.awayTeam.name}
                            width={24}
                            height={24}
                            className="rounded-full flex-shrink-0"
                            unoptimized
                          />
                        )}
                        <span className="text-sm font-semibold text-white truncate">
                          {getTeamDisplayName(fixture.awayTeam.name)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{formatLeagueName(fixture.league.name)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(fixture.matchDate).toLocaleDateString()}
                      </p>
                    </div>
                    <TrophyIcon className="h-5 w-5 text-cyan-400" />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Outcome Selector Modal */}
      <AnimatePresence>
        {showOutcomeSelector && tempSelectedFixture && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-2xl border border-border-card w-full max-w-md shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Select Outcome</h3>
                  <button
                    onClick={() => {
                      setShowOutcomeSelector(false);
                      setTempSelectedFixture(null);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4 p-3 bg-black/30 rounded-lg">
                  <p className="text-sm font-semibold text-white">
                    {tempSelectedFixture.homeTeam.name} vs {tempSelectedFixture.awayTeam.name}
                  </p>
                  <p className="text-xs text-gray-400">{tempSelectedFixture.league.name}</p>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getOutcomeOptions(tempSelectedFixture).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleOutcomeSelect(option.value, option.marketType)}
                      className="w-full p-3 bg-black/30 border border-white/10 rounded-lg hover:border-cyan-500/50 hover:bg-black/50 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white">{option.label}</span>
                        {option.odds && (
                          <span className="text-xs text-cyan-400">{(option.odds * 100).toFixed(0)}x</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

