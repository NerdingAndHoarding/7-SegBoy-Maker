# Current Milestone: R11-P02

## Goal

Publish the clean public beta package to GitHub when the user explicitly
approves repository publishing.

## Current Project State

- R10-P01 hardware regression has passed through user manual testing after the
  latest small fixes.
- R10-P02 public beta scope is locked in `Documentation/BETA_SCOPE.md`.
- R10-P03 clean package was created at
  `C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy_Maker_BETA_public_20260621`.
- Public-root files exist: `README.md`, `CHANGELOG.md`, and `.gitignore`.
- R11-P01 repository metadata is drafted in
  `Documentation/BETA_PACKAGE_CONTENTS.md`.
- The public beta includes combined Arduino worldmap, battle, music, battle
  calculation selection, and one EEPROM runtime save slot.
- The development folder still contains backups and history; the clean package
  folder is the candidate for public repository setup.

## Files Allowed

For R11-P02, publishing requires explicit user approval before any GitHub
action. Until then, prefer documentation and release-note edits only:

- `Documentation/BETA_PACKAGE_CONTENTS.md`
- `Documentation/BETA_RELEASE_CHECKLIST.md`
- `Documentation/BETA_TEST_RECORD.md`
- `Documentation/DECISIONS_AND_TESTS.md`
- `Documentation/ROADMAP.md`
- `START_HERE.md`
- `README.md`
- `CHANGELOG.md`
- `.gitignore`
- `Prompts/CURRENT_MILESTONE.md`

Do not publish to GitHub or GitLab until the user explicitly asks. If a GitHub
tool or command is needed and unavailable, stop and explain the manual steps.

Back up files before editing.

## Acceptance Test

- GitHub repository is public.
- Repository description and topics use the draft in
  `Documentation/BETA_PACKAGE_CONTENTS.md`.
- Repository README is the clean package README.
- A beta tag/release is created as `v0.1.0-beta`.
- Release notes link to beta scope, hardware profile, hardware-file warning,
  and tutorial outline.
- The next step after GitHub publishing is R11-P03 GitLab public mirror.

## Next Milestones

After R11-P02 passes:

- R11-P03: GitLab public mirror.
- R12-P01 to R12-P03: tutorial scripts/assets and tutorial publication.
