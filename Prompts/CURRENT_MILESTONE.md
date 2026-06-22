# Current Milestone: R12-P02

## Goal

Prepare tutorial assets for the public beta tutorial scripts.

## Current Project State

- R10-P01 hardware regression has passed through user manual testing after the
  latest small fixes.
- R10-P02 public beta scope is locked in `Documentation/BETA_SCOPE.md`.
- R10-P03 clean package was created at
  `C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy_Maker_BETA_public_20260621`.
- Public-root files exist: `README.md`, `CHANGELOG.md`, and `.gitignore`.
- R11-P01 repository metadata is drafted in
  `Documentation/BETA_PACKAGE_CONTENTS.md`.
- R11-P02 GitHub public beta is published at
  `https://github.com/NerdingAndHoarding/7-SegBoy-Maker`.
- GitHub release `v0.1.0-beta` is published at
  `https://github.com/NerdingAndHoarding/7-SegBoy-Maker/releases/tag/v0.1.0-beta`.
- R11-P03 preparation has added `.gitlab-ci.yml` and
  `Documentation/GITLAB_MIRROR_STEPS.md`.
- GitLab CLI package `GLab.GLab` is installed, but the current shell may need a
  restart before `glab` is visible.
- R12-P01 tutorial scripts are drafted in local development folder `tutorials`.
  They are not part of the public source package; finished videos will be
  uploaded manually to YouTube.
- The public beta includes combined Arduino worldmap, battle, music, battle
  calculation selection, and one EEPROM runtime save slot.
- The development folder still contains backups and history; the clean package
  folder is the candidate for public repository setup.

## Files Allowed

For R12-P02, prepare tutorial assets and asset instructions. Do not require
new app features.

- `Documentation/BETA_PACKAGE_CONTENTS.md`
- `Documentation/BETA_RELEASE_CHECKLIST.md`
- `Documentation/BETA_TEST_RECORD.md`
- `Documentation/GITLAB_MIRROR_STEPS.md`
- `Documentation/TUTORIAL_VIDEO_OUTLINE.md`
- `Documentation/DECISIONS_AND_TESTS.md`
- `Documentation/ROADMAP.md`
- `tutorials`
- `START_HERE.md`
- `README.md`
- `CHANGELOG.md`
- `.gitignore`
- `.gitlab-ci.yml`
- `Prompts/CURRENT_MILESTONE.md`

Do not publish tutorials or make new public releases until the user explicitly
asks.

Back up files before editing.

## Acceptance Test

- Tutorial asset checklist exists.
- Screenshots/photos/diagrams needed by the scripts are listed clearly.
- Hardware wiring images must match the one official wiring only.
- Any unavailable assets are marked as still needed.
- Raw tutorial scripts remain local and are not published as repository source.
- The next step after assets is R12-P03 tutorial publication.

## Next Milestones

After R12-P02 passes:

- R12-P03: tutorial publication.
- Then begin post-beta feature work or return to GitLab mirror if desired.
