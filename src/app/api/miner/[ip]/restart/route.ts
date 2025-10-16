
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FETCH_TIMEOUT = 10000; // 10 seconds

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ip: string }> }
) {
  const { ip } = await params;
  const restartUrl = `http://${ip}/api/system/restart`;

  try {
    const bitaxeResponse = await fetch(restartUrl, {
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: {
        'Accept': 'application/json',
      },
    });

    if (bitaxeResponse.ok) {
      const data = await bitaxeResponse.json().catch(() => ({}));
      return NextResponse.json({ message: 'Restart command sent successfully', ...data });
    }

    return NextResponse.json(
      { error: `Failed to restart miner ${ip}. The device returned status ${bitaxeResponse.status}.` },
      { status: bitaxeResponse.status }
    );

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json({ error: `Request to restart miner ${ip} timed out.` }, { status: 504 });
    }
    return NextResponse.json({ error: `Failed to connect to miner ${ip} to send restart command: ${error.message}` }, { status: 500 });
  }
}
