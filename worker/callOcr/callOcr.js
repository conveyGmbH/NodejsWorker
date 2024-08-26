/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    var subscriptionKey = "";
    if (process && process.env) {
        subscriptionKey = process.env.OCR_SUBSCRIPTION_KEY;
    }
    //var uriBase = "https://westeurope.api.cognitive.microsoft.com/vision/v3.2/read/analyze?detectOrientation=true";
    //var uriBase = "https://westeurope.cognitiveservices.azure.com/computervision/imageanalysis:analyze?api-version=2023-04-01-preview&features=read";
    var uriBase = "https://westeurope.cognitiveservices.azure.com/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read";
    //var uriBase = "https://westeurope.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-layout:analyze?_overload=analyzeDocument&api-version=2024-07-31-preview";
    var UUID = require("uuid-js");
    var b64js = require("base64-js");


    var dispatcher = {

        startup: function () {
            Log.call(Log.l.trace, "callOcr.");
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 950 + 100 * Math.random();
            this.timestamp = null;
            this._importCardscan_ODataView = AppData.getFormatView("IMPORT_CARDSCAN", 0, false);
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
                    "Content-Type": "application/octet-stream",
                    "Ocp-Apim-Subscription-Key": subscriptionKey
                }
            };
            var startOk = false;
            var myResult = "";
            var importcardscanid = 0;
            var docContent = null;
            var cardscanbulkid = 0;
            var dataImportCardscan = {};
            var that = this;
            var pAktionStatus = "OCR_START" + this.ocrUuid; //"OCR_START" + this.ocrUuid;
            var responseText = null;
            Log.call(Log.l.trace, "callOcr.");
            var err = null;
            var ret = AppData.call("PRC_STARTCARDOCREX", {
                pAktionStatus: pAktionStatus
            }, function (json) {
                Log.print(Log.l.trace, "PRC_STARTCARDOCREX success!");
                if (json && json.d && json.d.results && json.d.results.length > 0) {
                    importcardscanid = json.d.results[0].IMPORT_CARDSCANVIEWID;
                    Log.print(Log.l.trace, "importcardscanid=" + importcardscanid);
                    docContent = json.d.results[0].DocContentDOCCNT1;
                    if (docContent) {
                        var sub = docContent.search("\r\n\r\n");
                        if (sub) {
                            try {
                                options.data = b64js.toByteArray(docContent.substr(sub + 4));
                            } catch (exception) {
                                that.errorCount++;
                                Log.print(Log.l.error,
                                    "resource parse error " +
                                    (exception && exception.message) +
                                    that.successCount +
                                    " success / " +
                                    that.errorCount +
                                    " errors");
                                that.timestamp = new Date();
                                err = {
                                    status: 500,
                                    statusText: "data parse error " + (exception && exception.message)
                                };
                            }
                        }
                    }
                }
                startOk = true;
            }, function (error) {
                that.errorCount++;
                Log.print(Log.l.error, "PRC_STARTCARDOCREX error! " + that.successCount + " success / " + that.errorCount + " errors");
                that.timestamp = new Date();
            }).then(function ocrPostRequest() {
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
                    Log.print(Log.l.trace, "POST success!");
                    responseText = response && response.responseText;
                    return response &&
                        (typeof response.getResponseHeader === "function") &&
                        response.getResponseHeader("Operation-Location");
                }, function (errorResponse) {
                    that.errorCount++;
                    Log.print(Log.l.error, "error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                    that.timestamp = new Date();
                });
            }).then(function handleResponseHeader(url) {
                if (url) {
                    Log.print(Log.l.trace, "calling Operation-Location=" + url);
                    var optionsUrl = {
                        type: "GET",
                        url: url,
                        headers: {
                            "Ocp-Apim-Subscription-Key": subscriptionKey
                        }
                    };
                    return WinJS.xhr(optionsUrl).then(function (response) {
                        try {
                            var myresultJson = JSON.parse(response.responseText);
                            if (myresultJson && myresultJson.status !== "succeeded") {
                                Log.print(Log.l.trace, "GET status=" + myresultJson.status);
                                return handleResponseHeader(optionsUrl.url);
                            } else {
                                Log.print(Log.l.trace, "GET success!");
                                responseText = response && response.responseText;
                                return WinJS.Promise.as();
                            }
                        } catch (exception) {
                            that.errorCount++;
                            Log.print(Log.l.error,
                                "resource parse error " +
                                (exception && exception.message) +
                                that.successCount +
                                " success / " +
                                that.errorCount +
                                " errors");
                            that.timestamp = new Date();
                            err = {
                                status: 500,
                                statusText: "data parse error " + (exception && exception.message)
                            };
                            return WinJS.Promise.as();
                        }
                    });
                } else {
                    return WinJS.Promise.as();
                }
            }).then(function handleResponseText() {
                if (responseText) {
                    try {
                        var myresultJson = JSON.parse(responseText);
                        if (!myresultJson) {
                            that.errorCount++;
                            Log.print(Log.l.error,
                                "resource parse error " +
                                that.successCount +
                                " success / " +
                                that.errorCount +
                                " errors");
                            that.timestamp = new Date();
                            err = {
                                status: 500,
                                statusText: "data parse error "
                            };
                            return WinJS.Promise.as();
                        }
                        function degrees_to_radians(degrees) {
                            var pi = Math.PI;
                            return degrees * (pi / 180);
                        };

                        function rotatePoint(point, degrees) {
                            var radians = degrees_to_radians(degrees);
                            var cos_rad = Math.cos(radians);
                            var sin_rad = degrees < 0 ? Math.sin(radians) : -Math.sin(radians) ;

                            var qx = cos_rad * point.x - sin_rad * point.y;
                            var qy = sin_rad * point.x + cos_rad * point.y;
                            if (ocr_angle < 0) {
                                qy = -qy;
                            }
                            return {x: qx, y: qy };
                        };
                        var i, j, k, myBoundingBox, ocr_angle, lfHeight, text, boundingBoxRotated, l, x, y, rotatedPoint, width, height;
                        if (myresultJson.status !== "succeeded" &&
                            myresultJson.analyzeResult &&
                            myresultJson.analyzeResult.readResults) {
                            var readResults = myresultJson.analyzeResult.readResults;
                            if (readResults && readResults.length > 0) {
                                for (i = 0; i < readResults.length; i++) {
                                    for (j = 0; j < readResults[i].lines.length; j++) {
                                        for (k = 0; k < readResults[i].lines[j].words.length; k++) {
                                            myBoundingBox = readResults[i].lines[j].words[k].boundingBox;
                                            ocr_angle = readResults[i].angle;
                                            lfHeight = 15;
                                            text = readResults[i].lines[j].words[k].text;
                                            boundingBoxRotated = [];
                                            for (l = 0; l < myBoundingBox.length - 1; l = l + 2) {
                                                x = parseInt(myBoundingBox[l]);
                                                y = parseInt(myBoundingBox[l + 1]);
                                                rotatedPoint = null;
                                                if (ocr_angle < 0) {
                                                    rotatedPoint = rotatePoint({x: x, y: -y}, ocr_angle);
                                                } else {
                                                    rotatedPoint = rotatePoint({ x: x, y: y }, ocr_angle);
                                                }
                                                boundingBoxRotated.push(rotatedPoint.x);
                                                boundingBoxRotated.push(rotatedPoint.y);
                                            }
                                            if (ocr_angle) {
                                                myBoundingBox = boundingBoxRotated;
                                            }
                                            x = Math.round((myBoundingBox[0] + myBoundingBox[6]) / 2);
                                            y = Math.round((myBoundingBox[1] + myBoundingBox[3]) / 2);
                                            width = Math.round((myBoundingBox[2] - myBoundingBox[0] + myBoundingBox[4] - myBoundingBox[6]) / 2);
                                            height = Math.round((myBoundingBox[5] - myBoundingBox[3] + myBoundingBox[7] - myBoundingBox[1]) / 2);
                                            if (importcardscanid && text) {
                                                myResult = myResult + x + "," + y + "," + width + "," + height + "," + lfHeight + "," + text + "\n";
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (myresultJson.readResult &&
                                   myresultJson.readResult.pages) {
                            var pages = myresultJson.readResult.pages;
                            for (i = 0; i < pages.length; i++) {
                                for (k = 0; k < pages[i].words.length; k++) {
                                    myBoundingBox = pages[i].words[k].boundingBox;
                                    ocr_angle = pages[i].angle;
                                    lfHeight = 15;
                                    text = pages[i].words[k].content;
                                    boundingBoxRotated = [];
                                    for (l = 0; l < myBoundingBox.length - 1; l = l + 2) {
                                        x = parseInt(myBoundingBox[l]);
                                        y = parseInt(myBoundingBox[l + 1]);
                                        rotatedPoint = null;
                                        if (ocr_angle < 0) {
                                            rotatedPoint = rotatePoint({x: x, y: -y}, ocr_angle);
                                        } else {
                                            rotatedPoint = rotatePoint({ x: x, y: y }, ocr_angle);
                                        }
                                        boundingBoxRotated.push(rotatedPoint.x);
                                        boundingBoxRotated.push(rotatedPoint.y);
                                    }
                                    if (ocr_angle) {
                                        myBoundingBox = boundingBoxRotated;
                                    }
                                    x = Math.round((myBoundingBox[0] + myBoundingBox[6]) / 2);
                                    y = Math.round((myBoundingBox[1] + myBoundingBox[3]) / 2);
                                    width = Math.round((myBoundingBox[2] - myBoundingBox[0] + myBoundingBox[4] - myBoundingBox[6]) / 2);
                                    height = Math.round((myBoundingBox[5] - myBoundingBox[3] + myBoundingBox[7] - myBoundingBox[1]) / 2);
                                    if (importcardscanid && text) {
                                        myResult = myResult + x + "," + y + "," + width + "," + height + "," + lfHeight + "," + text + "\n";
                                    }
                                }
                            }
                        }
                        if (myResult) {
                            myResult = myResult.replace(/\n$/, " ");
                        }
                    } catch (exception) {
                        that.errorCount++;
                        Log.print(Log.l.error,
                            "resource parse error " +
                            (exception && exception.message) +
                            that.successCount +
                            " success / " +
                            that.errorCount +
                            " errors");
                        that.timestamp = new Date();
                        err = {
                            status: 500,
                            statusText: "data parse error " + (exception && exception.message)
                        };
                    }

                }
                return WinJS.Promise.as();
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
                    //that.errorCount++;
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
                    //that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.error, "no data found! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                if (!that._importCardscan_ODataView) {
                    //that.errorCount++;
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