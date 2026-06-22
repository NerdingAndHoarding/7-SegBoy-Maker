# GitLab Mirror Steps

Use this document for `R11-P03: GitLab Public Mirror`.

The GitHub repository is already public:

`https://github.com/NerdingAndHoarding/7-SegBoy-Maker`

The GitHub Pages version is:

`https://nerdingandhoarding.github.io/7-SegBoy-Maker/`

## Current Status

- `glab` GitLab CLI was installed with winget as `GLab.GLab`.
- The current Codex shell may need a restart before it can see `glab`.
- GitLab publishing still needs GitLab login and explicit user approval.
- No GitLab repository has been published by this step yet.

## GitLab Pages File

The project now includes `.gitlab-ci.yml`.

It serves the plain static files from the root repository folder through GitLab
Pages. This is enough because the app is plain HTML, CSS, and JavaScript.

## Manual GitLab Mirror Path

1. Create a GitLab project named `7-SegBoy-Maker`.
2. Make it public, or clearly mark it as the official mirror.
3. Use the same description as GitHub:
   `Browser RPG maker for Arduino Nano, MAX7219, and a 24-digit seven-segment display.`
4. Add topics/tags if GitLab offers them:
   `arduino`, `arduino-nano`, `max7219`, `seven-segment-display`,
   `rpg-maker`, `browser-tool`, `agplv3`.
5. Push the same `main` branch from the clean public package folder.
6. Confirm `.gitlab-ci.yml` runs and creates GitLab Pages.
7. Create or mirror release/tag `v0.1.0-beta`.
8. Add the GitHub repository link to the GitLab README or project description.
9. Add the GitLab repository link to the GitHub README.
10. Record both links in `Documentation/BETA_TEST_RECORD.md`.

## Command-Line Mirror Path

Run these only after the GitLab project exists and login works.

From:

`C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy_Maker_BETA_public_20260621`

Add the GitLab remote:

`git remote add gitlab https://gitlab.com/YOUR_GITLAB_NAME/7-SegBoy-Maker.git`

Push main:

`git push gitlab main`

Push the beta tag:

`git push gitlab v0.1.0-beta`

## Safety Rules

- Do not publish the development folder.
- Publish only the clean public package folder.
- Do not include `Arduino_Tests`, `Saved_json`, `old`, `backups`, or backup
  files.
- Do not change Arduino upload policy; GitLab mirror work is only repository
  publishing.
