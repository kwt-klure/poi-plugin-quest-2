import type { GameQuest } from '../poi/types'
import { QUEST_API_STATE } from '../poi/types'
import { buildUnionQuests } from '../store/quest'

const buildGameQuest = (
  api_no: number,
  api_state: QUEST_API_STATE,
  api_title: string,
  api_detail: string,
  api_category: GameQuest['api_category'] = 2,
): GameQuest =>
  ({
    api_no,
    api_state,
    api_title,
    api_detail,
    api_category,
    api_type: 1,
    api_get_material: [0, 0, 0, 0],
    api_invalid_flag: 0,
    api_label_type: 1,
    api_progress_flag: 0,
    api_voice_id: 0,
    api_bonus_flag: 1,
  }) as GameQuest

describe('buildUnionQuests', () => {
  test('includes observed quests that are not in the generated quest data', () => {
    const knownQuest = buildGameQuest(
      101,
      QUEST_API_STATE.IN_PROGRESS,
      'Known quest',
      'known detail',
      1,
    )
    const unknownObservedQuest = buildGameQuest(
      9999,
      QUEST_API_STATE.DEFAULT,
      '新任務',
      '觀測到但資料庫尚未收錄的任務',
      2,
    )

    const quests = buildUnionQuests(
      {
        101: {
          code: 'A1',
          name: 'Known from docs',
          desc: 'known docs detail',
        },
      },
      [knownQuest],
      [knownQuest, unknownObservedQuest],
    )

    expect(quests.map((quest) => quest.gameId)).toEqual([101, 9999])
    expect(quests[0]).toMatchObject({
      gameId: 101,
      gameQuest: knownQuest,
      docQuest: {
        code: 'A1',
        name: 'Known from docs',
      },
    })
    expect(quests[1]).toMatchObject({
      gameId: 9999,
      gameQuest: unknownObservedQuest,
      docQuest: {
        code: 'B?',
        name: '新任務',
        desc: '觀測到但資料庫尚未收錄的任務',
      },
    })
  })
})
