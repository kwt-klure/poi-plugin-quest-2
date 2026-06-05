#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pluginName = 'poi-plugin-kc-quest-audit';
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const defaultPluginsDir = path.join(os.homedir(), 'Library/Application Support/poi/plugins');

function parseArgs(argv) {
  const args = {
    fix: false,
    json: false,
    npmBin: process.env.NPM || 'npm',
    pluginsDir: defaultPluginsDir,
    tarball: undefined,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--fix') args.fix = true;
    else if (arg === '--json') args.json = true;
    else if (arg === '--plugins-dir') args.pluginsDir = path.resolve(argv[++i]);
    else if (arg === '--tarball') args.tarball = path.resolve(argv[++i]);
    else if (arg === '--npm-bin') args.npmBin = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage: node scripts/checkLocalPoiQuestAuditInstall.mjs [--fix]

Checks whether the local Poi plugin install still points ${pluginName} at a
repo-local tarball instead of an npm registry semver range.

Options:
  --fix                 Reinstall ${pluginName} from the selected tarball
  --plugins-dir <path>  Poi plugins directory
  --tarball <path>      Tarball to expect and install
  --npm-bin <path>      npm executable for --fix
  --json                Print the final report as JSON
`);
}

function versionParts(version) {
  return version.split('.').map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function tarballVersion(filePath) {
  const base = path.basename(filePath);
  const match = base.match(/^poi-plugin-kc-quest-audit-(\d+\.\d+\.\d+)\.tgz$/);
  return match?.[1];
}

function findNewestTarball() {
  const files = fs.readdirSync(repoRoot)
    .filter((file) => file.startsWith(`${pluginName}-`) && file.endsWith('.tgz'))
    .map((file) => path.join(repoRoot, file))
    .filter((file) => tarballVersion(file));

  files.sort((left, right) => compareVersions(tarballVersion(right), tarballVersion(left)));
  return files[0];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveFileSpec(spec, fromDir) {
  if (typeof spec !== 'string' || !spec.startsWith('file:')) return undefined;
  const ref = spec.slice('file:'.length);
  return path.resolve(fromDir, ref);
}

function samePath(left, right) {
  if (!left || !right) return false;
  return path.resolve(left) === path.resolve(right);
}

function checkInstall({ pluginsDir, tarball }) {
  const packageJsonPath = path.join(pluginsDir, 'package.json');
  const packageLockPath = path.join(pluginsDir, 'package-lock.json');
  const installedPackagePath = path.join(pluginsDir, 'node_modules', pluginName, 'package.json');
  const expectedVersion = tarballVersion(tarball);
  const checks = [];

  function add(name, ok, details = {}) {
    checks.push({ name, ok, ...details });
  }

  add('tarball exists', fs.existsSync(tarball), { tarball });
  add('plugins package.json exists', fs.existsSync(packageJsonPath), { packageJsonPath });
  add('plugins package-lock.json exists', fs.existsSync(packageLockPath), { packageLockPath });
  add('installed package exists', fs.existsSync(installedPackagePath), { installedPackagePath });

  let packageDep;
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = readJson(packageJsonPath);
    packageDep = packageJson.dependencies?.[pluginName];
    add('package.json dependency is file tarball', samePath(resolveFileSpec(packageDep, pluginsDir), tarball), {
      dependency: packageDep,
      resolvedDependency: resolveFileSpec(packageDep, pluginsDir),
    });
  }

  if (fs.existsSync(packageLockPath)) {
    const lockJson = readJson(packageLockPath);
    const rootDep = lockJson.packages?.['']?.dependencies?.[pluginName];
    const lockPackage = lockJson.packages?.[`node_modules/${pluginName}`];
    add('package-lock root dependency is file tarball', samePath(resolveFileSpec(rootDep, pluginsDir), tarball), {
      dependency: rootDep,
      resolvedDependency: resolveFileSpec(rootDep, pluginsDir),
    });
    add('package-lock plugin resolved is file tarball', samePath(resolveFileSpec(lockPackage?.resolved, pluginsDir), tarball), {
      resolved: lockPackage?.resolved,
      resolvedDependency: resolveFileSpec(lockPackage?.resolved, pluginsDir),
      version: lockPackage?.version,
    });
  }

  if (fs.existsSync(installedPackagePath)) {
    const installedPackage = readJson(installedPackagePath);
    add('installed package version matches tarball filename', installedPackage.version === expectedVersion, {
      installedVersion: installedPackage.version,
      expectedVersion,
    });
    add('installed package main exists', fs.existsSync(path.join(pluginsDir, 'node_modules', pluginName, installedPackage.main || '')), {
      main: installedPackage.main,
    });
  }

  return {
    ok: checks.every((check) => check.ok),
    pluginName,
    pluginsDir,
    tarball,
    expectedVersion,
    checks,
  };
}

function printReport(report) {
  console.log(`${report.ok ? 'OK' : 'FAIL'} ${report.pluginName}`);
  console.log(`pluginsDir: ${report.pluginsDir}`);
  console.log(`tarball: ${report.tarball}`);
  for (const check of report.checks) {
    console.log(`${check.ok ? '  ok ' : '  bad'} ${check.name}`);
    for (const [key, value] of Object.entries(check)) {
      if (key === 'name' || key === 'ok' || value === undefined) continue;
      console.log(`      ${key}: ${value}`);
    }
  }
}

function runNpmFix({ npmBin, pluginsDir, tarball }) {
  for (const args of [
    ['uninstall', pluginName],
    ['install', '--save', tarball],
  ]) {
    const result = spawnSync(npmBin, args, {
      cwd: pluginsDir,
      stdio: 'inherit',
    });
    if (result.status !== 0) {
      throw new Error(`${npmBin} ${args.join(' ')} failed with exit code ${result.status}`);
    }
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const tarball = args.tarball || findNewestTarball();
  if (!tarball) throw new Error(`No ${pluginName}-*.tgz tarball found in ${repoRoot}`);

  let report = checkInstall({ pluginsDir: args.pluginsDir, tarball });
  if (!args.json) printReport(report);

  if (!report.ok && args.fix) {
    if (!args.json) console.log(`Reinstalling ${pluginName} from ${tarball}`);
    runNpmFix({ npmBin: args.npmBin, pluginsDir: args.pluginsDir, tarball });
    report = checkInstall({ pluginsDir: args.pluginsDir, tarball });
    if (!args.json) printReport(report);
  }

  if (args.json) console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
}
