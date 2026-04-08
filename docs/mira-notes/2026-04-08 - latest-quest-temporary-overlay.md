# 2026-04-08 - latest quest temporary overlay

做了什麼：
- 為 2026-04-07 維修波次新增 draft markdown 與 machine-readable draft JSON。
- 先收整波最新任務的公開資訊，不等待 upstream quest text pipeline 追上。
- 這一輪沒有把任何未確認 id 的任務升級進 runtime overlay。

為什麼：
- 這個 fork 可以先補最新任務內容，但不應該因此改寫 generated quest text pipeline。
- 最新任務只要沒有確認 `api_no / gameId`，就不應該半成品進 `src/questOverrides/data.ts`。
- 日文主文本優先，中文資料只作可靠補充，不自造翻譯。

影響範圍：
- `docs/maintenance-2026-04-07-draft.md`
- `docs/data/maintenance-2026-04-07-public.json`
- runtime overlay 目前保持不變

後續注意事項：
- promotion workflow 固定為：先在 Poi 觀察 / export JSON，確認 `observedQuestList` 或 `unknownObservedQuests` 內的 id，再把該條目升級進 `src/questOverrides/data.ts`。
- `Cs3` 已在 upstream generated data 內，不要為了這波 maintenance 再做本地 overlay。
- upstream 追上後，要移除這波 temporary overlay（如果之後有加）並保留 draft 作 maintenance record。
- 這個 workspace 內含 `github-fork/*` nested clone，直接在 workspace 跑 `jest` 會有 haste collision warning；要看乾淨測試訊號時，優先用 clean clone 執行。
