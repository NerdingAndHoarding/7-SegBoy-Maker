(function () {
  "use strict";

  function frame(row1, row2, row3) {
    return String(row1 + row2 + row3).slice(0, 24).padEnd(24, " ");
  }

  function createHardwareTestProject() {
    return {
      title: "SevenSeg Hardware Test Example",
      displayTestText: "QUEST TEST",
      rooms: [
        {
          x: 0,
          y: 0,
          frame: frame(
            "........",
            "..#.....",
            "........"
          )
        },
        {
          x: 1,
          y: 0,
          frame: frame(
            "........",
            "....#...",
            "........"
          )
        },
        {
          x: 0,
          y: 1,
          frame: frame(
            "........",
            ".#......",
            "........"
          )
        },
        {
          x: 1,
          y: 1,
          frame: frame(
            "........",
            "......#.",
            "........"
          )
        }
      ],
      start: {
        roomX: 0,
        roomY: 0,
        playerX: 0,
        playerY: 1
      },
      battle: {
        playerHp: 99,
        beastHp: 50,
        playerAttack: 10,
        playerHeal: 50
      },
      hardware: {
        transitionAnimationMs: 500,
        showCoordinates: true,
        coordinateTimeMs: 1000
      }
    };
  }

  function createMinimalV2Project() {
    if (!window.SevenSegModel || !window.SevenSegModel.createDefaultProjectV2) {
      throw new Error("The schema v2 project model is not available.");
    }

    return window.SevenSegModel.createDefaultProjectV2();
  }

  window.SevenSegExamples = {
    createHardwareTestProject: createHardwareTestProject,
    createMinimalV2Project: createMinimalV2Project
  };
}());
