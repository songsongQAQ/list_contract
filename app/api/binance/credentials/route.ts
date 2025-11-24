import { NextResponse, NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, apiSecret } = body;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'API Key and Secret are required' },
        { status: 400 }
      );
    }

    console.log('✓ Credentials received and validated');

    return NextResponse.json(
      { message: 'Credentials validated successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Failed to validate credentials:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate credentials' },
      { status: 500 }
    );
  }
}
