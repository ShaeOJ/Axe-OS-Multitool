
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FETCH_TIMEOUT = 5000; // 5 seconds
const API_PATHS = ['/api/system/info', '/system/info', '/'];

async function fetchWithTimeout(url: string, timeout: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;

  for (const path of API_PATHS) {
    const url = `http://${ip}${path}`;
    try {
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT);
      
      if (response.ok) {
        const data = await response.json();
        // Basic validation to ensure it's likely a miner response
        if (data && (data.hashRate !== undefined || data.hostname !== undefined)) {
          return NextResponse.json(data);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(`[Proxy] Request to ${url} timed out.`);
      } else {
        console.log(`[Proxy] Could not connect to ${url}.`);
      }
      // Try next path
    }
  }

  // If all paths failed
  return NextResponse.json(
    { error: `All attempts to fetch data from miner ${ip} failed. The device may be offline or unresponsive.` },
    { status: 504 } // Gateway Timeout
  );
}
