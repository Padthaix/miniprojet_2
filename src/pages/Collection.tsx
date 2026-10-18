import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useBirthdayStore } from '../store'
import { thaiDayQuery } from '../lib/queries'
import { formatThaiDate } from '../lib/date'
import { EmptyState, ErrorBox, EventCard, LoadingGrid } from '../components/ui'

// Zustand เก็บแค่รหัส ข้อมูลจริงดึงผ่าน TanStack Query
const dayOf = (id: string) => id.split('-')[1]

export default function Collection() {
  const favoriteEvents = useBirthdayStore((state) => state.favoriteEvents)
  const favoritePeople = useBirthdayStore((state) => state.favoritePeople)
  const saved = [...favoriteEvents, ...favoritePeople]
  const days = [...new Set(saved.map(dayOf))].sort()
  const results = useQueries({ queries: days.map((mmdd) => thaiDayQuery(mmdd)) })

  const total = saved.length
  const failed = results.filter((result) => result.error)
  const groups = days.map((mmdd, i) => {
    const day = results[i].data
    const items = day
      ? [...day.events, ...day.births].filter((item) => saved.includes(item.id))
      : []
    return { mmdd, items, isPending: results[i].isPending }
  })
  const missing = results.every((result) => result.data)
    ? total - groups.reduce((sum, group) => sum + group.items.length, 0)
    : 0

  return (
    <div className="page-shell py-10">
      <header className="subpage-heading">
        <h1>รายการที่บันทึก</h1>
        <p>
          เหตุการณ์ {favoriteEvents.length} รายการ · บุคคล {favoritePeople.length} คน
          กดดาวอีกครั้งเพื่อนำออกจากรายการ
        </p>
      </header>

      {total === 0 && (
        <EmptyState title="ยังไม่มีรายการที่บันทึก">
          กดดาว ☆ ที่เหตุการณ์หรือบุคคลเพื่อเก็บไว้ที่นี่{' '}
          <Link to="/" className="text-coral underline">
            เริ่มจากวันเกิดของคุณ
          </Link>
        </EmptyState>
      )}

      {failed.length > 0 && (
        <div className="mt-8">
          <ErrorBox
            error={failed[0].error}
            onRetry={() => failed.forEach((result) => void result.refetch())}
          />
        </div>
      )}

      {groups.map(({ mmdd, items, isPending }) =>
        isPending ? (
          <div key={mmdd} className="mt-8">
            <LoadingGrid />
          </div>
        ) : items.length > 0 ? (
          <section key={mmdd} className="mt-10">
            <h2 className="mb-4 text-2xl font-bold">
              {formatThaiDate({ m: +mmdd.slice(0, 2), d: +mmdd.slice(2) })}
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <EventCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      {missing > 0 && (
        <p className="mt-8 text-sm text-muted">
          มี {missing} รายการที่ไม่พบในข้อมูลล่าสุดของวิกิพีเดียไทย
          (ข้อความต้นทางอาจถูกแก้ไขหรือลบไปแล้ว)
        </p>
      )}
    </div>
  )
}
