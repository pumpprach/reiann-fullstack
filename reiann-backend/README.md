# Reiann backend (Supabase + HTTP API)

โปรเจกต์นี้เป็น backend แยกจาก `reiann-frontend` ใช้ Node.js 20+, TypeScript และ Supabase สำหรับ Auth กับ Postgres หน้าเว็บใช้ Supabase client เฉพาะ Google login แล้วส่ง access token มาที่ API นี้ ทุกคำขอข้อมูลส่วนตัวผ่านการตรวจ token และฐานข้อมูลใช้ RLS จำกัดแถวของแต่ละบัญชี ไม่มี service role key ในโค้ด

```text
reiann-frontend ── Google login ──> Supabase Auth
      │                                  │
      └── HTTP + Bearer access token ──> reiann-backend ──> Supabase Postgres (RLS)
                                            │
                                            └── public share endpoint (ไม่ต้อง login)
```

## ตั้งค่าในเครื่องทีละขั้น

### 1. สร้าง Supabase project และตาราง

1. สร้างโปรเจกต์ที่ [Supabase Dashboard](https://supabase.com/dashboard)
2. เปิด **SQL Editor → New query** คัดลอกเนื้อหาทั้งหมดของ [`supabase/migrations/202611090001_mvp.sql`](supabase/migrations/202611090001_mvp.sql) แล้วกด Run หนึ่งครั้ง
3. ตรวจใน **Table Editor** ว่ามี `profiles`, `course_records`, `calculators`, `class_slots`, `next_term_plans`, `share_links` และทุกตารางเปิด RLS

### 2. เปิด Google login

1. สร้าง OAuth client ประเภท Web application ใน Google Cloud Console
2. เพิ่ม Authorized redirect URI ใน Google เป็น `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. นำ Client ID และ Client Secret ไปใส่ใน **Supabase → Authentication → Providers → Google** แล้วเปิดใช้งาน
4. ใน **Supabase → Authentication → URL Configuration** เพิ่ม `http://localhost:3000/**` ใน Redirect URLs และตั้ง Site URL เป็น `http://localhost:3000` ระหว่างทดสอบ

### 3. ตั้งค่าและรัน backend

จากโฟลเดอร์ `reiann-backend`:

```bash
cp .env.example .env
pnpm install
pnpm dev
```

แก้ `.env` ก่อนรัน โดยใส่ Project URL และ Publishable key จริงจาก **Supabase → Project Settings → API Keys**:

```dotenv
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

ลองเปิด `http://localhost:4000/health` ควรได้ `{"data":{"status":"ok"}}` ถ้าเรียก `/v1/profile` โดยไม่ login จะได้ 401

### 4. ตั้งค่าและรัน frontend

เปิด terminal อีกหน้าที่โฟลเดอร์ `reiann-frontend`:

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

ใส่ค่าใน `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_API_URL=http://localhost:4000
```

เปิด `http://localhost:3000/th/sign-in` และเข้าสู่ระบบด้วย Google URL และ key ของทั้งสองฝั่งต้องเป็น Supabase project เดียวกัน หากแก้ค่า env ให้รีสตาร์ตทั้งสองโปรเซส

## API ที่ frontend เรียก

ทุกเส้นทางส่ง JSON รูปแบบ `{ "data": ... }` หรือเมื่อผิดพลาด `{ "error": "..." }` เส้นทางส่วนตัวต้องมี `Authorization: Bearer <Supabase access token>`

| Method | Path | ใช้ทำอะไร |
| --- | --- | --- |
| GET | `/health` | ตรวจว่า API รันอยู่ |
| GET, PUT | `/v1/profile` | อ่านและบันทึกสาขา/สถานะ onboarding |
| GET, PUT | `/v1/records` | อ่านและแทนที่รายวิชากับเกรดแบบครั้งเดียวทั้งชุด |
| POST | `/v1/transcript/skip` | ข้ามขั้น transcript |
| GET | `/v1/calculators/last` | วิชาที่ใช้ตัวคำนวณล่าสุด |
| GET, PUT | `/v1/calculators/:code` | อ่านและบันทึกคะแนน |
| GET | `/v1/slots` | ตารางเรียนภาคปัจจุบัน |
| PUT, DELETE | `/v1/slots/:id` | เพิ่ม/แก้/ลบช่วงเวลาเรียน |
| GET, POST | `/v1/share-links` | ดูและสร้างลิงก์แชร์ |
| POST | `/v1/share-links/:token/revoke` | ยกเลิกลิงก์ |
| GET | `/v1/shared/:token` | ดูตารางผ่านลิงก์ ไม่ต้อง login |
| GET, PUT | `/v1/plan` | แผนภาคถัดไป |
| DELETE | `/v1/data` | ลบข้อมูลแอปของผู้ใช้ ไม่ลบบัญชี Auth |

ตัวอย่างการเรียก API หลังได้ access token จาก Google login:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:4000/v1/profile
```

ตรวจระบบด้วย `pnpm typecheck`, `pnpm test`, `pnpm build` ใน backend และ `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build` ใน frontend

## ไฟล์สำคัญ

- [`src/server.ts`](src/server.ts): HTTP, CORS, JSON และ error responses
- [`src/db.ts`](src/db.ts): ตรวจ Supabase access token และสร้าง client ที่ส่ง JWT ต่อไปให้ RLS
- [`src/routes.ts`](src/routes.ts): เส้นทาง API และการอ่าน/เขียนฐานข้อมูล
- [`src/validation.ts`](src/validation.ts): ตรวจข้อมูลก่อนบันทึก
- [`supabase/migrations/202611090001_mvp.sql`](supabase/migrations/202611090001_mvp.sql): schema, RLS, ฟังก์ชันบันทึกเกรดและแชร์ตาราง
- `../reiann-frontend/src/data/api-repository.ts`: ฝั่งเว็บที่เรียก API ทุกเส้นทาง

## ทดสอบการเชื่อมต่อ

1. Login, เลือกสาขา และข้ามขั้น transcript
2. กรอกรายวิชา/เกรดในหน้าวิชา เพิ่มคะแนน และจัดตาราง แล้วรีเฟรชหน้า ข้อมูลต้องยังอยู่
3. เปิดด้วยบัญชี Google อีกบัญชี ต้องไม่เห็นข้อมูลบัญชีแรก
4. สร้างลิงก์แชร์ เปิดหน้าต่างส่วนตัว แล้วกดยกเลิกลิงก์ หน้าสาธารณะต้องไม่แสดงตารางอีก
5. ลองเลือกซ่อนชื่อวิชาก่อนแชร์ ผู้ดูต้องไม่เห็นรหัสวิชาหรือห้อง

## เผยแพร่จริงและข้อจำกัด

deploy backend เป็น Node service ที่รัน `pnpm build` และ `pnpm start` ตั้ง `FRONTEND_ORIGIN` ให้ตรงกับ origin ของเว็บจริง เช่น `https://example.com` ตั้ง frontend `NEXT_PUBLIC_API_URL` เป็น URL ของ backend จริง เปิด HTTPS ทั้งสองฝั่ง และเพิ่ม URL เว็บจริงใน Supabase Redirect URLs กับการตั้งค่า Google OAuth

ตัวอ่าน transcript PDF จริงยังไม่มี โหมด Supabase ให้กรอกรายวิชาเอง ไม่อัปโหลดไฟล์หรือเกรดตัวอย่าง ข้อมูลรายวิชา/หลักสูตรบางส่วนยังเป็น static mock ใน frontend; รีวิว ชีท ถามตอบ และประกาศหนังสือยังไม่มี backend วันสิ้นภาค `20 ธันวาคม 2026` และภาค `2569/1` เป็นค่าคงที่ ต้องปรับเมื่อใช้ภาคใหม่

การลบข้อมูลผ่าน API ลบข้อมูลแอป ไม่ลบบัญชี Supabase Auth การลบบัญชี Auth ต้องทำเป็น flow แยกที่ใช้ server secret key และยืนยันตัวตนเพิ่มเติม

ดู [Supabase Auth `getUser(jwt)`](https://supabase.com/docs/reference/javascript/auth-getuser), [Supabase client headers](https://supabase.com/docs/reference/javascript/initializing) และ [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) สำหรับหลักการตรวจสิทธิ์ที่โค้ดนี้ใช้
