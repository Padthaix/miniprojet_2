// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './App'
import BirthdayPicker from './components/BirthdayPicker'
import { queryClient, thaiDayQuery, detailQuery } from './lib/queries'
import { BirthdayStats } from './components/ui'
import { parseThaiDay } from './lib/thaiWiki'
import { parseISODate, daysUntilBirthday, ageInDays, ageInYears } from './lib/date'
import { useBirthdayStore } from './store'

const fetchMock = vi.fn()
function respond(body: unknown) {
  return { ok: true, status: 200, json: async () => body }
}
const page = (html: string) => respond({ parse: { text: html } })
// จำลองหน้าวันที่ ทุกคนมีรูป ยกเว้นชื่อที่ระบุ
function serve(html: string, withoutPortrait: string[] = []) {
  fetchMock.mockImplementation(async (url: string) => {
    const params = new URL(url).searchParams
    if (params.get('prop') !== 'pageimages') return page(html)
    const pages = params
      .get('titles')!
      .split('|')
      .map((title) =>
        withoutPortrait.includes(title)
          ? { title }
          : { title, thumbnail: { source: `https://img/${encodeURIComponent(title)}.jpg` } },
      )
    return respond({ query: { pages } })
  })
}
// หน้าวันที่ที่ถูกเรียก (ไม่นับการเรียกรูปและบทคัดย่อ)
const datePageCalls = () =>
  fetchMock.mock.calls
    .map(([url]) => new URL(url).searchParams)
    .filter((params) => params.get('action') === 'parse')
    .map((params) => params.get('page'))
function openPage(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] })
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

const thaiNew = 'ประเทศไทยเปิดพิพิธภัณฑ์'
const thaiOld = 'ประเทศไทยจัดงานสำคัญ'
const foreign = 'เหตุการณ์ในประเทศฝรั่งเศส'
const holiday = 'วันแม่แห่งชาติ'
const birth = (be: number, name: string, role: string) =>
  `<li>พ.ศ. ${be} – <a href="/wiki/${name}" title="${name}">${name}</a> ${role}</li>`
const births =
  '<h2>วันเกิด</h2><ul>' +
  birth(2543, 'นักแสดงต่างชาติ', 'นักแสดงชาวอเมริกัน') +
  birth(2533, 'นักแสดงไทย', 'นักแสดงชาวไทย') +
  birth(2538, 'นักร้องไทย', 'นักร้องชาวไทย') +
  '</ul>'
const html =
  '<h2>เหตุการณ์</h2><ul><li>พ.ศ. 2568 – ' +
  foreign +
  '</li><li>พ.ศ. 2543 – ' +
  thaiOld +
  '</li><li>พ.ศ. 2553 – ' +
  thaiNew +
  '</li></ul>' +
  births +
  '<h2>วันสำคัญ</h2><ul><li>' +
  holiday +
  '</li></ul>'

beforeEach(() => {
  queryClient.clear()
  queryClient.setDefaultOptions({ queries: { retry: false, staleTime: 600000 } })
  useBirthdayStore.setState({ birthday: '', favoritePeople: [], favoriteEvents: [] })
  localStorage.clear()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('scrollTo', vi.fn())
  fetchMock.mockReset()
})
afterEach(() => {
  cleanup()
  queryClient.clear()
  vi.unstubAllGlobals()
})

describe('server state and routing', () => {
  it('shares one date page between the list and detail without fetching twice', async () => {
    serve(html)
    const day = await queryClient.fetchQuery(thaiDayQuery('0812'))
    const detail = await queryClient.fetchQuery(detailQuery(day.births[0].id))
    expect(detail.item.title).toBe('นักร้องไทย')
    expect(fetchMock.mock.calls.map(([url]) => new URL(url).pathname)).toEqual([
      '/w/api.php',
      expect.stringContaining('/api/rest_v1/page/summary/'),
    ])
  })
  it('deduplicates concurrent requests', async () => {
    serve(html)
    await Promise.all([
      queryClient.fetchQuery(thaiDayQuery('0812')),
      queryClient.fetchQuery(thaiDayQuery('0812')),
    ])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('rejects malformed detail links before requesting an API', async () => {
    for (const id of ['w-0312-0', 'n-20000312-0', 't-312-1'])
      await expect(queryClient.fetchQuery(detailQuery(id))).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('shows loading, results, then detail when an entry is clicked', async () => {
    serve(html)
    openPage('/?d=2000-08-12')
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    fireEvent.click(await screen.findByRole('link', { name: thaiNew }))
    await screen.findByRole('heading', { level: 1, name: thaiNew })
    expect(
      fetchMock.mock.calls.filter(([url]) => String(url).includes('action=parse')),
    ).toHaveLength(1)
  })
  it('recovers from an API failure using retry', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(page(html))
    openPage('/?d=2000-08-12')
    const alert = await screen.findByRole('alert')
    fireEvent.click(alert.querySelector('button')!)
    await screen.findByRole('link', { name: thaiNew })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('shows an empty state for no results', async () => {
    serve('')
    openPage('/?d=2000-03-12')
    await screen.findByText('ไม่พบเหตุการณ์ที่ตรงกับตัวกรอง')
  })
  it('loads a detail URL directly after refresh', async () => {
    serve(html)
    const { events } = await queryClient.fetchQuery(thaiDayQuery('0812'))
    queryClient.clear()
    openPage(`/event/${events[0].id}`)
    await screen.findByRole('heading', { level: 1, name: thaiNew })
  })
  it('falls back from a throttled image to the next size, then to a placeholder', async () => {
    const thumb = 'https://upload.wikimedia.org/a/thumb/x.jpg/330px-x.jpg'
    const original = 'https://upload.wikimedia.org/a/x.jpg'
    fetchMock.mockImplementation(async (url: string) =>
      url.includes('/page/summary/')
        ? respond({
            title: 'นักร้องไทย',
            thumbnail: { source: thumb },
            originalimage: { source: original },
          })
        : page(births),
    )
    const { births: people } = await queryClient.fetchQuery(thaiDayQuery('0812'))
    openPage(`/event/${people[0].id}`)
    await screen.findByRole('heading', { level: 1, name: 'นักร้องไทย' })
    const card = document.querySelector('article')!
    const tried: string[] = []
    while (card.querySelector('img')) {
      const img = card.querySelector('img')!
      tried.push(img.getAttribute('src')!)
      fireEvent.error(img)
    }
    expect(tried).toEqual([thumb.replace('330px', '500px'), thumb, original])
    expect(card.querySelector('.img-placeholder')).toBeNull()
  })
  it('shows other-event cards as text only, without requesting images', async () => {
    const linked = (be: number, title: string) =>
      `<li>พ.ศ. ${be} – <a href="/wiki/${title}" title="${title}">${title}</a> เกิดขึ้น</li>`
    serve(
      '<h2>เหตุการณ์</h2><ul><li>พ.ศ. 2439 – เหตุการณ์ไม่มีลิงก์</li>' +
        linked(2400, 'บทความมีรูป') +
        linked(2300, 'บทความไม่มีรูป') +
        '</ul>',
      ['บทความไม่มีรูป'],
    )
    const { events } = await queryClient.fetchQuery(thaiDayQuery('0118'))
    const unlinked = events.find((e) => e.pageTitle === null)!
    openPage(`/event/${unlinked.id}`)
    await screen.findByRole('heading', { level: 1, name: 'เหตุการณ์ไม่มีลิงก์' })
    expect(document.querySelector('article .img-placeholder')).toBeNull()
    expect(screen.getByRole('link', { name: 'บทความมีรูป เกิดขึ้น' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'บทความไม่มีรูป เกิดขึ้น' })).toBeTruthy()
    expect(document.querySelector('.event-card .event-image')).toBeNull()
    expect(
      fetchMock.mock.calls.some(([url]) => new URL(url).searchParams.get('prop') === 'pageimages'),
    ).toBe(false)
  })
  it('renders every page inside the root layout with active NavLinks', async () => {
    serve(html)
    openPage('/about')
    expect(screen.getByRole('navigation', { name: 'เมนูหลัก' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'เกี่ยวกับเว็บ' }).className).toContain('active')
    expect(screen.getByRole('heading', { name: 'ชยพล ช่วยบำรุง (โฮป)' })).toBeTruthy()
    expect(screen.getByText('หน้าที่: ออกแบบและช่วยคิดไอเดีย')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'รูปของโฮป' }).getAttribute('src')).toBe(
      '/team/hope.jpg',
    )
    expect(screen.getByText('รหัสนักศึกษา 1660702943')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'รายการที่บันทึก' }))
    await screen.findByRole('heading', { level: 1, name: 'รายการที่บันทึก' })
    expect(screen.getByRole('navigation', { name: 'เมนูหลัก' })).toBeTruthy()
  })
  it('has no language switch and marks the document as Thai', () => {
    openPage('/')
    expect(screen.queryByRole('button', { name: 'EN' })).toBeNull()
    expect(screen.queryByText(/What happened/i)).toBeNull()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('วันเกิดของคุณ')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('birthday countdown', () => {
  afterEach(() => vi.useRealTimers())
  const today = (iso: string) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(iso + 'T10:00:00'))
  }
  it('counts days to the next birthday, days alive and age', () => {
    today('2026-10-18')
    const date = { y: 2000, m: 10, d: 20 }
    expect(daysUntilBirthday(date)).toBe(2)
    expect(ageInDays(date)).toBe(9494)
    expect(ageInYears(date)).toBe(25)
    render(<BirthdayStats date={date} />)
    expect(screen.getByText('9,494')).toBeTruthy()
    expect(screen.getByText('วันถึงวันเกิดครั้งถัดไป').previousSibling?.textContent).toBe('2')
  })
  it('says today is the birthday and counts the new age', () => {
    today('2026-10-18')
    render(<BirthdayStats date={{ y: 2000, m: 10, d: 18 }} />)
    expect(screen.getByText('วันนี้คือวันเกิดของคุณ!').previousSibling?.textContent).toBe('0')
    expect(ageInYears({ y: 2000, m: 10, d: 18 })).toBe(26)
  })
  it('uses 28 February for a 29 February birthday in a common year', () => {
    today('2026-10-18')
    expect(daysUntilBirthday({ m: 2, d: 29 })).toBe(133)
  })
  it('shows the countdown on Home together with the timeline', async () => {
    serve(html)
    openPage('/?d=2000-08-12')
    expect(screen.getByText('วันที่คุณมีชีวิตอยู่บนโลกนี้')).toBeTruthy()
    await screen.findByRole('list', { name: 'เส้นเวลาเหตุการณ์' })
  })
})

describe('input', () => {
  it('clears the date fields when navigating to an empty date', () => {
    const props = { onSubmit: vi.fn() }
    const { rerender } = render(<BirthdayPicker value="2000-03-12" {...props} />)
    const fields = screen.getAllByRole('combobox') as HTMLSelectElement[]
    expect(fields[0].value).toBe('12')
    expect(fields[2].selectedOptions[0].textContent).toBe('2543')
    rerender(<BirthdayPicker value="" {...props} />)
    for (const field of screen.getAllByRole('combobox'))
      expect((field as HTMLSelectElement).value).toBe('')
  })
  it('validates leap-day input', () => {
    expect(parseISODate('2000-02-29')).toEqual({ y: 2000, m: 2, d: 29 })
    expect(parseISODate('2001-02-29')).toBeNull()
    expect(parseISODate('2000-13-01')).toBeNull()
  })
  it('parses Thai events, births and observances without unsafe HTML', () => {
    const day = parseThaiDay(
      '<h2>เหตุการณ์</h2><ul><li>พ.ศ. 2543 – เหตุการณ์ในประเทศไทย <script>alert(1)</script></li></ul>' +
        '<h2>วันเกิด</h2><ul><li>พ.ศ. 2531 (ค.ศ. 1988) – <a href="/wiki/x" title="การะเกด (นักร้อง)">การะเกด (นักร้อง)</a> นักร้องลูกทุ่งหญิงชาวไทย</li>' +
        '<li>พ.ศ. 2527 – รอลา คาเล็ด นักมวยไทยหญิงชาวเลบานอน (ถึงแก่กรรม พ.ศ. 2560)</li></ul>' +
        '<h2>วันสำคัญ</h2><ul><li>วันแม่แห่งชาติ</li></ul>',
      '0812',
      '12 สิงหาคม',
    )
    expect(day.events).toHaveLength(2)
    expect(day.events.find((item) => !item.isHoliday)?.year).toBe(2000)
    expect(day.events.find((item) => item.isHoliday)?.year).toBeNull()
    expect(day.events.every((item) => !item.text.includes('alert'))).toBe(true)
    expect(day.births.map((b) => [b.title, b.description, b.year, b.isThaiRelated])).toEqual([
      ['การะเกด', 'นักร้องลูกทุ่งหญิงชาวไทย', 1988, true],
      ['รอลา คาเล็ด', 'นักมวยไทยหญิงชาวเลบานอน', 1984, false],
    ])
  })
})

describe('birthday timeline', () => {
  it('shows Thai events first, newest first, followed by other events in one timeline', async () => {
    serve(html)
    openPage('/?d=2000-08-12')
    const list = await screen.findByRole('list', { name: 'เส้นเวลาเหตุการณ์' })
    const titles = [...list.querySelectorAll('h4')].map((node) => node.textContent)
    expect(titles).toEqual([thaiNew, thaiOld, holiday, foreign])
    expect(list.querySelectorAll('.timeline-date')[2].textContent).toBe('ทุกปี')
    expect(document.querySelector('a[href*="google.com"]')).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('filters Thai and other events locally and restores the full timeline', async () => {
    serve(html)
    openPage('/?d=2000-08-12')
    const list = await screen.findByRole('list', { name: 'เส้นเวลาเหตุการณ์' })
    expect(screen.queryByRole('searchbox')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'ข่าวในไทย' }))
    expect([...list.querySelectorAll('h4')].map((node) => node.textContent)).toEqual([
      thaiNew,
      thaiOld,
      holiday,
    ])
    fireEvent.click(screen.getByRole('button', { name: 'ข่าวต่างประเทศ' }))
    expect([...list.querySelectorAll('h4')].map((node) => node.textContent)).toEqual([foreign])
    fireEvent.click(screen.getByRole('button', { name: 'ทั้งหมด' }))
    expect(list.querySelectorAll('li')).toHaveLength(4)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it('loads more timeline entries and displays BE with CE years', async () => {
    const entries = Array.from(
      { length: 14 },
      (_, i) => '<li>พ.ศ. ' + (2500 + i) + ' – ประเทศไทย เรื่องที่ ' + i + '</li>',
    ).join('')
    serve('<h2>เหตุการณ์</h2><ul>' + entries + '</ul>')
    openPage('/?d=2000-08-12')
    const list = await screen.findByRole('list', { name: 'เส้นเวลาเหตุการณ์' })
    expect(list.querySelectorAll('li')).toHaveLength(12)
    expect(list.querySelector('.timeline-date')?.textContent).toContain('2513')
    expect(list.querySelector('.timeline-date')?.textContent).toContain('ค.ศ. 1970')
    fireEvent.click(screen.getByRole('button', { name: /ดูเพิ่มเติม/ }))
    expect(list.querySelectorAll('li')).toHaveLength(14)
  })
})

describe('shared birthday and birthday twins', () => {
  it('carries the birthday from Home to Twins using the same cached page', async () => {
    serve(html)
    openPage('/?d=2000-08-12')
    await screen.findByRole('list', { name: 'เส้นเวลาเหตุการณ์' })
    fireEvent.click(screen.getByRole('link', { name: 'คนเกิดวันเดียวกัน' }))
    await screen.findByText('นักร้องไทย')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(useBirthdayStore.getState().birthday).toBe('2000-08-12')
    expect(screen.getByRole('link', { name: 'ค้นจากวันเกิด' }).getAttribute('href')).toBe(
      '/?d=2000-08-12',
    )
    expect(datePageCalls()).toEqual(['12 สิงหาคม'])
  })
  it('uses the saved birthday when Twins has no date, and accepts a different explicit date', async () => {
    useBirthdayStore.getState().setBirthday('2000-03-12')
    serve(births)
    openPage('/twins')
    await screen.findByText('นักร้องไทย')
    expect(datePageCalls()).toEqual(['12 มีนาคม'])
    cleanup()
    openPage('/twins?d=2001-08-12')
    await screen.findByText('นักร้องไทย')
    expect(useBirthdayStore.getState().birthday).toBe('2001-08-12')
    expect(datePageCalls()).toEqual(['12 มีนาคม', '12 สิงหาคม'])
  })
  it('puts Thai people first and chooses the nearest Thai birthday twin', async () => {
    serve(births)
    openPage('/twins?d=2000-08-12')
    const singer = await screen.findByText('นักร้องไทย')
    expect(singer.closest('section')?.querySelector('h2')?.textContent).toBe('แฝดวันเกิดของคุณ')
    const cards = [...document.querySelectorAll('article')]
    expect(cards[0].textContent).toContain('นักแสดงไทย')
    expect(cards[0].textContent).toContain('พ.ศ. 2533')
    expect(cards[1].textContent).toContain('นักแสดงต่างชาติ')
  })
  it('lists only people with a portrait, waiting for portraits before showing anyone', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      new URL(url).searchParams.get('prop') === 'pageimages'
        ? respond({
            query: {
              normalized: [{ from: 'นักร้องไทย', to: 'นักร้องไทย (นักร้อง)' }],
              pages: [
                { title: 'นักร้องไทย (นักร้อง)', thumbnail: { source: 'https://img/singer.jpg' } },
                { title: 'นักแสดงไทย' },
              ],
            },
          })
        : page(births),
    )
    openPage('/twins?d=2000-08-12')
    await screen.findByText('กำลังค้นหาคนดัง…')
    expect(screen.queryByText('นักแสดงไทย')).toBeNull()
    const singer = await screen.findByText('นักร้องไทย')
    expect(document.querySelector('img[src="https://img/singer.jpg"]')).not.toBeNull()
    expect(singer.closest('section')?.querySelector('h2')?.textContent).toBe('แฝดวันเกิดของคุณ')
    expect(screen.queryByText('นักแสดงไทย')).toBeNull()
    expect(screen.queryByText('นักแสดงต่างชาติ')).toBeNull()
    expect(screen.getByText('ไม่มีบุคคลอื่นที่มีรูปในวันนี้')).toBeTruthy()
  })
  it('shows a silhouette when a listed portrait fails to load', async () => {
    serve(births)
    openPage('/twins?d=2000-08-12')
    const card = (await screen.findByText('นักแสดงต่างชาติ')).closest('article')!
    while (card.querySelector('img')) fireEvent.error(card.querySelector('img')!)
    expect(card.querySelector('svg')).not.toBeNull()
  })
  it('shows a retry button when portraits cannot be loaded', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      new URL(url).searchParams.get('prop') === 'pageimages'
        ? { ok: false, status: 500, json: async () => ({}) }
        : page(births),
    )
    openPage('/twins?d=2000-08-12')
    const alert = await screen.findByRole('alert')
    serve(births)
    fireEvent.click(alert.querySelector('button')!)
    await screen.findByText('นักร้องไทย')
  })
  it('can change the shared birthday from Twins', async () => {
    serve(births)
    openPage('/twins?d=2000-03-12')
    await screen.findByText('นักร้องไทย')
    fireEvent.click(screen.getByRole('button', { name: 'เปลี่ยนวันเกิด' }))
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '15' } })
    fireEvent.click(screen.getByRole('button', { name: 'หาแฝดวันเกิด' }))
    await waitFor(() => expect(useBirthdayStore.getState().birthday).toBe('2000-03-15'))
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})

describe('personal collection', () => {
  it('stars people without navigation and restores them after rehydration', async () => {
    serve(births)
    openPage('/twins?d=2000-08-12')
    fireEvent.click(await screen.findByRole('button', { name: 'บันทึก นักร้องไทย' }))
    expect(screen.getByRole('heading', { level: 1, name: 'คนเกิดวันเดียวกัน' })).toBeTruthy()
    const saved = localStorage.getItem('whob:birthday')!
    expect(JSON.parse(saved).state.favoritePeople).toEqual([expect.stringMatching(/^b-0812-\d+$/)])
    cleanup()
    useBirthdayStore.setState({ birthday: '', favoritePeople: [], favoriteEvents: [] })
    localStorage.setItem('whob:birthday', saved)
    await useBirthdayStore.persist.rehydrate()
    openPage('/twins')
    const star = await screen.findByRole('button', { name: 'เลิกบันทึก นักร้องไทย' })
    expect(star.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /รายการโปรด/ }))
    expect(screen.queryByText('นักแสดงต่างชาติ')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'เลิกบันทึก นักร้องไทย' }))
    expect(screen.getByText('ยังไม่มีคนโปรดในวันนี้')).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('whob:birthday')!).state.favoritePeople).toEqual([])
  })
  it('lists saved events and people on the Collection page from IDs only', async () => {
    serve(html)
    const day = await queryClient.fetchQuery(thaiDayQuery('0812'))
    queryClient.clear()
    useBirthdayStore.getState().toggleEventFavorite(day.events[0].id)
    useBirthdayStore.getState().toggleFavorite(day.births[0].id)
    expect(Object.keys(JSON.parse(localStorage.getItem('whob:birthday')!).state)).toEqual([
      'birthday',
      'favoritePeople',
      'favoriteEvents',
    ])
    openPage('/collection')
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull()
    await screen.findByRole('link', { name: thaiNew })
    expect(screen.getByRole('link', { name: 'นักร้องไทย' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: '12 สิงหาคม' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `เลิกบันทึก ${thaiNew}` }))
    expect(screen.queryByRole('link', { name: thaiNew })).toBeNull()
    expect(useBirthdayStore.getState().favoriteEvents).toEqual([])
  })
  it('shows an empty Collection without calling an API', () => {
    openPage('/collection')
    expect(screen.getByText('ยังไม่มีรายการที่บันทึก')).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('saves from the timeline and unstars from detail', async () => {
    serve(html)
    openPage('/?d=2000-08-12')
    fireEvent.click(await screen.findByRole('button', { name: `บันทึก ${thaiNew}` }))
    expect(useBirthdayStore.getState().favoritePeople).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'ที่บันทึกไว้' }))
    expect(screen.queryByRole('link', { name: thaiOld })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: thaiNew }))
    await screen.findByRole('heading', { level: 1, name: thaiNew })
    fireEvent.click(screen.getByRole('button', { name: `เลิกบันทึก ${thaiNew}` }))
    expect(useBirthdayStore.getState().favoriteEvents).toEqual([])
  })
  it('drops saved keys from the old English-data version', async () => {
    localStorage.setItem(
      'whob:birthday',
      JSON.stringify({
        state: {
          birthday: '2000-03-12',
          favoritePeople: ['en:Thai_Actor', 'b-0312-42'],
          favoriteEvents: ['event:t:0312:2000:x'],
        },
        version: 0,
      }),
    )
    await useBirthdayStore.persist.rehydrate()
    expect(useBirthdayStore.getState().favoritePeople).toEqual(['b-0312-42'])
    expect(useBirthdayStore.getState().favoriteEvents).toEqual([])
  })
})
