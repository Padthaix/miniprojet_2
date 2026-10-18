import { Link } from 'react-router-dom'
import type { Birthday, EventItem } from '../types'
import { useState, type ReactNode } from 'react'
import { useBirthdayStore } from '../store'
import {
  formatYear,
  formatNumber,
  formatThaiDate,
  daysUntilBirthday,
  ageInDays,
  ageInYears,
} from '../lib/date'

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="card min-w-0 p-3 text-center sm:p-5">
      <div className={`font-display text-2xl font-bold sm:text-4xl ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-muted sm:text-sm">{label}</div>
    </div>
  )
}
/** อีกกี่วันถึงวันเกิด, เกิดมาแล้วกี่วัน และอายุ (นับจากวันนี้ตามเวลาเครื่องผู้ใช้) */
export function BirthdayStats({ date }: { date: Birthday }) {
  const until = daysUntilBirthday(date)
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <Stat
        value={formatNumber(until)}
        label={until === 0 ? 'วันนี้คือวันเกิดของคุณ!' : 'วันถึงวันเกิดครั้งถัดไป'}
        color="text-coral"
      />
      <Stat
        value={formatNumber(ageInDays(date))}
        label="วันที่คุณมีชีวิตอยู่บนโลกนี้"
        color="text-plum"
      />
      <Stat
        value={ageInYears(date)}
        label={`ปี · เกิดวันที่ ${formatThaiDate(date)}`}
        color="text-mint"
      />
    </div>
  )
}

/** แสดงรูปแรกที่โหลดได้ ถ้าโหลดไม่ได้เลยแสดง fallback */
export function SafeImage({
  sources,
  fallback,
  ...props
}: {
  sources: (string | null | undefined)[]
  fallback: ReactNode
  onExhausted?: () => void
  alt: string
  className?: string
  crossOrigin?: 'anonymous'
  loading?: 'lazy'
}) {
  const { onExhausted, ...imgProps } = props
  const urls = sources.filter((url): url is string => Boolean(url))
  const [failed, setFailed] = useState<string[]>([])
  const src = urls.find((url) => !failed.includes(url))
  if (!src) return <>{fallback}</>
  const fail = () => {
    setFailed((list) => [...list, src])
    if (urls.every((url) => url === src || failed.includes(url))) onExhausted?.()
  }
  return <img key={src} src={src} onError={fail} {...imgProps} />
}
export function LoadingGrid() {
  return (
    <div aria-busy="true">
      <Spinner />
    </div>
  )
}
export function Spinner({ label = 'กำลังโหลด…' }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted" role="status">
      <span className="h-6 w-6 animate-spin rounded-full border-3 border-line border-t-coral" />
      {label}
    </div>
  )
}
function StateMark() {
  return (
    <svg className="state-symbol" viewBox="0 0 28 32" fill="none" aria-hidden="true">
      <path
        d="M4 2h14l6 6v22H4V2ZM18 2v7h6M9 15h10M9 20h10M9 25h6"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}
export function ErrorBox({
  error,
  onRetry,
  children,
}: {
  error: Error | null
  onRetry?: (() => void) | null
  children?: ReactNode
}) {
  return (
    <div className="state-panel" role="alert">
      <StateMark />
      <h3>โหลดข้อมูลไม่สำเร็จ</h3>
      <p className="state-copy">{error?.message || 'ลองตรวจสอบการเชื่อมต่อ แล้วลองอีกครั้ง'}</p>
      {children}
      {onRetry && (
        <button className="btn-primary mt-5" onClick={onRetry}>
          ลองใหม่
        </button>
      )}
    </div>
  )
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-panel">
      <StateMark />
      <h3>{title}</h3>
      {children && <div className="state-copy">{children}</div>}
    </div>
  )
}

const sources = {
  t: 'วิกิพีเดียไทย',
  b: 'คนเกิดวันเดียวกัน',
}
const yearLabel = (item: EventItem) => (item.year === null ? 'วันสำคัญ' : formatYear(item.year))
export function EventCard({ item }: { item: EventItem }) {
  const href = `/event/${item.id}`
  return (
    <article className="event-card relative">
      <FavoriteStar item={item} />
      {/* การ์ดเหตุการณ์ไม่มีรูป */}
      {item.kind === 'b' && (
        <Link to={href} className="event-image" tabIndex={-1} aria-hidden="true">
          <SafeImage
            sources={[item.thumbnail]}
            alt=""
            loading="lazy"
            fallback={
              <div className="event-no-image">
                <strong>{yearLabel(item)}</strong>
                <span>วิกิพีเดียไทย</span>
              </div>
            }
          />
        </Link>
      )}

      <div className={`event-meta ${item.kind === 'b' ? '' : 'pr-12'}`}>
        <b>{yearLabel(item)}</b>
        <span>{sources[item.kind]}</span>
      </div>
      <h3 className="event-title line-clamp-3">
        <Link to={href}>{item.title}</Link>
      </h3>
      {item.kind === 'b' && item.description && (
        <p className="event-excerpt line-clamp-3">{item.description}</p>
      )}
    </article>
  )
}

export function FavoriteStar({ item }: { item: EventItem }) {
  const selected = useBirthdayStore((state) =>
    (item.kind === 'b' ? state.favoritePeople : state.favoriteEvents).includes(item.id),
  )
  const toggle = useBirthdayStore((state) =>
    item.kind === 'b' ? state.toggleFavorite : state.toggleEventFavorite,
  )
  const label = `${selected ? 'เลิกบันทึก' : 'บันทึก'} ${item.title}`
  return (
    <button
      type="button"
      className="favorite-star"
      data-html2canvas-ignore
      aria-label={label}
      title={label}
      aria-pressed={selected}
      onClick={() => toggle(item.id)}
    >
      <span aria-hidden="true">{selected ? '★' : '☆'}</span>
    </button>
  )
}
