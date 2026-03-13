# Repository Boundary Policy

This document defines what is allowed in the local workspace, what is safe to publish to the personal GitHub fork, and what should be excluded from any upstream/public contribution.

The goal is simple:

- use real local data when it helps us test and validate the plugin
- keep personal or environment-specific data out of GitHub
- keep internal maintenance notes out of upstream submissions

## 1. Default rule

When something is ambiguous, use the stricter bucket.

- If it contains real personal data, keep it local only.
- If it only helps our own workflow, keep it local or personal-fork only.
- If it is intended for upstream or general public use, it must be cleaned and generalized first.

## 2. Local workspace only

These are allowed in the local workspace and can be used for debugging, validation, or temporary notes:

- real ship CSV exports
- real equipment CSV exports
- exported quest analysis JSON files from a real account
- exported Poi quest snapshots
- local tarballs such as `*.tgz`
- local installation notes
- local recovery notes after broken installs
- temporary maintenance draft notes
- absolute filesystem paths
- references to the local Poi plugin directory
- personal testing observations tied to one account

Typical examples:

- `/Users/.../Downloads/kancolle_kan_*.csv`
- `/Users/.../Desktop/poi-quest-analysis-*.json`
- notes about what quests are missing on one specific account
- local install commands that point to a machine-specific tarball path

These are useful for us, but they should be treated as non-public by default.

## 3. Safe for the personal GitHub fork

These are normally safe to commit to the personal GitHub fork:

- source code
- tests
- synthetic or hand-written fixtures
- generalized docs about architecture
- generalized docs about update workflow
- generalized limitations docs
- generalized maintenance process docs
- sanitized handoff notes
- changelog entries

Allowed documentation style for the personal fork:

- generic paths such as `/path/to/...`
- relative links such as `docs/...`
- process notes that help maintain the fork over time

Before pushing to the fork, remove or rewrite:

- absolute local paths
- machine-specific usernames
- exported real CSV or JSON data
- personal account observations that identify owned ships, quest state, or inventory
- browser login codes, tokens, credentials, or auth traces

## 4. Not for the personal GitHub fork

Do **not** commit these to the GitHub fork:

- real ship CSV exports
- real equipment CSV exports
- real quest analysis export JSON
- real Poi quest snapshot exports
- tokens
- device codes
- passwords
- auth logs
- local cache directories
- `node_modules`
- `.npm-cache`
- tarballs intended only for local installation
- absolute filesystem paths that reveal the local machine layout

If a file exists only because we tested with a real account, it should stay local unless it is rewritten into a synthetic fixture.

## 5. Additional upstream/public restrictions

Upstream or public contribution rules are stricter than personal-fork rules.

Do **not** send upstream:

- handoff notes written for our own agent workflow
- local installation playbooks
- internal maintenance notes that only exist to support our fork
- fork-specific branding decisions unless they are part of the proposed feature
- any personal or account-derived test data

Only send upstream:

- generalized source code
- generalized tests
- generalized user-facing docs
- generalized bugfixes and features

## 6. Test data policy

Real local data can be used for testing, but it should not automatically become repository data.

Use this rule:

1. Test locally with the real file if it helps.
2. If a test case needs to live in the repo, rewrite it as:
   - a synthetic fixture
   - a minimized hand-written sample
   - an anonymized example that no longer reflects one real account

Do not commit a real export just because it was convenient during debugging.

## 7. Document policy

Use these buckets for docs:

- local-only docs:
  - machine-specific install notes
  - scratch investigation notes
  - notes containing absolute paths or account-specific examples
- personal-fork docs:
  - architecture policy
  - update workflow
  - limitations
  - generalized maintenance drafts
- upstream docs:
  - only generalized docs that help normal users or maintainers

If a doc teaches only our own maintenance workflow, decide whether it belongs in:

- local workspace only
- or the personal fork

But do not assume it belongs upstream.

## 8. Quick checklist before push

Before pushing to the personal GitHub fork, check:

1. No real CSV or exported JSON files are staged.
2. No absolute `/Users/...` paths remain in staged files unless the file is explicitly local-only and not meant to be pushed.
3. No tokens, auth codes, passwords, or session traces are present.
4. No machine-specific tarballs or cache directories are staged.
5. Docs are written in generalized terms.

Before preparing anything for upstream/public contribution, check:

1. Everything already passes the personal-fork checklist.
2. No internal handoff or local install notes are included.
3. No fork-only maintenance docs are included unless they are intentionally generalized.
4. The change reads like a product/code improvement, not an internal project log.

## 9. Working rule for future Codex sessions

Unless explicitly told otherwise:

- real user exports may be read and used for **local validation only**
- real user exports must **not** be committed
- absolute local paths may exist in local-only docs, but should be removed or generalized before any GitHub push
- internal handoff/install notes may live locally or in the personal fork, but should be excluded from upstream

This is the default boundary policy for this project.
