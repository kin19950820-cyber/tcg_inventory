# Token Saving Playbook

Use this checklist when prompting Claude on this project.

## 1) Scope Requests Tightly
- Good: "Update only `src/services/pricingService.ts` and matching API route."
- Good: "Do not touch UI components."
- Avoid: "Refactor the whole app."

## 2) Ask for Search-First Workflows
- Request that Claude use `rg` to locate symbols before opening files.
- Ask for targeted reads (single feature path), not full-tree inspection.

## 3) Keep Output Compact
- Ask for concise summaries plus changed file list.
- Ask for line-level references only where needed.
- Avoid requesting full file dumps unless auditing.

## 4) Reuse Context Across Turns
- Reference prior decisions: schema, API contract, naming.
- Ask Claude to continue from previous diff instead of re-explaining architecture.

## 5) Batch Related Edits
- Group tightly-coupled changes in one turn (service + route + test).
- Split unrelated work into separate turns.

## 6) Request Verification, Not Narration
- Prefer: "Run lint/build and report failures only."
- Prefer: "List risks and missing tests."

## 7) Use This Short Prompt Template
```text
Task: <one concrete outcome>
Files in scope: <explicit paths>
Out of scope: <what not to touch>
Validation: run <lint/test/build commands>
Output: short summary + changed files + risks
```
