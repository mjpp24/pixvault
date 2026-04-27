import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'gallery-media'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  let partPaths: string[], targetPath: string, contentType: string
  try {
    ;({ partPaths, targetPath, contentType } = await req.json())
    if (!Array.isArray(partPaths) || !targetPath) throw new Error('bad params')
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    // Download all parts concurrently (server ↔ Supabase — same datacenter, very fast)
    const buffers = await Promise.all(
      partPaths.map(async (path) => {
        const { data, error } = await supabase.storage.from(BUCKET).download(path)
        if (error || !data) throw new Error(`Failed to download part: ${path}`)
        return Buffer.from(await data.arrayBuffer())
      })
    )

    const merged = Buffer.concat(buffers)

    // Upload merged file
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(
      targetPath,
      merged,
      { contentType: contentType || 'application/octet-stream', upsert: true }
    )
    if (upErr) throw upErr

    // Delete part files (fire and forget — don't block the response)
    supabase.storage.from(BUCKET).remove(partPaths).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Merge failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
