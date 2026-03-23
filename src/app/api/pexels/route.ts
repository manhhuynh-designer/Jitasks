import { NextResponse } from 'next/server'

export async function GET() {
  const pexelKey = process.env.PEXEL_KEY

  if (!pexelKey) {
    return NextResponse.json({ error: 'PEXEL_KEY not found' }, { status: 500 })
  }

  try {
    // Fetch 80 nature/landscape photos for more variety
    const response = await fetch(
      'https://api.pexels.com/v1/search?query=nature+landscape&per_page=80&orientation=landscape',
      {
        headers: {
          Authorization: pexelKey,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`)
    }

    const data = await response.json()
    const photos = data.photos.map((p: any) => p.src.large2x || p.src.original)

    return NextResponse.json({ photos })
  } catch (error: any) {
    console.error('Error fetching Pexels images:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
