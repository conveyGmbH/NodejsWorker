/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    var subscriptionKey = "a12ee952460d409f9f66d1536dd97318";
    var uriBase = "https://westeurope.api.cognitive.microsoft.com/vision/v1.0/ocr?detectOrientation=true";
    var UUID = require("uuid-js");
    var b64js = require("base64-js");


    var dispatcher = {

        startup: function () {
            Log.call(Log.l.trace, "callOcr.");
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 2000;
            this.timestamp = null;
            this._importCardscan_ODataView = AppData.getFormatView("IMPORT_CARDSCAN", 0, false);
            this._importCardscanView20507 = AppData.getFormatView("IMPORT_CARDSCAN", 20507, false);
            this._importCardscanBulk_ODataView = AppData.getFormatView("ImportCardScanBulk", 0, false);
            this.results = [];
            var uuid = UUID.create();
            this.ocrUuid = uuid.toString();
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            var options = {
                type: "POST",
                url: uriBase,
                data: null,
                headers: {
                    "Content-Type": "'application/octet-stream'",
                    "Ocp-Apim-Subscription-Key": subscriptionKey
                }
            };
            var startOk = false;
            var myResult = "";
            var importcardscanid = 0;
            var cardscanbulkid = 0;
            var languageCode = "";
            var dataImportCardscan = {};
            var that = this;
            var pAktionStatus = "OCR_START" + this.ocrUuid; //"OCR_START" + this.ocrUuid;
            Log.call(Log.l.trace, "callOcr.");
            var ret = AppData.call("PRC_STARTCARDOCREX", {
                pAktionStatus: pAktionStatus
            }, function (json) {
                Log.print(Log.l.trace, "PRC_STARTCARDOCREX success!");
                if (json.d.results && json.d.results.length > 0) {
                    importcardscanid = json.d.results[0].IMPORT_CARDSCANVIEWID;
                    Log.print(Log.l.trace, "importcardscanid=" + importcardscanid);
                    var docContent = json.d.results[0].DocContentDOCCNT1;
                    if (docContent) {
                        var sub = docContent.search("\r\n\r\n");
                        options.data = b64js.toByteArray(docContent.substr(sub + 4));
                    }
                }
                startOk = true;
            }, function (error) {
                that.errorCount++;
                Log.print(Log.l.error, "PRC_STARTCARDOCREX error! " + that.successCount + " success / " + that.errorCount + " errors");
                that.timestamp = new Date();
            })/*.then(function selectCardscanView20507() {
                Log.call(Log.l.trace, "callOcr.", "pAktionStatus=" + pAktionStatus);
                if (!startOk) {
                    Log.ret(Log.l.trace, "PRC_STARTCARDOCREX failed!");
                    return WinJS.Promise.as();
                }
                if (!that._importCardscanView20507) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.error, "_importCardscanView20507 not initialized! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                Log.ret(Log.l.trace);
                return that._importCardscanView20507.select(function (json) {
                    Log.print(Log.l.trace, "importCardscanView20507: success!");
                    if (json && json.d && json.d.results && json.d.results.length > 0) {
                        importcardscanid = json.d.results[0].IMPORT_CARDSCANVIEWID;
                        Log.print(Log.l.trace, "importcardscanid=" + importcardscanid);
                        var docContent = json.d.results[0].DocContentDOCCNT1;
                        if (docContent) {
                            var sub = docContent.search("\r\n\r\n");
                            options.data = b64js.toByteArray(docContent.substr(sub + 4));
                        }
                    }
                }, function (error) {
                    Log.print(Log.l.error, "select error=" + AppData.getErrorMsgFromResponse(error));
                    that.errorCount++;
                    Log.print(Log.l.error, "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, { Button: pAktionStatus });
            })*/.then(function ocrPostRequest() {
                Log.call(Log.l.trace, "callOcr.", "importcardscanid=" + importcardscanid + " pAktionStatus=" + pAktionStatus);
                if (!startOk) {
                    Log.ret(Log.l.trace, "PRC_STARTCARDOCREX failed!");
                    return WinJS.Promise.as();
                }
                if (!importcardscanid) {
                    Log.ret(Log.l.trace, "no record found!");
                    return WinJS.Promise.as();
                }
                if (!options.data) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.trace, "no data returned! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                Log.ret(Log.l.trace);
                return WinJS.xhr(options).then(function (response) {
                    var err;
                    Log.print(Log.l.trace, "POST success!");
                    try {
                        var obj = response;
                        var myresultJson = JSON.parse(response.responseText);
                        if (myresultJson && myresultJson.regions.length > 0) {
                            for (var i = 0; i < myresultJson.regions.length; i++) {
                                for (var j = 0; j < myresultJson.regions[i].lines.length; j++) {
                                    for (var k = 0; k < myresultJson.regions[i].lines[j].words.length; k++) {
                                        var myOuterBoundingBox = myresultJson.regions[i].lines[j].boundingBox;
                                        var myBoundingBox = myresultJson.regions[i].lines[j].words[k].boundingBox;
                                        var myNewboundingBox = myBoundingBox.split(",");
                                        var myNewOuterboundingBox = myOuterBoundingBox.split(",");
                                        var x = parseInt(myNewboundingBox[0]);
                                        var y = parseInt(myNewboundingBox[1]);
                                        var width = parseInt(myNewboundingBox[2]);
                                        var height = parseInt(myNewOuterboundingBox[3]);
                                        var lfHeight = 15;
                                        var text = (myresultJson.regions[i].lines[j].words[k].text);
                                        if (importcardscanid && x && y && width && height && text) {
                                            myResult = myResult + x + "," + y + "," + width + "," + height + "," + lfHeight + "," + text + "\n";
                                        }
                                    }
                                }
                            }
                        }
                        if (myResult) {
                            myResult = myResult.replace(/\n$/, " ");
                        }
                    } catch (exception) {
                        that.errorCount++;
                        Log.print(Log.l.error, "resource parse error " + (exception && exception.message) + that.successCount + " success / " + that.errorCount + " errors");
                        that.timestamp = new Date();
                        err = { status: 500, statusText: "data parse error " + (exception && exception.message) };
                    }
                    return WinJS.Promise.as();
                }, function (errorResponse) {
                    that.errorCount++;
                    Log.print(Log.l.error, "error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                    that.timestamp = new Date();
                });
            }).then(function importCardscanBulk() {
                Log.call(Log.l.trace, "callOcr.", "importcardscanid=" + importcardscanid);
                if (!importcardscanid) {
                    Log.ret(Log.l.trace, "no record found!");
                    return WinJS.Promise.as();
                }
                if (!myResult) {
                    Log.ret(Log.l.error, "no result found!");
                    return WinJS.Promise.as();
                }
                if (!that._importCardscanBulk_ODataView) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.error, "_importCardscanBulk_ODataView not initialized! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                var dataImportCardscanBulk = {
                    IMPORT_CARDSCANID: importcardscanid,
                    OCRData: myResult
                };
                Log.ret(Log.l.trace);
                return that._importCardscanBulk_ODataView.insert(function (json) {
                    Log.print(Log.l.info, "importcardscanBulk insert: success!");
                    if (json && json.d) {
                        Log.print(Log.l.info, "ImportCardScanBulkVIEWID=" + json.d.ImportCardScanBulkVIEWID);
                        cardscanbulkid = json.d.ImportCardScanBulkVIEWID;
                        languageCode = json.d.LanguageCode;
                        if (languageCode) {
                            var language = languageCode.split("-");
                            options.url = uriBase + "&language=" + language[0];
                        }
                    }
                }, function (error) {
                    that.errorCount++;
                    Log.print(Log.l.error, "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, dataImportCardscanBulk);
                }).then(function ocrPostRequest() {
                    Log.call(Log.l.trace, "callOcr.", "importcardscanid=" + importcardscanid);
                    if (!importcardscanid) {
                        Log.ret(Log.l.trace, "no record found!");
                        return WinJS.Promise.as();
                    }
                    if (!options.data) {
                        that.errorCount++;
                        that.timestamp = new Date();
                        Log.ret(Log.l.error, "no data returned! " + that.successCount + " success / " + that.errorCount + " errors");
                        return WinJS.Promise.as();
                    }
                    if (!languageCode) {
                        Log.ret(Log.l.trace, "no languageCode found!");
                        return WinJS.Promise.as();
                    }
                    Log.ret(Log.l.trace);
                    return WinJS.xhr(options).then(function (response) {
                        var err;
                        myResult = "";
                        Log.print(Log.l.trace, "POST success!");
                        try {
                            var obj = response;
                            var myresultJson = JSON.parse(response.responseText);
                            if (myresultJson && myresultJson.regions.length > 0) {
                                for (var i = 0; i < myresultJson.regions.length; i++) {
                                    for (var j = 0; j < myresultJson.regions[i].lines.length; j++) {
                                        for (var k = 0; k < myresultJson.regions[i].lines[j].words.length; k++) {
                                            var myOuterBoundingBox = myresultJson.regions[i].lines[j].boundingBox;
                                            var myBoundingBox = myresultJson.regions[i].lines[j].words[k].boundingBox;
                                            var myNewboundingBox = myBoundingBox.split(",");
                                            var myNewOuterboundingBox = myOuterBoundingBox.split(",");
                                            var x = parseInt(myNewboundingBox[0]);
                                            var y = parseInt(myNewboundingBox[1]);
                                            var width = parseInt(myNewboundingBox[2]);
                                            var height = parseInt(myNewOuterboundingBox[3]);
                                            var lfHeight = 15;
                                            var text = (myresultJson.regions[i].lines[j].words[k].text);

                                            if (importcardscanid && x && y && width && height && text) {
                                                myResult = myResult + x + "," + y + "," + width + "," + height + "," + lfHeight + "," + text + "\n";
                                            }
                                        }
                                    }
                                }
                            }
                            if (myResult) {
                                myResult = myResult.replace(/\n$/, " ");
                            }
                        } catch (exception) {
                            that.errorCount++;
                            Log.print(Log.l.error, "resource parse error " + (exception && exception.message) + that.successCount + " success / " + that.errorCount + " errors");
                            that.timestamp = new Date();
                            err = { status: 500, statusText: "data parse error " + (exception && exception.message) };
                        }
                        return WinJS.Promise.as();
                    }, function (errorResponse) {
                        that.errorCount++;
                        Log.print(Log.l.error, "error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                        that.timestamp = new Date();
                    });
                }).then(function importCardscanBulk() {
                    Log.call(Log.l.trace, "callOcr.", "importcardscanid=" + importcardscanid);
                    if (!importcardscanid) {
                        Log.ret(Log.l.trace, "no record found!");
                        return WinJS.Promise.as();
                    }
                    if (!myResult) {
                        Log.ret(Log.l.error, "no result found!");
                        return WinJS.Promise.as();
                    }
                    if (!that._importCardscanBulk_ODataView) {
                        that.errorCount++;
                        that.timestamp = new Date();
                        Log.ret(Log.l.error, "_importCardscanBulk_ODataView not initialized! " + that.successCount + " success / " + that.errorCount + " errors");
                        return WinJS.Promise.as();
                    }
                    var dataImportCardscanBulk = {
                        IMPORT_CARDSCANID: importcardscanid,
                        OCRData: myResult
                    };
                    Log.ret(Log.l.trace);
                    return that._importCardscanBulk_ODataView.insert(function (json) {
                        Log.print(Log.l.info, "importcardscanBulk insert: success!");
                        if (json && json.d) {
                            Log.print(Log.l.info, "ImportCardScanBulkVIEWID=" + json.d.ImportCardScanBulkVIEWID);
                            cardscanbulkid = json.d.ImportCardScanBulkVIEWID;
                            languageCode = json.d.LanguageCode;
                            if (languageCode) {
                                var language = languageCode.split("-");
                                options.url = uriBase + "&language=" + language[0];
                            }
                        }
                    }, function (error) {
                        that.errorCount++;
                        Log.print(Log.l.error, "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                        that.timestamp = new Date();
                    }, dataImportCardscanBulk);
                }).then(function selectImportCardscan() {
                Log.call(Log.l.trace, "callOcr.", "importcardscanid=" + importcardscanid);
                if (!importcardscanid) {
                    Log.ret(Log.l.trace, "no record found!");
                    return WinJS.Promise.as();
                }
                if (!that._importCardscan_ODataView) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.error, "_importCardscan_ODataView not initialized! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                Log.ret(Log.l.trace);
                return that._importCardscan_ODataView.selectById(function (json) {
                    if (json && json.d) {
                        dataImportCardscan = json.d;
                    }
                }, function (error) {
                    that.errorCount++;
                    Log.print(Log.l.error, "_importCardscan_ODataView error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, importcardscanid);
            }).then(function updateImportCardscan() {
                Log.call(Log.l.trace, "callOcr.", "importcardscanid=" + importcardscanid);
                if (!importcardscanid) {
                    Log.ret(Log.l.trace, "no record found!");
                    return WinJS.Promise.as();
                }
                if (!dataImportCardscan) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.error, "no data found! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                if (!that._importCardscan_ODataView) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.error, "_importCardscan_ODataView not initialized! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                if (cardscanbulkid) {
                    pAktionStatus = "OCR_DONE";
                } else {
                    pAktionStatus = "OCR_ERROR";
                }
                dataImportCardscan.Button = pAktionStatus;
                dataImportCardscan.SCANTS = null;
                Log.ret(Log.l.trace);
                return that._importCardscan_ODataView.update(function (json) {
                    that.successCount++;
                    Log.print(Log.l.info, "_importCardscan_ODataView update: success! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, function (error) {
                    that.errorCount++;
                    Log.print(Log.l.error, "_importCardscan_ODataView error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, importcardscanid, dataImportCardscan);
            });
            Log.ret(Log.l.trace);
            return ret;
        },

        dispose: function () {
            Log.call(Log.l.trace, "callOcr.");
            this.dbEngine = null;
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            Log.call(Log.l.trace, "callOcr.");
            var infoText = this.successCount + " success / " + this.errorCount + " errors";
            if (this.timestamp) {
                infoText += "\n" + this.timestamp.toLocaleTimeString();
            }
            if (this.results) {
                for (var i = 0; i < this.results.length; i++) {
                    infoText += "\n" + "[" + i + "]: " + this.results[i];
                }
            }
            Log.ret(Log.l.trace, infoText);
            return infoText;
        }
    };
    module.exports = dispatcher;
})();