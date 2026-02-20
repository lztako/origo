# SPEC_AI_AGENT_CHATGPT.md

## Objective
Build the `AI Agent` tab with a ChatGPT-like experience for business analytics on Supabase data.

## Data Universe Policy
- `Market` = external universe: `companies`, `company_*`
- `Operation/Finance` = internal universe: `operation_*`, `finance_invoices`
- Cross-universe queries are blocked unless an explicit verified mapping layer exists.

## MVP Scope
1. Chat thread UI (user/assistant messages, loading state, error state)
2. Conversation persistence (create, list, open, continue)
3. Message persistence (store prompt/answer with timestamps)
4. AI response with streaming support
5. Read-only tool/query layer with table allowlist
6. Source citation in each assistant answer
7. Guardrails for unsafe or out-of-scope queries

## Functional Requirements
1. Composer
- Enter to send, Shift+Enter for newline
- Disable send during in-flight request

2. Conversations
- New chat
- Rename chat title
- Delete chat
- Auto-title from first prompt (fallback: `New chat`)

3. Messages
- Persist `role`, `content`, `created_at`
- Show model name + generated time
- Regenerate last assistant response

4. Tool/Query Execution
- Read-only only
- Hard row limit + timeout
- Friendly error translation for user

5. Answer Quality
- No fabricated data
- Include data source metadata when tools are used
- Explicitly state when data is insufficient

## Suggested Schema
- `ai_conversations`
- `ai_messages`
- `ai_tool_logs`

## Acceptance Criteria
1. User can start and continue conversations after page refresh.
2. AI answers stream in real time.
3. Query/tool failures are visible and recoverable.
4. Only allowed tables are queried.
5. Cross-universe policy is enforced.
6. Each data-backed answer includes source metadata.

## Rollout Plan
1. Phase 1: Conversation/message persistence + basic thread UI
2. Phase 2: Streaming + tool layer + citations
3. Phase 3: Guardrails + telemetry + UX polish

## Completion Note
When all checklist items in `TODO.md` are complete, delete this file:
- `SPEC_AI_AGENT_CHATGPT.md`
