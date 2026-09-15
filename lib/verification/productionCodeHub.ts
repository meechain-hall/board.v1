import { getLatestWorkflowRun, getLatestCommitSha } from '@/lib/github';
import { getLatestDeployment } from '@/lib/vercel';
import {
  Evidence,
  EvidenceStatus,
  VerificationResult,
  deriveStatus,
  serializeError,
} from './types';

const RUNTIME_HEALTH_URL = 'https://board.meechain.live/api/health';

async function checkGithubCommit(): Promise<Evidence> {
  try {
    const commit = await getLatestCommitSha();
    return {
      type: 'github-commit',
      label: 'ตัวระบุตัวตนของการยืนยันแหล่งที่มา (Git SHA)',
      value: commit.shortSha,
      status: 'pass',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      detail: { fullSha: commit.sha, message: commit.message, date: commit.date },
    };
  } catch (err) {
    return {
      type: 'github-commit',
      label: 'ตัวระบุตัวตนของการยืนยันแหล่งที่มา (Git SHA)',
      value: '',
      status: 'unknown',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      error: serializeError(err),
    };
  }
}

async function checkCiWorkflow(): Promise<Evidence> {
  try {
    const run = await getLatestWorkflowRun();
    if (!run) {
      return {
        type: 'ci-run',
        label: 'เวิร์กโฟลว์ CI',
        value: 'ยังไม่มี run บันทึกไว้',
        status: 'unknown',
        source: 'live-probe',
        timestamp: new Date().toISOString(),
      };
    }

    const status: EvidenceStatus =
      run.conclusion === 'success'
        ? 'pass'
        : run.conclusion
          ? 'fail'
          : 'unknown';

    return {
      type: 'ci-run',
      label: 'เวิร์กโฟลว์ CI',
      value: run.conclusion ?? run.status,
      status,
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      detail: {
        branch: run.branch,
        commitSha: run.commitSha,
        url: run.url,
        status: run.status,
        conclusion: run.conclusion ?? null,
      },
    };
  } catch (err) {
    return {
      type: 'ci-run',
      label: 'เวิร์กโฟลว์ CI',
      value: '',
      status: 'unknown',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      error: serializeError(err),
    };
  }
}

async function checkDeployment(): Promise<{ evidence: Evidence; commitSha?: string }> {
  try {
    const deployment = await getLatestDeployment();
    if (!deployment) {
      return {
        evidence: {
          type: 'vercel-deployment',
          label: 'การดำเนินการปรับใช้ (Vercel)',
          value: 'ยังไม่พบ deployment',
          status: 'unknown',
          source: 'live-probe',
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      evidence: {
        type: 'vercel-deployment',
        label: 'การดำเนินการปรับใช้ (Vercel)',
        value: deployment.state,
        status: deployment.state === 'READY' ? 'pass' : 'fail',
        source: 'live-probe',
        timestamp: new Date().toISOString(),
        detail: {
          url: deployment.url,
          target: deployment.target,
          commitSha: deployment.commitSha,
        },
      },
      commitSha: deployment.commitSha,
    };
  } catch (err) {
    return {
      evidence: {
        type: 'vercel-deployment',
        label: 'การดำเนินการปรับใช้ (Vercel)',
        value: '',
        status: 'unknown',
        source: 'live-probe',
        timestamp: new Date().toISOString(),
        error: serializeError(err),
      },
    };
  }
}

function checkShaMatch(githubSha: string | undefined, deploySha: string | undefined): Evidence {
  const status: EvidenceStatus =
    githubSha && deploySha
      ? githubSha === deploySha
        ? 'pass'
        : 'fail'
      : 'unknown';

  return {
    type: 'sha-match',
    label: 'การจัดเรียง SHA ในการใช้งาน (GitHub เทียบกับ Vercel)',
    value:
      status === 'unknown'
        ? 'ข้อมูลไม่ครบสำหรับเทียบ'
        : status === 'pass'
          ? 'ตรงกัน'
          : 'ไม่ตรงกัน',
    status,
    source: 'derived',
    timestamp: new Date().toISOString(),
    detail: { githubSha, deploySha },
  };
}

function inferRuntimeHealthStatus(body: unknown): 'pass' | 'fail' {
  if (!body || typeof body !== 'object') return 'pass';

  const record = body as Record<string, unknown>;
  const marker = record.status;

  if (typeof marker === 'string') {
    const normalized = marker.toLowerCase();
    if (['ok', 'healthy', 'connected', 'ready', 'pass'].includes(normalized)) {
      return 'pass';
    }
    if (['offline', 'degraded', 'error', 'failed', 'fail', 'unhealthy'].includes(normalized)) {
      return 'fail';
    }
  }

  return 'pass';
}

async function checkRuntimeHealth(): Promise<Evidence> {
  try {
    const res = await fetch(RUNTIME_HEALTH_URL, { cache: 'no-store' });

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    if (!res.ok) {
      return {
        type: 'runtime-health',
        label: 'จุดสิ้นสุดรันไทม์ (Health Endpoint)',
        value: `HTTP ${res.status}`,
        status: 'fail',
        source: 'live-probe',
        timestamp: new Date().toISOString(),
        detail: { url: RUNTIME_HEALTH_URL, body },
      };
    }

    const status = inferRuntimeHealthStatus(body);

    return {
      type: 'runtime-health',
      label: 'จุดสิ้นสุดรันไทม์ (Health Endpoint)',
      value: 'HTTP 200',
      status,
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      detail: { url: RUNTIME_HEALTH_URL, body },
    };
  } catch (err) {
    return {
      type: 'runtime-health',
      label: 'จุดสิ้นสุดรันไทม์ (Health Endpoint)',
      value: '',
      status: 'unknown',
      source: 'live-probe',
      timestamp: new Date().toISOString(),
      error: serializeError(err),
    };
  }
}

export async function getProductionCodeHubVerification(): Promise<VerificationResult> {
  const [commitEvidence, ciEvidence, deployResult, runtimeEvidence] = await Promise.all([
    checkGithubCommit(),
    checkCiWorkflow(),
    checkDeployment(),
    checkRuntimeHealth(),
  ]);

  const githubSha =
    typeof commitEvidence.detail?.fullSha === 'string'
      ? commitEvidence.detail.fullSha
      : undefined;

  const shaMatchEvidence = checkShaMatch(githubSha, deployResult.commitSha);

  const evidence: Evidence[] = [
    commitEvidence,
    ciEvidence,
    deployResult.evidence,
    shaMatchEvidence,
    runtimeEvidence,
  ];

  const status = deriveStatus(evidence);
  const summaryMap: Record<typeof status, string> = {
    verified: 'หลักฐานด้านซอร์สโค้ด, CI, การปรับใช้, เวลาทำงาน และ SHA ล้วนเชื่อมโยงกัน',
    degraded: 'บางหลักฐานยังไม่สามารถยืนยันได้ครบถ้วน',
    failed: 'พบหลักฐานที่ล้มเหลวอย่างน้อยหนึ่งรายการ',
    unknown: 'ไม่มีหลักฐานเพียงพอสำหรับประเมินสถานะ',
  };

  return {
    id: 'production-code-hub',
    label: 'การตรวจสอบการผลิต · Production Code Hub',
    status,
    summary: summaryMap[status],
    checkedAt: new Date().toISOString(),
    evidence,
  };
}

