export type PoiInventoryExportLane = 'archive' | 'local-fallback'

const DEFAULT_EXTERNAL_ARCHIVE_PATH =
  '/Volumes/Mira External/Mira-Workspace/archive'

type ResolvePoiInventoryExportDirectoryOptions = {
  documentsPath: string
  existsSync: (path: string) => boolean
  externalArchivePath?: string
  joinPath: (...parts: string[]) => string
  realpathSync?: (path: string) => string
}

type ResolvedPoiInventoryExportDirectory = {
  lane: PoiInventoryExportLane
  path: string
}

export const resolvePoiInventoryExportDirectory = ({
  documentsPath,
  existsSync,
  externalArchivePath = DEFAULT_EXTERNAL_ARCHIVE_PATH,
  joinPath,
  realpathSync,
}: ResolvePoiInventoryExportDirectoryOptions): ResolvedPoiInventoryExportDirectory => {
  const workspacePath = joinPath(documentsPath, 'Mira-Workspace')
  const archiveRoot = joinPath(workspacePath, 'archive')
  const archiveRealpath = resolveRealpath(archiveRoot, existsSync, realpathSync)
  const externalArchiveRealpath = resolveRealpath(
    externalArchivePath,
    existsSync,
    realpathSync,
  )

  if (
    archiveRealpath &&
    externalArchiveRealpath &&
    archiveRealpath === externalArchiveRealpath
  ) {
    return {
      lane: 'archive',
      path: joinPath(archiveRoot, 'poi-inventory-exports'),
    }
  }

  return {
    lane: 'local-fallback',
    path: joinPath(workspacePath, 'local-fallback', 'poi-inventory-exports'),
  }
}

const resolveRealpath = (
  path: string,
  existsSync: (path: string) => boolean,
  realpathSync?: (path: string) => string,
) => {
  if (!existsSync(path)) {
    return null
  }
  if (!realpathSync) {
    return path
  }
  try {
    return realpathSync(path)
  } catch {
    return null
  }
}
