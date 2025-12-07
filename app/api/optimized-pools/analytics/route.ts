import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://predinex.fly.dev';

export async function GET(_request: NextRequest) {
  try {
    const url = `${API_BASE_URL}/api/optimized-pools/analytics`;
    
    console.log(`🔍 Fetching analytics from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend API error (${response.status}):`, errorText);
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      },
      { status: 500 }
    );
  }
}

