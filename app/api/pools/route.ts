import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://predinex-backend.fly.dev';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    // const category = searchParams.get('category') || 'all'; // Unused variable

    // Fetch pools from backend
    const response = await fetch(`${API_BASE_URL}/api/guided-markets/pools?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch pools');
    }

    // Log first pool to see what backend returns
    if (data.data?.pools?.length > 0) {
      console.log('🔍 Backend pool data sample:', {
        poolId: data.data.pools[0].id,
        category: data.data.pools[0].category,
        homeTeam: data.data.pools[0].homeTeam,
        awayTeam: data.data.pools[0].awayTeam,
        title: data.data.pools[0].title,
        marketId: data.data.pools[0].marketId,
        fixtureId: data.data.pools[0].fixtureId,
        // Check for any logo fields
        allKeys: Object.keys(data.data.pools[0]),
      });
    }

    // Transform and format the data for frontend
    // Also pass through logo fields and fixtureId from backend
    const formattedPools = data.data.pools.map((pool: Record<string, unknown>) => ({
      poolId: pool.id,
      id: pool.id,
      creator: pool.creator,
      odds: pool.odds,
      settled: pool.settled || false,
      creatorSideWon: pool.creatorSideWon || false,
      isPrivate: pool.isPrivate || false,
      usesPrix: pool.usesPrix || false,
      filledAbove60: pool.filledAbove60 || false,
      oracleType: pool.oracleType || 'GUIDED',
      
      creatorStake: pool.creatorStake,
      totalCreatorSideStake: pool.totalCreatorSideStake || pool.creatorStake,
      maxBettorStake: pool.maxBettorStake || pool.totalBettorStake,
      totalBettorStake: pool.totalBettorStake,
      predictedOutcome: pool.predictedOutcome,
      result: pool.result || '',
      marketId: pool.marketId,
      marketType: pool.marketType || 0,
      // ✅ NEW: Include fixtureId from backend
      fixtureId: pool.fixtureId,
      // ✅ NEW: Include team logos from backend
      homeTeamLogo: pool.homeTeamLogo,
      awayTeamLogo: pool.awayTeamLogo,
      leagueLogo: pool.leagueLogo,
      
      eventStartTime: typeof pool.eventStartTime === 'string' ? new Date(pool.eventStartTime).getTime() / 1000 : pool.eventStartTime,
      eventEndTime: typeof pool.eventEndTime === 'string' ? new Date(pool.eventEndTime).getTime() / 1000 : pool.eventEndTime,
      bettingEndTime: typeof pool.bettingEndTime === 'string' ? new Date(pool.bettingEndTime).getTime() / 1000 : pool.bettingEndTime,
      resultTimestamp: pool.resultTimestamp ? new Date(pool.resultTimestamp as string).getTime() / 1000 : 0,
      arprixationDeadline: pool.arprixationDeadline ? new Date(pool.arprixationDeadline as string).getTime() / 1000 : (typeof pool.eventEndTime === 'string' ? new Date(pool.eventEndTime as string).getTime() / 1000 + (24 * 60 * 60) : (pool.eventEndTime as number) + (24 * 60 * 60)),
      
      league: pool.league || 'Unknown',
      category: pool.category || 'sports',
      region: pool.region || 'Global',
      maxBetPerUser: pool.maxBetPerUser,
      
      boostTier: pool.boostTier || 'NONE',
      boostExpiry: pool.boostExpiry || 0,
      trending: pool.trending || false,
      socialStats: pool.socialStats || {
        likes: 0,
        comments: 0,
        views: 0
      },
      change24h: pool.change24h || 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        pools: formattedPools,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: formattedPools.length
        }
      }
    });

  } catch (error) {
    console.error('Error fetching pools:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pools'
      },
      { status: 500 }
    );
  }
}
