/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    const UUID = require("uuid-js");
    const puppeteer = require("puppeteer");
    const fs = require("fs");
    const path = require("path");
    const logPrefix = 'recognizeUrlCard';

    function toWinJSPromise(nativePromise, onCancel) {
        return new WinJS.Promise(function (complete, error /*, progress */) {
            try {
                nativePromise.then(complete, error);
            } catch (e) {
                error(e);
            }
        }, onCancel);
    }

    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, `${logPrefix}.startup`);
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 1000;

            const uuid = UUID.create();
            this.urluuid = uuid.toString();

            // TODO: white-/blacklist?

            this._importCardscan_ODataView = AppData.getFormatView("IMPORT_CARDSCAN", 0, false);
            this._doc1ImportCardscan_ODataView = AppData.getFormatView("DOC1IMPORT_CARDSCAN", 0, false);
            this._synchronisationsjob_ODataView = AppData.getFormatView("Synchronisationsjob", 0, false);

            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            const testing = process.env.TESTING
            Log.call(Log.l.trace, `${logPrefix}.activity`);
            var that = this;
            const pAktionStatus = `URL_START-${this.urluuid}`;

            var currentId = null;
            var currentKontaktID = null;
            var currentUrl = null;
            var importCardscanId = null;
            var screenshotData = null;
            var screenshotDimensions = null;
            var currentSynchronisationsjobData = null;
            var err = null;

            // Step 1: fetch next record to process
            var ret = AppData.call("PRC_STARTURLOCREX", {
                pAktionStatus: pAktionStatus
            },
            function callSuccess(json) {
                Log.print(Log.l.trace, "PRC_STARTURLOCREX success");
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
                Log.call(Log.l.trace, `${logPrefix}.screenshot`);
                if (!currentId || err) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }

                return toWinJSPromise(
                    puppeteer.launch().then(function(browser) {
                        return browser.newPage().then(function(page) {
                            return page.goto(currentUrl, { waitUntil: 'networkidle2' }).then(function() {
                                return page.evaluate(function() {
                                    return {
                                        width: document.documentElement.scrollWidth,
                                        height: document.documentElement.scrollHeight
                                    };
                                });
                            }).then(function(dimensions) {
                                screenshotDimensions = dimensions;
                                return page.screenshot({ fullPage: true, encoding: 'base64' });
                            }).then(function(image) {
                                screenshotData = image;
                                if (testing) {
                                    const debugDir = path.join(__dirname, 'debug');
                                    fs.mkdirSync(debugDir, { recursive: true });
                                    const filename = path.join(debugDir, `${currentId}_${Date.now()}.png`);
                                    fs.writeFileSync(filename, Buffer.from(image, 'base64'));
                                    Log.print(Log.l.info, "Debug screenshot saved: " + filename);
                                }
                            });
                        }).then(function() {
                            return browser.close();
                        }, function(e) {
                            return browser.close().then(function() { throw e; });
                        });
                    })
                ).then(function() {
                    Log.ret(Log.l.trace);   
                }, function (error) {
                    that.errorCount++;
                    err = error;
                    Log.print(Log.l.error, "Screenshot failed: " + error );
                    Log.ret(Log.l.trace);
                });
            }).then(function insertImport_Cardscan() {
                Log.call(Log.l.trace, `${logPrefix}.insertImport_Cardscan`);
                if (!currentId || err) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }

                return that._importCardscan_ODataView.insert(
                    function insertSuccess(response) {
                        importCardscanId = response.d.IMPORT_CARDSCANVIEWID;
                        Log.print(Log.l.info, "Import_Cardscan insert success, ID: " + importCardscanId);
                    },
                    function insertError(error) {
                        that.errorCount++;
                        err = error;
                        Log.print(Log.l.error, "Error: " + error);                    },
                    {
                        KontaktID: currentKontaktID,
                        Button: "OCR_TODO"
                    }
                ).then(function() {
                    Log.ret(Log.l.trace);
                })

            }).then(function insertDOC1() {
                Log.call(Log.l.trace, `${logPrefix}.insertDOC1`);
                if (!currentId || err || !importCardscanId) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                };

                Log.print(Log.l.info, "DOC1 insert: importCardscanId=" + importCardscanId + " screenshotDimensions=" + JSON.stringify(screenshotDimensions));

                // TODO: This is currently a temporary manual request because idk i couldn't get it to work with the ODATA API... not usable like this.
                // var url = "https://deimos.convey.de/odata_online/DOC1IMPORT_CARDSCAN_ODataVIEW";
                // var options = AppData.initXhrOptions("POST", url, false);
                // options.headers["Accept"] = "application/json";
                // options.headers["Content-Type"] = "application/json";
                // options.data = JSON.stringify({
                //     DOC1IMPORT_CARDSCANVIEWID: importCardscanId,
                //     wFormat: 3,
                //     ColorType: 11,
                //     ulWidth: screenshotDimensions.width,
                //     ulHeight: screenshotDimensions.height,
                //     ulDpm: 0,
                //     szOriFileNameDOC1: "card.jpg",
                //     DocContentDOCCNT1: screenshotData,
                //     ContentEncoding: 4096
                // });
                // return WinJS.xhr(options).then(
                //     function() {
                //         Log.print(Log.l.info, "DOC1 insert success");
                //         Log.ret(Log.l.trace);
                //     },
                //     function(error) {
                //         that.errorCount++;
                //         err = error;
                //         Log.print(Log.l.error, "DOC1 insert failed: " + error);
                //         Log.ret(Log.l.trace);
                //     }
                // );

                return that._doc1ImportCardscan_ODataView.insertWithId(
                    function insertSuccess(response) {
                        Log.print(Log.l.info, "DOC1 Insert completed.");
                    },
                    function insertError(error) {
                        that.errorCount++;
                        err = error;
                        Log.print(Log.l.error, "Error: " + error); 
                    },
                    {
                        DOC1IMPORT_CARDSCANVIEWID: importCardscanId,
                        wFormat: 3,
                        ColorType: 11,
                        ulWidth: screenshotDimensions.width,
                        ulHeight: screenshotDimensions.height,
                        ulDpm: 0,
                        szOriFileNameDOC1: "card.jpg",
                        DocContentDOCCNT1: screenshotData,
                        ContentEncoding: 4096
                    }

                )
            }).then(function selectForUpdate() {
                if (err || !currentId) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, `${logPrefix}.selectForUpdate`);
                return that._synchronisationsjob_ODataView.selectById(
                    function selectSuccess(json) {
                        Log.print(Log.l.info, "selectForUpdate select success.");
                        if (json) {
                            currentSynchronisationsjobData = json.d;
                        }
                    },
                    function selectError(error) {
                        that.errorCount++;
                        err = error;
                        Log.print(Log.l.error, "Error: " + error);
                    },
                    currentId
                ).then(function() {
                    Log.ret(Log.l.trace);
                });
            }).then(function updateSyncJob() {
                if (!currentSynchronisationsjobData || !currentId) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, `${logPrefix}.updateSyncJob`);
                if (!err) {
                    currentSynchronisationsjobData.FollowUp = 'URL_DONE';
                } else {
                    currentSynchronisationsjobData.FollowUp = 'URL_ERROR';
                }
                currentSynchronisationsjobData.ClientID = null;
                return that._synchronisationsjob_ODataView.update(
                    function updateSuccess() {
                        Log.print(Log.l.info, "Successfully updated Synchronisationsjob to Status: " + currentSynchronisationsjobData.FollowUp);
                    },
                    function updateError(error) {
                        that.errorCount++;
                        err = error;
                        Log.print(Log.l.error, "Error: " + error);
                    },
                    currentId,
                    currentSynchronisationsjobData
                ).then(function() {
                    Log.ret(Log.l.trace);
                })

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
