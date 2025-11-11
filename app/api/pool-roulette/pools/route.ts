import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const excludePoolIds = searchParams.get('excludePoolIds') || undefined;
    
    // Build query params
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (excludePoolIds) params.append('excludePoolIds', excludePoolIds);
    
    const queryString = params.toString();
    const url = `${API_BASE_URL}/api/pool-roulette/pools${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
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
      throw new Error(data.error || 'Failed to fetch pool roulette pools');
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error fetching pool roulette pools:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pool roulette pools'
      },
      { status: 500 }
    );
  }
}

