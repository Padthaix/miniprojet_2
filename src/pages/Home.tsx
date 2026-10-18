import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { thaiDayQuery } from '../lib/queries'
import { LoadingGrid, ErrorBox, EmptyState, FavoriteStar, BirthdayStats } from '../components/ui'
import BirthdayPicker from '../components/BirthdayPicker'
import { useBirthdayStore } from '../store'
import type { Birthday } from '../types'
import { parseISODate, formatThaiDate, weekdayThai, toMMDD } from '../lib/date'

export default function Home() {
  const [params, setParams] = useSearchParams()
  const savedBirthday = useBirthdayStore((state) => state.birthday)
  const setBirthday = useBirthdayStore((state) => state.setBirthday)
  const dateStr = params.get('d') ?? savedBirthday
  const date = parseISODate(dateStr)
  useEffect(() => {
    if (parseISODate(dateStr) && dateStr !== savedBirthday) setBirthday(dateStr)
  }, [dateStr, savedBirthday, setBirthday])
  return (
    <div className="page-shell">
      <section className={`explore-hero ${date ? 'has-results' : ''}`}>
        <h1 className="hero-title">
          ในวันเกิดของคุณ
          <br />
          <em>เกิดอะไรขึ้นบ้าง?</em>
        </h1>
        <div className="birthday-sheet">
          <div className="sheet-heading">
            <h2>{'เริ่มจากวันเกิดของคุณ'}</h2>
          </div>
          <BirthdayPicker value={dateStr} onSubmit={(iso) => setParams({ d: iso })} />
        </div>
      </section>
      {date && (
        <section className="results-section">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                {weekdayThai(date)} · {formatThaiDate(date)}
              </h2>
            </div>
            <Link
              className="text-sm text-coral underline underline-offset-4"
              to={`/twins?d=${dateStr}`}
            >
              {'ดูคนดังที่เกิดวันเดียวกัน →'}
            </Link>
          </div>
          <div className="mt-6">
            <BirthdayStats date={date} />
          </div>
          <Timeline key={dateStr} date={date} />
        </section>
      )}
    </div>
  )
}

function Timeline({ date }: { date: Birthday }) {
  const mmdd = toMMDD(date.m, date.d)
  const { data, error, isPending, refetch } = useQuery({
    ...thaiDayQuery(mmdd),
    select: (day) => day.events,
  })
  const [filter, setFilter] = useState<'all' | 'thai' | 'other' | 'saved'>('all')
  const [limit, setLimit] = useState(12)
  const favorites = useBirthdayStore((state) => state.favoriteEvents)
  const items = (data ?? []).filter(
    (item) =>
      filter === 'all' ||
      (filter === 'saved'
        ? favorites.includes(item.id)
        : filter === 'thai'
          ? item.isThaiRelated
          : !item.isThaiRelated),
  )

  if (isPending)
    return (
      <div className="mt-8">
        <LoadingGrid />
      </div>
    )
  if (error)
    return (
      <div className="mt-8">
        <ErrorBox
          error={error}
          onRetry={() => {
            void refetch()
          }}
        />
      </div>
    )
  return (
    <div className="py-7">
      <div className="timeline-header">
        <h3 className="text-xl font-semibold">{'เส้นเวลาในวันของคุณ'}</h3>
        <div className="timeline-filters" role="group" aria-label={'กรองเหตุการณ์'}>
          {(
            [
              ['all', 'ทั้งหมด'],
              ['thai', 'ข่าวในไทย'],
              ['other', 'ข่าวต่างประเทศ'],
              ['saved', 'ที่บันทึกไว้'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value)
                setLimit(12)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {items.length ? (
        <ol className="birthday-timeline" aria-label={'เส้นเวลาเหตุการณ์'}>
          {items.slice(0, limit).map((item) => (
            <li key={item.id} className={`timeline-entry ${item.isThaiRelated ? 'is-thai' : ''}`}>
              <div className="timeline-date">
                {item.year === null ? (
                  <strong>{'ทุกปี'}</strong>
                ) : (
                  <>
                    <strong>{item.year > 0 ? item.year + 543 : 1 - item.year}</strong>
                    <span>{item.year > 0 ? 'พ.ศ.' : 'ปีก่อน ค.ศ.'}</span>
                    {item.year > 0 && <small>ค.ศ. {item.year}</small>}
                  </>
                )}
              </div>
              <article className="timeline-story relative">
                <FavoriteStar item={item} />
                <h4 className="pr-8">
                  <Link to={`/event/${item.id}`}>{item.title}</Link>
                </h4>
                <div className="timeline-source">
                  <Link to={`/event/${item.id}`} aria-label={`อ่านรายละเอียด: ${item.title}`}>
                    {'อ่านรายละเอียด →'}
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          title={
            filter === 'saved'
              ? 'ยังไม่มีเหตุการณ์ที่บันทึกในวันนี้'
              : 'ไม่พบเหตุการณ์ที่ตรงกับตัวกรอง'
          }
        />
      )}
      {items.length > limit && (
        <button className="btn-ghost mt-6" onClick={() => setLimit((value) => value + 12)}>
          {'ดูเพิ่มเติม ('}
          {items.length - limit})
        </button>
      )}
    </div>
  )
}
