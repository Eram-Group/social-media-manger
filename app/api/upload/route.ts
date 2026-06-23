import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

// POST /api/upload  (multipart: file)
// Stores an uploaded image/video in Vercel Blob and returns a PUBLIC url.
// Instagram requires a public URL to publish media; this provides it (and it
// makes Facebook posting more robust too).
export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Image hosting is not configured. Add a Vercel Blob store and set BLOB_READ_WRITE_TOKEN.' },
      { status: 500 },
    );
  }
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    const name = (file as File).name || 'upload';
    const ext = name.includes('.') ? name.split('.').pop() : (file.type.startsWith('video') ? 'mp4' : 'jpg');
    const key = `posts/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    // Pass the token explicitly so the SDK uses token auth (the project has OIDC
    // enabled, which isn't available in the local development environment).
    const blob = await put(key, file, {
      access: 'public',
      contentType: file.type || undefined,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return NextResponse.json({ ok: true, url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
