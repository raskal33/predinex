import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'https://predinex.fly.dev';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Build query params
    const params = new URLSearchParams();
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/optimized-pools/pools${queryString ? `?${queryString}` : ''}`;
    
    console.log(`🔍 Fetching optimized pools from: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Backend API error (${response.status}):`, errorText);
      throw new Error(`Backend API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error fetching optimized pools:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch optimized pools'
      },
      { status: 500 }
    );
  }
}

