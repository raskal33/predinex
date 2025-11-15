import { EnhancedPool } from "@/components/EnhancedPoolCard";
// import { PoolMetadataService } from "./poolMetadataService";
import { GuidedMarketService } from "./guidedMarketService";

/**
 * Service to automatically generate relevant images for pools
 * Creates abstract card designs with team logos or coin logos
 */

// Category-based image keywords
const categoryImageMap: Record<string, string[]> = {
  football: ["football", "soccer", "stadium", "sports"],
  crypto: ["cryptocurrency", "bitcoin", "blockchain", "digital"],
  basketball: ["basketball", "nba", "court", "sports"],
  sports: ["sports", "athletics", "competition"],
  other: ["prediction", "market", "trading"],
};

// League-specific image keywords
const leagueImageMap: Record<string, string[]> = {
  "La Liga": ["la liga", "spain", "football", "soccer"],
  "Premier League": ["premier league", "england", "football"],
  "Serie A": ["serie a", "italy", "football"],
  "Bundesliga": ["bundesliga", "germany", "football"],
  "Ligue 1": ["ligue 1", "france", "football"],
  "MLS": ["mls", "usa", "football", "soccer"],
  "Saudi Pro League": ["saudi", "arabia", "football"],
  "NBA": ["nba", "basketball", "usa"],
  "Euroleague": ["euroleague", "basketball", "europe"],
};

// Team name keywords for better image matching
const teamKeywords: Record<string, string> = {
  "Barcelona": "barcelona fc",
  "Real Madrid": "real madrid",
  "Manchester": "manchester united",
  "Liverpool": "liverpool fc",
  "Arsenal": "arsenal fc",
  "Chelsea": "chelsea fc",
  "Bayern": "bayern munich",
  "PSG": "paris saint germain",
  "Juventus": "juventus",
  "Milan": "ac milan",
  "Inter": "inter milan",
  "Messi": "lionel messi",
  "Ronaldo": "cristiano ronaldo",
  "Bitcoin": "bitcoin",
  "Ethereum": "ethereum",
  "Solana": "solana",
};

/**
 * Generate image URL based on pool metadata
 * Uses Unsplash Source API (no key required) for dynamic images
 */
export function getPoolImageUrl(pool: EnhancedPool): string {
  // If pool already has an imageUrl, use it
  if ((pool as any).imageUrl) {
    return (pool as any).imageUrl;
  }

  // Build search query based on pool metadata
  const searchTerms: string[] = [];

  // 1. Check for team names in title
  if (pool.homeTeam || pool.awayTeam) {
    const team1 = pool.homeTeam || "";
    const team2 = pool.awayTeam || "";
    
    // Use team keywords if available
    const team1Keyword = teamKeywords[team1] || team1.toLowerCase();
    const team2Keyword = teamKeywords[team2] || team2.toLowerCase();
    
    searchTerms.push(team1Keyword, team2Keyword);
  }

  // 2. Check league
  if (pool.league) {
    const leagueKeywords = leagueImageMap[pool.league] || [pool.league.toLowerCase()];
    searchTerms.push(...leagueKeywords.slice(0, 2));
  }

  // 3. Check category
  if (pool.category) {
    const categoryKeywords = categoryImageMap[pool.category.toLowerCase()] || [pool.category.toLowerCase()];
    searchTerms.push(...categoryKeywords.slice(0, 2));
  }

  // 4. Extract keywords from title if available
  if (pool.title) {
    const titleWords = pool.title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 2);
    searchTerms.push(...titleWords);
  }

  // Remove duplicates and empty strings
  const uniqueTerms = [...new Set(searchTerms.filter(Boolean))];
  
  // Use first 2-3 relevant terms
  const query = uniqueTerms.slice(0, 3).join(",");

  // Generate Unsplash Source URL
  // Format: https://source.unsplash.com/featured/?{query}
  // Using a more specific size and better quality
  const width = 800;
  const height = 400;
  
  if (query) {
    // Use Unsplash Source API with specific dimensions
    return `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(query)}`;
  }

  // Fallback: category-based gradient or placeholder
  return getCategoryGradientImage(pool.category || "other");
}

/**
 * Generate a gradient-based placeholder image URL
 * Uses a service that generates images with text/gradients
 */
function getCategoryGradientImage(category: string): string {
  const categoryColors: Record<string, string> = {
    football: "10b981,059669", // Green
    crypto: "f59e0b,ef4444", // Orange-Red
    basketball: "3b82f6,1d4ed8", // Blue
    sports: "8b5cf6,7c3aed", // Purple
    other: "06b6d4,0891b2", // Cyan
  };

  const colors = categoryColors[category.toLowerCase()] || "6b7280,4b5563";
  
  // Use placeholder.com or similar service with gradient
  // Format: https://via.placeholder.com/{width}x{height}/{color1}/{color2}
  return `https://via.placeholder.com/800x400/${colors.split(',')[0]}/${colors.split(',')[1]}?text=${encodeURIComponent(category.toUpperCase())}`;
}

/**
 * Alternative: Use Picsum Photos with ID based on pool ID for consistent images
 * This is the most reliable method - always works
 */
export function getPoolImageUrlSeeded(pool: EnhancedPool): string {
  if ((pool as any).imageUrl) {
    return (pool as any).imageUrl;
  }

  // Use pool ID to get a consistent image ID (0-1000 range)
  // This ensures same pool always gets same image
  const imageId = (pool.id % 1000) + 1; // +1 to avoid 0
  const width = 800;
  const height = 400;
  
  // Picsum Photos with ID - this format always works
  return `https://picsum.photos/id/${imageId}/${width}/${height}`;
}

/**
 * Generate deterministic image URL based on pool metadata
 * Uses pool ID + category + league to create consistent images
 */
function _generateDeterministicImageUrl(pool: EnhancedPool): string {
  // Create a seed from pool metadata for consistency
  const seed = `${pool.id}-${pool.category || 'other'}-${pool.league || ''}-${pool.homeTeam || ''}-${pool.awayTeam || ''}`;
  
  // Hash the seed to a number (simple hash function)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use absolute value and modulo to get a consistent image ID
  const imageId = Math.abs(hash) % 1000;
  const width = 800;
  const height = 400;
  
  // Use Picsum Photos with deterministic ID
  return `https://picsum.photos/id/${imageId}/${width}/${height}`;
}

/**
 * Get team logos for football pools using fallback strategies
 * 1. Try match-center API (if available)
 * 2. Generate UI Avatar logos from team names
 * 3. Create abstract team representations
 */
async function getTeamLogos(pool: EnhancedPool): Promise<{ homeLogo?: string; awayLogo?: string; leagueLogo?: string }> {
  if (pool.category?.toLowerCase() !== 'football' && pool.category?.toLowerCase() !== 'soccer') {
    return {};
  }

  // Extract team names from pool data
  const homeTeam = pool.homeTeam || (pool.title ? extractTeamName(pool.title, 'home') : undefined);
  const awayTeam = pool.awayTeam || (pool.title ? extractTeamName(pool.title, 'away') : undefined);
  
  if (!homeTeam || !awayTeam) {
    return {};
  }

  // ✅ NEW: Check if logos are already in the pool data (from backend)
  const poolWithLogos = pool as any;
  if (poolWithLogos.homeTeamLogo || poolWithLogos.awayTeamLogo) {
    console.log('✅ Found team logos from backend:', {
      poolId: pool.id,
      homeLogo: poolWithLogos.homeTeamLogo,
      awayLogo: poolWithLogos.awayTeamLogo,
      leagueLogo: poolWithLogos.leagueLogo,
      fixtureId: poolWithLogos.fixtureId
    });
    return {
      homeLogo: poolWithLogos.homeTeamLogo,
      awayLogo: poolWithLogos.awayTeamLogo,
      leagueLogo: poolWithLogos.leagueLogo
    };
  }

  // First, try match-center API (but don't wait long if it fails)
  // Try fixtureId first (SportMonks fixture ID), then marketId
  const fixtureId = (pool as any).fixtureId;
  const marketId = (pool as any).marketId;
  const poolId = pool.id?.toString();
  
  // Don't use pool ID as marketId if marketId is already set to pool ID
  // (this happens when marketId is missing and we fall back to pool.id.toString())
  const shouldTryPoolIdAsMarket = !marketId || marketId === poolId;
  
  console.log('🔍 getTeamLogos - Attempting to fetch logos:', {
    poolId: pool.id,
    fixtureId,
    marketId,
    poolIdString: poolId,
    shouldTryPoolIdAsMarket,
    homeTeam,
    awayTeam,
    category: pool.category
  });
  
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://predinex.fly.dev';
  
  // Strategy 1: Try fixture endpoint if fixtureId is available (most reliable)
  if (fixtureId) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      
      const endpoint = `${backendUrl}/api/match-center/fixture/${fixtureId}?t=${Date.now()}`;
      console.log(`🔍 Trying match-center fixture API with ID: ${fixtureId}`, endpoint);
      
      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Match-center fixture API response for ID ${fixtureId}:`, data);
        
        if (data.success && data.data?.teams) {
          const teams = data.data.teams;
          const homeTeamLogo = typeof teams.home === 'object' ? teams.home?.logo : undefined;
          const awayTeamLogo = typeof teams.away === 'object' ? teams.away?.logo : undefined;
          
          if (homeTeamLogo || awayTeamLogo) {
            console.log('✅ Found logos from match-center fixture API:', { 
              fixtureId,
              homeTeamLogo, 
              awayTeamLogo,
              homeTeam,
              awayTeam
            });
            return {
              homeLogo: homeTeamLogo,
              awayLogo: awayTeamLogo,
              leagueLogo: typeof data.data.match?.league === 'object' ? data.data.match.league.logo : undefined,
            };
          }
        }
      } else {
        console.log(`⚠️ Match-center fixture API returned ${response.status} for ID ${fixtureId}`);
      }
    } catch (error) {
      console.log(`⚠️ Error fetching logos from fixture API for ID ${fixtureId}:`, error);
    }
  }
  
  // Strategy 2: Skip fixture search (too slow) and go directly to fallback
  // TODO: When backend provides fixtureId in pool data, use Strategy 1
  
  // Strategy 3: Try market endpoint if marketId is available and different from pool ID
  if (marketId && marketId !== poolId) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      
      const endpoint = `${backendUrl}/api/match-center/market/${marketId}?t=${Date.now()}`;
      console.log(`🔍 Trying match-center market API with ID: ${marketId}`, endpoint);
      
      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Match-center market API response for ID ${marketId}:`, data);
        
        if (data.success && data.data?.teams) {
          const teams = data.data.teams;
          const homeTeamLogo = typeof teams.home === 'object' ? teams.home?.logo : undefined;
          const awayTeamLogo = typeof teams.away === 'object' ? teams.away?.logo : undefined;
          
          if (homeTeamLogo || awayTeamLogo) {
            console.log('✅ Found logos from match-center market API:', { 
              marketId,
              homeTeamLogo, 
              awayTeamLogo,
              homeTeam,
              awayTeam
            });
            return {
              homeLogo: homeTeamLogo,
              awayLogo: awayTeamLogo,
              leagueLogo: typeof data.data.match?.league === 'object' ? data.data.match.league.logo : undefined,
            };
          }
        }
      } else {
        console.log(`⚠️ Match-center market API returned ${response.status} for ID ${marketId}`);
      }
    } catch (error) {
      console.log(`⚠️ Error fetching logos from market API for ID ${marketId}:`, error);
    }
  }

  // Fallback: Generate UI Avatar logos (same as FixtureSelector)
  try {
    const homeLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(homeTeam)}&background=3b82f6&color=fff&size=128&format=png&bold=true`;
    const awayLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(awayTeam)}&background=ef4444&color=fff&size=128&format=png&bold=true`;
    
    console.log('🎯 Generated UI Avatar logos:', { homeTeam, awayTeam, homeLogo, awayLogo });
    
    return {
      homeLogo,
      awayLogo,
      leagueLogo: undefined,
    };
  } catch {
    return {};
  }
}

/**
 * Extract team names from pool title
 * Examples: "Arsenal vs Chelsea", "Real Madrid v Barcelona"
 */
function extractTeamName(title: string, position: 'home' | 'away'): string | null {
  if (!title) return null;
  
  // Common separators for team vs team format
  const separators = [' vs ', ' v ', ' VS ', ' V ', ' - ', ' x '];
  
  for (const sep of separators) {
    if (title.includes(sep)) {
      const teams = title.split(sep).map(t => t.trim());
      if (teams.length >= 2) {
        return position === 'home' ? teams[0] : teams[1];
      }
    }
  }
  
  return null;
}

/**
 * Get coin logo for crypto pools
 * Has timeout and graceful error handling
 */
async function getCoinLogo(pool: EnhancedPool): Promise<string | null> {
  if (pool.category?.toLowerCase() !== 'crypto' && pool.category?.toLowerCase() !== 'cryptocurrency') {
    return null;
  }

  try {
    // Extract coin symbol from title or team names
    const title = (pool.title || '').toLowerCase();
    const homeTeam = (pool.homeTeam || '').toLowerCase();
    const awayTeam = (pool.awayTeam || '').toLowerCase();
    
    // Common crypto symbols
    const cryptoKeywords: Record<string, string> = {
      'bitcoin': 'btc',
      'btc': 'btc',
      'ethereum': 'eth',
      'eth': 'eth',
      'solana': 'sol',
      'sol': 'sol',
      'cardano': 'ada',
      'ada': 'ada',
      'polygon': 'matic',
      'matic': 'matic',
      'avalanche': 'avax',
      'avax': 'avax',
      'chainlink': 'link',
      'link': 'link',
      'polkadot': 'dot',
      'dot': 'dot',
    };

    // Find matching crypto
    let coinSymbol = '';
    for (const [keyword, symbol] of Object.entries(cryptoKeywords)) {
      if (title.includes(keyword) || homeTeam.includes(keyword) || awayTeam.includes(keyword)) {
        coinSymbol = symbol;
        break;
      }
    }

    if (coinSymbol) {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        // Fetch cryptocurrencies to get logo
        const cryptos = await GuidedMarketService.getCryptocurrencies(500);
        clearTimeout(timeoutId);
        
        const matchingCrypto = cryptos.find(c => 
          c.symbol.toLowerCase() === coinSymbol.toLowerCase() ||
          c.id.toLowerCase().includes(coinSymbol.toLowerCase())
        );

        if (matchingCrypto?.logo) {
          return matchingCrypto.logo;
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Silently handle timeout or network errors
        if (fetchError.name === 'AbortError') {
          // Timeout - that's okay, just return null
          return null;
        }
        // Other errors - silently return null
        return null;
      }
    }
  } catch {
    // Silently handle any other errors
    return null;
  }

  return null;
}

/**
 * Generate abstract card design with logos
 * Returns metadata for rendering the card (logos and colors)
 */
export function getAbstractCardMetadata(
  pool: EnhancedPool,
  homeLogo?: string,
  awayLogo?: string,
  coinLogo?: string,
  leagueLogo?: string
) {
  const category = (pool.category || 'other').toLowerCase();

  // Category-based color schemes
  const colorSchemes: Record<string, { primary: string; secondary: string; accent: string }> = {
    football: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
    soccer: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
    crypto: { primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' },
    cryptocurrency: { primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24' },
    basketball: { primary: '#3b82f6', secondary: '#2563eb', accent: '#60a5fa' },
    sports: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
    other: { primary: '#06b6d4', secondary: '#0891b2', accent: '#22d3ee' },
  };

  const colors = colorSchemes[category] || colorSchemes.other;

  return {
    colors,
    category,
    homeLogo,
    awayLogo,
    coinLogo,
    leagueLogo,
  };
}

/**
 * Get category-specific image metadata
 * Returns logos and colors for rendering abstract card
 */
export async function getCategorySpecificImageMetadata(pool: EnhancedPool) {
  const category = (pool.category || 'other').toLowerCase();
  let homeLogo: string | undefined;
  let awayLogo: string | undefined;
  let coinLogo: string | undefined;
  let leagueLogo: string | undefined;
  
  // Try to get logos for football pools
  if (category === 'football' || category === 'soccer') {
    const teamLogos = await getTeamLogos(pool);
    homeLogo = teamLogos.homeLogo;
    awayLogo = teamLogos.awayLogo;
    leagueLogo = teamLogos.leagueLogo;
  }
  
  // Try to get logo for crypto pools
  if (category === 'crypto' || category === 'cryptocurrency') {
    const coin = await getCoinLogo(pool);
    coinLogo = coin || undefined;
  }
  
  return getAbstractCardMetadata(pool, homeLogo, awayLogo, coinLogo, leagueLogo);
}

/**
 * Get image URL with fallback chain
 * Tries multiple strategies for best results
 * Works for both existing and future pools
 * Always returns a working image URL
 * Now uses abstract card designs with team/coin logos
 */
export function getPoolImageUrlWithFallback(pool: EnhancedPool): string {
  // Strategy 1: Generate abstract card with logos (most relevant)
  // This is async, so we'll handle it in the component
  // For now, return a placeholder that will be replaced
  try {
    // We'll make this async in the component
    // For now, return a synchronous version
    return getCategoryGradientImage(pool.category || "other");
  } catch (error) {
    console.warn('Failed to generate abstract card:', error);
  }

  // Strategy 2: Use seeded image based on pool ID (fallback, always works)
  try {
    return getPoolImageUrlSeeded(pool);
  } catch (error) {
    console.warn('Failed to generate seeded image:', error);
  }

  // Strategy 3: Category gradient fallback (always works)
  return getCategoryGradientImage(pool.category || "other");
}

/**
 * Get image URL with logos (async version)
 * Returns null to indicate we should use the React component instead
 */
export async function getPoolImageUrlWithLogos(_pool: EnhancedPool): Promise<string | null> {
  // Return null to indicate we should use AbstractPoolCardImage component
  // The component will fetch logos and render the abstract card
  return null;
}

/**
 * Preload image to check if it's available
 */
export async function preloadPoolImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    
    // Timeout after 3 seconds
    setTimeout(() => resolve(false), 3000);
  });
}

/**
 * Get optimized image URL with caching
 * Uses a CDN or optimized image service if available
 */
export function getOptimizedPoolImageUrl(pool: EnhancedPool, width: number = 800, height: number = 400): string {
  const baseUrl = getPoolImageUrlWithFallback(pool);
  
  // If using Unsplash, we can add size parameters
  if (baseUrl.includes('unsplash.com')) {
    return baseUrl.replace(/\/\d+x\d+\//, `/${width}x${height}/`);
  }
  
  // If using placeholder, update size
  if (baseUrl.includes('placeholder.com')) {
    return baseUrl.replace(/\d+x\d+/, `${width}x${height}`);
  }
  
  return baseUrl;
}


