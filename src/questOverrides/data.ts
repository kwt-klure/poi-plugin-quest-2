import type { QuestOverrides } from './types'

// Intentionally empty by default. Add short-lived quest data here when upstream
// sources lag behind live maintenance updates.
export const questOverrides: QuestOverrides = {
  quests: {
    shared: {},
    byDataSource: {},
  },
  questCodeMap: {},
  prePostQuest: {},
  newQuestIds: [],
  questCategory: {},
}
