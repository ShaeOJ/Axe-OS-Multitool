import { MinerDashboard } from '@/components/miner-dashboard';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-start justify-center">
        <MinerDashboard />
      </main>
    </div>
  );
}
