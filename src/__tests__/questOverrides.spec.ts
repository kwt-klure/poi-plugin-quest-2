import {
  mergeNewQuestIds,
  mergePrePostQuest,
  mergeQuestCategory,
  mergeQuestCodeMap,
  mergeQuestMap,
} from '../questOverrides'
import type {
  QuestCategoryMap,
  QuestCodeMap,
  QuestDocMap,
  QuestOverrides,
  QuestPrePostMap,
} from '../questOverrides'

describe('questOverrides', () => {
  test('mergeQuestMap can override existing quest fields and add a new quest', () => {
    const baseQuestMap: QuestDocMap = {
      '101': {
        code: 'A1',
        name: 'Base Name',
        desc: 'Base description',
      },
    }
    const overrides: QuestOverrides = {
      quests: {
        shared: {
          '101': {
            memo2: 'Overlay memo',
          },
        },
        byDataSource: {
          'zh-Hans-kcwiki': {
            '101': {
              name: 'Overlay Name',
            },
            '1901': {
              code: 'B999',
              name: 'New Quest',
              desc: 'New quest description',
              rewards: 'reward text',
            },
          },
        },
      },
    }

    const mergedQuestMap = mergeQuestMap(
      baseQuestMap,
      'zh-Hans-kcwiki',
      overrides,
    )

    expect(mergedQuestMap['101']).toEqual({
      code: 'A1',
      name: 'Overlay Name',
      desc: 'Base description',
      memo2: 'Overlay memo',
    })
    expect(mergedQuestMap['1901']).toEqual({
      code: 'B999',
      name: 'New Quest',
      desc: 'New quest description',
      rewards: 'reward text',
    })
  })

  test('mergeQuestCodeMap keeps base entries and lets overlay add new codes', () => {
    const baseQuestCodeMap: QuestCodeMap = { A1: 101 }
    const mergedQuestCodeMap = mergeQuestCodeMap(baseQuestCodeMap, {
      questCodeMap: {
        B999: 1901,
      },
    })

    expect(mergedQuestCodeMap).toEqual({
      A1: 101,
      B999: 1901,
    })
  })

  test('mergePrePostQuest merges new quest chains without dropping base data', () => {
    const basePrePostQuest: QuestPrePostMap = {
      '101': { pre: [], post: ['A2'] },
    }
    const mergedPrePostQuest = mergePrePostQuest(basePrePostQuest, {
      prePostQuest: {
        '1901': { pre: ['A1'], post: [] },
      },
    })

    expect(mergedPrePostQuest).toEqual({
      '101': { pre: [], post: ['A2'] },
      '1901': { pre: ['A1'], post: [] },
    })
  })

  test('mergeNewQuestIds unions base and overlay quest ids', () => {
    expect(
      mergeNewQuestIds(['101', '102'], {
        newQuestIds: [1901, '1902'],
      }),
    ).toEqual(['101', '102', '1901', '1902'])
  })

  test('mergeQuestCategory unions category arrays without dropping base ids', () => {
    const baseQuestCategory: QuestCategoryMap = {
      dailyQuest: [101],
      weeklyQuest: [],
      monthlyQuest: [],
      quarterlyQuest: [],
      yearlyQuest: [],
      singleQuest: [101, 102],
    }

    expect(
      mergeQuestCategory(baseQuestCategory, {
        questCategory: {
          singleQuest: [1901],
          yearlyQuest: [2001],
        },
      }),
    ).toEqual({
      dailyQuest: [101],
      weeklyQuest: [],
      monthlyQuest: [],
      quarterlyQuest: [],
      yearlyQuest: [2001],
      singleQuest: [101, 102, 1901],
    })
  })
})
