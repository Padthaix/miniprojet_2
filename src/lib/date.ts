import type { Birthday } from '../types'
export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]
const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

export const MIN_YEAR = 1900

const pad = (n: number) => String(n).padStart(2, '0')

export function daysInMonth(year: number, month: number) {
  return new Date(year || 2000, month, 0).getDate()
}

/** "YYYY-MM-DD" -> { y, m, d } หรือ null ถ้าวันที่ไม่ถูกต้อง */
export function parseISODate(str: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str || '')
  if (!match) return null
  const [y, m, d] = match.slice(1).map(Number)
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null
  return { y, m, d }
}

export const toISODate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`
export const toMMDD = (m: number, d: number) => `${pad(m)}${pad(d)}`

/** 2000 -> "พ.ศ. 2543", -50 -> "51 ปีก่อน ค.ศ." */
export function formatYear(year: number) {
  return year > 0 ? `พ.ศ. ${year + 543}` : `${1 - year} ปีก่อน ค.ศ.`
}

export function formatThaiDate({ y, m, d }: { y?: number | null; m: number; d: number }) {
  const month = THAI_MONTHS[m - 1]
  return y ? `${d} ${month} ${formatYear(y)}` : `${d} ${month}`
}

export function weekdayThai({ y, m, d }: Birthday) {
  return THAI_WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const DAY_MS = 24 * 60 * 60 * 1000

/** วันเกิดครั้งถัดไป (29 ก.พ. ในปีที่ไม่ใช่อธิกสุรทินจะนับเป็น 28 ก.พ.) */
function birthdayInYear(year: number, m: number, d: number) {
  const day = Math.min(d, daysInMonth(year, m))
  return new Date(year, m - 1, day)
}

export function daysUntilBirthday({ m, d }: Pick<Birthday, 'm' | 'd'>) {
  const today = startOfToday()
  let next = birthdayInYear(today.getFullYear(), m, d)
  if (next < today) next = birthdayInYear(today.getFullYear() + 1, m, d)
  return Math.round((next.getTime() - today.getTime()) / DAY_MS)
}

export function ageInDays({ y, m, d }: Birthday) {
  return Math.round((startOfToday().getTime() - new Date(y, m - 1, d).getTime()) / DAY_MS)
}

export function ageInYears({ y, m, d }: Birthday) {
  const today = startOfToday()
  let age = today.getFullYear() - y
  if (today < birthdayInYear(today.getFullYear(), m, d)) age -= 1
  return age
}

export function isFuture({ y, m, d }: Birthday) {
  return new Date(y, m - 1, d) > startOfToday()
}

export const formatNumber = (n: number) => n.toLocaleString('th-TH')
