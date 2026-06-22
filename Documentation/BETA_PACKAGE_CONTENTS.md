# Beta Package Contents

Use this when making a clean copy of the beta folder for sharing.

## Include

- `index.html`
- `style.css`
- `START_HERE.md`
- `LICENSE.md`
- `PROJECT_RULES.md`
- `Documentation`
- `Prompts/CURRENT_MILESTONE.md`
- `README.md`
- `CHANGELOG.md`
- `.gitignore` for the public repository
- `.gitlab-ci.yml` for GitLab Pages
- `References/Original_Tools` if the 018 import reference is still needed for
  beta explanation or comparison

### Required Root JavaScript Files

Keep these files beside `index.html`:

- `visualAssets.js`
- `displayEditor.js`
- `glyphEditor.js`
- `frameEditor.js`
- `animationEditor.js`
- `visualImport018.js`
- `projectModel.js`
- `worldCompression.js`
- `resourceEstimator.js`
- `preflight.js`
- `worldEditor.js`
- `emulator.js`
- `battle.js`
- `musicRuntime.js`
- `exportArduino.js`
- `projectStorage.js`
- `app.js`

### Optional Test Files

Include these if the beta copy should run browser self-tests:

- `projectModelTests.html`
- `projectModelTests.js`
- `worldCompressionTests.html`
- `worldCompressionTests.js`
- `examples.js`

## Usually Exclude From A Public Copy

- `backups`
- `old`
- `Arduino_Tests`
- `Saved_json`
- root `*.backup_*` files
- `Documentation/*.backup_*` files
- `Prompts/*.backup_*` files
- `_rpg_Backend_design_tool`
- Temporary generated sketches
- Local browser recovery data
- Personal notes that are not needed to run or understand the beta
- Attached research PDFs unless they are intentionally part of public
  documentation
- Experimental standalone design tools unless they are clearly linked from the
  beta README

## Before Sharing

1. Open the clean copied folder.
2. Open `index.html`.
3. Confirm the tool works without the excluded folders.
4. Export a fresh Combined Game `.ino`.
5. Compile and upload that fresh export.
6. Fill in `Documentation/BETA_TEST_RECORD.md`.
7. Confirm the clean package is the same package used for GitHub and GitLab.
8. Do not publish the development folder itself.

## Public Repository Notes

- GitHub and GitLab should receive the same clean package contents.
- Do not publish the development folder directly.
- Do not publish private test saves or long generated Arduino export history.
- Public release notes should link to:
  - `START_HERE.md`,
  - `Documentation/HARDWARE_PROFILE.md`,
  - `Documentation/TUTORIAL_VIDEO_OUTLINE.md`,
  - `Documentation/BETA_SCOPE.md`,
  - `Documentation/BETA_RELEASE_CHECKLIST.md`,
  - `Documentation/GITLAB_MIRROR_STEPS.md`.

## Repository Metadata Draft

Use the same wording on GitHub and GitLab unless the site requires shorter
text.

- Repository name: `7-SegBoy-Maker`
- Short description:
  `Browser RPG maker for Arduino Nano, MAX7219, and a 24-digit seven-segment display.`
- Topics:
  `arduino`, `arduino-nano`, `max7219`, `seven-segment-display`,
  `rpg-maker`, `browser-tool`, `agplv3`
- First beta tag: `v0.1.0-beta`
- First beta release title: `7-SegBoy Maker v0.1.0-beta`
- Release warning:
  `The included PCB/Gerber hardware files are beta reference files and have not yet been fully verified on a manufactured board.`

## GitHub Release Body Draft

Use this as the first GitHub release body for `v0.1.0-beta`:

```text
7-SegBoy Maker v0.1.0-beta is the first public beta of a small browser-based
RPG maker for a custom 24-digit seven-segment display driven by an Arduino Nano
and three MAX7219 chips.

This beta proves the full path from browser editing to real hardware gameplay:
open index.html, test the Minimal RPG, export a combined Arduino sketch, and
play it on the official 7-SegBoy hardware.

Start here:
- START_HERE.md
- Documentation/BETA_SCOPE.md
- Documentation/HARDWARE_PROFILE.md
- Documentation/BETA_RELEASE_CHECKLIST.md
- Documentation/TUTORIAL_VIDEO_OUTLINE.md

Hardware note:
Documentation/Hardware includes EasyEDA schematic/PCB files, a BOM, schematic
image, and Gerber ZIP. These PCB/Gerber files are beta reference files based on
the working beta hardware, but they have not yet been fully verified on a
manufactured board.
```

## Manual GitHub Publish Steps

Use the clean public package folder, not the development folder:

`C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy_Maker_BETA_public_20260621`

1. Create a new public GitHub repository named `7-SegBoy-Maker`.
2. Set the description to:
   `Browser RPG maker for Arduino Nano, MAX7219, and a 24-digit seven-segment display.`
3. Add topics:
   `arduino`, `arduino-nano`, `max7219`, `seven-segment-display`,
   `rpg-maker`, `browser-tool`, `agplv3`.
4. Upload or commit only the files from the clean public package folder.
5. Confirm `Arduino_Tests`, `Saved_json`, `old`, `backups`, and backup files
   are not in the repository.
6. Confirm GitHub shows `README.md` on the repository front page.
7. Create tag/release `v0.1.0-beta`.
8. Use release title `7-SegBoy Maker v0.1.0-beta`.
9. Paste the release body draft above.
10. After publishing, copy the repository and release links into
    `Documentation/BETA_TEST_RECORD.md`.

## GitLab Mirror Notes

- Use `Documentation/GITLAB_MIRROR_STEPS.md`.
- GitLab Pages uses `.gitlab-ci.yml`.
- GitLab publishing requires GitLab login and explicit user approval.
- The GitLab mirror should use the same clean public package as GitHub.

## Rule

Do not delete working folders from the development copy just to make a public
package. Make a clean copy instead.
