import { NextResponse } from 'next/server';
import { getMiners } from '@/server/state';

export async function GET() {
  return NextResponse.json({ miners: getMiners() });
}
