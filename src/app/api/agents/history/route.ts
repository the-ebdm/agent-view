import { NextResponse } from 'next/server';
import { sessionManager } from '@/lib/agent-session-manager';

export async function GET() {
  const history = sessionManager.getHistory();
  return NextResponse.json({ history });
}
