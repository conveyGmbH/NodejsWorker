/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />

(function () {
    "use strict";
    var UUID = require("uuid-js");
    var CSV = require("csv-string");
    //var iconv = require('iconv-lite');
    //var PARSECSV = require("csv-parse/lib/es5");
    /**
     * Daten unterschiedlich getrennt -> reihenfolge der Daten unterschiedlich von Messe zu Messe (config-datei)
     */
    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, "dbSyncdbSync.");
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 950 + 100 * Math.random();
            this.timestamp = null;
            this.results = [];
            this._synchronisationsjob_odataView = AppData.getFormatView("Synchronisationsjob", 0, false);
            this._synchronisationsjobVIEW_20560 = AppData.getFormatView("Synchronisationsjob", 20560, false);
            this._importBarcodeScan_ODataView = AppData.getFormatView("ImportBarcodeScan", 0, false);

            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            // Ruf Prozedur auf
            var options = {
                type: "GET"
            }

            var myResult = "";
            var dataImportBarcodeScan = null;
            var recordId = 0;
            var synchronisationsjobViewId = 0;
            var synchronisationsjobRecord = null;
            var uuid = UUID.create();
            this.dbSyncUuid = uuid.toString();
            var that = this;
            var pAktionStatus = "DBSYNC_START" + this.dbSyncUuid;
            var pStatusId = -1;
            var pErrorCode = 0;
            var pErrorMessage = null;
            var ret = AppData.call("PRC_STARTDBSYNC",
                {
                    pAktionStatus: pAktionStatus
                },
                function (json) {
                    //Log.print(Log.l.trace, "PRC_STARTDBSYNC success!");
                    if (json && json.d && json.d.results && json.d.results.length > 0) {
                        Log.print(Log.l.trace, "result not empty");
                        recordId = json.d.results[0].RecordID; //RecordID
                        synchronisationsjobViewId = json.d.results[0].SynchronisationsjobVIEWID;
                        //dataImportBarcodeScan = json.d.results[0];
                        options.url = json.d.results[0].URL +
                            "&" +
                            json.d.results[0].RemoteTableID +
                            "&&,,,,'" +
                            json.d.results[0].Request_Barcode +
                            "';&";
                        /*options.user = json.d.results[0].UserName;
                        options.password = json.d.results[0].UserPassword;*/
                    }
                },
                function (error) {
                    Log.print(Log.l.error, "myResult post request: " + myResult);
                    Log.print(Log.l.error, "select error=" + AppData.getErrorMsgFromResponse(error));
                    that.errorCount++;
                    Log.print(Log.l.error,
                        "PRC_STARTDBSYNC error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }).then(function importBarcodeScanODataView() {
                    Log.call(Log.l.trace, "dbsync.", "pAktionStatus=" + pAktionStatus);
                    if (!recordId) {
                        Log.ret(Log.l.trace, "no data returned");
                        return WinJS.Promise.as();
                    }
                    if (!that._importBarcodeScan_ODataView) {
                        that.errorCount++;
                        that.timestamp = new Date();
                        Log.print(Log.l.error, "myResult post request: " + myResult);
                        Log.ret(Log.l.error,
                            "_synchronisationsjobVIEW not initialized! " +
                            that.successCount +
                            " success / " +
                            that.errorCount +
                            " errors");
                        return WinJS.Promise.as();
                    }
                    Log.ret(Log.l.trace);
                    return that._importBarcodeScan_ODataView.select(function (json) {
                        if (json && json.d && json.d.results && json.d.results.length > 0) {
                            Log.print(Log.l.trace, "importBarcodeScan_ODataView: success!");
                            dataImportBarcodeScan = json.d.results[0];
                        }
                        return WinJS.Promise.as();
                    },
                        function (error) {
                            that.errorCount++;
                            Log.print(Log.l.error, "myResult post request: " + myResult);
                            Log.print(Log.l.error,
                                "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                            that.timestamp = new Date();
                        },
                        { ImportBarcodeScanVIEWID: recordId });
                }).then(function barcodeRequestPostRequest() {
                    if (!recordId) {
                        return WinJS.Promise.as();
                    }
                    if (!options.url) {
                        return WinJS.Promise.as();
                    }
                    return WinJS.xhr(options).then(function (successResponse) {
                        var err;
                        Log.print(Log.l.trace, "POST success!");
                        var obj = null;
                        try {
                            obj = successResponse.response.replace(/(<([^>]+)>)/gi, "");
                            myResult = CSV.parse(obj); // stelle kann nicht parsen
                            Log.print(Log.l.error, "1. myResult post request: " + myResult);
                            if (myResult && myResult[1][22] && myResult[1][22] !== "") {
                                Log.print(Log.l.error, "1. myResult.Fehlermeldung post request: " + myResult[1][22]);
                                pErrorMessage = myResult[1][22].substring(1, myResult[1][22].length - 1);
                            }
                            Log.print(Log.l.error, "2. myResult post request: " + myResult);
                        } catch (exception) {
                            that.errorCount++;
                            Log.print(Log.l.error, "obj post request: " + obj);
                            Log.print(Log.l.error,
                                "resource parse error " +
                                (exception && exception.message) +
                                that.successCount +
                                " success / " +
                                that.errorCount +
                                " errors");
                            that.timestamp = new Date();
                            err = { status: 500, statusText: "data parse error " + (exception && exception.message) };
                        }
                    },
                        function (errorResponse) {
                            that.errorCount++;
                            //Log.print(Log.l.error, "obj post request: " + obj);
                            Log.print(Log.l.error, "myResult post request: " + myResult);
                            Log.print(Log.l.error,
                                "error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                            that.timestamp = new Date();
                        });
                }).then(function updatedataImportBarcodeScan() {
                    if (!recordId) {
                        return WinJS.Promise.as();
                    }
                    if (!synchronisationsjobViewId) {
                        return WinJS.Promise.as();
                    }
                    //dataImportBarcodeScan.RequestUser = "ConveyCIAS";
                    /*if (!myResult) {
                        return WinJS.Promise.as();
                    }*/
                    Log.call(Log.l.trace, "calldbSync.", "dataImportBarcodeScan=" + dataImportBarcodeScan);
                    if (myResult && myResult[1][22] && myResult[1][22] !== "") {
                        dataImportBarcodeScan.RequestUser = myResult[1][1].substring(1, myResult[1][1].length - 1);
                        dataImportBarcodeScan.RequestHost = myResult[1][2].substring(1, myResult[1][2].length - 1);
                        var requestTS_local = new Date(myResult[1][3].substring(1, myResult[1][3].length - 1));
                        var requestTS_UTC = Date.UTC(requestTS_local.getUTCFullYear(), requestTS_local.getUTCMonth(),
                            requestTS_local.getUTCDate(), requestTS_local.getUTCHours(),
                            requestTS_local.getUTCMinutes(), requestTS_local.getUTCSeconds());
                        dataImportBarcodeScan.RequestTS = "/Date(" + requestTS_UTC + ")/";
                        dataImportBarcodeScan.Anrede = myResult[1][5].substring(1, myResult[1][5].length - 1);
                        dataImportBarcodeScan.Titel = myResult[1][6].substring(1, myResult[1][6].length - 1);
                        dataImportBarcodeScan.Vorname = myResult[1][7].substring(1, myResult[1][7].length - 1);
                        dataImportBarcodeScan.Vorname2 = myResult[1][8].substring(1, myResult[1][8].length - 1);
                        dataImportBarcodeScan.Personenname = myResult[1][9].substring(1, myResult[1][9].length - 1);
                        dataImportBarcodeScan.Strasse = myResult[1][10].substring(1, myResult[1][10].length - 1);
                        dataImportBarcodeScan.Postfach = myResult[1][11].substring(1, myResult[1][11].length - 1);
                        dataImportBarcodeScan.PLZ = myResult[1][12].substring(1, myResult[1][12].length - 1);
                        dataImportBarcodeScan.Ort = myResult[1][13].substring(1, myResult[1][13].length - 1);
                        //dataImportBarcodeScan.Staat_Provinz =
                        //
                        dataImportBarcodeScan.Land = myResult[1][15].substring(1, myResult[1][15].length - 1);
                        dataImportBarcodeScan.Telefon = myResult[1][16].substring(1, myResult[1][16].length - 1);
                        dataImportBarcodeScan.Telefax = myResult[1][17].substring(1, myResult[1][17].length - 1);
                        dataImportBarcodeScan.EMail = myResult[1][18].substring(1, myResult[1][18].length - 1);
                        dataImportBarcodeScan.WWW = myResult[1][19].substring(1, myResult[1][19].length - 1);
                        dataImportBarcodeScan.Firmenposition = myResult[1][20].substring(1, myResult[1][20].length - 1);
                        dataImportBarcodeScan.Firmenname = myResult[1][21].substring(1, myResult[1][21].length - 1);
                        dataImportBarcodeScan.LandISOCode = myResult[1][25].substring(1, myResult[1][25].length - 1);
                        dataImportBarcodeScan.Mobile = myResult[1][26].substring(1, myResult[1][26].length - 1);
                        dataImportBarcodeScan.SpracheID = myResult[1][33].substring(1, myResult[1][33].length - 1);
                        dataImportBarcodeScan.PostfachPLZ = myResult[1][30].substring(1, myResult[1][30].length - 1);
                        dataImportBarcodeScan.Branche = myResult[1][36].substring(1, myResult[1][36].length - 1);
                    }

                    dataImportBarcodeScan.Kommentar = pErrorMessage;
                    if (!pErrorMessage) {
                        pAktionStatus = null;
                        pStatusId = 1;
                        pErrorCode = 99;
                        pErrorMessage = "Ok";
                    } else {
                        pAktionStatus = null;
                        pStatusId = 99;
                        pErrorCode = null;
                        //pErrorMessage = null;
                    }
                    //dataImportBarcodeScan.StatusID = pStatusId;
                    //dataImportBarcodeScan.ClientID = pAktionStatus;
                    Log.ret(Log.l.trace);
                    //invalid entity
                    return that._importBarcodeScan_ODataView.update(function (json) {
                        Log.print(Log.l.info, "_importCardscan_ODataView update: success!");
                        that.timestamp = new Date();
                    },
                        function (error) {
                            that.errorCount++;
                            Log.print(Log.l.error, "myResult post request: " + myResult);
                            Log.print(Log.l.error,
                                "_importCardscan_ODataView error! " +
                                that.successCount +
                                " success / " +
                                that.errorCount +
                                " errors");
                            that.timestamp = new Date();
                        },
                        recordId,
                        dataImportBarcodeScan);
                }).then(function selectSynchronisationsjobODataView() {
                    if (!recordId) {
                        return WinJS.Promise.as();
                    }
                    if (!synchronisationsjobViewId) {
                        return WinJS.Promise.as();
                    }
                    return that._synchronisationsjob_odataView.select(function (json) {
                        Log.print(Log.l.trace, "synchronisationsjob_odataView: success!");
                        if (json && json.d && json.d.results && json.d.results.length > 0) {
                            //importcardscanid = json.d.results[0].IMPORT_CARDSCANVIEWID;
                            //Log.print(Log.l.trace, "importcardscanid=" + importcardscanid);
                            synchronisationsjobRecord = json.d.results[0];
                        }
                    }, function (error) {
                        that.errorCount++;
                        Log.print(Log.l.error, "myResult post request: " + myResult);
                        Log.print(Log.l.error, "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                        that.timestamp = new Date();
                    }, { SynchronisationsjobVIEWID: synchronisationsjobViewId });
                }).then(function updateSynchronisationsjobODataView() {
                    if (!recordId) {
                        return WinJS.Promise.as();
                    }
                    if (!synchronisationsjobRecord) {
                        return WinJS.Promise.as();
                    }
                    synchronisationsjobRecord.StatusID = pStatusId;
                    synchronisationsjobRecord.ErrorCode = pErrorCode;
                    synchronisationsjobRecord.ErrorMessage = pErrorMessage;
                    synchronisationsjobRecord.ClientID = pAktionStatus;
                    //invalid entity
                    return that._synchronisationsjob_odataView.update(function (json) {
                        that.successCount++;
                        Log.print(Log.l.error, "myResult post request: " + myResult);
                        Log.print(Log.l.info,
                            "_importCardscan_ODataView update: success! " +
                            that.successCount +
                            " success / " +
                            that.errorCount +
                            " errors");
                        that.timestamp = new Date();
                    }, function (error) {
                        that.errorCount++;
                        Log.print(Log.l.error, "myResult post request: " + myResult);
                        Log.print(Log.l.error,
                            "_importCardscan_ODataView error! " +
                            that.successCount +
                            " success / " +
                            that.errorCount +
                            " errors");
                        that.timestamp = new Date();
                    }, synchronisationsjobViewId, synchronisationsjobRecord);
                });
            return ret;
        },

        dispose: function () {
            Log.call(Log.l.trace, "calldbSync.");
            this.dbEngine = null;
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            Log.call(Log.l.trace, "calldbSync.");
            var infoText = this.successCount + " success / " + this.errorCount + " errors";
            if (this.timestamp) {
                infoText += "\n" + this.timestamp.toLocaleTimeString();
            }
            if (this.results) {
                for (var i = 0; i < this.results.length; i++) {
                    infoText += "\n" + "[" + i + "]: " + this.results[i];
                }
            }
            Log.ret(Log.l.trace);
            return infoText;
        }
    };
    module.exports = dispatcher;
})();