# TODO

- [x] Re-login MCP: ปิด/เปิด session ใหม่ให้ `supabase` MCP auth ติดสมบูรณ์ แล้วทดสอบ query ได้จริง
- [x] Market Map Coverage: ดึงรายการ `companies.location` ทั้งหมดจาก Supabase เพื่อหาเคสที่ยัง unmapped
- [ ] Market Map Coverage: เพิ่ม alias/normalization จน `Coverage` = `100%` (ทั้ง locations และ rows)
- [x] Market Map Zoom: ปรับแผนที่ให้ zoom ใกล้ที่สุดที่ยังครอบคลุมทุกประเทศที่มีข้อมูลในหน้าจอเดียว
- [ ] Market Validation: ตรวจหน้า `Market` รอบสุดท้าย (status text, coverage block, unmapped list ควรเป็น 0)

- [x] สร้างแท็บใหม่ชื่อ `AI Agent` ในหน้า dashboard
- [x] ออกแบบให้ `AI Agent` วิเคราะห์ข้อมูลจาก Supabase
- [x] กำหนดโครงสร้างการเรียกใช้งานโมเดลแบบ API (request/response/error handling)

- [x] แก้ปัญหา Operation tab หลัง rename table: query เดิมอ้าง public.contract_lines/public.contracts ย้ายเป็น operation_lines/operation_contracts (รวม operation_deliveries) แล้ว
- [x] AI Agent ChatGPT-like: Conversation UI (thread + composer + loading/error)
- [x] AI Agent ChatGPT-like: Conversation persistence (create/list/open/rename/delete)
- [x] AI Agent ChatGPT-like: Message persistence (role/content/timestamp)
- [ ] AI Agent ChatGPT-like: Streaming response
- [x] AI Agent ChatGPT-like: Read-only tool/query layer with allowlist tables
- [x] AI Agent ChatGPT-like: Source citations in assistant answers
- [ ] AI Agent ChatGPT-like: Guardrails (cross-universe policy + unsafe query blocking)
- [ ] AI Agent ChatGPT-like: Telemetry/logging for request + tool usage
- [x] AI Agent quality: แก้ context ให้ไม่ bias ไปที่ finance อย่างเดียว (ต้องตอบได้ทั้ง market/operation/finance ตามคำถาม)
- [x] AI Agent output format: แก้การแสดงผล markdown ที่ไม่ต้องการ (เช่น `**ตัวอย่าง**` แสดงเป็นตัวหนา)
- [x] AI Agent completeness: แก้ปัญหาคำตอบขาดตอน/ตอบไม่ครบจำนวนข้อที่ผู้ใช้สั่ง (เช่น ขอ 6 ข้อแต่ได้ 2 ข้อ)
- [x] AI Agent reliability: เพิ่ม fallback เมื่อคำตอบถูกตัด (auto-continue หรือขอโมเดลตอบต่อให้ครบ)
- [x] AI Agent analytics depth (2026-02-17): เพิ่ม context monthly performance ทั้ง Finance/Operation และเพิ่ม row coverage metadata
- [x] AI Agent analytics depth (2026-02-17): เพิ่ม Top 10 ลูกค้า Finance (USD/Tons) และ Operation (planned/delivered/remaining tons)
- [x] AI Agent prompt policy (2026-02-17): บังคับแนวตอบให้ใส่ตัวเลข+ช่วงเวลา และคืน Top N ให้ครบเมื่อข้อมูลพอ
- [x] AI Agent analytics depth (2026-02-17): เพิ่ม intent-to-tool router และ focused views ตามคำถาม (monthly/top/risk/stock/market concentration)
- [x] AI Agent analytics depth (2026-02-17): เพิ่ม metric เฉพาะทางรายตาราง (finance MoM, overdue by customer, stock by factory/type, market concentration)
- [ ] AI Agent analytics depth (next): เพิ่ม guardrails ระดับ query-shape + audit trail ต่อ intent สำหรับตรวจสอบย้อนกลับ
- [ ] Cleanup: เมื่อทำรายการ AI Agent ChatGPT-like ครบทั้งหมดแล้ว ให้ลบไฟล์ `SPEC_AI_AGENT_CHATGPT.md`

## Trade Performance Redesign (2026-02-17)

- [x] สร้างสเปก `Trade Performance` ฉบับลงมือทำได้ในไฟล์ `SPEC_TRADE_PERFORMANCE.md`
- [ ] Trade Performance MVP: ลดหน้าให้เหลือ KPI สำคัญ + 2 กราฟหลัก (Sales vs Delivery, Inventory Signal)
- [ ] Trade Performance MVP: ทุก widget ต้องแสดง period + unit ชัดเจน
- [ ] Trade Performance MVP: เพิ่ม Action Queue (impact-ranked) สำหรับงานที่ต้องทำก่อน
- [ ] Trade Performance MVP: เพิ่มตาราง Order/Shipment แบบ compact และ pagination `Prev`/`Next`
- [ ] Trade Performance MVP: ตัด/แก้ metric ที่กำกวม (เช่น average ที่ไม่มีสูตร/ช่วงเวลา)
- [ ] Trade Performance Next: เพิ่ม Admin Control flow สำหรับอัปเดตข้อมูลฝั่ง operation โดยตรงในระบบ
- [ ] Trade Performance Next: เพิ่ม one-click lead signal ใน Market list (pin/deprioritize/follow-up)

## Post-deploy Watchlist (2026-02-17)

- [ ] Provider plan note: ตอนนี้ใช้ Gemini API แบบ free tier จึงอาจเจอ rate/quota limit และผลกระทบด้าน context บางช่วง
- [ ] Provider plan note: เตรียมอัปเกรดเป็น paid plan (target: เร็ว ๆ นี้) เพื่อเพิ่ม capacity และลดข้อจำกัดจาก free tier
- [x] Fix incident (2026-02-17): Edge Function `ai-agent` ตอบ 401/non-2xx เพราะ verify_jwt เปิดอยู่; redeploy ด้วย `--no-verify-jwt` แล้วทดสอบได้ 200
- [x] Fix incident (2026-02-17): ลดโอกาส `500 non-2xx` จาก provider โดยเพิ่ม fallback response + จำกัด payload (`messages/prompt`) ใน `ai-agent`
- [x] Fix incident (2026-02-17): ปรับ logic `overdue` ให้ใช้สูตรเดียวกันระหว่าง summary กับ list (ลดคำตอบไม่ตรงกันเรื่องจำนวน overdue)
- [x] Fix incident (2026-02-17): เพิ่มตาราง `market_status_definitions` และ feed เข้า `ai-agent` เพื่อให้ตอบความหมาย `yellow/green` ตามนิยามธุรกิจ
- [ ] Next step (defer): เพิ่ม FK `companies.status` -> `market_status_definitions.status_code` หลังยืนยันข้อมูล status ครบและสะอาด
- [x] Stock UI (2026-02-17): แยกเป็นแท็บใหม่ `Stock` พร้อม KPI 4 ใบ + line chart + vertical bar
- [ ] Stock UI (defer): ตารางรูปแบบเดียวกับ Finance
- [ ] Stock UI (defer): ยังไม่ต้องมี filter/sort
- [ ] Stock UI (defer): pagination มีเฉพาะปุ่ม `Prev`/`Next` และไม่ต้องมีปุ่ม/ตัวเลือกเลข `10`
- [ ] ตรวจ logs ของ `ai-agent` 24 ชั่วโมงแรก (error rate, timeout, provider error, 401/403)
- [ ] ตั้งค่า quota/billing ของ Gemini (`generate_content_free_tier_requests`) หรือเพิ่ม backoff queue เพื่อไม่ชน 429 ช่วงถามถี่
- [ ] หากคำตอบยังไม่แม่นยำตาม intent ให้ tune regex ของ intent router และปรับ `focused_views`
- [x] หากคำตอบยาวเกิน/ช้า ให้ลด context payload size และปรับ `maxOutputTokens`
- [ ] ตรวจว่าข้อความใน UI แสดง `Sources` และ `Intent` ครบทุกคำตอบที่มี citation/tool report
- [ ] เพิ่ม alert/telemetry เมื่อ tool layer ปิดการทำงาน (เช่นไม่มี runtime env หรือ query error ต่อเนื่อง)

## Origo Meeting Tasks (2026-02-17 & 2026-02-18)

### or_dashboard (legacy meeting notes)

#### Customer List (Market Intelligence - main page)
- [x] Add pin/checkbox column on the far left for marking priority customers
- [ ] Add drag-and-drop reordering via 3-bar handle (like standard UX pattern)
- [ ] Add 1-click "not interested" signal button per customer row -> triggers request to BA for follow-up

## Market UX Priorities (2026-02-19)

- [ ] Market Table: เพิ่มคอลัมน์ `Request` (ปุ่มต่อแถว) พร้อมสถานะปุ่ม `Request` -> `Requested`
- [ ] Market Table: กำหนด action เมื่อกด `Request` (เปิด modal สั้น ๆ เพื่อใส่ note/เหตุผล ก่อน submit)
- [ ] Market Table: เก็บ request ลงฐานข้อมูลใหม่ (เช่น `market_requests`) โดยมี `company_id`, `request_type`, `note`, `status`, `requested_at`, `requested_by`
- [ ] Market Table: แสดงสถานะ request ในตาราง (badge เช่น `pending`, `in_review`, `done`) และรองรับ refresh แล้วยังเห็นสถานะเดิม
- [ ] Market Table: เพิ่ม guard ป้องกันกดซ้ำ + optimistic UI + error toast

- [ ] Market Map: เพิ่ม legend สี + ความหมายระดับสีให้ชัด (low/medium/high trades)
- [ ] Market Map: ปรับ tooltip ให้สั้นและอ่านเร็ว (Country, Companies, Trades, Top Product) และจัดบรรทัดเดียวต่อ metric
- [ ] Market Map: เพิ่ม loading/empty state สำหรับ tooltip (ไม่มีข้อมูลแสดงข้อความเดียว)
- [ ] Market Map: จำกัดข้อมูลใน tooltip ไม่เกิน 4 บรรทัด + truncate พร้อม `...` เพื่อไม่บังแผนที่
- [ ] Market Map: ทดสอบ UX บนจอเล็ก (tablet/mobile) และปรับตำแหน่ง tooltip ไม่ให้ล้นขอบ

- [ ] Market Validation: รีวิวสุดท้ายร่วมทีม (เจ้าของโปรดักต์/หัวหน้า) ด้วย checklist: table action flow, map readability, tooltip clarity

#### Company Info + Contact tab
- [ ] Merge Company Info and Contact into a single tab (reduce unnecessary clicks)
- [ ] Contact UX: จัดลำดับรายการ contact/email ให้ชัดเจน (กำหนด default sort เช่น primary ก่อน แล้วค่อยล่าสุด)
- [ ] Contact UX: ต้องแสดง `contact_name` คู่กับ `email` ทุกแถว (ไม่ให้เห็นแค่อีเมลลอย ๆ)
- [ ] Contact UX: เพิ่ม `LinkedIn` ของ contact/customer (ถ้ามี) และแสดงเป็นลิงก์กดได้
- [ ] Contact UX: เพิ่ม fallback label เมื่อข้อมูลไม่ครบ (เช่น `No name`, `No LinkedIn`) เพื่อให้ผู้ใช้เข้าใจทันที
- [ ] Contact UX: ตรวจ schema/ข้อมูลจาก `company_email` และ `company_info` ว่ามี field รองรับ `name` และ `linkedin` หรือไม่; ถ้าไม่มีกำหนด migration เพิ่ม

### Next After Re-Auth (Contact issue from head)
- [x] Re-auth Supabase MCP แล้วรัน SQL ตรวจ schema/data จริงของ `company_email` และ `company_contract`
- [x] ยืนยัน source of truth: ชื่อ + LinkedIn ใช้จาก `company_contract` หรือมีใน `company_email` ด้วย
- [x] กำหนด default sort สำหรับ 2 ตาราง (เช่น `created_at desc` + `importance` ถ้ามี)
- [x] ปรับ `Contact Directory` ให้แสดง `LinkedIn` เป็นลิงก์กดได้ (fallback: `No LinkedIn`)
- [x] ปรับ `Known Emails` ให้มีชื่อกำกับอีเมล (ผ่าน join/mapping หรือ fallback `No name`)
- [ ] UAT กับหัวหน้า: เช็กว่า “email เรียงชัดเจน + มีชื่อ + มี LinkedIn” ตรง feedback แล้ว

#### Supply Chain section
- [ ] Show only 2 sections: (1) who supplies to the customer, (2) who the customer sells to
- [ ] Remove 3rd section - no data available for it

#### Purchase History
- [ ] Display import/buying history for each customer (focus on import side only)

#### AI Agent (per company)
- [x] Add per-company AI agent panel for querying company-specific data
- [x] Scope: agent only answers questions about that specific company

### or_catalog (confirmed from or_2026-02-19.txt)

#### Product Catalog page
- [ ] Design product catalog page (reference: Makro-style product listing)
- [ ] Product Catalog MVP fields: `product_name`, `hero_product`, `description`, `hs_code` (optional), `product_image`
- [ ] Keep product card content simple first (name + image + short description) and expand later if needed
- [ ] Keep naming flexible: `hero_product` label can be renamed later
- [ ] Support export catalog as PDF

#### Admin: Upload & Edit Data
- [ ] Allow customers to upload and edit product data via admin panel
- [ ] Team handles initial setup; customer self-manages after that
- [ ] UI: single-page form (Excel-like row input), one form per product entry

#### AI Chatbot (WhatsApp / Line integration)
- [ ] Prioritize WhatsApp integration (easier API)
- [ ] Design topic-selection step before free-text input (e.g., order, shipment, overdue)
- [ ] Goal: narrow AI scope so answers are more accurate

#### AI Email Suggestion
- [ ] AI drafts outbound emails based on catalog data + customer interaction history
- [ ] System logs all email/call/chat activity per customer for AI context

#### Deployment Notes
- [ ] ก่อน deploy รอบถัดไป: ให้ผู้ใช้สร้าง Vercel project ใหม่ก่อน แล้วค่อย deploy
