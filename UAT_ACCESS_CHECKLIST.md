# UAT Access Checklist (1 user = 1 company)

Date: 2026-02-21

## Goal
- ยืนยันว่า RLS + policy ป้องกันการเห็นข้อมูลข้ามบริษัทได้จริง
- ยืนยันว่าผู้ใช้ที่เป็นสมาชิกบริษัทใช้งานหน้า `market`, `operation`, `finance`, `ai-agent` ได้ตามปกติ

## Pre-requisites
- มีบัญชีทดสอบ 2 บัญชี
- `Member user`: อยู่ใน `company_user_members` และ `is_active = true`
- `Non-member user`: ไม่มี membership (หรือ inactive)
- deploy ล่าสุดถูกใช้แล้ว (migrations + `ai-agent`)

## SQL Verification (ก่อน UAT หน้าเว็บ)
- รันไฟล์ `supabase/sql/uat_access_checks.sql`
- ใส่ค่า `entity_id`, `member_user_id`, `non_member_user_id` ก่อนรัน
- ผลที่คาดหวัง:
- `member_user_id` เห็นข้อมูล scoped tables ได้
- `non_member_user_id` เห็น `0` rows ใน scoped tables และ `company_user_members = 0`

## UI UAT - Member user
1. Login ด้วย member user
2. เปิด `index.html` แล้วสลับ view `market-map`, `dashboard`, `finance`, `ai-agent`
3. ตรวจว่าไม่มี JS error และข้อมูลโหลดได้
4. กดแถวบริษัทจาก Market แล้วเปิด `company-detail.html` ได้
5. เปิด `delivery-detail.html` จาก flow ปกติได้
6. สร้างแชตใหม่ใน AI Agent ได้ และเห็นเฉพาะบทสนทนาของตัวเอง

## UI UAT - Non-member user
1. Login ด้วย non-member user
2. เปิดทุก view เดิม
3. ผลที่คาดหวัง:
- ไม่เห็นข้อมูล domain หลัก (ควรเป็น empty/0 rows หรือข้อความสิทธิ์ไม่พอ)
- ไม่เห็นบทสนทนาที่สร้างโดย member user
- ถ้าสร้างแชตใหม่ไม่ได้ ให้แสดง error จาก policy (ถือว่าถูกต้องตาม security model)

## Pass Criteria
- ไม่มีข้อมูลข้ามบริษัทให้เห็น
- AI conversation isolation ทำงานตาม owner + membership policy
- member user ใช้งาน flow หลักได้ครบ
- non-member user ไม่สามารถอ่าน domain data ได้

## Notes
- Security Advisor ที่เหลือ `auth_leaked_password_protection` เป็นข้อจำกัดจาก Free plan (ไม่ใช่ regression ของ schema/policy)
- ถ้ายังไม่มี non-member account จริง: ใช้ non-member simulation โดยตั้ง `company_user_members.is_active=false` ใน transaction แล้ว `ROLLBACK`
