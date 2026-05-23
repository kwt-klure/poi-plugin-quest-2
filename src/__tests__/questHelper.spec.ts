import {
  buildAcceptableQuestFilter,
  calcQuestMap,
  getCompletedQuest,
  getLockedQuest,
  getPostQuestIds,
  getPreQuestIds,
  getQuestCodeByGameId,
  isQuestAcceptableStatus,
  QUEST_STATUS,
} from '../questHelper'

describe('questHelper', () => {
  test('should getQuestCodeByGameId correct', () => {
    expect(getQuestCodeByGameId(0)).toEqual(null)
    expect(getQuestCodeByGameId(101)).toEqual('A1')
  })

  test('should getPreQuestIds correct', () => {
    expect(getPreQuestIds(101)).toEqual([])
    expect(getPreQuestIds(102)).toEqual([101])
    expect(getPreQuestIds(236)).toEqual([235, 273])
  })

  test('should getPostQuestIds correct', () => {
    expect(getPostQuestIds(101)).toEqual([102])
    expect(getPostQuestIds(105)).toEqual([106, 108, 174, 254, 401, 612])
    expect(getPostQuestIds(140)).toEqual([])
  })

  test('should 101 no completed quest', () => {
    expect(getCompletedQuest([101])).toEqual({})
  })

  test('should getCompletedQuest quest match snapshot', () => {
    expect(calcQuestMap([817], getPreQuestIds)).toMatchSnapshot()
  })

  test('should 236 getCompletedQuest correct', () => {
    expect(calcQuestMap([236], getPreQuestIds)).toMatchSnapshot()
  })

  test('should 101 locked quests match snapshot', () => {
    expect(getLockedQuest([101])).toMatchSnapshot()
  })

  test('should 196 getLockedQuest correct', () => {
    expect(getLockedQuest([196])).toMatchSnapshot()
  })

  test('treats only visible unaccepted quests as acceptable', () => {
    expect(isQuestAcceptableStatus(QUEST_STATUS.DEFAULT)).toBe(true)
    expect(isQuestAcceptableStatus(QUEST_STATUS.IN_PROGRESS)).toBe(false)
    expect(isQuestAcceptableStatus(QUEST_STATUS.COMPLETED)).toBe(false)
    expect(isQuestAcceptableStatus(QUEST_STATUS.LOCKED)).toBe(false)
    expect(isQuestAcceptableStatus(QUEST_STATUS.ALREADY_COMPLETED)).toBe(false)
    expect(isQuestAcceptableStatus(QUEST_STATUS.UNKNOWN)).toBe(false)
  })

  test('builds a quest filter that keeps only acceptable quests', () => {
    const acceptableFilter = buildAcceptableQuestFilter((gameId) =>
      gameId === 101 ? QUEST_STATUS.DEFAULT : QUEST_STATUS.IN_PROGRESS,
    )

    expect(
      [101, 202]
        .map((gameId) => ({
          gameId,
          docQuest: { code: `A${gameId}`, name: '', desc: '' },
        }))
        .filter(acceptableFilter)
        .map((quest) => quest.gameId),
    ).toEqual([101])
  })
})
