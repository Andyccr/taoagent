# Taoagent development rules

- Keep AGENTS.md and CLAUDE.md identical.
- Keep the application minimal: Node.js built-ins, plain HTML/CSS/JavaScript, TypeScript server. Pi Agent Core, Pi AI and Pi MCP 1.3.0 are explicitly authorized runtime dependencies. Keep group scheduling in the application; do not add frameworks or services without a request.
- All user state belongs under home/ (or TAOAGENT_HOME). Store readable UTF-8 Markdown, JSON and JSONL; use relative IDs, never machine-specific paths in active records.
- Preserve complete history and original migrated records. Write through atomic rename. Do not silently truncate current input or mutate long-term memories.
- Use proper TypeScript types; never use any or disable checks to hide errors.
- Never stop an existing development or user server without explicit permission. Choose a free local port for verification.
- Bind only to 127.0.0.1. Keep same-origin protections. Never return model API keys to the browser or log them.
- Run npm test and npm run lint:baseline after runtime changes. Verify live HTTP streaming and portable ZIP restoration. If no working model credentials exist, report that real-provider chat could not be verified.
- Add meaningful regression coverage for confirmed behavior. Do not require real API keys for automated tests.
- Portable exports must include program sources and all home/ data, include the release bundle, pinned lockfile and Windows runtime with licenses; exclude node_modules, Git and build caches, and reject symbolic links. Preserve the source archive separately.
- Never reference AI tools or providers in commit authorship messages. Do not commit personal home/ data or keys.
- Every update must deliver an unpacked Windows release folder with a directly runnable Taoagent.exe and Start/Stop/Check CMD launchers, in addition to ZIP and source archives. If an existing launcher is running, build in an isolated directory and preserve that process.
