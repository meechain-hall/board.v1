import { NextResponse } from 'next/server';
import { getLatestDeployment } from '@/lib/vercel';
import { getLatestCommitSha } from '@/lib/github';

function serializeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export async function GET() {
  const [depResult, commitResult] = await Promise.allSettled([
    getLatestDeployment(),
    getLatestCommitSha(),
  ]);

  const deployment = depResult.status === 'fulfilled' ? depResult.value : null;
  const latestCommit = commitResult.status === 'fulfilled' ? commitResult.value : null;

  const deploymentError = depResult.status === 'rejected' ? serializeError(depResult.reason) : null;
  const commitError = commitResult.status === 'rejected' ? serializeError(commitResult.reason) : null;

  // match: true/false เมื่อเทียบได้จริง, null เมื่อข้อมูลไม่ครบพอจะเทียบ
  const match =
    deployment?.commitSha && latestCommit?.sha
      ? deployment.commitSha === latestCommit.sha ||
        latestCommit.sha.startsWith(deployment.commitSha)
      : null;

  return NextResponse.json({
    deployment,
    latestCommit,
    match,
    errors: { deployment: deploymentError, commit: commitError },
    source: 'live-probe',
    updatedAt: new Date().toISOString(),
  });
}