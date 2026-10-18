import { useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { EventCard, FavoriteStar, SafeImage } from '../components/ui'
import { Spinner, ErrorBox } from '../components/ui'
import { ApiError } from '../lib/api'
import type { EventItem, DetailData } from '../types'
import { useQuery } from '@tanstack/react-query'
import { detailQuery, portraitsQuery } from '../lib/queries'
import { formatThaiDate, formatYear } from '../lib/date'
const KIND_LABEL = {
  t: 'เหตุการณ์จากวิกิพีเดียไทย',
  b: 'บุคคลที่เกิดวันนี้',
}
function dayLabel(item: EventItem) {
  const day = formatThaiDate({
    y: item.year,
    m: +item.mmdd.slice(0, 2),
    d: +item.mmdd.slice(2),
  })
  if (item.year === null) return `${day} · ทุกปี`
  return item.year > 0 ? `${day} (ค.ศ. ${item.year})` : day
}
export default function Detail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, error, isPending: loading, refetch: reload } = useQuery(detailQuery(id ?? ''))
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <button onClick={goBack} className="btn-ghost mb-5">
        ← กลับ
      </button>
      {loading && <Spinner />}
      {error && (
        <ErrorBox
          error={error}
          onRetry={error instanceof ApiError && error.code === 'NOT_FOUND' ? null : reload}
        />
      )}
      {data && <DetailBody key={id} {...data} />}
    </div>
  )
}
function DetailBody({ item, siblings, summary }: DetailData) {
  const cardRef = useRef<HTMLElement>(null)
  const [toast, setToast] = useState('')
  const [busy, setBusy] = useState(false)

  const yearText = item.year === null ? 'วันสำคัญ' : formatYear(item.year)
  const imageSources = [...(summary?.images ?? []), item.image].filter(Boolean)
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = imageSources.length > 0 && !imageFailed
  function flash(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      flash('คัดลอกลิงก์แล้ว')
    } catch {
      flash('คัดลอกไม่สำเร็จ ลองคัดลอกจากแถบที่อยู่แทน')
    }
  }
  async function downloadImage() {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: '#f7f5ef',
        scale: 2,
      })
      const link = document.createElement('a')
      link.download = `birthday-${item.id}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      flash('ดาวน์โหลดรูปการ์ดแล้ว')
    } catch {
      flash('สร้างรูปไม่สำเร็จ')
    } finally {
      setBusy(false)
    }
  }

  // บุคคลอื่นแสดงเฉพาะคนที่มีรูป เหมือนหน้า Twins
  const isPerson = item.kind === 'b'
  const titles = isPerson ? siblings.flatMap((s) => (s.pageTitle ? [s.pageTitle] : [])) : []
  const { data: images } = useQuery(portraitsQuery(item.mmdd, titles))
  const pool = isPerson
    ? siblings.flatMap((s) => {
        const thumbnail = (s.pageTitle && images?.[s.pageTitle]) || null
        return thumbnail || s.id === item.id ? [{ ...s, thumbnail }] : []
      })
    : siblings

  // รายการอื่นในวันเดียวกัน: เลือกที่อยู่ใกล้รายการนี้ในลิสต์
  const index = pool.findIndex((x) => x.id === item.id)
  const others = pool
    .slice(Math.max(0, index - 3), index + 4)
    .filter((other) => other.id !== item.id)
    .slice(0, 6)
  return (
    <>
      {/* การ์ดหลัก (ใช้สร้างรูปสำหรับแชร์ด้วย) */}
      <article ref={cardRef} className="card overflow-hidden relative">
        <FavoriteStar item={item} />
        <div className="rainbow-bar h-2" />
        {/* ไม่มีรูปก็ไม่ต้องเว้นช่องรูป */}
        <div className={`grid gap-6 p-5 sm:p-8 ${showImage ? 'md:grid-cols-[2fr_3fr]' : ''}`}>
          {showImage && (
            <div className="img-placeholder self-start overflow-hidden rounded-xl">
              <SafeImage
                sources={imageSources}
                alt={item.title}
                crossOrigin="anonymous"
                className="h-full max-h-[420px] w-full object-cover"
                onExhausted={() => setImageFailed(true)}
                fallback={null}
              />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-muted">{KIND_LABEL[item.kind]}</p>
            <p className="mt-1 font-display text-4xl font-bold text-coral">{yearText}</p>
            <p className="text-sm text-muted">{dayLabel(item)}</p>
            <h1 className="mt-3 text-2xl leading-snug font-bold sm:text-3xl">{item.title}</h1>
            {(summary?.description || item.description) && (
              <p className="mt-2 inline-block rounded-full bg-soft px-3 py-1 text-sm">
                {item.kind === 'b' ? item.description || summary?.description : item.description}
              </p>
            )}

            <div className="mt-4 space-y-3 leading-relaxed">
              {summary?.title && item.kind === 't' && (
                <h2 className="font-display text-lg font-semibold text-plum">
                  เกี่ยวกับ: {summary.title}
                </h2>
              )}
              <p className="text-muted">
                {summary?.extract || item.extract || 'ไม่มีคำอธิบายเพิ่มเติม'}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2" data-html2canvas-ignore>
              <button onClick={copyLink} className="btn-ghost">
                คัดลอกลิงก์
              </button>
              <button onClick={downloadImage} disabled={busy} className="btn-ghost">
                {busy ? 'กำลังสร้างรูป…' : 'ดาวน์โหลดเป็นรูปการ์ด'}
              </button>
              {(summary?.url || item.url) && (
                <a
                  href={summary?.url || item.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost"
                >
                  อ่านต่อบนวิกิพีเดีย
                </a>
              )}
            </div>
            {item.sourceUrl && (
              <p className="mt-5 text-sm">
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-coral underline"
                >
                  ดูหน้าวันที่และแหล่งอ้างอิงบนวิกิพีเดียไทย ↗
                </a>
              </p>
            )}
            <p className="mt-6 text-xs text-muted">วันเกิดของคุณ · ข้อมูลจากวิกิพีเดียไทย</p>
          </div>
        </div>
      </article>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-2 text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}

      {others.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-bold">
              {item.kind === 'b' ? 'บุคคลอื่นที่เกิดวันเดียวกัน' : 'เหตุการณ์อื่นในวันเดียวกัน'}
            </h2>
            {item.kind === 'b' && (
              <Link to="/twins" className="text-coral hover:underline">
                ดูทั้งหมด →
              </Link>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((x) => (
              <EventCard key={x.id} item={x} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
