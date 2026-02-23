# TODO (Refactored 2026-02-21)

## P0 Critical (ทำก่อน)
- [x] Fix login error `Database error querying schema` ให้ล็อกอินผ่านที่ `login.html` ได้จริงสำหรับ `login@trrgroup.com`
- [ ] รัน UI UAT ด้วย 2 บัญชี (member / non-member) ให้ครบทุก view และยืนยันผลกับทีม
- [x] สรุป root cause + fix note ของ Auth schema/login ลงเอกสารถาวร (`AUTH_LOGIN_INCIDENT_2026-02-21.md`)
- [ ] Batch A: ปิดประเด็น `verify_jwt=true` ให้ใช้งานได้จริง (ปัจจุบันใช้ `--no-verify-jwt` ชั่วคราว)
- [ ] Batch A: ทำ RCA `Invalid JWT` ที่ gateway พร้อม checklist (token issuer/aud, function config, client header, project ref)
- [ ] Batch A: หลังแก้แล้ว deploy แบบ `verify_jwt=true` และยืนยันว่า AI chat ใช้งานได้ทั้ง `app.js` และ `company-detail.js`
- [ ] Batch A: เพิ่ม smoke test สำหรับ auth path ของ Edge Function (valid token = 200, invalid token = 401)

## P1 Important (ถัดไป)
- [ ] AI Agent: Streaming response
- [ ] AI Agent: Guardrails (cross-universe policy + unsafe query blocking + query-shape)
- [x] AI Agent: Telemetry / audit trail (intent, tool usage, error, latency)
- [ ] Billing/Usage: ทำ quota ต่อ `company_entities` (เช่น requests/tokens ต่อรอบบิล) และบล็อก `ai-agent` เมื่อเกิน limit
- [ ] Billing/Usage: เพิ่มแท็บ `Usage` แสดง `Used / Limit / Remaining / Reset date` ต่อบริษัท
- [ ] Investigate Edge gateway `verify_jwt=true` incompatibility (`Invalid JWT`) to remove `--no-verify-jwt`
- [ ] เพิ่ม FK `companies.status` -> `market_status_definitions.status_code` หลังยืนยันข้อมูล status สะอาด
- [ ] Cleanup: ลบ `SPEC_AI_AGENT_CHATGPT.md` เมื่อปิดงาน AI ครบ
- [ ] Batch B: เพิ่ม AI eval จาก 8 -> 25 เคส (ไทย/อังกฤษ, JSON/plain text, company detail, trade performance, status semantics)
- [ ] Batch B: ตั้ง baseline metric จาก `ai_telemetry_events` (p50/p95 latency, fallback rate, rule_based rate, error rate)
- [ ] Batch B: เพิ่มหน้า admin/SQL report สรุป telemetry รายวัน (requests, error%, avg latency, top intents)
- [ ] Batch B: ตั้ง alert threshold (fallback > 10%, error > 2%, p95 latency > 6s)
- [ ] Batch C: ลดความช้า company detail (lazy query เพิ่มเติม + limit payload AI context + index query ที่ใช้งานบ่อย)
- [ ] Batch C: เพิ่ม persistence UAT สำหรับ `ai_conversations/ai_messages` (create, reload, delete, RLS isolation)
- [ ] Batch C: เขียน runbook incident AI (`provider down`, `edge error`, `jwt fail`, `rls deny`) พร้อมวิธี rollback

## AI Analysis Backlog (2026-02-23)
- [ ] ลด payload จาก frontend -> `ai-agent` เมื่อใช้ `strict_server_only=true` (ส่งเฉพาะ metadata ที่จำเป็น)
- [ ] ลด over-fetch (`limit(5000)`) โดยย้าย metric/summary เป็น SQL view หรือ RPC aggregate
- [ ] เพิ่ม timeout/retry ที่ฝั่ง web (`app.js`, `company-detail.js`) และฝั่ง edge provider call (`ai-agent`)
- [ ] แยก `app.js` (monolith) เป็นโมดูลย่อยตามโดเมน: market / operation / finance / ai / product
- [ ] รวม utility ซ้ำข้ามหน้า (`auth`, `ai fetch`, `format/date`) เป็น shared utilities
- [ ] เพิ่ม pagination/lazy-load สำหรับ `ai_conversations` และ `ai_messages`
- [ ] ทำ CORS allowlist สำหรับ production origin (แทน `*`) และทบทวนจุด `innerHTML`
- [ ] ขยาย AI eval จาก 8 -> 25 เคส และผูกเป็น quality gate ก่อน deploy
- [ ] ตั้ง telemetry baseline + alert: fallback rate, error rate, p95 latency

## Architecture Notes (จดไว้ก่อน)
- [ ] เพิ่มตาราง `customers` (internal customer object แยกจาก external market companies)
- [ ] เพิ่มตาราง `customer_external_company_map` (many-to-many + confidence/verification)
- [ ] ทำ onboarding template สำหรับลูกค้าใหม่: `company_entities` + user/member + mapping + UAT checklist

## Deferred / Plan Constraint
- [ ] เปิด `Leaked password protection` (ทำได้เมื่ออัปเกรด Supabase เป็น Pro)
- [ ] พิจารณาอัปเกรดแผน provider AI เมื่อเจอ quota/rate limit จริง

## Completed Recently
- [x] Benchmark หลัง optimize: DB-level initial query bundle ของ `company-detail` ลดลง ~33.27% (200 runs, เทียบ old preload trade vs new overview-only init)
- [x] เพิ่ม migration ดัชนีสำหรับ company detail/trade query (`20260223024617_optimize_company_detail_query_indexes.sql`)
- [x] Company detail performance: ย้ายการโหลด `company_history`/`company_supplychain` เป็น on-demand ตอนเปิดแท็บ `trade` (เอา eager preload ตอนเข้า page ออก)
- [x] Security hardening batches 1-3 (RLS, grants, ai-agent JWT, sandbox cleanup)
- [x] Access UAT ฝั่ง SQL/RLS + report (`UAT_ACCESS_REPORT_2026-02-21.md`)
- [x] บังคับ `1 user = 1 company` + auto-mapping trigger
- [x] เพิ่ม data-quality guard script กันข้อมูลเทสค้าง (`supabase/sql/data_quality_guard.sql`)
- [x] เพิ่มชุดทดสอบความแม่นยำ AI แบบ live (`qa/ai_accuracy/run-ai-eval.mjs`) + เอกสารวิธีรัน
- [x] เพิ่ม `ai_telemetry_events` + logging จาก `ai-agent` + deterministic answers สำหรับคำถามสำคัญ
- [x] Optimize AI RLS + FK indexes สำหรับ `ai_conversations`/`ai_messages`/`ai_telemetry_events`
