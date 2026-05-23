import { resolvePoiInventoryExportDirectory } from '../poi/exportDirectory'

const joinPath = (...parts: string[]) => parts.join('/')
const externalArchivePath = '/Volumes/Mira External/Mira-Workspace/archive'

describe('resolvePoiInventoryExportDirectory', () => {
  test('uses archive export lane when the archive root resolves to external archive', () => {
    const result = resolvePoiInventoryExportDirectory({
      documentsPath: '/Users/mira/Documents',
      existsSync: (path: string) =>
        path === '/Users/mira/Documents/Mira-Workspace/archive' ||
        path === externalArchivePath,
      externalArchivePath,
      joinPath,
      realpathSync: (path: string) =>
        path === '/Users/mira/Documents/Mira-Workspace/archive'
          ? externalArchivePath
          : path,
    })

    expect(result).toEqual({
      lane: 'archive',
      path: '/Users/mira/Documents/Mira-Workspace/archive/poi-inventory-exports',
    })
  })

  test('uses local fallback export lane when the archive root is unavailable', () => {
    const result = resolvePoiInventoryExportDirectory({
      documentsPath: '/Users/mira/Documents',
      existsSync: () => false,
      externalArchivePath,
      joinPath,
    })

    expect(result).toEqual({
      lane: 'local-fallback',
      path: '/Users/mira/Documents/Mira-Workspace/local-fallback/poi-inventory-exports',
    })
  })

  test('uses local fallback export lane for local archive shadow directories', () => {
    const archivePath = '/Users/mira/Documents/Mira-Workspace/archive'
    const result = resolvePoiInventoryExportDirectory({
      documentsPath: '/Users/mira/Documents',
      existsSync: (path: string) => path === archivePath,
      externalArchivePath,
      joinPath,
      realpathSync: (path: string) => path,
    })

    expect(result).toEqual({
      lane: 'local-fallback',
      path: '/Users/mira/Documents/Mira-Workspace/local-fallback/poi-inventory-exports',
    })
  })
})
