import type { EventItem, ThaiDay } from '../types'
// อ่านหน้าวันที่ของวิกิพีเดียไทย เก็บเป็นข้อความล้วน ไม่ใส่ HTML จาก API ลงหน้าเว็บ
const THAI_CONTEXT =
  /ประเทศไทย|คนไทย|ชาวไทย|ของไทย|แห่งชาติไทย|สยาม|กรุงเทพ|กรุงธนบุรี|กรุงศรีอยุธยา|กรุงรัตนโกสินทร์|พระบาทสมเด็จ|สมเด็จพระนางเจ้า|ราชวงศ์จักรี|รัชกาลที่|คณะราษฎร|ปรีดี พนมยงค์|จอมพล ป\.|วันจักรี|วันแม่แห่งชาติ|วันพ่อแห่งชาติ|วันปิยมหาราช|วันฉัตรมงคล|วันรัฐธรรมนูญ|วันสงกรานต์|จังหวัด(?:เชียงใหม่|เชียงราย|ภูเก็ต|นครราชสีมา|ขอนแก่น|สงขลา|ชลบุรี)|มหาวิทยาลัย(?:ธรรมศาสตร์|เกษตรศาสตร์|มหิดล)|จุฬาลงกรณ์/
// คำบ่งชี้ว่าเป็นคนไทย เช่น "ชาวไทย" หรือฐานันดรศักดิ์ไทย
const THAI_PERSON =
  /ไทย|สยาม|พระบาทสมเด็จ|พระบรมราชินี|พระบรมราชชนก|พระบรมราชชนนี|พระเจ้าบรมวงศ์เธอ|พระเจ้าลูกยาเธอ|พระเจ้าลูกเธอ|พระวรวงศ์เธอ|พระองค์เจ้า|กรมหมื่น|กรมหลวง|กรมพระ|หม่อมเจ้า|หม่อมราชวงศ์|หม่อมหลวง|พระยา|ศิลปินแห่งชาติ/
// ถ้าชื่อไม่มีลิงก์ ให้ตัดชื่อตรงคำบอกอาชีพ
const ROLE_START =
  /\s(?=นัก|นาง|นาย|ลูก|บุตร|ธิดา|ทหาร|ผู้|อดีต|ศิลปิน|ดารา|พิธีกร|ยูทูบเบอร์|แร็ปเปอร์)/
const digits = (text: string) => text.replace(/[๐-๙]/g, (n) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(n)))
function yearFrom(text: string) {
  const normalized = digits(text).replace(/,/g, '')
  const ce = normalized.match(/ค\.ศ\.\s*(\d+)/)
  if (ce) return Number(ce[1])
  const be = normalized.match(/พ\.ศ\.\s*(\d+)/)
  if (be) return Number(be[1]) - 543
  return null
}
function stableId(text: string) {
  let hash = 2166136261
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return String(hash >>> 0)
}
const byThaiThenNewest = (a: EventItem, b: EventItem) =>
  Number(b.isThaiRelated) - Number(a.isThaiRelated) || (b.year ?? -Infinity) - (a.year ?? -Infinity)

export function parseThaiDay(html: string, mmdd: string, title: string): ThaiDay {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('sup,.mw-editsection,script,style').forEach((node) => node.remove())
  let section: 'events' | 'births' | 'holidays' | null = null
  const events: EventItem[] = []
  const births: EventItem[] = []
  const seen = new Set<string>()
  const pageUrl = `https://th.wikipedia.org/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
  for (const node of doc.querySelectorAll('h2,li')) {
    if (node.tagName === 'H2') {
      const heading = (node.textContent ?? '').trim()
      section = /^เหตุการณ์/.test(heading)
        ? 'events'
        : /^วันเกิด/.test(heading)
          ? 'births'
          : /^วันสำคัญ|^วันหยุด/.test(heading)
            ? 'holidays'
            : null
      continue
    }
    if (!section || node.closest('table,.navbox,.toc,.metadata')) continue
    // ข้ามรายการที่มีรายการย่อยซ้อนอยู่
    if (node.querySelector('ul,ol')) continue
    const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!text || seen.has(section + text)) continue
    const parent = node.parentElement?.closest('li')
    const context = parent ? (parent.cloneNode(true) as HTMLElement) : null
    context?.querySelectorAll('ul,ol').forEach((el) => el.remove())
    const fullText = `${context?.textContent ?? ''} ${text}`.trim()
    const year = section === 'holidays' ? null : yearFrom(fullText)
    if (section !== 'holidays' && year === null) continue
    const links = [...node.querySelectorAll<HTMLAnchorElement>('a[href^="/wiki/"]')].filter(
      (a) => !/^(พ\.ศ\.|ค\.ศ\.|\d+ |ไฟล์:|หมวดหมู่:)/.test(a.title),
    )
    // เลือกลิงก์หัวข้อก่อนลิงก์ประเทศ
    const topic =
      section === 'births' ? links[0] : (links.find((a) => !/^ประเทศ/.test(a.title)) ?? links[0])
    const entryText = text.replace(
      /^(?:พ\.ศ\.\s*[๐-๙\d,]+\s*)?(?:\(ค\.ศ\.\s*[๐-๙\d,]+\)\s*)?[–—-]\s*/,
      '',
    )
    const url = topic
      ? new URL(topic.getAttribute('href')!, 'https://th.wikipedia.org').href
      : pageUrl
    seen.add(section + text)
    const base = {
      id: `${section === 'births' ? 'b' : 't'}-${mmdd}-${stableId(section + text)}`,
      source: 'wikipedia-th',
      year,
      text: entryText,
      extract: fullText,
      pageTitle: topic?.title || null,
      thumbnail: null,
      image: null,
      url,
      sourceUrl: pageUrl,
      mmdd,
    }
    if (section === 'births') {
      // "ชื่อ คำอธิบาย (ถึงแก่กรรม ...)" -> แยกชื่อกับคำอธิบาย
      const withoutDeath = entryText.replace(/\s*\([^()]*\)\s*$/, '')
      const linked = topic?.textContent?.trim()
      const linkEnd = linked ? withoutDeath.indexOf(linked) + linked.length : -1
      const roleAt = withoutDeath.search(ROLE_START)
      const end = linkEnd > 0 ? linkEnd : roleAt > 0 ? roleAt : withoutDeath.length
      // ตัดวงเล็บท้ายชื่อ เช่น "การะเกด (นักร้อง)"
      const name = withoutDeath
        .slice(0, end)
        .replace(/\s*\([^()]*\)$/, '')
        .trim()
      const description = withoutDeath
        .slice(end)
        .replace(/^[\s,]+/, '')
        .trim()
      births.push({
        ...base,
        kind: 'b',
        title: name,
        description,
        // "นักมวยไทย" ไม่ได้แปลว่าเป็นคนไทย
        isThaiRelated: [THAI_PERSON, THAI_CONTEXT].some((pattern) =>
          pattern.test(`${name} ${description}`.replaceAll('มวยไทย', '')),
        ),
      })
      continue
    }
    events.push({
      ...base,
      kind: 't',
      title: entryText,
      description:
        section === 'holidays' ? 'วันสำคัญและวันหยุดเทศกาล' : 'เหตุการณ์จากวิกิพีเดียไทย',
      isHoliday: section === 'holidays',
      isThaiRelated: THAI_CONTEXT.test(fullText + ' ' + links.map((a) => a.title).join(' ')),
    })
  }
  return { events: events.sort(byThaiThenNewest), births: births.sort(byThaiThenNewest) }
}
