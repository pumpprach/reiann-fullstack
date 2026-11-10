# Reiann: frontend + backend แยกกัน

ไฟล์ ZIP นี้มีสองโปรเจกต์:

- [`reiann-frontend/`](reiann-frontend/README.md): Next.js, หน้าจอ, Google login และตัวเรียก HTTP API
- [`reiann-backend/`](reiann-backend/README.md): Node.js API, การตรวจ access token, การอ่าน/เขียน Supabase และ SQL migration

เริ่มจาก [คู่มือ backend ภาษาไทย](reiann-backend/README.md) ตามหัวข้อ 1–4 เพื่อสร้าง Supabase project, ตั้ง Google login, ใส่ค่า `.env` ทั้งสองฝั่ง และเปิดสอง terminal รัน frontend กับ backend คู่กัน

ในโหมดต่อ backend หน้าเว็บเรียก `NEXT_PUBLIC_API_URL` สำหรับข้อมูลแอปทั้งหมดที่มีการบันทึก ส่วนข้อมูลวิชาและหน้าฟีเจอร์ที่ยังเป็นตัวอย่างระบุไว้ในหัวข้อ “ข้อจำกัด” ของคู่มือ backend
