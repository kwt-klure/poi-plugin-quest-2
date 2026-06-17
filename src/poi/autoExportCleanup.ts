type FileSystemLike = {
  readdirSync: (directory: string) => string[]
  unlinkSync: (filePath: string) => void
}
type PathLike = {
  basename: (filePath: string) => string
  join: (...parts: string[]) => string
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const cleanupOldAutoExportFiles = ({
  fs,
  path,
  targetDirectory,
  currentFilePath,
  filePrefix,
}: {
  fs: FileSystemLike
  path: PathLike
  targetDirectory: string
  currentFilePath: string
  filePrefix: string
}) => {
  const currentFileName = path.basename(currentFilePath)
  const autoExportFilePattern = new RegExp(
    `^${escapeRegExp(filePrefix)}_\\d{8}-\\d{6}\\.json$`,
  )

  fs.readdirSync(targetDirectory).forEach((fileName) => {
    if (fileName === currentFileName || !autoExportFilePattern.test(fileName)) {
      return
    }
    fs.unlinkSync(path.join(targetDirectory, fileName))
  })
}
