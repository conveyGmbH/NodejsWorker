/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    const UUID = require("uuid-js");
    const puppeteer = require("puppeteer");
    const logPrefix = 'recognizeUrlCard';

    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, `${logPrefix}.startup`);
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 1000;

            const uuid = UUID.create();
            this.urluuid = uuid.toString();

            // TODO: initialize puppeteer?

            // TODO: white-/blacklist?

            // TODO: initialize OData views here
            // e.g. this._someView = AppData.getFormatView("SOME_VIEW", 0, false);

            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            Log.call(Log.l.trace, `${logPrefix}.activity`);
            var that = this;
            const pAktionStatus = `URL_START-${this.urluuid}`;

            var currentId = null;
            var currentKontaktID = null;
            var currentUrl = null;
            var screenshotData = null;
            var err = null;

            // Step 1: fetch next record to process
            var ret = AppData.call("PRC_STARTURLOCR", {
                pAktionStatus: pAktionStatus
            },
            function callSuccess(json) {
                Log.print(Log.l.trace, "PRC_STARTURLOCR success");
                if (json.d.results && json.d.results.length > 0) {
                    currentId = json.d.results[0].SynchronisationsjobID;
                    currentKontaktID = json.d.results[0].KontaktID;
                    currentUrl = json.d.results[0].Request_Barcode;
                } else {
                    Log.print(Log.l.info, "No rows to process");
                }
            },
            function callError(error) {
                that.errorCount++;
                err = error;
                Log.print(Log.l.error, "Error: " + error);
            }).then(function screenshot() {
                Log.call(Log.l.trace, `${logPrefix}.step2`);
                if (!currentId || err) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }

                // TODO: puppeteer pickup
                this.screenshotData = 'TODO LMAO'
                // Can we just save into a base64 encoded thing with puppeteer? Who knows.

                Log.ret(Log.l.trace);
                return WinJS.Promise.as();
            }).then(function insertIntoDB() {
                Log.call(Log.l.trace, `${logPrefix}.inserIntoDB`);
                if (!currentId || err) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }

                // TODO: Insert new Import_Cardscan row
                // TODO: Insert new Doc1Importcardscan row with imagedata (base64)

                Log.ret(Log.l.trace);
                return WinJS.Promise.as();
            }).then(function doRepeate() {
                Log.call(Log.l.trace, `${logPrefix}.doRepeate`);
                if (!currentId) {
                    Log.print(Log.l.info, "No rows to process, stopping loop");
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }
                if (!err) {
                    Log.print(Log.l.info, "Continuing loop...");
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.timeout(that.waitTimeMs).then(function () {
                        return that.activity();
                    });
                }
                Log.print(Log.l.info, "Stopping loop due to error");
                Log.ret(Log.l.trace);
                return WinJS.Promise.as();
            });

            Log.ret(Log.l.trace);
            return ret;
        },

        dispose: function () {
            Log.call(Log.l.trace, `${logPrefix}.dispose`);
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            return this.successCount + " success / " + this.errorCount + " errors";
        }
    };

    module.exports = dispatcher;
})();
