# วันเกิดของคุณ เกิดอะไรขึ้นบ้าง

Mini Project 2 — เลือกวันเกิดแล้วดูเหตุการณ์ วันสำคัญ และบุคคลที่เกิดวันและเดือนเดียวกันในปีต่าง ๆ ข้อมูลจากวิกิพีเดียไทย

**ผู้จัดทำ:** ชยพล ช่วยบำรุง (1660701705), วรพิณ ทองที (1660702943)

**เครื่องมือ:** React 19, Vite, TypeScript, React Router 7, Zustand, TanStack Query 5, Tailwind CSS

## วิธีรัน

ใช้ Node.js 22 ขึ้นไป ไม่ต้องใช้ API key

```sh
npm install
npm run dev
```

คำสั่งอื่น: `npm run build`, `npm test`, `npm run typecheck`

## หน้าในเว็บ

| เส้นทาง | หน้า |
| --- | --- |
| `/` | หน้าหลัก — เลือกวันเกิด ตัวนับวัน และเส้นเวลาเหตุการณ์ |
| `/event/:id` | รายละเอียดเหตุการณ์หรือบุคคล |
| `/twins` | คนเกิดวันเดียวกัน (หน้าพิเศษ) |
| `/collection` | รายการที่บันทึกไว้ |
| `/about` | ผู้จัดทำและแหล่งข้อมูล |

## การแบ่ง State

- **TanStack Query** — ข้อมูลจาก API ทั้งหมด (cache 10 นาที, loading, error, retry)
- **Zustand + persist** — วันเกิดล่าสุด และรหัสของรายการที่กดบันทึก (เก็บใน localStorage)
- **URL** — วันเกิดที่เลือก (`?d=YYYY-MM-DD`) เพื่อแชร์ลิงก์ได้

## แหล่งข้อมูล

- [MediaWiki Action API](https://www.mediawiki.org/wiki/API:Parsing_wikitext) — หน้าวันที่ของวิกิพีเดียไทย เช่น "12 สิงหาคม" และรูปของบุคคล
- [Wikimedia REST API](https://th.wikipedia.org/api/rest_v1/) — บทคัดย่อและรูปในหน้ารายละเอียด
- ตัวอย่างข้อมูลที่ได้จาก API อยู่ในโฟลเดอร์ `sample-data/`

ข้อจำกัด: การแยกว่าเรื่องไหนเกี่ยวกับไทยใช้คำบ่งชี้ในข้อความ จึงอาจคลาดเคลื่อนได้ และจำนวนรายการขึ้นกับข้อมูลของแต่ละวัน

## Deploy

เป็นเว็บ static: build ด้วย `npm run build` ได้ผลลัพธ์ที่โฟลเดอร์ `dist` มี `vercel.json` (Vercel) และ `public/_redirects` (Netlify) สำหรับเปิดลิงก์หน้าย่อยได้โดยตรง
