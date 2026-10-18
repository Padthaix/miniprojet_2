import { QueryClient, queryOptions } from '@tanstack/react-query'
import { ApiError, getThaiDay, getPageSummary, getPageImages } from './api'
import type { DetailData } from '../types'

// Server State: ข้อมูลจาก API ใช้ cache ร่วมกันทุกหน้า
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000,
      retry: (count, error) =>
        count < 1 &&
        !(error instanceof ApiError && ['NOT_FOUND', 'RATE_LIMIT'].includes(error.code)),
      refetchOnWindowFocus: false,
    },
  },
})
export function thaiDayQuery(mmdd: string) {
  return queryOptions({ queryKey: ['thai-day', mmdd], queryFn: () => getThaiDay(mmdd) })
}
// รูปของบุคคลที่เกิดวันนั้น (หน้าวันที่ไม่มีรูป)
export function portraitsQuery(mmdd: string, titles: string[]) {
  return queryOptions({
    queryKey: ['portraits', mmdd],
    queryFn: () => getPageImages(titles),
    enabled: titles.length > 0,
  })
}
export function detailQuery(id: string) {
  return queryOptions({
    queryKey: ['detail', id],
    queryFn: async (): Promise<DetailData> => {
      const match = /^([tb])-(\d{4})-(\d+)$/.exec(id)
      if (!match) throw new ApiError('ลิงก์ไม่ถูกต้อง', 'NOT_FOUND')
      const [, kind, mmdd] = match
      const day = await queryClient.fetchQuery(thaiDayQuery(mmdd))
      const siblings = kind === 'b' ? day.births : day.events
      const item = siblings.find((item) => item.id === id)
      if (!item) throw new ApiError('ไม่พบรายการนี้', 'NOT_FOUND')
      // ดึงบทคัดย่อไม่ได้ก็ยังแสดงรายการได้
      const summary = item.pageTitle
        ? await queryClient
            .fetchQuery({
              queryKey: ['summary', item.pageTitle],
              queryFn: () => getPageSummary(item.pageTitle!),
            })
            .catch(() => null)
        : null
      return {
        item,
        siblings,
        summary,
      }
    },
  })
}
