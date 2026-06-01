# PDF Chapter-wise Question Generation Plan

## 1) What is happening right now (current state)

### Backend behavior
- Both PDF flows enqueue background jobs and do not generate questions synchronously.
- Admin PDF flow:
  - Endpoint: `POST /api/v1/upload/tag`
  - Controller: `backend/src/controller/uploadPdf.controller.ts`
  - Creates `BackgroundJob` with type `generate_from_pdf`, then enqueues BullMQ job.
- User PDF flow:
  - Endpoint: `POST /api/v1/user/upload/tag`
  - Controller: `backend/src/controller/userPdfUpload.controller.ts`
  - Also creates `BackgroundJob` then enqueues.
- Worker:
  - `backend/src/workers/questionWorker.ts` -> `backend/src/service/generationJobHandler.ts`
  - For PDF jobs: attempts summary-based generation first, falls back to subject-knowledge generation.

### Data model today
- No chapter entity exists.
- Questions are grouped by subject/exam, not by chapter.
- `BackgroundJob` has subject/exam metadata only.
- `Pdf` has subject/exam metadata only.

### Limits today (important)
- Config defines:
  - `USER_PDF_MAX_PAGES` default 30
  - `USER_PDF_MAX_QUESTIONS` default 100
  - `MAX_QUESTIONS_PER_PERIOD` fixed 50 (user limit in 15 days)
- User route includes a `validatePDF()` helper, but it is currently not called in the PDF tag flow.
- Frontend shows max pages from quota, but page count is not enforced server-side in the current upload-tag path.

### Direct answer to your question: can we upload 20 or 50 pages now?
- 20 pages: Yes, practically possible.
- 50 pages:
  - User side: intended limit is 30 pages by config; however, current page-count enforcement is effectively missing in tag flow.
  - Admin side: no explicit page-count limit in the current flow.
- So today it is inconsistent and needs explicit enforcement logic.

---

## 2) Your new requirement (PDF-only)

1. Add one more required field: `chapter` (in addition to entrance exam and subject).
2. Add optional `nickname` for reference only.
3. Original chapter name is canonical; nickname is display/reference only.
4. Questions should be tracked chapter-wise.
5. Multiple uploads for same chapter should accumulate total generated questions.
   - Example: first upload 40 + second upload 30 = chapter total 70.
6. Scale output by PDF size:
   - ~20 pages -> at least 50 questions.
   - ~50 pages -> around 100 to 120 questions.
7. Token cost is not a blocker.

---

## 3) Internet-based clarity applied to design

### Findings used
- OpenAI file input guidance: PDF processing includes extracted text + page images, which increases token usage and quality context.
- Responses/text guidance: use deterministic prompts/structured output/evals to keep output reliable.
- Assessment design references show larger assessments often use item volume scaling by section/time, supporting page-to-question scaling strategy.

### Practical implication for our implementation
- For quality and consistency, chapter-wise generation should:
  - Use deterministic scaling rules from page count.
  - Use stronger structured generation prompts.
  - Keep background execution and retries.
  - Add post-generation top-up loop when generated count is below chapter target.

---

## 4) Proposed target design

## 4.1 New chapter domain model
Create a chapter model to make chapter the primary unit for PDF generation tracking.

- New collection: `Chapter`
- Suggested fields:
  - `subjectId` (ObjectId)
  - `entranceExamId` (ObjectId)
  - `chapterName` (required, canonical)
  - `chapterSlug` (normalized unique key per exam+subject+chapterName)
  - `nickname` (optional; latest alias entered by user/admin)
  - `createdBy` (optional)
  - `isActive` (default true)
  - timestamps
- Unique index: `(entranceExamId, subjectId, chapterSlug)`

## 4.2 Attach chapter to generated artifacts
- Update `Pdf` model to include `chapterId` and `chapterNameSnapshot`.
- Update `QuestionModel` to include:
  - `chapterId` (ObjectId)
  - `chapterName` (snapshot for simple reads)
- Update `BackgroundJob` to include chapter metadata:
  - `chapterId`, `chapterName`, `chapterNickname`.

## 4.3 Chapter totals and cumulative tracking
Option A (recommended for correctness):
- Compute totals using aggregation from `QuestionModel` by `chapterId`.
- Keep optional denormalized counters in `Chapter` for fast UI.

Option B (faster to build, less robust):
- Store cumulative totals in `Chapter` only and increment after each job.

Recommended fields in `Chapter` if denormalized:
- `totalQuestionsGenerated`
- `lastGeneratedAt`
- `totalPdfUploads`

## 4.4 New request contract for PDF tagging
Current required fields: `fileName`, `key`, `subjectId`, `entranceExamId`

New required fields:
- `chapterName`

New optional fields:
- `chapterNickname`
- `requestedQuestions` (optional override; still bounded by policy)

Validation rules:
- `chapterName` required, trimmed, min length 2, max length 120.
- `chapterNickname` optional, max length 80.

## 4.5 Page-to-question scaling policy
Introduce deterministic function:
- `calculateTargetQuestions(pageCount: number): number`

Proposed policy:
- Min floor for meaningful PDFs:
  - `target >= 50` when pageCount >= 20
- 50-page expectation:
  - `target in [100, 120]` for ~50 pages
- Suggested formula:
  - `base = Math.ceil(pageCount * 2.2)`
  - clamp by policy bounds, then adjust by quality tier.

Simple practical mapping table (easier to reason about):
- 1-9 pages: 20-35
- 10-19 pages: 35-49
- 20-29 pages: 50-75
- 30-39 pages: 70-95
- 40-50 pages: 90-120
- >50 pages: either split per chapter part or cap per job and enqueue chained jobs

Important: if user quota remains 50/15 days, user route cannot satisfy 100-120 in one run. We must decide policy change for user flow.

---

## 5) Required changes by layer

### 5.1 Backend: models and migrations
1. Create `backend/src/models/chapter.model.ts`.
2. Update:
   - `backend/src/models/pdf.model.ts`
   - `backend/src/models/questions.model.ts`
   - `backend/src/models/backgroundJob.model.ts`
3. Add indexes for chapter queries.
4. Add backfill script for existing questions/pdfs with no chapter.

### 5.2 Backend: controllers
Update both PDF tag controllers to accept chapter fields:
- `backend/src/controller/uploadPdf.controller.ts` (admin)
- `backend/src/controller/userPdfUpload.controller.ts` (user)

Behavior changes:
1. Resolve/create chapter from exam+subject+chapterName.
2. Save nickname if provided.
3. Save chapter on PDF and BackgroundJob.
4. Compute target questions from actual pageCount (from uploaded PDF metadata).
5. Enforce page limits explicitly and consistently.
6. Return response containing:
   - `chapterId`
   - `chapterName`
   - `chapterNickname`
   - `targetQuestions`
   - `chapterTotalQuestions` (if available)

### 5.3 Backend: worker/job pipeline
Update:
- `backend/src/types/job.types.ts`
- `backend/src/service/generationJobHandler.ts`

Add to payload:
- `chapterId`
- `chapterName`
- `chapterNickname` (optional)
- `pageCount`
- `targetQuestions`

Worker behavior:
1. Generate until `targetQuestions` for this job (with existing dedupe + top-up loops).
2. Persist `chapterId` in every inserted question.
3. Update chapter cumulative totals after completion.
4. Mark job `partial` if target not achieved after capped retries.

### 5.4 Backend: API endpoints for chapter reporting
Add endpoints (admin + user scoped where appropriate):
1. `GET /api/v1/chapter/:id/stats`
   - total questions generated, total uploads, last generation, job history
2. `GET /api/v1/chapter/by-subject?examId=&subjectId=`
   - list chapters and totals

### 5.5 Frontend (user + admin)
PDF form updates:
- Add required `Chapter Name` field.
- Add optional `Nickname` field.
- Keep entrance exam + subject selection.

After submission:
- Show queued job with chapter context.
- Show chapter cumulative counter (e.g., "Class 11 Maths Ch-3 total: 70").

Files to update (at minimum):
- User UI:
  - `frontend/src/components/GenerateQuestionsTab.tsx`
  - `frontend/src/pages/UploadPdf.tsx` (if still used)
- Admin UI:
  - `admin-frontend/src/pages/Questions.tsx`
  - `admin-frontend/src/pages/UploadPdf.tsx`

### 5.6 Validation and policy alignment
Must choose one of these policies:

Policy A (strict current user quota):
- Keep user max 50 per 15 days.
- 100-120 output only for admin/internal pipeline.

Policy B (new chapter policy for users):
- Increase or redesign user quota so 50-page PDFs can return 100-120.
- Example: chapter-based quota bucket separate from direct generation quota.

Without this policy decision, requirement and current user quota conflict.

---

## 6) Execution plan (phased)

### Phase 0: Product decisions (required before coding)
1. Decide user quota policy (A or B above).
2. Decide max pages globally for user/admin (same or different).
3. Decide if >50 pages are allowed in one job or split into multiple chapter-part jobs.

### Phase 1: Data model and contracts
1. Add Chapter model and indexes.
2. Add chapter fields in Pdf, Question, BackgroundJob.
3. Extend payload and controller request schemas.
4. Add DB backfill script for old records.

### Phase 2: PDF ingestion and targeting
1. Enforce real PDF page counting in tag flows.
2. Implement `calculateTargetQuestions(pageCount, policy)`.
3. Attach chapter metadata at enqueue time.

### Phase 3: Worker generation and totals
1. Ensure per-job target fulfillment loops for chapter jobs.
2. Persist chapter references in questions.
3. Update chapter cumulative totals on completion.
4. Add partial-job handling when target not met.

### Phase 4: UI and UX
1. Add chapter name + nickname fields.
2. Send new fields in tag payload.
3. Display chapter total questions and job progress.

### Phase 5: Testing and rollout
1. Unit tests:
   - chapter resolution
   - question target calculation
   - cumulative totals
2. Integration tests:
   - upload 20-page PDF -> >=50 questions target path
   - upload 50-page PDF -> 100-120 target path (policy dependent)
   - repeated uploads same chapter -> cumulative total increases correctly
3. Dry-run with staging queue + monitoring.
4. Backfill old data and release behind feature flag.

---

## 7) Acceptance criteria

1. PDF generation request fails if `chapterName` is missing.
2. Questions generated from PDF always store `chapterId`.
3. Chapter totals are visible and cumulative across repeated jobs.
4. 20-page PDF meets >=50 target under successful generation conditions.
5. 50-page PDF meets 100-120 target where quota/policy allows.
6. Job history and status include chapter context.
7. Page-limit behavior is explicit and consistent in both user/admin flows.

---

## 8) Risks and mitigations

- Risk: quota conflict with 100-120 requirement.
  - Mitigation: finalize policy before implementation.
- Risk: long-running jobs/timeouts for large PDFs.
  - Mitigation: chunked generation waves + partial status + retries.
- Risk: duplicate chapter naming variants.
  - Mitigation: chapter slug normalization and unique index.
- Risk: inconsistent old records.
  - Mitigation: migration/backfill script + null-safe UI.

---

## 9) Recommended immediate next action

1. Approve quota policy (A or B).
2. Confirm page limits for user and admin.
3. Then implementation starts with Phase 1 (schema + API contract), followed by worker and UI changes.
