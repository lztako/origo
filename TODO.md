# TODO (Refactored 2026-02-21)

## P0 Critical (ทำก่อน)
- [x] Fix login error `Database error querying schema` ให้ล็อกอินผ่านที่ `login.html` ได้จริงสำหรับ `login@trrgroup.com`
- [ ] รัน UI UAT ด้วย 2 บัญชี (member / non-member) ให้ครบทุก view และยืนยันผลกับทีม
- [x] สรุป root cause + fix note ของ Auth schema/login ลงเอกสารถาวร (`AUTH_LOGIN_INCIDENT_2026-02-21.md`)

## P1 Important (ถัดไป)
- [ ] AI Agent: Streaming response
- [ ] AI Agent: Guardrails (cross-universe policy + unsafe query blocking + query-shape)
- [ ] AI Agent: Telemetry / audit trail (intent, tool usage, error, latency)
- [ ] เพิ่ม FK `companies.status` -> `market_status_definitions.status_code` หลังยืนยันข้อมูล status สะอาด
- [ ] Cleanup: ลบ `SPEC_AI_AGENT_CHATGPT.md` เมื่อปิดงาน AI ครบ

## Architecture Notes (จดไว้ก่อน)
- [ ] เพิ่มตาราง `customers` (internal customer object แยกจาก external market companies)
- [ ] เพิ่มตาราง `customer_external_company_map` (many-to-many + confidence/verification)
- [ ] ทำ onboarding template สำหรับลูกค้าใหม่: `company_entities` + user/member + mapping + UAT checklist

## Deferred / Plan Constraint
- [ ] เปิด `Leaked password protection` (ทำได้เมื่ออัปเกรด Supabase เป็น Pro)
- [ ] พิจารณาอัปเกรดแผน provider AI เมื่อเจอ quota/rate limit จริง

## Completed Recently
- [x] Security hardening batches 1-3 (RLS, grants, ai-agent JWT, sandbox cleanup)
- [x] Access UAT ฝั่ง SQL/RLS + report (`UAT_ACCESS_REPORT_2026-02-21.md`)
- [x] บังคับ `1 user = 1 company` + auto-mapping trigger
- [x] เพิ่ม data-quality guard script กันข้อมูลเทสค้าง (`supabase/sql/data_quality_guard.sql`)
- [x] เพิ่มชุดทดสอบความแม่นยำ AI แบบ live (`qa/ai_accuracy/run-ai-eval.mjs`) + เอกสารวิธีรัน
