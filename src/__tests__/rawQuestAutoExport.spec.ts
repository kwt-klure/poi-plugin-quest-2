import { QuestTab } from '../poi/types'
import {
  buildRawQuestSnapshotAutoExportKey,
  shouldAutoExportRawQuestSnapshot,
} from '../poi/rawQuestAutoExport'
import { buildRawQuestSnapshotExportPayload } from '../rawQuestSnapshot'

describe('raw quest auto export decision', () => {
  test('auto-exports complete All-tab raw snapshots', () => {
    const payload = buildRawQuestSnapshotExportPayload({
      pluginVersion: '0.18.6',
      activeQuestMap: {},
      rawQuestPages: {
        'api_tab_id=0&api_verno=1': {
          pageKey: 'api_tab_id=0&api_verno=1',
          observedAt: '2026-05-04T10:00:00.000Z',
          path: '/kcsapi/api_get_member/questlist',
          tabId: QuestTab.ALL,
          postBody: {
            api_tab_id: QuestTab.ALL,
            api_verno: '1',
          },
          response: {
            api_completed_kind: 0,
            api_count: 1,
            api_exec_count: 0,
            api_exec_type: 0,
          },
          questIds: [101],
          quests: [
            {
              api_no: 101,
              api_state: 1,
              api_title: 'A1',
              api_detail: 'listed quest',
              api_category: 1,
              api_type: 1,
              api_get_material: [0, 0, 0, 0],
              api_invalid_flag: 0,
              api_label_type: 1,
              api_progress_flag: 0,
              api_voice_id: 0,
              api_bonus_flag: 1,
            },
          ],
        },
      },
    })

    expect(payload.coverage.status).toBe('complete')
    expect(shouldAutoExportRawQuestSnapshot(payload)).toBe(true)
  })

  test('does not auto-export empty or page-incomplete raw snapshots', () => {
    const emptyPayload = buildRawQuestSnapshotExportPayload({
      pluginVersion: '0.18.6',
      activeQuestMap: {},
      rawQuestPages: {},
    })
    const pageIncompletePayload = buildRawQuestSnapshotExportPayload({
      pluginVersion: '0.18.6',
      activeQuestMap: {},
      rawQuestPages: {
        'api_page_no=1&api_tab_id=0&api_verno=1': {
          pageKey: 'api_page_no=1&api_tab_id=0&api_verno=1',
          observedAt: '2026-05-04T10:00:00.000Z',
          path: '/kcsapi/api_get_member/questlist',
          tabId: QuestTab.ALL,
          postBody: {
            api_page_no: '1',
            api_tab_id: QuestTab.ALL,
            api_verno: '1',
          },
          response: {
            api_completed_kind: 0,
            api_count: 2,
            api_exec_count: 0,
            api_exec_type: 0,
          },
          questIds: [101],
          quests: [
            {
              api_no: 101,
              api_state: 1,
              api_title: 'A1',
              api_detail: 'listed quest',
              api_category: 1,
              api_type: 1,
              api_get_material: [0, 0, 0, 0],
              api_invalid_flag: 0,
              api_label_type: 1,
              api_progress_flag: 0,
              api_voice_id: 0,
              api_bonus_flag: 1,
            },
          ],
        },
      },
    })

    expect(shouldAutoExportRawQuestSnapshot(emptyPayload)).toBe(false)
    expect(shouldAutoExportRawQuestSnapshot(pageIncompletePayload)).toBe(false)
  })

  test('auto-export key ignores generated export timestamp but tracks raw state', () => {
    const input = {
      pluginVersion: '0.18.6',
      activeQuestMap: {
        101: {
          time: 1,
          detail: {
            api_no: 101,
            api_state: 2,
            api_title: 'A1',
            api_detail: 'accepted quest',
            api_category: 1,
            api_type: 1,
            api_get_material: [0, 0, 0, 0],
            api_invalid_flag: 0,
            api_label_type: 1,
            api_progress_flag: 0,
            api_voice_id: 0,
            api_bonus_flag: 1,
          },
        },
      } as any,
      rawQuestPages: {
        'api_tab_id=0&api_verno=1': {
          pageKey: 'api_tab_id=0&api_verno=1',
          observedAt: '2026-05-04T10:00:00.000Z',
          path: '/kcsapi/api_get_member/questlist',
          tabId: QuestTab.ALL,
          postBody: {
            api_tab_id: QuestTab.ALL,
            api_verno: '1',
          },
          response: {
            api_completed_kind: 0,
            api_count: 1,
            api_exec_count: 1,
            api_exec_type: 0,
          },
          questIds: [101],
          quests: [
            {
              api_no: 101,
              api_state: 2,
              api_title: 'A1',
              api_detail: 'accepted quest',
              api_category: 1,
              api_type: 1,
              api_get_material: [0, 0, 0, 0],
              api_invalid_flag: 0,
              api_label_type: 1,
              api_progress_flag: 0,
              api_voice_id: 0,
              api_bonus_flag: 1,
            },
          ],
        },
      },
    } as const

    const first = buildRawQuestSnapshotExportPayload(input as any)
    const second = buildRawQuestSnapshotExportPayload(input as any)
    const changed = buildRawQuestSnapshotExportPayload({
      ...input,
      activeQuestMap: {},
    } as any)

    expect(buildRawQuestSnapshotAutoExportKey(first)).toBe(
      buildRawQuestSnapshotAutoExportKey(second),
    )
    expect(buildRawQuestSnapshotAutoExportKey(first)).not.toBe(
      buildRawQuestSnapshotAutoExportKey(changed),
    )
  })
})
