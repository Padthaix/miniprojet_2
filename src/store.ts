import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// รหัสรายการ เช่น "t-0812-123" มีวันที่อยู่ในตัว
const ITEM_ID = /^[tb]-\d{4}-\d+$/
const savedIds = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((key): key is string => typeof key === 'string' && ITEM_ID.test(key))
    : []

// Client State: วันเกิดและรหัสรายการที่บันทึก (ไม่เก็บข้อมูล API)
interface BirthdayState {
  birthday: string
  favoritePeople: string[]
  favoriteEvents: string[]
  setBirthday: (birthday: string) => void
  toggleFavorite: (id: string) => void
  toggleEventFavorite: (id: string) => void
}
const toggle = (list: string[], id: string) =>
  list.includes(id) ? list.filter((value) => value !== id) : [...list, id]

export const useBirthdayStore = create<BirthdayState>()(
  persist(
    (set) => ({
      birthday: '',
      favoritePeople: [],
      favoriteEvents: [],
      setBirthday: (birthday) => set({ birthday }),
      toggleEventFavorite: (id) =>
        set((state) => ({ favoriteEvents: toggle(state.favoriteEvents, id) })),
      toggleFavorite: (id) =>
        set((state) => ({ favoritePeople: toggle(state.favoritePeople, id) })),
    }),
    {
      name: 'whob:birthday',
      storage: createJSONStorage(() => ({
        getItem: (key) => {
          try {
            return localStorage.getItem(key)
          } catch {
            return null
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value)
          } catch {
            /* ใช้ต่อในหน่วยความจำ */
          }
        },
        removeItem: (key) => {
          try {
            localStorage.removeItem(key)
          } catch {
            /* เบราว์เซอร์อาจปิด storage */
          }
        },
      })),
      partialize: (state) => ({
        birthday: state.birthday,
        favoritePeople: state.favoritePeople,
        favoriteEvents: state.favoriteEvents,
      }),
      merge: (saved, current) => {
        const data = saved as Partial<BirthdayState> | null
        return {
          ...current,
          birthday: typeof data?.birthday === 'string' ? data.birthday : '',
          favoriteEvents: savedIds(data?.favoriteEvents),
          favoritePeople: savedIds(data?.favoritePeople),
        }
      },
    },
  ),
)
