import { Link } from 'react-router-dom'
import { SafeImage } from '../components/ui'

const members = [
  {
    name: 'ชยพล ช่วยบำรุง',
    nickname: 'โฮป',
    studentId: '1660701705',
    role: 'พัฒนาเว็บไซต์',
    photo: '/team/hope.jpg',
  },
  {
    name: 'วรพิณ ทองที',
    nickname: 'เบส',
    studentId: '1660702943',
    role: 'ออกแบบและช่วยคิดไอเดีย',
    photo: '/team/bas.jpg',
  },
]
const sources = [
  {
    title: 'วิกิพีเดียไทย — หน้าวันที่',
    text: 'เหตุการณ์ วันสำคัญ และบุคคลที่เกิดในวันเดียวกัน อ่านจากหน้าวันที่ เช่น "12 สิงหาคม" ผ่าน MediaWiki Action API (action=parse) จัดรายการที่มีคำบ่งชี้เกี่ยวกับไทยขึ้นก่อน เนื้อหาภาษาไทยไม่ได้หมายความว่าเป็นเหตุการณ์ในไทยทุกรายการ',
    docs: 'https://www.mediawiki.org/wiki/API:Parsing_wikitext',
  },
  {
    title: 'Wikimedia REST API — page summary',
    text: 'บทคัดย่อและรูปภาพของบทความวิกิพีเดียไทยที่แสดงในหน้ารายละเอียด',
    docs: 'https://th.wikipedia.org/api/rest_v1/',
  },
]
export default function About() {
  return (
    <div className="page-shell py-10">
      <header className="subpage-heading">
        <p className="eyebrow">เกี่ยวกับโครงงาน</p>
        <h1>เรื่องราวเริ่มจากวันเกิด</h1>
        <p>
          เลือกวันเกิดเพื่อดูเหตุการณ์และวันสำคัญในวันเดียวกันผ่านเส้นเวลา
          ให้เรื่องเกี่ยวกับไทยขึ้นก่อน และดูบุคคลที่เกิดวันเดียวกันได้
        </p>
        <Link to="/" className="btn-primary mt-6">
          ค้นจากวันเกิดของคุณ →
        </Link>
      </header>
      <section className="about-section">
        <h2>ผู้จัดทำ</h2>
        <div>
          {members.map((member) => (
            <div className="about-row flex items-center gap-5" key={member.studentId}>
              <div className="img-placeholder grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-ink text-xl font-semibold">
                <SafeImage
                  sources={[member.photo]}
                  alt={`รูปของ${member.nickname}`}
                  className="h-full w-full object-cover"
                  fallback={member.nickname}
                />
              </div>
              <div>
                <h3>
                  {member.name} ({member.nickname})
                </h3>
                <p>รหัสนักศึกษา {member.studentId}</p>
                <p>หน้าที่: {member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="about-section">
        <h2>อ่านแบบไหนได้บ้าง</h2>
        <div>
          <div className="about-row">
            <h3>เหตุการณ์และวันสำคัญไทย</h3>
            <p>
              วันและเดือนตรงกับที่เลือก แต่ปีอาจแตกต่างกัน เช่น เหตุการณ์ทั้งหมดที่เกิดในวันที่ 12
              สิงหาคม
            </p>
          </div>
          <div className="about-row">
            <h3>เส้นเวลาในวันของคุณ</h3>
            <p>
              เรื่องราวของไทยขึ้นก่อน แล้วต่อด้วยเหตุการณ์อื่นในวันเดียวกัน
              เรียงปีใหม่ไปเก่าภายในแต่ละกลุ่ม
            </p>
          </div>
          <div className="about-row">
            <h3>คนเกิดวันเดียวกัน</h3>
            <p>ดูบุคคลที่เกิดวันและเดือนเดียวกัน พร้อมเลือกคนที่มีปีเกิดใกล้กับคุณที่สุด</p>
          </div>
          <div className="about-row">
            <h3>รายการที่บันทึก</h3>
            <p>กดดาวที่เหตุการณ์หรือบุคคลเพื่อเก็บไว้ ข้อมูลจำไว้ในเบราว์เซอร์แม้ปิดเว็บแล้ว</p>
          </div>
        </div>
      </section>
      <section className="about-section">
        <h2>แหล่งข้อมูล (API)</h2>
        <div>
          {sources.map((source) => (
            <div className="about-row" key={source.title}>
              <h3>{source.title}</h3>
              <p>{source.text}</p>
              <a
                href={source.docs}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-3 text-sm text-coral underline underline-offset-4"
              >
                เอกสาร API ↗
              </a>
            </div>
          ))}
          <div className="about-row">
            <p>
              เนื้อหาจากวิกิพีเดียใช้สัญญาอนุญาต{' '}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/deed.th"
                target="_blank"
                rel="noreferrer"
                className="text-coral underline"
              >
                CC BY-SA 4.0
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
