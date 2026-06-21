(function () {
  "use strict";

  var DATABASE_NAME = "SevenSegQuestMaker";
  var DATABASE_VERSION = 1;
  var STORE_NAME = "recovery";
  var ACTIVE_KEY = "activeProject";
  var RECOVERY_FORMAT = "sevenseg-recovery";
  var RECOVERY_VERSION = 1;

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function failure(message, unavailable, malformed) {
    return {
      ok: false,
      found: false,
      unavailable: Boolean(unavailable),
      malformed: Boolean(malformed),
      error: message
    };
  }

  function openDatabase() {
    return new Promise(function (resolve, reject) {
      var request;

      if (!window.indexedDB) {
        reject(new Error("IndexedDB is not available in this browser."));
        return;
      }

      try {
        request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      } catch (error) {
        reject(error);
        return;
      }

      request.addEventListener("upgradeneeded", function () {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      });
      request.addEventListener("success", function () {
        resolve(request.result);
      });
      request.addEventListener("error", function () {
        reject(request.error || new Error("Could not open IndexedDB."));
      });
      request.addEventListener("blocked", function () {
        reject(new Error("IndexedDB upgrade is blocked by another open page."));
      });
    });
  }

  function runRequest(mode, action) {
    return openDatabase().then(function (database) {
      return new Promise(function (resolve, reject) {
        var transaction;
        var request;
        var requestResult;
        var settled = false;

        function fail(error) {
          if (settled) return;
          settled = true;
          database.close();
          reject(error);
        }

        try {
          transaction = database.transaction(STORE_NAME, mode);
          request = action(transaction.objectStore(STORE_NAME));
        } catch (error) {
          fail(error);
          return;
        }

        request.addEventListener("success", function () {
          requestResult = request.result;
        });
        request.addEventListener("error", function () {
          fail(request.error || new Error("IndexedDB request failed."));
        });
        transaction.addEventListener("complete", function () {
          if (settled) return;
          settled = true;
          database.close();
          resolve(requestResult);
        });
        transaction.addEventListener("abort", function () {
          fail(transaction.error || new Error("IndexedDB transaction was aborted."));
        });
      });
    });
  }

  function validateRecoveryRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return "Recovery record is not an object.";
    }
    if (record.recoveryFormat !== RECOVERY_FORMAT ||
        Number(record.recoveryVersion) !== RECOVERY_VERSION) {
      return "Recovery format or version is not supported.";
    }
    if (typeof record.projectId !== "string" || !record.projectId ||
        typeof record.projectTitle !== "string" ||
        Number(record.projectSchemaVersion) !== 2 ||
        typeof record.savedAt !== "string" ||
        !record.projectData || typeof record.projectData !== "object" ||
        Array.isArray(record.projectData)) {
      return "Recovery record is missing required project information.";
    }

    return "";
  }

  function buildRecoveryRecord(projectData) {
    if (!projectData || typeof projectData !== "object" || Array.isArray(projectData) ||
        Number(projectData.schemaVersion) !== 2 ||
        !projectData.project || typeof projectData.project !== "object") {
      throw new Error("Only a prepared schema v2 project can be stored as recovery.");
    }

    return {
      recoveryFormat: RECOVERY_FORMAT,
      recoveryVersion: RECOVERY_VERSION,
      projectId: String(projectData.project.id || ""),
      projectTitle: String(projectData.project.title || "Untitled Quest"),
      projectSchemaVersion: 2,
      savedAt: new Date().toISOString(),
      dirty: true,
      projectData: cloneJson(projectData)
    };
  }

  function saveRecovery(projectData) {
    var record;

    try {
      record = buildRecoveryRecord(projectData);
    } catch (error) {
      return Promise.resolve(failure(error.message, false, true));
    }

    return runRequest("readwrite", function (store) {
      return store.put(record, ACTIVE_KEY);
    }).then(function () {
      return {
        ok: true,
        found: true,
        record: cloneJson(record)
      };
    }).catch(function (error) {
      return failure(error.message || String(error), !window.indexedDB, false);
    });
  }

  function loadRecovery() {
    return runRequest("readonly", function (store) {
      return store.get(ACTIVE_KEY);
    }).then(function (record) {
      var validationError;

      if (record === undefined) {
        return {
          ok: true,
          found: false,
          record: null
        };
      }

      validationError = validateRecoveryRecord(record);
      if (validationError) {
        return failure(validationError, false, true);
      }

      return {
        ok: true,
        found: true,
        record: cloneJson(record)
      };
    }).catch(function (error) {
      return failure(error.message || String(error), !window.indexedDB, false);
    });
  }

  function clearRecovery() {
    return runRequest("readwrite", function (store) {
      return store.delete(ACTIVE_KEY);
    }).then(function () {
      return {
        ok: true,
        found: false
      };
    }).catch(function (error) {
      return failure(error.message || String(error), !window.indexedDB, false);
    });
  }

  function recoveryInfo() {
    return loadRecovery().then(function (result) {
      if (!result.ok || !result.found) {
        return result;
      }

      return {
        ok: true,
        found: true,
        info: {
          projectId: result.record.projectId,
          projectTitle: result.record.projectTitle,
          projectSchemaVersion: result.record.projectSchemaVersion,
          savedAt: result.record.savedAt
        }
      };
    });
  }

  window.SevenSegProjectStorage = {
    saveRecovery: saveRecovery,
    loadRecovery: loadRecovery,
    clearRecovery: clearRecovery,
    recoveryInfo: recoveryInfo
  };
}());
