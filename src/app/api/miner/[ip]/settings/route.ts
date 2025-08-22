
import { NextResponse } from 'next/server';

const FETCH_TIMEOUT = 10000; // 10 seconds

export async function PATCH(
  request: Request,  
  { params }: { params: { ip: string | Promise<string> } }
) {
  const resolvedParams = await params;
  const ip = resolvedParams.ip;

  try {
    const body = await request.json();
    const { frequency, coreVoltage } = body;

    if (frequency === undefined || coreVoltage === undefined) {
      return NextResponse.json(
        { error: 'Missing frequency or coreVoltage in request body' },
        { status: 400 }
      );
    }
    
    // This proxy expects coreVoltage to be in millivolts (mV), as received from the frontend.
    const bitaxeUrl = `http://${ip}/api/system`;
    console.log(`[Proxy] Attempting PATCH to ${bitaxeUrl} with F:${frequency}, V:${coreVoltage}mV`);
    
    try {
        const bitaxeResponse = await fetch(bitaxeUrl, {
            method: 'PATCH',
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
            headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            },
                        body: JSON.stringify({ frequency, coreVoltage }),
        });

        if (bitaxeResponse.ok) {
            const data = await bitaxeResponse.json().catch(() => ({}));
            return NextResponse.json(data);
        }

        const errorText = await bitaxeResponse.text();
        console.error(`[Proxy] Miner at ${ip} returned error ${bitaxeResponse.status}: ${errorText}`);
        return NextResponse.json(
            { error: `Failed to apply settings to miner ${ip}. The device returned status ${bitaxeResponse.status}.` },
            { status: bitaxeResponse.status }
        );

    } catch (error: any) {
        if (error.name === 'AbortError') {
             return NextResponse.json({ error: `Request to miner ${ip} timed out.` }, { status: 504 });
        }
        return NextResponse.json({ error: `Failed to connect to miner ${ip}: ${error.message}` }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({ error: `Failed to process request: ${error.message}` }, { status: 400 });
  }
}
