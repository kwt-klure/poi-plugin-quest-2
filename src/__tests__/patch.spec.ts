import { hasEnabledConflictingQuestPlugin } from '../patch'

describe('hasEnabledConflictingQuestPlugin', () => {
  test('returns false when only the current plugin is enabled', () => {
    expect(
      hasEnabledConflictingQuestPlugin(
        [{ id: 'poi-plugin-kc-quest-audit', enabled: true }],
        'poi-plugin-kc-quest-audit',
      ),
    ).toBe(false)
  })

  test('returns true when official quest-info-2 is enabled alongside current plugin', () => {
    expect(
      hasEnabledConflictingQuestPlugin(
        [
          { id: 'poi-plugin-kc-quest-audit', enabled: true },
          { id: 'poi-plugin-quest-info-2', enabled: true },
        ],
        'poi-plugin-kc-quest-audit',
      ),
    ).toBe(true)
  })

  test('ignores disabled sibling plugins', () => {
    expect(
      hasEnabledConflictingQuestPlugin(
        [
          { id: 'poi-plugin-kc-quest-audit', enabled: true },
          { id: 'poi-plugin-quest-info-2', enabled: false },
        ],
        'poi-plugin-kc-quest-audit',
      ),
    ).toBe(false)
  })
})
