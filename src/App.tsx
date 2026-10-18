import { useBirthdayStore } from './store'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, type RouteObject } from 'react-router-dom'
import Home from './pages/Home'
import Detail from './pages/Detail'
import Collection from './pages/Collection'
import About from './pages/About'
import Twins from './pages/Twins'
import { EmptyState } from './components/ui'

// เส้นทางทั้งหมด ใช้ทั้งใน main.tsx และใน test
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'event/:id', element: <Detail /> },
      { path: 'twins', element: <Twins /> },
      { path: 'collection', element: <Collection /> },
      { path: 'about', element: <About /> },
      {
        path: '*',
        element: (
          <div className="px-4 py-16">
            <EmptyState title="ไม่พบหน้านี้">
              <Link to="/" className="text-coral underline">
                กลับหน้าหลัก
              </Link>
            </EmptyState>
          </div>
        ),
      },
    ],
  },
]

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="page-shell footer-inner">
          <span className="footer-title">วันเกิดของคุณ</span>
          <Link to="/about" className="hover:text-coral">
            เกี่ยวกับโครงงาน ↗
          </Link>
        </div>
      </footer>
    </div>
  )
}

const LINKS = [
  {
    to: '/',
    label: 'ค้นจากวันเกิด',
    end: true,
  },
  {
    to: '/twins',
    label: 'คนเกิดวันเดียวกัน',
  },
  {
    to: '/collection',
    label: 'รายการที่บันทึก',
  },
  {
    to: '/about',
    label: 'เกี่ยวกับเว็บ',
  },
]
function Navbar() {
  const birthday = useBirthdayStore((state) => state.birthday)
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <nav className="site-nav" aria-label="เมนูหลัก">
        <Link
          to="/"
          className="wordmark"
          onClick={() => setOpen(false)}
          aria-label="วันเกิดของคุณ — หน้าหลัก"
        >
          <svg className="wordmark-icon" viewBox="0 0 38 44" fill="none" aria-hidden="true">
            <path d="M3 7h32v33H3zM3 16h32M11 3v8M27 3v8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 23h14M12 28h14M12 33h7" stroke="currentColor" />
          </svg>
          <span>
            <span className="wordmark-title">
              วันเกิดของคุณ<span className="text-coral">.</span>
            </span>
          </span>
        </Link>
        <button
          type="button"
          className="btn-ghost menu-toggle"
          aria-controls="main-menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? 'ปิดเมนู' : 'เมนู'}
        </button>
        <ul id="main-menu" className={`nav-items ${open ? 'open' : ''}`}>
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink
                to={
                  birthday && (l.to === '/' || l.to === '/twins')
                    ? `${l.to}?d=${encodeURIComponent(birthday)}`
                    : l.to
                }
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
