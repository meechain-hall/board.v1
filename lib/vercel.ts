function vercelHeaders() {
  const token = process.env.VERCEL_API_TOKEN;
  if (!token) throw new Error('VERCEL_API_TOKEN ไม่ได้ตั้งค่า');
  return { Authorization: `Bearer ${token}` };
}

export async function getLatestDeployment() {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) throw new Error('VERCEL_PROJECT_ID ไม่ได้ตั้งค่า');
  const teamId = process.env.VERCEL_TEAM_ID; // optional ตามที่ตกลง

  const params = new URLSearchParams({ projectId, limit: '1', target: 'production' });
  if (teamId) params.set('teamId', teamId);

  const res = await fetch(`https://api.vercel.com/v6/deployments?${params}`, {
    headers: vercelHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${res.statusText}`);

  const json = await res.json();
  const dep = json.deployments?.[0];
  if (!dep) return null;

  return {
    state: dep.state as string, // READY | BUILDING | ERROR | QUEUED | CANCELED
    url: dep.url as string,
    target: dep.target as string,
    createdAt: dep.createdAt as number,
    commitSha: dep.meta?.githubCommitSha as string | undefined,
  };
}