# ตั้งค่า GitHub และ Vercel สำหรับ reiann-frontend

อัปเดต: 8 พ.ย. 2569 · ใช้คู่กับ `tech-decisions.md`

## 1. สร้าง repository

| ช่อง | ค่าที่แนะนำ | เหตุผล |
|---|---|---|
| Owner | `Pakkapon06` (บัญชีตัวเอง) หรือ org `cnc-csku` | ถ้าจะทำกับทีมระยะยาว ใช้ org จะเพิ่มคนและสิทธิ์ได้ง่ายกว่า |
| Repository name | `reiann-frontend` | คู่กับ `reiann-backend` ที่จะสร้างทีหลัง |
| Visibility | **Private** | ยังเป็นงานทดลอง และมีข้อมูลตัวอย่างของนิสิต |
| Initialize with README / .gitignore / license | **ไม่ติ๊ก** | โปรเจกต์มีไฟล์เหล่านี้อยู่แล้ว ถ้าติ๊กจะ push ครั้งแรกไม่ได้ |

สร้างผ่านเว็บที่ github.com/new หรือคำสั่งนี้ (ใช้บัญชี `gh` ที่ล็อกอินอยู่)

```bash
gh repo create Pakkapon06/reiann-frontend --private --description "Reiann web app (Next.js)"
```

จากนั้นเพิ่ม remote และ push ครั้งแรก (ต้องมี commit ก่อน)

```bash
git remote add origin https://github.com/Pakkapon06/reiann-frontend.git
git push -u origin main
```

## 2. Settings → General

- **Default branch:** `main`
- **Features:** เปิด Issues · ปิด Wiki (เอกสารอยู่ใน `docs/` แล้ว) · Projects เปิดถ้าทีมจะใช้บอร์ดงาน
- **Pull Requests:**
  - เปิดแค่ **Allow squash merging** (ประวัติใน `main` เป็น 1 commit ต่อ 1 PR อ่านง่าย) ปิด merge commit และ rebase
  - เปิด **Always suggest updating pull request branches**
  - เปิด **Automatically delete head branches** (ลบ branch หลัง merge ให้เอง)

## 3. Settings → Rules → Rulesets (ป้องกัน `main`)

สร้าง ruleset ชื่อ `protect-main` ใช้กับ default branch แล้วเปิด

- **Restrict deletions** และ **Block force pushes**
- **Require a pull request before merging**
  - Required approvals: `0` ตอนทำคนเดียว · เปลี่ยนเป็น `1` เมื่อมีเพื่อนร่วมเขียนโค้ด
  - เปิด **Dismiss stale approvals when new commits are pushed**
- **Require status checks to pass:** เลือก `Lint, typecheck, test, build` (มาจาก `.github/workflows/ci.yml` จะเลือกได้หลัง CI รันครั้งแรก) และเลือก Vercel ด้วยถ้าอยากให้ preview build ผ่านก่อน merge
- **Require linear history** (เข้ากับ squash merge)

## 4. Settings → Collaborators

เชิญเพื่อนในทีมด้วยสิทธิ์ **Write** ส่วนคนที่แค่ดูหรือรีวิวใช้ **Read** ถ้าใช้ org ให้สร้าง Team เช่น `reiann-dev` แล้วให้สิทธิ์ทั้ง team

## 5. Settings → Code security

- เปิด **Dependabot alerts** และ **Dependabot security updates**
- เปิด **Secret scanning / Push protection** ถ้าแผนของบัญชีรองรับใน private repo
- ห้าม commit ไฟล์ `.env*` (`.gitignore` กันไว้แล้ว) คีย์ของ Supabase ใส่ใน Vercel → Environment Variables เท่านั้น

## 6. Actions

`.github/workflows/ci.yml` รัน `lint`, `typecheck`, `vitest` และ `build` ทุก PR และทุก push เข้า `main` ไม่ต้องตั้ง secret ใด ๆ ตอนนี้ Playwright จะเพิ่มทีหลังเมื่อติดตั้งเบราว์เซอร์สำหรับทดสอบ

## 7. วิธีทำงานประจำวัน

1. แตก branch จาก `main` ตั้งชื่อ `feat/...`, `fix/...`, `docs/...`
2. เปิด PR (มี template ให้ใน `.github/pull_request_template.md`)
3. รอ CI ผ่าน และเปิดลิงก์ preview ของ Vercel ลองหน้าที่แก้
4. Squash merge แล้ว Vercel จะ deploy production ให้เอง

## 8. Vercel

| ค่า | ตั้งเป็น |
|---|---|
| Project name | `reiann` (ได้ URL `reiann.vercel.app` ถ้ายังว่าง) |
| Framework | Next.js (ตรวจเจอเอง) |
| Root directory | `.` (repo นี้มีแค่ frontend) |
| Install / Build | ตรวจเจอ pnpm และ `next build` เอง ไม่ต้องแก้ |
| Production branch | `main` |
| Preview deployments | ทุก PR ได้ลิงก์ของตัวเอง |
| Environment variables | เดโมยังไม่ต้องใช้ · ตอนต่อ Supabase ใส่ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` แยก Preview กับ Production |
| Deployment protection | ค่าเริ่มต้นของ Hobby ล็อก preview ให้เฉพาะคนที่ล็อกอิน Vercel ส่วน production เปิดให้ทุกคน |
| Web Analytics | เปิดในแท็บ Analytics (ตกลงไว้แล้ว ไม่ใช้ cookie) |

ข้อควรรู้: แผน Hobby ใช้ได้เฉพาะงานที่ไม่ใช่เชิงพาณิชย์ และเพิ่มเพื่อนเป็นสมาชิกโปรเจกต์ไม่ได้ ถ้าทีมต้องเข้าไปตั้งค่าใน Vercel ด้วยต้องใช้แผน Pro หรือให้คนเดียวดูแล
