import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { THAI_MONTHS, MIN_YEAR, daysInMonth, parseISODate, toISODate, isFuture } from '../lib/date'
const THIS_YEAR = new Date().getFullYear()
const YEARS = Array.from(
  {
    length: THIS_YEAR - MIN_YEAR + 1,
  },
  (_, i) => THIS_YEAR - i,
)

/** ช่องเลือก วัน / เดือน / ปี + ปุ่มยืนยัน */
export default function BirthdayPicker({
  value,
  onSubmit,
  buttonLabel = 'ค้นเรื่องราวของวันนี้',
}: {
  value: string
  onSubmit: (value: string) => void
  buttonLabel?: string
}) {
  const initial = parseISODate(value)
  const [d, setD] = useState<number | ''>(initial?.d ?? '')
  const [m, setM] = useState(initial?.m ?? '')
  const [y, setY] = useState(initial?.y ?? '')
  const [error, setError] = useState('')
  useEffect(() => {
    const p = parseISODate(value)
    if (p) {
      setD(p.d)
      setM(p.m)
      setY(p.y)
    } else {
      setD('')
      setM('')
      setY('')
    }
  }, [value])
  const maxDay = m ? daysInMonth(Number(y) || 2000, Number(m)) : 31

  // ถ้าเปลี่ยนเดือน/ปีแล้ววันเกินจำนวนวันของเดือน ให้ปรับลง
  useEffect(() => {
    if (d && d > maxDay) setD(maxDay)
  }, [d, maxDay])
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!d || !m || !y) {
      setError('กรุณาเลือกวัน เดือน และปีเกิดให้ครบ')
      return
    }
    const date = {
      y: Number(y),
      m: Number(m),
      d: Number(d),
    }
    if (isFuture(date)) {
      setError('วันเกิดต้องไม่เป็นวันในอนาคต')
      return
    }
    setError('')
    onSubmit(toISODate(date.y, date.m, date.d))
  }
  return (
    <form onSubmit={handleSubmit} className="birthday-picker">
      <div className="picker-fields">
        <label>
          {'วัน'}
          <select
            className="input"
            value={d}
            onChange={(e) => setD(Number(e.target.value))}
            aria-label={'วันเกิด'}
          >
            <option value="">{'วัน'}</option>
            {Array.from(
              {
                length: maxDay,
              },
              (_, i) => i + 1,
            ).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          {'เดือน'}
          <select
            className="input"
            value={m}
            onChange={(e) => setM(Number(e.target.value))}
            aria-label={'เดือนเกิด'}
          >
            <option value="">{'เดือน'}</option>
            {THAI_MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {'ปี พ.ศ.'}
          <select
            className="input"
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            aria-label={'ปีเกิด พ.ศ.'}
          >
            <option value="">{'ปี พ.ศ.'}</option>
            {YEARS.map((n) => (
              <option key={n} value={n}>
                {n + 543}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" className="btn-primary picker-submit">
        <span>{buttonLabel}</span>
        <span aria-hidden="true">→</span>
      </button>
      {error && (
        <p className="mt-3 text-sm text-coral" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
