import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy so Canvas API tokens never leave the server
// and CORS is not an issue.

function isValidCanvasUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

async function fetchAllPages(url: string, token: string): Promise<unknown[]> {
  const results: unknown[] = [];
  let nextUrl: string | null = url;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Canvas API fejl: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as unknown[];
    results.push(...data);

    // Follow Canvas pagination via Link header
    const link = res.headers.get('link') ?? '';
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }

  return results;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const baseUrl = searchParams.get('baseUrl');
  const token = searchParams.get('token');
  const endpoint = searchParams.get('endpoint');

  if (!baseUrl || !token || !endpoint) {
    return NextResponse.json({ error: 'Mangler baseUrl, token eller endpoint' }, { status: 400 });
  }

  if (!isValidCanvasUrl(baseUrl)) {
    return NextResponse.json({ error: 'Ugyldig Canvas URL' }, { status: 400 });
  }

  // Whitelist allowed endpoints to prevent abuse
  const allowed = [
    /^courses$/,
    /^courses\/\d+\/assignments$/,
    /^courses\/\d+\/files$/,
    /^courses\/\d+\/modules$/,
  ];
  if (!allowed.some((pattern) => pattern.test(endpoint))) {
    return NextResponse.json({ error: 'Endpoint ikke tilladt' }, { status: 403 });
  }

  try {
    const isModules = /^courses\/\d+\/modules$/.test(endpoint);
    const extra = isModules ? '&include[]=items' : '';
    const url = `${baseUrl}/api/v1/${endpoint}?per_page=100${extra}`;
    const data = await fetchAllPages(url, token);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ukendt fejl';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
