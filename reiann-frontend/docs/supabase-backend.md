# Backend แยกสำหรับ Reiann

Backend อยู่ในโฟลเดอร์พี่น้อง [`reiann-backend`](../../reiann-backend/README.md) คู่มือที่นั่นมีขั้นตอนสร้าง Supabase project, รัน SQL, เปิด Google login, ใส่ค่า `.env`, เปิด frontend กับ backend และทดสอบการเชื่อมต่อ

Frontend เรียก HTTP API ผ่าน [`src/data/api-repository.ts`](../src/data/api-repository.ts) โดยใช้ Supabase client เฉพาะการเข้าสู่ระบบ Google และส่ง access token ให้ backend ข้อมูลแอปไม่ได้อ่านตาราง Supabase จาก frontend โดยตรง
