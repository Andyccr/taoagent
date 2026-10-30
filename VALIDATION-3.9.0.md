# Delivery validation — Taoagent 3.9.0

- Final release: release/server.mjs; build succeeded.
- npm run lint:baseline: passed.
- Strict TypeScript source check (noEmit, strict, NodeNext): passed.
- Final npm test: 170 tests, 169 passed; one 10-second fixture timeout in tests/self-review.test.ts under host load. Immediate isolated rerun of that unchanged file passed all six tests; the affected test completed in 641 ms. No assertions or timeouts were relaxed.
- Earlier complete suite: 168/168 passed. An additional load-contended run had one ping-pong timeout; that test passed in the later full run. These timing sensitivities remain visible in the retained logs.
- Production candidate cycle in a synthetic installation: acceptance tests, build, full regression and syntax checks passed; candidate applied and rollback restored original contents. Total 500,985 ms. This end-to-end run preceded the final bounded-copy optimization; the final copier is covered by candidate regression and cancellation tests, but has not been rebenchmarked at full dependency size.
- Live HTTP streaming and synthetic portable ZIP restoration are covered by the executed suite. Browser inspection verified separate message bubbles, narrow layout and accessible improvement controls.
- Real provider: two synthetic requests, both correct, overlapping starts, 1,445 ms total, 157 reported tokens. Pi catalogue estimate $0.0000492; actual billed/subscription cost unavailable.
- No claim of guaranteed emergence, general accuracy improvement, or OS sandbox isolation.

Logs: .validation/delivery-final-tests.log, .validation/delivery-retest.log, .validation/delivery-types.log, .validation/evolution-e2e.json, .validation/provider-evaluation.json. Screenshot: .validation/improvement-ui.png.

Start: double-click 启动 Taoagent.cmd. Keep the existing home directory. Existing user servers were not stopped; restart your server when ready to load the new release. Source, credentials, histories, memories and unrelated work remain in place.
