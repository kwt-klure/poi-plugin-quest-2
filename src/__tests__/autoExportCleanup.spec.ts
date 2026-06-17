import { cleanupOldAutoExportFiles } from '../poi/autoExportCleanup'

const makeFs = (entries: string[]) => {
  const deleted: string[] = []
  return {
    readdirSync: jest.fn(() => entries),
    unlinkSync: jest.fn((filePath: string) => {
      deleted.push(filePath)
    }),
    deleted,
  }
}

const pathLike = {
  basename: (filePath: string) => filePath.split('/').pop() ?? filePath,
  join: (...parts: string[]) => parts.join('/'),
}

describe('auto export cleanup', () => {
  test('keeps the newly written export and deletes older files with the same prefix', () => {
    const fs = makeFs([
      'kancolle_raw_quests_20260606-000001.json',
      'kancolle_raw_quests_20260606-000002.json',
      'kancolle_live_quest_progress_20260606-000001.json',
      'notes.txt',
    ])

    cleanupOldAutoExportFiles({
      fs,
      path: pathLike,
      targetDirectory: '/exports',
      currentFilePath: '/exports/kancolle_raw_quests_20260606-000002.json',
      filePrefix: 'kancolle_raw_quests',
    })

    expect(fs.deleted).toEqual([
      '/exports/kancolle_raw_quests_20260606-000001.json',
    ])
  })

  test('ignores malformed filenames even when they share the prefix', () => {
    const fs = makeFs([
      'kancolle_live_quest_progress_20260606-000001.json',
      'kancolle_live_quest_progress_latest.json',
      'kancolle_live_quest_progress_20260606-000002.json',
    ])

    cleanupOldAutoExportFiles({
      fs,
      path: pathLike,
      targetDirectory: '/exports',
      currentFilePath:
        '/exports/kancolle_live_quest_progress_20260606-000002.json',
      filePrefix: 'kancolle_live_quest_progress',
    })

    expect(fs.deleted).toEqual([
      '/exports/kancolle_live_quest_progress_20260606-000001.json',
    ])
  })
})
