import type { PageSummary, ThaiDay } from '../types'
import { parseThaiDay } from './thaiWiki'
import { THAI_MONTHS } from './date'
/**
 * ชั้นเรียก API ทั้งหมดของแอป (วิกิพีเดียไทย ไม่ต้องใช้ key)
 * - MediaWiki Action API (action=parse): หน้าวันที่ เช่น "12 สิงหาคม"
 * - Wikimedia REST API (page/summary): บทคัดย่อและรูปของบทความ
 * ไฟล์นี้เรียก API อย่างเดียว ส่วน cache อยู่ใน queries.ts
 */

const WIKI = 'https://th.wikipedia.org'

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message)
  }
}

async function getJSON<T>(url: string): Promise<T> {
  let res
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    })
  } catch {
    throw new ApiError('เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง', 'NETWORK')
  }
  if (res.status === 429) {
    throw new ApiError(
      'เรียกข้อมูลถี่เกินไป (API จำกัดจำนวนครั้ง) รอสักครู่แล้วลองใหม่',
      'RATE_LIMIT',
    )
  }
  if (res.status === 404) throw new ApiError('ไม่พบข้อมูล', 'NOT_FOUND')
  if (!res.ok) throw new ApiError(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})`, 'HTTP')
  return res.json()
}

/** mmdd: "0812" -> เหตุการณ์ วันสำคัญ และบุคคลที่เกิดจากหน้า "12 สิงหาคม" */
export async function getThaiDay(mmdd: string): Promise<ThaiDay> {
  const m = Number(mmdd.slice(0, 2)),
    d = Number(mmdd.slice(2))
  if (!/^\d{4}$/.test(mmdd) || m < 1 || m > 12 || d < 1 || d > new Date(2000, m, 0).getDate())
    return Promise.reject(new ApiError('ลิงก์ไม่ถูกต้อง', 'NOT_FOUND'))
  const title = d + ' ' + THAI_MONTHS[m - 1]

  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'text',
    format: 'json',
    formatversion: '2',
    origin: '*',
    redirects: '1',
  })
  const data = await getJSON<{ error?: unknown; parse?: { text?: string } }>(
    `${WIKI}/w/api.php?${params}`,
  )
  if (data.error || typeof data.parse?.text !== 'string')
    throw new ApiError('ไม่สามารถอ่านข้อมูลวันที่นี้จากวิกิพีเดียไทยได้', 'THAI_WIKI')
  return parseThaiDay(data.parse.text, mmdd, title)
}

export async function getPageSummary(title: string): Promise<PageSummary> {
  const s = await getJSON<WikiPage>(`${WIKI}/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
  return {
    title: s.title ?? title,
    description: s.description ?? '',
    extract: s.extract ?? '',
    images: summaryImages(s),
    url: s.content_urls?.desktop?.page ?? null,
  }
}

// รูปต้นฉบับขนาดเต็มมักโหลดไม่ขึ้น (429) จึงลองรูปย่อ 500px ก่อน
function summaryImages({ thumbnail, originalimage }: WikiPage) {
  const larger = thumbnail?.source.replace(/\/\d+px-/, '/500px-')
  const urls = [larger, thumbnail?.source, originalimage?.source]
  return [...new Set(urls.filter((url): url is string => Boolean(url)))]
}

/** รูปย่อของหลายบทความ -> { ชื่อบทความตามที่ขอ: url รูป } (บทความที่ไม่มีรูปจะไม่อยู่ในผลลัพธ์) */
export async function getPageImages(titles: string[]): Promise<Record<string, string>> {
  const chunks: string[][] = []
  for (let i = 0; i < titles.length; i += 50) chunks.push(titles.slice(i, i + 50)) // API limit
  const results = await Promise.all(
    chunks.map((chunk) =>
      getJSON<{ query?: PageImagesQuery }>(
        `${WIKI}/w/api.php?` +
          new URLSearchParams({
            action: 'query',
            prop: 'pageimages',
            titles: chunk.join('|'),
            pithumbsize: '240',
            pilimit: '50',
            format: 'json',
            formatversion: '2',
            origin: '*',
            redirects: '1',
          }),
      ),
    ),
  )
  const images: Record<string, string> = {}
  for (const { query } of results) {
    if (!query?.pages) continue
    // ชื่อที่ API เปลี่ยนให้ (redirect) แปลงกลับเป็นชื่อที่ขอ
    const renamed = new Map<string, string>()
    for (const { from, to } of [...(query.normalized ?? []), ...(query.redirects ?? [])])
      renamed.set(to, renamed.get(from) ?? from)
    for (const page of query.pages)
      if (page.thumbnail) images[renamed.get(page.title) ?? page.title] = page.thumbnail.source
  }
  return images
}

// รูปแบบข้อมูลที่ API ส่งกลับมา
interface PageImagesQuery {
  pages?: { title: string; thumbnail?: { source: string } }[]
  normalized?: { from: string; to: string }[]
  redirects?: { from: string; to: string }[]
}
interface WikiPage {
  title?: string
  description?: string
  extract?: string
  thumbnail?: { source: string }
  originalimage?: { source: string }
  content_urls?: { desktop?: { page: string } }
}
