import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const pluginName = 'poi-plugin-kc-quest-audit'

const writeJson = (filePath: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

const makeHealthyInstall = (tmpDir: string) => {
  const pluginsDir = path.join(tmpDir, 'plugins')
  const tarball = path.join(tmpDir, `${pluginName}-0.18.15.tgz`)
  const relativeTarball = `file:${path.relative(pluginsDir, tarball)}`
  fs.mkdirSync(pluginsDir, { recursive: true })
  fs.writeFileSync(tarball, 'fake tarball')
  writeJson(path.join(pluginsDir, 'package.json'), {
    dependencies: {
      [pluginName]: relativeTarball,
    },
  })
  writeJson(path.join(pluginsDir, 'package-lock.json'), {
    packages: {
      '': {
        dependencies: {
          [pluginName]: relativeTarball,
        },
      },
      [`node_modules/${pluginName}`]: {
        version: '0.18.15',
        resolved: relativeTarball,
      },
    },
  })
  writeJson(
    path.join(pluginsDir, 'node_modules', pluginName, 'package.json'),
    {
      name: pluginName,
      version: '0.18.15',
      main: 'src/index.ts',
    },
  )
  fs.mkdirSync(path.join(pluginsDir, 'node_modules', pluginName, 'src'), {
    recursive: true,
  })
  fs.writeFileSync(
    path.join(pluginsDir, 'node_modules', pluginName, 'src', 'index.ts'),
    '',
  )
  return { pluginsDir, tarball }
}

const makeNpmStub = (tmpDir: string) => {
  const npmStub = path.join(tmpDir, 'npm-stub.mjs')
  const logFile = path.join(tmpDir, 'npm-calls.jsonl')
  fs.writeFileSync(
    npmStub,
    `#!/usr/bin/env node
import fs from 'node:fs'
fs.appendFileSync(${JSON.stringify(logFile)}, JSON.stringify(process.argv.slice(2)) + '\\n')
`,
  )
  fs.chmodSync(npmStub, 0o755)
  return { npmStub, logFile }
}

describe('checkLocalPoiQuestAuditInstall script', () => {
  test('force fix reinstalls even when the local tarball install already checks out', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'poi-install-script-'))
    const { pluginsDir, tarball } = makeHealthyInstall(tmpDir)
    const { npmStub, logFile } = makeNpmStub(tmpDir)
    const result = spawnSync(
      process.execPath,
      [
        'scripts/checkLocalPoiQuestAuditInstall.mjs',
        '--fix',
        '--force',
        '--plugins-dir',
        pluginsDir,
        '--tarball',
        tarball,
        '--npm-bin',
        npmStub,
        '--json',
      ],
      {
        cwd: path.resolve(__dirname, '../..'),
        encoding: 'utf8',
      },
    )

    expect(result.status).toBe(0)
    expect(
      fs
        .readFileSync(logFile, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)),
    ).toEqual([
        ['uninstall', pluginName],
        ['install', '--save', tarball],
      ])
  })
})
