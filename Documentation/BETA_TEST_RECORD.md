# Beta Test Record

Use this file to record the final test of a beta candidate before sharing it.
The pass/fail source is `Documentation/BETA_RELEASE_CHECKLIST.md`.

## Candidate

- Test date: 2026-06-21
- Tester: hardware owner
- Browser:
- Arduino IDE version:
- Board:
- Processor:
- Port:
- Project JSON file tested: `BETA_JSON_EVIDENCE.json`
- Exported sketch folder: `SevenSeg_BETA_EVIDENCE_ARDUINO_INO_20260621_133418_329`

## Browser Result

- `index.html` opens: OK
- Starter project/preflight: OK, no blockers
- Browser movement between rooms:
- Trigger battles on/off:
- Browser worldmap music: assigned
- Browser battle music switch: assigned
- Browser battle victory:
- Browser battle defeat:
- Project JSON save/reload: OK, evidence file saved
- Browser recovery clears after clean save:
- Notes: Browser preparation passed for the tested beta candidate.

## Arduino Compile Result

- Sketch name: `SevenSeg_BETA_EVIDENCE_ARDUINO_INO_20260621_133418_329`
- Flash used: 14222 bytes
- Flash maximum: 30720 bytes
- Flash percent: 46%
- Global variables used: 679 bytes
- Global variables maximum: 2048 bytes
- SRAM remaining: 1369 bytes
- Compile result: OK
- Notes: Compiled for Arduino Nano / ATmega328P.

## Hardware Result

- Upload result: OK
- A0 BrightnessPot: OK
- A4 direction/menu pot: OK
- D5 forward/confirm: OK
- D4 backward/reject: OK
- Room movement: OK
- Blocking: OK
- `E.02` / `E.03` boundary blocked: OK
- Ancient-key gate route: OK
- Room transitions: OK
- Gold chest: OK
- Potion chest: OK
- Sword chest: OK
- Key chest: OK
- Battle entry: OK
- Worldmap music: OK
- Battle music: OK
- Music resumes after victory: OK
- Actor prompt alternates `YOU1` / `HP-MAX`: OK
- Potion restores up to 10 HP and display matches actual gain: FAIL in tested export; observed 5 or 6 HP actual gain while older test wording expected exactly 10.
- Battle victory: OK
- Battle defeat: not recorded
- Boss battle: OK
- Boss ending text: OK
- Boss does not restart after defeat: OK
- Visible mismatch: enemy hit displayed `-10` while HP changed by 8; HEAL displayed `50` while HP changed by 8.
- Notes: Export generator now updated so battle text shows actual applied enemy damage and actual applied healing after max-HP cap. Level-up generation was also changed so levels can continue past level 2. A fresh export is required for retest.

## Public Beta Readiness

- `README.md` prepared: yes, public beta draft exists.
- `CHANGELOG.md` or release notes prepared: yes, public beta candidate notes exist.
- `.gitignore` prepared: yes, excludes generated exports, backups, private saves, and temporary files.
- Clean public package created: yes,
  `C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy_Maker_BETA_public_20260621`
- Release ZIP prepared: yes,
  `C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy-Maker-v0.1.0-beta.zip`
- GitHub repository published:
- GitHub beta tag/release created:
- GitLab mirror published:
- GitHub/GitLab cross-links:
- Tutorial scripts or links prepared:
- Tutorial links added to README/release notes:

## Release Decision

- Candidate accepted for beta sharing: Pending final package-copy browser and
  Arduino compile/upload check.
- Blocking reason: no current code blocker recorded after the later manual
  fixes and tests; final evidence must be recorded from the clean package copy.
- Follow-up needed: open `index.html` from the clean public package, export a
  fresh combined sketch from that copy, compile/upload it, and record the final
  figures here.
- Automatic GitHub publish note: blocked in this Codex shell because neither
  `git` nor GitHub CLI `gh` is available, and Codex has no GitHub login token.
  The release ZIP above is ready for manual upload.
