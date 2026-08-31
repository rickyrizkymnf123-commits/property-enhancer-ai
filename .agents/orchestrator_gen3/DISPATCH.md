## 2026-08-31T18:57:11+07:00

Fix AI Studio Image Enhancement Error Handling & Kobil LLM Proxy Auth Integration in Property Enhancer AI.

Requirements:
1. R1. Strict Error Guard & Result View Suppression:
   When the AI Provider API (Kobil LLM Proxy / Edge Function) returns an HTTP error (such as HTTP 401 Invalid proxy server token, 400 Bad Request, or 500 Server Error), the system MUST NOT render or display the "SESUDAH (AI)" slider image or any fallback image. The Before/After slider MUST remain hidden/suppressed, and only the prominent error alert card/toast detailing the raw server HTTP response should be shown.

2. R2. Kobil LLM Proxy API Key & Token Credentials Resolution:
   Ensure KobilLlmConfigView.tsx, useRealtimeEnhancement.ts, mockSupabase.ts, and supabase/functions/enhance-image/index.ts read and pass the active API Key entered by Admin/User cleanly in the Authorization: Bearer <key> header to https://api.koboillm.com/v1/chat/completions.

Acceptance Criteria:
- Error Guarding & Result View Behavior:
  - When AI API returns an HTTP error (e.g., HTTP 401 token_not_found_in_db), the Before/After slider is NOT rendered or displayed.
  - UI displays a clear, prominent error card showing the HTTP error status and raw server JSON error message.
- Valid AI Generation Workflow:
  - When AI API returns HTTP 200 with valid image output, Before/After slider renders the exact generated image.
  - All unit and E2E tests in Vitest pass 100%.
