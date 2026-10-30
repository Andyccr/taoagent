# Taoagent 3.9.0 — implementation and validation

Date: 2026-10-24 (Europe/Berlin).

## Runtime configuration

Group session `runtimeLimits` is validated by the API and frozen on each turn. Changing group limits affects new turns; retry keeps the original limits and cumulative usage. Advanced UI exposes concurrency, model calls, listener depth and checks, per-agent events and total events; all values can be supplied to POST /api/groups or PUT /api/groups/:id as runtimeLimits.

| Setting | Default | Maximum |
| --- | ---: | ---: |
| concurrency | 2 | 8 |
| modelCalls | 24 | 200 |
| toolCalls | 80 | 500 |
| events | 16 | 100 |
| depth | 6 | 20 |
| perAgent | 4 | 30 |
| listenerFanout | 2 | 12 |
| listenerChecks | 8 | 50 |
| listenerDepth | 6 | 10 |

All values are positive integers. Event limits constrain autonomous expansion; explicit user interruptions are accepted even when the autonomous queue is full, but do not reset model/tool budgets. Fresh user input supersedes pending autonomous events. Fair dispatch prefers agents with fewer attempts and preserves each agent's event order. Existing FIFO event insertion prevents newer topics overtaking older ready work within an agent. Different agents can generate concurrently; external effects sharing an application home are conservatively serialized within the server process. A durable home lock rejects competing operations in other live servers before they run.

Acknowledgement-only replies do not trigger listener calls. Pending opportunities coalesce per member, and messages already considered are suppressed. A listener may pass silently. Failed calls remain visible and consume their reservations. Tasks waiting for unavailable dependencies remain pending with no polling; resume after providing the missing completed result.

Natural listeners may propose an answer, a concrete follow-up question, an example, a correction or a combination of prior ideas. Structured decisions persist an intent, reason and proposed contribution; the original SPEAK/PASS protocol remains compatible. Published natural replies link to their source messages. Explicit mentions and the previous conversation partner receive priority within the fanout budget. New messages arriving during an in-flight decision retain a coalesced pending opportunity. There is no hidden two-observation cap or fixed sixteen-event cap beyond the configured budgets. Default upgrades affect only idle open-discussion groups whose budgets exactly match all previous defaults; custom budgets and historical turns remain intact.

## Provenance, storage, and interruptions

Each stream includes conversationId; speaker streams also carry agentId/eventId. Message bubbles route by event ID and rendering is frame-batched. Navigation retains the in-memory streams; reload uses saved history. A new browser page cannot recover unsent text that was never received by the server. User drafts and saved interrupted assistant drafts remain separate from completed shared knowledge.

`turns.json` records limits, calls, usage, dependencies and status. Provider input/output/cache/total token reports are accumulated separately from `estimatedInputTokens`. A partial report is not a complete billing statement. Per-attempt context and native tool exchanges are in `chats/<id>/contexts/<turn>/<event>-<attempt>.json`; messages record initial and tool-read source IDs. Excerpted history reads are marked. Concurrent-draft markers indicate messages arriving after drafting began, not omitted old context. Group contexts and memory searches exclude private agent memories in all group modes; account-wide explicitly shared memory remains shared.

Stopping cancels active generations, approval waits, and cancellable operations. Completed receipts and spending persist. Already performed external effects are not undone. Member changes notify active execution lanes in the running process; operations and publication also recheck membership. Multiple application instances are supported for ordinary storage. Immediate cancellation notifications are process-local; other servers still recheck membership at execution boundaries. Conflicting external operations in another live server are rejected before execution by a durable home lock; the user may retry after that operation finishes.

## Improvement workflow

The default remains per-candidate approval. A user may grant automatic improvement through the conversation control panel or POST /api/chats/:id/improvement, with objective, acceptanceCriteria, acceptanceTests (existing tests/*.test.ts or .mjs), scope, maxIterations, maxModelCalls, maxToolCalls, maxTokens and maxMinutes. Limits: 10 candidates, 200 model calls, 500 tools, 2,000,000 token reservations, 120 minutes. GET returns grant and version history. POST operation=stop revokes the grant and aborts its active conversation. The normal Stop button also revokes an active grant.

A grant does not itself send a model request: send the concrete task in that conversation. Model/tool/token consumption is durably reserved before dispatch; retries and restart preserve it. Model reservations use UTF-8 serialized request bytes plus maximum output tokens; listener calls use conservative configured context/output bounds. Reservations are intentionally not refunded and are not measured token bills. Grants authorize only self_evolve with exactly the approved acceptance criteria and tests, within scope. Other external tools and rollback retain per-action approval.

Editable implementation: context.ts, audience.ts, communication.ts, reasoning.ts, defaults.ts, public/client.js, public/index.html, public/style.css. Core authorization, dispatch, storage, provider plumbing, build, tests and dependency manifests are readable but protected from candidate edits. Improving protected boundaries requires a normal user-directed engineering change outside automatic evolution.

Candidates retain originals, proposed files, validation output/timing, full-program baseline hash, and application journal. The validation runner uses trusted command lists and a minimal environment without inherited credentials or the user's home. Selected acceptance tests, build, all regression tests, and syntax checks must pass. Protected candidate material is hashed before/after validation. Installed source is rechecked before promotion. A source-wide lock prevents concurrent promotions even across separate homes. No server is stopped or restarted automatically.

An interrupted applying/recovering journal can be restored through the version panel or operation=recover with runId. Restoration checks all installed files against either recorded original or proposed versions and refuses unrelated edits. An active lock-owner process cannot be overridden. self_rollback requests approval and requires that installed files still match the applied version. Candidate directories are **not OS sandboxes**; trusted local execution is required. Passing tests is compatibility evidence; any stronger improvement claim requires relevant results beyond agreement between agents.

## Verification and measured outcomes

Deterministic HTTP model fixtures exercise real overlapping requests, default and configurable limits, immediate recipient delivery, per-agent ordering, persisted call budgets, usage aggregation, cancellation, departed members, dependency results, listener coalescing, and separate browser bubbles. Tests also cover parallel approvals, external-effect ordering across conversations, durable receipts, acceptance criteria/scope, protected validators, stale promotion, rollback and interrupted recovery. Browser inspection verified a narrow layout, separate messages, parallel-draft labels, and accessible improvement controls.

Final validation is recorded in VALIDATION-3.9.0.md: 169/170 passed in the last full run, with the single timed-out test passing immediately in an unchanged isolated rerun. Build, baseline syntax and strict TypeScript checks passed. Existing suite includes live HTTP streaming, bundled release CLI behavior, and portable ZIP extraction with synthetic credentials/history restored.

A bounded real-provider evaluation used deepseek-v4.1-flash through the existing Pi/OpenCode Go configuration, synthetic arithmetic only, two concurrent requests, at most 512 output tokens each, 45-second timeouts. Both completed correctly in 1,445 ms total; starts were 1 ms apart. Provider reports: 100 input + 57 output = **157 tokens** (including reported reasoning output). Pi's model-catalog cost estimate totaled **$0.0000492**; actual invoiced/subscription cost was not available and is not asserted. These two requests verify connectivity and overlapping generation, not emergent teamwork quality or general accuracy.

## Start / upgrade

Keep the existing home directory. On Windows use 启动 Taoagent.cmd (bundled Node 24.19), or run `runtime\node.exe release\server.mjs`. Other platforms need Node >=22.19 and may run `npm start`. Existing servers keep their loaded code until the user restarts them. No history or credentials need migration. Developers: `npm ci`, `npm run build`, `npm run lint:baseline`, `npm test`. Ensure the supported Node is first on PATH; the machine's global Node 22.16 is below the declared minimum.

All validation data was synthetic and separate from home. No existing server was stopped. Pre-existing repository rewrites and unrelated work were retained; no Git commit was created.
