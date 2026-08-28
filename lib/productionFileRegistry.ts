export interface ProductionFileMeta {
  id: string;
  name: string;
  category: 'Components' | 'API Routes' | 'Config' | 'CI/CD' | 'Tests';
  language: string;
  targetPath: string; // path จริงใน repo — server ใช้ path นี้เรียก GitHub เท่านั้น
  description: string;
}

export const PRODUCTION_FILE_REGISTRY: ProductionFileMeta[] = [
{
  id: 'magic-hall-view',
  name: 'MagicHallView.tsx',
  category: 'Components',
  language: 'tsx',
  targetPath: 'app/components/magic/MagicHallView.tsx',
  description: 'ComPort Hall UI — network topology, relay feed, packet transmission',
},
  {
    id: 'comports-route',
    name: 'comports/route.ts',
    category: 'API Routes',
    language: 'ts',
    targetPath: 'app/api/control-plane/comports/route.ts',
    description: 'Live probe ของ API Gateway และ RPC Node พร้อมแยก source/identity',
  },
  {
    id: 'comports-relay-route',
    name: 'comports/relay/route.ts',
    category: 'API Routes',
    language: 'ts',
    targetPath: 'app/api/control-plane/comports/relay/route.ts',
    description: 'Relay log GET/POST ต่อกับ Supabase edge function',
  },
  {
    id: 'stats-route',
    name: 'stats/route.ts',
    category: 'API Routes',
    language: 'ts',
    targetPath: 'app/api/stats/route.ts',
    description: 'Aggregated node/API/RPC telemetry',
  },
  {
    id: 'health-route',
    name: 'health/route.ts',
    category: 'API Routes',
    language: 'ts',
    targetPath: 'app/api/health/route.ts',
    description: 'Backend health check endpoint',
  },
  {
    id: 'transactions-route',
    name: 'transactions/route.ts',
    category: 'API Routes',
    language: 'ts',
    targetPath: 'app/api/transactions/route.ts',
    description: 'Latest on-chain transfers (mock, TODO: real indexer)',
  },
  {
    id: 'quest-leaderboard-route',
    name: 'quest-leaderboard/route.ts',
    category: 'API Routes',
    language: 'ts',
    targetPath: 'app/api/quest-leaderboard/route.ts',
    description: 'Quest performer ranking (mock, TODO: real quest log)',
  },
  {
    id: 'ci-cd-workflow',
    name: 'ci-cd.yaml',
    category: 'CI/CD',
    language: 'yaml',
    targetPath: '.github/workflows/ci-cd.yaml',
    description: 'GitHub Actions pipeline',
  },
];

export function getRegistryEntry(id: string) {
  return PRODUCTION_FILE_REGISTRY.find((f) => f.id === id) || null;
}