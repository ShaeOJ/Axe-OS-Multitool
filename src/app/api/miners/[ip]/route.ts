import { NextResponse } from 'next/server';
import { addMiner, removeMiner, updateMiner } from '@/server/state';
import type { MinerConfig } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { ip: string } }
) {
  const miner: MinerConfig = await request.json();
  addMiner(miner);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { ip: string } }
) {
  removeMiner(params.ip);
  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: { ip: string } }
) {
  const miner: MinerConfig = await request.json();
  updateMiner(miner);
  return NextResponse.json({ success: true });
}
