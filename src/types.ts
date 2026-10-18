// ชนิดข้อมูลที่ใช้ร่วมกัน
export type Birthday = { y: number; m: number; d: number }
export interface EventItem {
  id: string
  kind: 't' | 'b' // 't' = เหตุการณ์/วันสำคัญ, 'b' = บุคคลที่เกิดวันนี้
  source: string
  year: number | null
  title: string
  text: string
  description: string
  extract: string
  thumbnail: string | null
  image: string | null
  url: string | null
  mmdd: string
  pageTitle?: string | null
  sourceUrl?: string
  isHoliday?: boolean
  isThaiRelated?: boolean
}
// หน้าวันที่หนึ่งหน้าให้ทั้งเหตุการณ์และบุคคล
export interface ThaiDay {
  events: EventItem[]
  births: EventItem[]
}
export interface PageSummary {
  title: string
  description: string
  extract: string
  images: string[] // candidate URLs, best first; try the next one when an image fails to load
  url: string | null
}
export interface DetailData {
  item: EventItem
  siblings: EventItem[]
  summary: PageSummary | null
}
