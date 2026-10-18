import { useBirthdayStore } from '../store'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import BirthdayPicker from '../components/BirthdayPicker'
import {
  Spinner,
  ErrorBox,
  EmptyState,
  FavoriteStar,
  SafeImage,
  BirthdayStats,
} from '../components/ui'
import type { Birthday, EventItem } from '../types'
import { useQuery } from '@tanstack/react-query'
import { thaiDayQuery, portraitsQuery } from '../lib/queries'
import { parseISODate, toMMDD, formatThaiDate, formatYear } from '../lib/date'

export default function Twins() {
  const [params, setParams] = useSearchParams()

  const savedBirthday = useBirthdayStore((state) => state.birthday)
  const setBirthday = useBirthdayStore((state) => state.setBirthday)
  const [editing, setEditing] = useState(false)
  const dateStr = params.get('d') ?? savedBirthday
  const date = parseISODate(dateStr)
  useEffect(() => {
    if (parseISODate(dateStr) && dateStr !== savedBirthday) setBirthday(dateStr)
  }, [dateStr, savedBirthday, setBirthday])
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="twins-intro">
        <div className="subpage-heading">
          <h1 className="text-3xl font-bold sm:text-4xl">คนเกิดวันเดียวกัน</h1>
        </div>
        {date && !editing && (
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <p className="font-semibold">{formatThaiDate(date)}</p>
            <button className="btn-ghost" onClick={() => setEditing(true)}>
              {'เปลี่ยนวันเกิด'}
            </button>
          </div>
        )}
        {(!date || editing) && (
          <div className="mt-6">
            <BirthdayPicker
              value={dateStr}
              buttonLabel={'หาแฝดวันเกิด'}
              onSubmit={(iso) => {
                setEditing(false)
                setParams({
                  d: iso,
                })
              }}
            />
          </div>
        )}
      </div>
      {!date && (
        <EmptyState title={'ใครเกิดวันเดียวกับคุณบ้าง'}>
          {'เลือกวันเกิดด้านบน เพื่อดูบุคคลที่เกิดวันและเดือนเดียวกัน'}
        </EmptyState>
      )}
      {date && <TwinsResult key={dateStr} date={date} />}
    </div>
  )
}
function TwinsResult({ date }: { date: Birthday }) {
  const mmdd = toMMDD(date.m, date.d)
  const {
    data,
    error,
    isPending: loading,
    refetch: reload,
  } = useQuery({
    ...thaiDayQuery(mmdd),
    select: (day) => day.births,
  })
  const [q, setQ] = useState('')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const favorites = useBirthdayStore((state) => state.favoritePeople)
  const [limit, setLimit] = useState(24)
  // แสดงเฉพาะคนที่มีรูป จึงรอรูปโหลดก่อน
  const titles = (data ?? []).flatMap((item) => (item.pageTitle ? [item.pageTitle] : []))
  const portraits = useQuery(portraitsQuery(mmdd, titles))
  const images = portraits.data
  const people = useMemo(
    () =>
      (data ?? []).flatMap((item) => {
        const thumbnail = item.pageTitle ? images?.[item.pageTitle] : undefined
        return thumbnail
          ? [{ item: { ...item, thumbnail }, name: item.title, job: item.description }]
          : []
      }),
    [data, images],
  )
  const ready = Boolean(data && (images || titles.length === 0))

  // แฝดวันเกิด = คนที่เกิดปีใกล้ผู้ใช้ที่สุด เลือกคนไทยก่อนถ้ามี
  const twin = useMemo(() => {
    let best: { item: EventItem; name: string; job: string; diff: number } | null = null
    const thaiPeople = people.filter((p) => p.item.isThaiRelated)
    for (const p of thaiPeople.length ? thaiPeople : people) {
      const diff = Math.abs((p.item.year ?? date.y) - date.y)
      if (!best || diff < best.diff)
        best = {
          ...p,
          diff,
        }
    }
    return best
  }, [people, date.y])
  const filtered = people.filter(
    (p) =>
      (onlyFavorites || p.item.id !== twin?.item.id) &&
      (!onlyFavorites || favorites.includes(p.item.id)) &&
      (!q ||
        `${p.name} ${p.job} ${p.item.year} ${(p.item.year ?? 0) + 543}`
          .toLowerCase()
          .includes(q.toLowerCase())),
  )
  return (
    <div className="mt-10 space-y-10">
      <BirthdayStats date={date} />

      {(loading || (data && portraits.isLoading)) && <Spinner label={'กำลังค้นหาคนดัง…'} />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {portraits.error && (
        <ErrorBox error={portraits.error} onRetry={() => void portraits.refetch()} />
      )}

      {twin && !onlyFavorites && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">{'แฝดวันเกิดของคุณ'}</h2>
          <div className="relative">
            <FavoriteStar item={twin.item} />
            <Link
              to={`/event/${twin.item.id}`}
              className="card flex flex-col items-center gap-5 border-l-2 border-coral bg-soft p-6 pr-14 transition hover:border-coral sm:flex-row"
            >
              <Avatar item={twin.item} size="h-32 w-32" />
              <div className="text-center sm:text-left">
                <p className="font-display text-3xl font-bold">{twin.name}</p>
                <p className="mt-1 text-muted">{twin.job}</p>
                <p className="mt-3 inline-block rounded-full bg-sun/25 px-3 py-1 font-semibold">
                  {'เกิด '}
                  {formatThaiDate({
                    ...date,
                    y: twin.item.year,
                  })}
                  {twin.diff === 0 ? ' — ปีเดียวกับคุณ' : ` — ห่างจากคุณ ${twin.diff} ปี`}
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}

      {ready && (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold">
              {onlyFavorites ? 'คนโปรดที่เกิดวันที่ ' : 'บุคคลอื่นที่เกิดวันที่ '}
              {formatThaiDate({
                m: date.m,
                d: date.d,
              })}{' '}
              <span className="text-base font-normal text-muted">
                ({filtered.length}
                {'คน)'}
              </span>
            </h2>
            <button
              className="btn-ghost"
              aria-pressed={onlyFavorites}
              onClick={() => {
                setOnlyFavorites((value) => !value)
                setLimit(24)
              }}
            >
              {'รายการโปรด'} ★
            </button>
            <input
              type="search"
              className="input w-full sm:w-72"
              placeholder={'ค้นหาชื่อ อาชีพ หรือปี…'}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title={
                onlyFavorites
                  ? 'ยังไม่มีคนโปรดในวันนี้'
                  : q
                    ? 'ไม่พบบุคคลที่ตรงกับคำค้นหา'
                    : 'ไม่มีบุคคลอื่นที่มีรูปในวันนี้'
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.slice(0, limit).map((p) => (
                <article key={p.item.id} className="card relative">
                  <FavoriteStar item={p.item} />
                  <Link
                    to={`/event/${p.item.id}`}
                    className="flex flex-col items-center p-4 pt-12 text-center transition  hover:border-coral"
                  >
                    <Avatar item={p.item} size="h-20 w-20" />
                    <p className="mt-3 line-clamp-2 font-display font-semibold">{p.name}</p>
                    <p className="text-sm font-semibold text-coral">
                      {p.item.year !== null && formatYear(p.item.year)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{p.job}</p>
                  </Link>
                </article>
              ))}
            </div>
          )}
          {filtered.length > limit && (
            <div className="mt-8 text-center">
              <button className="btn-ghost" onClick={() => setLimit((l) => l + 24)}>
                {'ดูเพิ่มเติม ('}
                {filtered.length - limit})
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
function Avatar({ item, size }: { item: EventItem; size: string }) {
  // ถ้ารูปแรกไม่ขึ้น ลองรูปอีกขนาด
  const thumb = item.thumbnail
  return (
    <div
      className={`img-placeholder ${size} shrink-0 overflow-hidden rounded-full border-2 border-ink`}
    >
      <SafeImage
        sources={[thumb, thumb?.replace(/\/\d+px-/, '/330px-')]}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover object-top"
        fallback={
          // ไม่มีรูปแสดงไอคอนคนแทน
          <svg viewBox="0 0 40 40" className="h-full w-full text-muted" aria-hidden="true">
            <circle cx="20" cy="15" r="7" fill="currentColor" opacity="0.45" />
            <path d="M6 38c1.5-8 7-12 14-12s12.5 4 14 12z" fill="currentColor" opacity="0.45" />
          </svg>
        }
      />
    </div>
  )
}
