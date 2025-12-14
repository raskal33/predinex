'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { 
  PlusIcon, 
  TrashIcon, 
  CubeIcon,
  ExclamationTriangleIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import Button from '@/components/button';
import AmountInput from '@/components/AmountInput';
import Textarea from '@/components/textarea';
import { useComboPools, CurrencyType } from '@/hooks/useComboPools';
import { useWalletConnection } from '@/hooks/useWalletConnection';
import { useReputationStore } from '@/stores/useReputationStore';
import { GuidedMarketService, FootballMatch, Cryptocurrency } from '@/services/guidedMarketService';

// Currency config for minimum stakes and display
const CURRENCY_CONFIG = {
  [CurrencyType.BNB]: { symbol: 'tBNB', minStake: 2, name: 'Somnia Network' },
  [CurrencyType.PRIX]: { symbol: 'PRIX', minStake: 5000, name: 'Reduced fees' },
  [CurrencyType.USDT]: { symbol: 'USDT', minStake: 2000, name: 'Stablecoin' },
};

interface ComboCondition {
  id: string;
  type: 'football' | 'crypto';
  matchId?: string;
  cryptoId?: string;
  market: string;
  odds: number;
  selection: 'YES' | 'NO';
  description: string;
  eventStartTime: Date;
  eventEndTime: Date;
  // Football specific
  homeTeam?: string;
  awayTeam?: string;
  league?: string;
  // Crypto specific
  symbol?: string;
  name?: string;
  currentPrice?: number;
}

interface ComboPoolFormData {
  title: string;
  description: string;
  creatorStake: number;
  combinedOdds: number;
  betType: 'fixed' | 'max';
  fixedBetAmount?: number;
  maxBetPerUser?: number;
  currencyType: CurrencyType; // 0=BNB, 1=PRIX, 2=USDT
  isPrivate: boolean;
  conditions: ComboCondition[];
  eventStartTime: Date;
  eventEndTime: Date;
  bettingEndTime: Date;
  category?: string;
}

export default function EnhancedComboPoolCreationForm({ onSuccess, onClose }: {
  onSuccess?: (poolId: string) => void;
  onClose?: () => void;
}) {
  const { address, isConnected } = useAccount();
  const { connectWallet } = useWalletConnection();
  const { createComboPool } = useComboPools();
  const { getUserReputation, canCreateMarket } = useReputationStore();

  const [formData, setFormData] = useState<ComboPoolFormData>({
    title: '',
    description: '',
    creatorStake: 2, // Default to minimum BNB stake
    combinedOdds: 2.0,
    betType: 'fixed',
    fixedBetAmount: 1,
    maxBetPerUser: 1000,
    currencyType: CurrencyType.BNB,
    isPrivate: false,
    conditions: [],
    eventStartTime: new Date(),
    eventEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    bettingEndTime: new Date(Date.now() + 23 * 60 * 60 * 1000)
  });
  
  // Get current currency config
  const currentCurrency = CURRENCY_CONFIG[formData.currencyType];

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FootballMatch[] | Cryptocurrency[]>([]);
  const [allMatches, setAllMatches] = useState<FootballMatch[]>([]); // Store all matches
  const [allCryptos, setAllCryptos] = useState<Cryptocurrency[]>([]); // Store all cryptos
  const [selectedType, setSelectedType] = useState<'football' | 'crypto' | null>(null);
  const [activeConditionId, setActiveConditionId] = useState<string | null>(null); // Track which condition is being edited

  const userReputation = address ? getUserReputation(address) : null;
  const canCreate = address ? canCreateMarket(address) : false;

  // Load all matches/cryptos when type is selected
  useEffect(() => {
    const loadData = async () => {
      if (selectedType === 'football' && allMatches.length === 0) {
        try {
          const matches = await GuidedMarketService.getFootballMatches(7, 100);
          setAllMatches(matches);
          setSearchResults(matches); // Show all initially
        } catch (error) {
          console.error('Error loading matches:', error);
          toast.error('Failed to load matches');
        }
      } else if (selectedType === 'crypto' && allCryptos.length === 0) {
        try {
          const cryptos = await GuidedMarketService.getCryptocurrencies();
          setAllCryptos(cryptos);
          setSearchResults(cryptos); // Show all initially
        } catch (error) {
          console.error('Error loading cryptocurrencies:', error);
          toast.error('Failed to load cryptocurrencies');
        }
      }
    };
    loadData();
  }, [selectedType, allMatches.length, allCryptos.length]);

  // Calculate potential winnings
  const potentialWinnings = formData.creatorStake * (formData.combinedOdds - 1);

  // Calculate max bettors
  const maxBettors = formData.betType === 'fixed' && formData.fixedBetAmount 
    ? Math.floor(formData.creatorStake / formData.fixedBetAmount)
    : 0;

  const addCondition = useCallback(() => {
    if (formData.conditions.length >= 5) {
      toast.error('Maximum 5 conditions allowed for combo pools');
      return;
    }
    
    const newCondition: ComboCondition = {
      id: Date.now().toString(),
      type: 'football',
      market: '',
      odds: 2.0,
      selection: 'YES',
      description: '',
      eventStartTime: new Date(),
      eventEndTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  }, [formData.conditions.length]);

  const removeCondition = useCallback((conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }));
  }, []);

  const updateCondition = useCallback((conditionId: string, field: keyof ComboCondition, value: string | number | Date) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === conditionId ? { ...c, [field]: value } : c
      )
    }));
  }, []);

  const handleSearch = useCallback(async (query: string, type: 'football' | 'crypto') => {
    if (!query.trim()) {
      // Show all when search is cleared
      if (type === 'football') {
        setSearchResults(allMatches);
      } else {
        setSearchResults(allCryptos);
      }
      return;
    }
    
    try {
      if (type === 'football') {
        const filtered = allMatches.filter(match => 
          match.homeTeam.name.toLowerCase().includes(query.toLowerCase()) ||
          match.awayTeam.name.toLowerCase().includes(query.toLowerCase()) ||
          match.league.name?.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      } else {
        const filtered = allCryptos.filter(crypto => 
          crypto.name.toLowerCase().includes(query.toLowerCase()) ||
          crypto.symbol.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search');
    }
  }, [allMatches, allCryptos]);

  const selectItem = useCallback((item: FootballMatch | Cryptocurrency, conditionId: string) => {
    const condition = formData.conditions.find(c => c.id === conditionId);
    if (!condition) return;

    if ('homeTeam' in item) {
      // Football match
      setFormData(prev => ({
        ...prev,
        conditions: prev.conditions.map(c =>
          c.id === conditionId
            ? {
                ...c,
                type: 'football' as 'football' | 'crypto',
                matchId: item.id,
                homeTeam: item.homeTeam.name,
                awayTeam: item.awayTeam.name,
                league: item.league.name || '',
                eventStartTime: new Date(item.matchDate)
              }
            : c
        )
      }));
    } else {
      // Cryptocurrency
      setFormData(prev => ({
        ...prev,
        conditions: prev.conditions.map(c =>
          c.id === conditionId
            ? {
                ...c,
                type: 'crypto' as 'football' | 'crypto',
                cryptoId: item.id,
                symbol: item.symbol,
                name: item.name,
                currentPrice: item.currentPrice
              }
            : c
        )
      }));
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setActiveConditionId(null);
    toast.success('Match selected!');
  }, [formData.conditions]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Pool title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Pool description is required';
    }

    if (formData.conditions.length < 2) {
      newErrors.conditions = 'At least 2 conditions are required for combo pools';
    }

    if (formData.conditions.length > 10) {
      newErrors.conditions = 'Maximum 10 conditions allowed for combo pools';
    }

    formData.conditions.forEach((condition, index) => {
      if (!condition.market.trim()) {
        newErrors[`condition_${index}_market`] = 'Market selection is required';
      }
      if (condition.odds < 1.01 || condition.odds > 100) {
        newErrors[`condition_${index}_odds`] = 'Odds must be between 1.01 and 100';
      }
    });

    if (formData.creatorStake < currentCurrency.minStake) {
      newErrors.creatorStake = `Minimum creator stake is ${currentCurrency.minStake.toLocaleString()} ${currentCurrency.symbol}`;
    }

    if (formData.betType === 'fixed' && (!formData.fixedBetAmount || formData.fixedBetAmount < 1)) {
      newErrors.fixedBetAmount = 'Fixed bet amount must be at least 1 token';
    }

    if (formData.betType === 'max' && (!formData.maxBetPerUser || formData.maxBetPerUser < 1)) {
      newErrors.maxBetPerUser = 'Max bet per user must be at least 1 token';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, currentCurrency.minStake, currentCurrency.symbol]);

  const handleSubmit = useCallback(async () => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet first');
      try {
        await connectWallet();
      } catch {
        toast.error('Failed to connect wallet');
      }
      return;
    }

    if (!canCreate) {
      toast.error('Insufficient reputation to create combo pools');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsLoading(true);

    try {
      const comboPoolData = {
        conditions: formData.conditions.map(condition => ({
          marketId: condition.matchId || condition.cryptoId || `condition_${condition.id}`,
          expectedOutcome: `${condition.market} ${condition.selection}`,
          description: `${condition.market} ${condition.selection}`,
          odds: condition.odds || 2.0
        })),
        combinedOdds: formData.combinedOdds,
        creatorStake: BigInt(Math.floor(formData.creatorStake * 1e18)),
        earliestEventStart: BigInt(Math.floor(formData.eventStartTime.getTime() / 1000)),
        latestEventEnd: BigInt(Math.floor(formData.eventEndTime.getTime() / 1000)),
        category: formData.category || "football",
        maxBetPerUser: BigInt(Math.floor((formData.betType === 'fixed' ? formData.fixedBetAmount! : formData.maxBetPerUser!) * 1e18)),
        currencyType: formData.currencyType // 0=BNB, 1=PRIX, 2=USDT
      };

      const txHash = await createComboPool(comboPoolData);
      
      toast.success('Combo pool creation transaction submitted!');
      
      if (onSuccess) {
        onSuccess(txHash);
      }
      
      if (onClose) {
        onClose();
      }

    } catch (error) {
      console.error('Error creating combo pool:', error);
      toast.error('Failed to create combo pool');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, address, canCreate, validateForm, createComboPool, formData, onSuccess, onClose, connectWallet]);

  const renderTypeSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-2">Choose Market Type</h2>
        <p className="text-text-secondary">Select the type of market for your combo pool</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setSelectedType('football')}
          className={`p-6 rounded-xl border-2 transition-all ${
            selectedType === 'football'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border-input bg-bg-card text-text-secondary hover:border-primary/50'
          }`}
        >
          <TrophyIcon className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Football</h3>
          <p className="text-sm">Create combo pools with football matches</p>
        </button>

        <button
          onClick={() => setSelectedType('crypto')}
          className={`p-6 rounded-xl border-2 transition-all ${
            selectedType === 'crypto'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border-input bg-bg-card text-text-secondary hover:border-primary/50'
          }`}
        >
          <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Cryptocurrency</h3>
          <p className="text-sm">Create combo pools with crypto predictions</p>
        </button>
      </div>

      {selectedType && (
        <div className="flex justify-center">
          <Button
            onClick={() => setStep(2)}
            variant="primary"
            className="flex items-center gap-2"
          >
            Continue to Selection
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderItemSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Select {selectedType === 'football' ? 'Football Matches' : 'Cryptocurrencies'}
          </h2>
          <p className="text-text-secondary">
            Choose the {selectedType === 'football' ? 'matches' : 'cryptocurrencies'} for your combo pool
          </p>
        </div>
        <Button
          onClick={() => setStep(1)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Search */}
      <div className="relative z-[100]">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value, selectedType!);
            }}
            placeholder={`Search ${selectedType === 'football' ? 'football matches' : 'cryptocurrencies'}...`}
            className="w-full pl-10 pr-10 py-3 bg-bg-card border border-border-input rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all relative z-10"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                if (selectedType === 'football') {
                  setSearchResults(allMatches);
                } else {
                  setSearchResults(allCryptos);
                }
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-muted hover:text-text-primary z-20"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="absolute z-[200] w-full mt-2 bg-bg-card border border-border-input rounded-xl shadow-2xl max-h-96 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (activeConditionId) {
                    selectItem(item, activeConditionId);
                  } else {
                    toast.error('Please add a condition first');
                  }
                }}
                className="w-full p-4 text-left hover:bg-primary/10 border-b border-border-input last:border-b-0 transition-colors"
              >
                {'homeTeam' in item ? (
                  <div>
                    <div className="font-semibold text-text-primary">
                      {item.homeTeam.name} vs {item.awayTeam.name}
                    </div>
                    <div className="text-sm text-text-secondary mt-1">{item.league.name}</div>
                    <div className="text-xs text-text-muted mt-1">{new Date(item.matchDate).toLocaleString()}</div>
                  </div>
                ) : (
                  <div>
                    <div className="font-semibold text-text-primary">
                      {item.symbol} - {item.name}
                    </div>
                    <div className="text-sm text-success mt-1">${item.currentPrice.toLocaleString()}</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Condition Button */}
      <div className="text-center">
        <Button
          onClick={addCondition}
          variant="outline"
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          Add {selectedType === 'football' ? 'Match' : 'Crypto'} Condition
        </Button>
      </div>

      {/* Conditions List */}
      <div className="space-y-4 relative">
        {formData.conditions.map((condition, index) => (
          <motion.div
            key={condition.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6 border border-border-card relative overflow-visible"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <CubeIcon className="h-5 w-5 text-primary" />
                Condition {index + 1}
              </h3>
              {formData.conditions.length > 2 && (
                <button
                  onClick={() => removeCondition(condition.id)}
                  className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Item Selection */}
              <div className="md:col-span-2 relative z-[90]">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {selectedType === 'football' ? 'Select Match' : 'Select Cryptocurrency'} *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={activeConditionId === condition.id ? searchQuery : (condition.matchId || condition.cryptoId ? 
                      (condition.type === 'football' ? `${condition.homeTeam} vs ${condition.awayTeam}` : `${condition.symbol} - ${condition.name}`) : '')}
                    onFocus={() => {
                      setActiveConditionId(condition.id);
                      // Show all matches when focusing
                      if (selectedType === 'football') {
                        setSearchResults(allMatches);
                      } else {
                        setSearchResults(allCryptos);
                      }
                    }}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setActiveConditionId(condition.id);
                      handleSearch(e.target.value, selectedType!);
                    }}
                    placeholder={`Search ${selectedType === 'football' ? 'matches' : 'cryptocurrencies'}...`}
                    className="w-full px-4 py-3 bg-bg-card border border-border-input rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all relative z-10"
                  />
                  {activeConditionId === condition.id && searchResults.length > 0 && (
                    <div className="absolute z-[200] w-full mt-2 bg-bg-card border border-border-input rounded-xl shadow-2xl max-h-96 overflow-y-auto">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => selectItem(item, condition.id)}
                          className="w-full p-4 text-left hover:bg-primary/10 border-b border-border-input last:border-b-0 transition-colors"
                        >
                          {'homeTeam' in item ? (
                            <div>
                              <div className="font-semibold text-text-primary">
                                {item.homeTeam.name} vs {item.awayTeam.name}
                              </div>
                              <div className="text-sm text-text-secondary mt-1">{item.league.name}</div>
                              <div className="text-xs text-text-muted mt-1">{new Date(item.matchDate).toLocaleString()}</div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-semibold text-text-primary">
                                {item.symbol} - {item.name}
                              </div>
                              <div className="text-sm text-success mt-1">${item.currentPrice.toLocaleString()}</div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Market Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Market Type *
                </label>
                <select
                  value={condition.market}
                  onChange={(e) => updateCondition(condition.id, 'market', e.target.value)}
                  className="w-full px-4 py-3 bg-bg-card border border-border-input rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                >
                  <option value="">Select market...</option>
                  {selectedType === 'football' ? (
                    <>
                      <option value="1X2">1X2 (Match Result)</option>
                      <option value="Over/Under 2.5">Over/Under 2.5 Goals</option>
                      <option value="Both Teams to Score">Both Teams to Score</option>
                      <option value="Half Time Result">Half Time Result</option>
                    </>
                  ) : (
                    <>
                      <option value="Price Target">Price Target</option>
                      <option value="24h Change">24h Price Change</option>
                      <option value="Weekly Change">Weekly Price Change</option>
                    </>
                  )}
                </select>
                {errors[`condition_${index}_market`] && (
                  <p className="text-error text-sm mt-1">{errors[`condition_${index}_market`]}</p>
                )}
              </div>

              {/* Odds */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Odds (Decimal)
                </label>
                <AmountInput
                  value={condition.odds.toString()}
                  onChange={(value) => updateCondition(condition.id, 'odds', parseFloat(value || '0'))}
                  placeholder="2.00"
                  min={1.01}
                  max={100}
                  step={0.01}
                  allowDecimals={true}
                  currency="x"
                  error={errors[`condition_${index}_odds`]}
                />
              </div>

              {/* Selection */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Your Prediction
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateCondition(condition.id, 'selection', 'YES')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      condition.selection === 'YES'
                        ? 'border-success bg-success/10 text-success'
                        : 'border-border-input bg-bg-card text-text-secondary hover:border-success/50'
                    }`}
                  >
                    <div className="font-semibold">YES</div>
                  </button>
                  <button
                    onClick={() => updateCondition(condition.id, 'selection', 'NO')}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      condition.selection === 'NO'
                        ? 'border-error bg-error/10 text-error'
                        : 'border-border-input bg-bg-card text-text-secondary hover:border-error/50'
                    }`}
                  >
                    <div className="font-semibold">NO</div>
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Description
                </label>
                <Textarea
                  value={condition.description}
                  onChange={(e) => updateCondition(condition.id, 'description', e.target.value)}
                  placeholder="Describe this condition..."
                  rows={2}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {formData.conditions.length >= 2 && (
        <div className="flex justify-between">
          <Button onClick={() => setStep(1)} variant="outline">
            Back: Type Selection
          </Button>
          <Button onClick={() => setStep(3)} variant="primary">
            Next: Configuration
          </Button>
        </div>
      )}
    </div>
  );

  const renderConfiguration = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Pool Configuration</h2>
          <p className="text-text-secondary">Configure your combo pool settings and stake</p>
        </div>
        <Button
          onClick={() => setStep(2)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pool Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Pool Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Premier League Champions + Bitcoin Bull Run"
            className="w-full px-4 py-3 bg-bg-card border border-border-input rounded-xl text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
          {errors.title && (
            <p className="text-error text-sm mt-1">{errors.title}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <Textarea
            label="Pool Description *"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your combo pool and the conditions..."
            rows={4}
            error={errors.description}
          />
        </div>

        {/* Creator Stake */}
        <div>
          <AmountInput
            label="Creator Stake *"
            value={formData.creatorStake.toString()}
            onChange={(value) => setFormData(prev => ({ ...prev, creatorStake: parseFloat(value || '0') }))}
            placeholder="100.0"
            min={50}
            max={1000000}
            step={0.1}
            allowDecimals={true}
            currency={currentCurrency.symbol}
            help={`Your stake that acts as liquidity for the pool. Minimum: ${currentCurrency.minStake.toLocaleString()} ${currentCurrency.symbol}`}
            error={errors.creatorStake}
          />
        </div>

        {/* Bet Type */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Bet Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormData(prev => ({ ...prev, betType: 'fixed' }))}
              className={`p-3 rounded-xl border text-center transition-all ${
                formData.betType === 'fixed'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-input bg-bg-card text-text-secondary hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">Fixed Bet</div>
              <div className="text-xs mt-1">Exact amount</div>
            </button>
            <button
              onClick={() => setFormData(prev => ({ ...prev, betType: 'max' }))}
              className={`p-3 rounded-xl border text-center transition-all ${
                formData.betType === 'max'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-input bg-bg-card text-text-secondary hover:border-primary/50'
              }`}
            >
              <div className="font-semibold">Max Bet</div>
              <div className="text-xs mt-1">Up to limit</div>
            </button>
          </div>
        </div>

        {/* Bet Amount */}
        {formData.betType === 'fixed' ? (
          <div>
            <AmountInput
              label="Fixed Bet Amount *"
              value={formData.fixedBetAmount?.toString() || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, fixedBetAmount: parseFloat(value || '0') }))}
              placeholder="1000.0"
              min={1}
              max={1000000}
              step={0.1}
              allowDecimals={true}
              currency={currentCurrency.symbol}
              help="Exact bet amount users must place"
              error={errors.fixedBetAmount}
            />
          </div>
        ) : (
          <div>
            <AmountInput
              label="Max Bet Per User *"
              value={formData.maxBetPerUser?.toString() || ''}
              onChange={(value) => setFormData(prev => ({ ...prev, maxBetPerUser: parseFloat(value || '0') }))}
              placeholder="1000.0"
              min={1}
              max={1000000}
              step={0.1}
              allowDecimals={true}
              currency={currentCurrency.symbol}
              help="Maximum bet amount per user"
              error={errors.maxBetPerUser}
            />
          </div>
        )}

        {/* Payment Token - 3 Currency Options */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-secondary mb-3">
            <SparklesIcon className="h-4 w-4 inline-block mr-1.5 text-primary" />
            Select Payment Currency
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* BNB Option */}
            <button
              onClick={() => setFormData(prev => ({
                ...prev, 
                currencyType: CurrencyType.BNB,
                creatorStake: Math.max(prev.creatorStake, CURRENCY_CONFIG[CurrencyType.BNB].minStake)
              }))}
              className={`group relative p-4 rounded-2xl border-2 text-center transition-all duration-300 overflow-hidden ${
                formData.currencyType === CurrencyType.BNB
                  ? 'border-amber-400 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-transparent shadow-lg shadow-amber-500/20'
                  : 'border-border-input bg-bg-card/50 backdrop-blur-sm text-text-secondary hover:border-amber-400/50 hover:bg-amber-500/5'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className={`text-xl font-bold mb-1 ${formData.currencyType === CurrencyType.BNB ? 'text-amber-400' : 'text-text-primary'}`}>
                  tBNB
                </div>
                <div className="text-xs text-text-muted">Somnia Network</div>
                <div className="mt-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Min: 2 tBNB</span>
                </div>
              </div>
            </button>
            
            {/* PRIX Option */}
            <button
              onClick={() => setFormData(prev => ({
                ...prev, 
                currencyType: CurrencyType.PRIX,
                creatorStake: Math.max(prev.creatorStake, CURRENCY_CONFIG[CurrencyType.PRIX].minStake)
              }))}
              className={`group relative p-4 rounded-2xl border-2 text-center transition-all duration-300 overflow-hidden ${
                formData.currencyType === CurrencyType.PRIX
                  ? 'border-primary bg-gradient-to-br from-primary/20 via-primary/10 to-transparent shadow-lg shadow-primary/20'
                  : 'border-border-input bg-bg-card/50 backdrop-blur-sm text-text-secondary hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className={`text-xl font-bold mb-1 ${formData.currencyType === CurrencyType.PRIX ? 'text-primary' : 'text-text-primary'}`}>
                  PRIX
                </div>
                <div className="text-xs text-text-muted">Reduced fees</div>
                <div className="mt-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary">Min: 5,000 PRIX</span>
                </div>
              </div>
            </button>
            
            {/* USDT Option */}
            <button
              onClick={() => setFormData(prev => ({
                ...prev, 
                currencyType: CurrencyType.USDT,
                creatorStake: Math.max(prev.creatorStake, CURRENCY_CONFIG[CurrencyType.USDT].minStake)
              }))}
              className={`group relative p-4 rounded-2xl border-2 text-center transition-all duration-300 overflow-hidden ${
                formData.currencyType === CurrencyType.USDT
                  ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/20 via-emerald-400/10 to-transparent shadow-lg shadow-emerald-500/20'
                  : 'border-border-input bg-bg-card/50 backdrop-blur-sm text-text-secondary hover:border-emerald-400/50 hover:bg-emerald-500/5'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className={`text-xl font-bold mb-1 ${formData.currencyType === CurrencyType.USDT ? 'text-emerald-400' : 'text-text-primary'}`}>
                  USDT
                </div>
                <div className="text-xs text-text-muted">Stablecoin</div>
                <div className="mt-2 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Min: $2,000</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Privacy */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            Pool Privacy
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFormData(prev => ({ ...prev, isPrivate: false }))}
              className={`p-3 rounded-xl border text-center transition-all ${
                !formData.isPrivate
                  ? 'border-success bg-success/10 text-success'
                  : 'border-border-input bg-bg-card text-text-secondary hover:border-success/50'
              }`}
            >
              <div className="font-semibold">Public</div>
              <div className="text-xs mt-1">Anyone can bet</div>
            </button>
            <button
              onClick={() => setFormData(prev => ({ ...prev, isPrivate: true }))}
              className={`p-3 rounded-xl border text-center transition-all ${
                formData.isPrivate
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border-input bg-bg-card text-text-secondary hover:border-accent/50'
              }`}
            >
              <div className="font-semibold">Private</div>
              <div className="text-xs mt-1">Whitelist only</div>
            </button>
          </div>
        </div>
      </div>

      {/* Calculations */}
      {formData.betType === 'fixed' && formData.fixedBetAmount && (
        <div className="glass-card p-6 border border-primary/20">
          <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <CalculatorIcon className="h-5 w-5 text-primary" />
            Pool Calculations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-text-muted text-sm">Max Bettors</label>
              <p className="text-text-primary font-semibold text-xl">{maxBettors}</p>
            </div>
            <div>
              <label className="text-text-muted text-sm">Combined Odds</label>
              <p className="text-primary font-bold text-xl">{formData.combinedOdds.toFixed(2)}x</p>
            </div>
            <div>
              <label className="text-text-muted text-sm">Potential Win</label>
              <p className="text-success font-bold text-xl">
                {potentialWinnings.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currentCurrency.symbol}
              </p>
            </div>
          </div>
          {maxBettors > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-muted">Bettor Progress</span>
                <span className="text-text-primary">0 / {maxBettors}</span>
              </div>
              <div className="w-full bg-bg-card rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <Button onClick={() => setStep(2)} variant="outline">
          Back: Selection
        </Button>
        <Button onClick={() => setStep(4)} variant="primary">
          Next: Review
        </Button>
      </div>
    </div>
  );

  const renderSummary = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Pool Summary</h2>
          <p className="text-text-secondary">Review your combo pool before creation</p>
        </div>
        <Button
          onClick={() => setStep(3)}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="glass-card p-6 border border-primary/20">
        <div className="space-y-4">
          <div>
            <h4 className="text-lg font-semibold text-text-primary mb-2">{formData.title}</h4>
            <p className="text-text-secondary">{formData.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-text-muted text-sm">Conditions</label>
              <p className="text-text-primary font-semibold">{formData.conditions.length}</p>
            </div>
            <div>
              <label className="text-text-muted text-sm">Combined Odds</label>
              <p className="text-primary font-bold text-xl">{formData.combinedOdds.toFixed(2)}x</p>
            </div>
            <div>
              <label className="text-text-muted text-sm">Creator Stake</label>
              <p className="text-text-primary font-semibold">
                {formData.creatorStake.toLocaleString()} {currentCurrency.symbol}
              </p>
            </div>
            <div>
              <label className="text-text-muted text-sm">Potential Win</label>
              <p className="text-success font-bold text-xl">
                {potentialWinnings.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currentCurrency.symbol}
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-border-card">
            <h5 className="font-semibold text-text-primary mb-3">Conditions:</h5>
            <div className="space-y-2">
              {formData.conditions.map((condition) => (
                <div key={condition.id} className="flex items-center justify-between p-3 bg-bg-card/50 rounded-lg">
                  <div>
                    <p className="text-text-primary font-medium">
                      {condition.type === 'football' 
                        ? `${condition.homeTeam} vs ${condition.awayTeam}` 
                        : `${condition.symbol} - ${condition.name}`
                      }
                    </p>
                    <p className="text-text-muted text-sm">{condition.market} - {condition.selection}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-primary font-semibold">{condition.odds}x</p>
                    <p className="text-text-muted text-xs">{condition.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button onClick={() => setStep(3)} variant="outline">
          Back: Configuration
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          loading={isLoading}
          variant="primary"
          className="min-w-[200px]"
        >
          {isLoading ? 'Creating Pool...' : 'Create Combo Pool'}
        </Button>
      </div>
    </div>
  );

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-warning mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">Wallet Not Connected</h2>
        <p className="text-text-secondary mb-6">Please connect your wallet to create combo pools.</p>
        <Button onClick={connectWallet} variant="primary">
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="h-12 w-12 text-error mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-text-primary mb-2">Insufficient Reputation</h2>
        <p className="text-text-secondary mb-6">
          You need higher reputation to create combo pools. Participate in existing markets to build your reputation.
        </p>
        {userReputation && (
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-lg">
              <span className="text-sm font-medium">Current Reputation: {userReputation?.score || 0}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3, 4].map((stepNumber) => (
          <React.Fragment key={stepNumber}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
              step >= stepNumber 
                ? 'bg-primary text-white' 
                : 'bg-bg-card text-text-muted'
            }`}>
              {stepNumber}
            </div>
            {stepNumber < 4 && (
              <div className={`h-1 w-16 ${
                step > stepNumber ? 'bg-primary' : 'bg-bg-card'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="type-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderTypeSelection()}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="item-selection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderItemSelection()}
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="configuration"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderConfiguration()}
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderSummary()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
