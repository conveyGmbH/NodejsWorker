/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    const { DocumentAnalysisClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");
    const UUID = require("uuid-js");
    const b64js = require("base64-js");
    //const fs = require("fs");

    //var fileName = "images/business_card.jpg";

    // Set up the request
    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 950 + 100 * Math.random();
            this.timestamp = null;

            // You will need to set these environment variables or edit the following values
            this.endpoint = "https://westeurope.api.cognitive.microsoft.com/";
            this.apiKey = "eb0abaaf63d3477c95c3f6f645be1eab";

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
            Log.call(Log.l.trace, "recognizeBusinessCard.");
            var startOk = false;
            var myResult = "";
            var importcardscanid = 0;
            var docContent = null;
            var cardscanbulkid = 0;
            var data = "";
            var languageCode = "";
            var dataImportCardscan = {};

            var that = this;
            var pAktionStatus = "OCR_START" + this.ocrUuid; //"OCR_START" + this.ocrUuid;

            //var readStream = fs.createReadStream(fileName);
            var client = new DocumentAnalysisClient(this.endpoint, new AzureKeyCredential(this.apiKey));
            var ret = AppData.call("PRC_STARTCARDOCREX", {
                pAktionStatus: pAktionStatus
            }, function (json) {
                Log.print(Log.l.trace, "PRC_STARTCARDOCREX success!");
                if (json.d.results && json.d.results.length > 0) {
                    importcardscanid = json.d.results[0].IMPORT_CARDSCANVIEWID;
                    Log.print(Log.l.trace, "importcardscanid=" + importcardscanid);
                    docContent = json.d.results[0].DocContentDOCCNT1;
                    if (docContent) {
                        var sub = docContent.search("\r\n\r\n");
                        data = b64js.toByteArray(docContent.substr(sub + 4));
                    }
                }
                startOk = true;
            }, function (error) {
                that.errorCount++;
                Log.print(Log.l.error, "PRC_STARTCARDOCREX error! " + that.successCount + " success / " + that.errorCount + " errors");
                that.timestamp = new Date();
            }).then(function ocrPostRequest() {
                Log.print(Log.l.trace, "importcardscanid=" + importcardscanid + " pAktionStatus=" + pAktionStatus);
                if (!startOk) {
                    Log.ret(Log.l.trace, "PRC_STARTCARDOCREX failed!");
                    return WinJS.Promise.as();
                }
                if (!importcardscanid) {
                    Log.ret(Log.l.trace, "no record found!");
                    return WinJS.Promise.as();
                }
                if (!data) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.trace, "no data returned! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                var promise = new WinJS.Promise.timeout(0).then(function beginAnalyzeDocument() {
                    client.beginAnalyzeDocument("prebuilt-businessCard", data).then(function (poller) {
                        return poller.pollUntilDone();
                    }).then(function (result) {
                        var err, text;
                        if (result) {
                            try {
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
                                        qy = -qy
                                    }
                                    return {x: qx, y: qy };
                                };
                                var readResults = result.pages;
                                if (readResults && readResults.length > 0) {
                                    for (var i = 0; i < readResults.length; i++) {
                                        for (var k = 0; k < readResults[i].words.length; k++) {
                                            var myBoundingBox = readResults[i].words[k].polygon;
                                            var ocr_angle = readResults[i].angle;
                                            var lfHeight = 15;
                                            var text = readResults[i].words[k].content;
                                            var boundingBoxRotated = [];
                                            for (var l = 0; l < myBoundingBox.length; l++) {
                                                var x = myBoundingBox[l].x;
                                                var y = myBoundingBox[l].y;
                                                var rotatedPoint = null;
                                                if (ocr_angle < 0) {
                                                    rotatedPoint = rotatePoint({x: x, y: -y}, ocr_angle);
                                                } else {
                                                    rotatedPoint = rotatePoint({ x: x, y: y }, ocr_angle);
                                                }
                                                boundingBoxRotated.push({
                                                    x: rotatedPoint.x,
                                                    y: rotatedPoint.y
                                                });
                                            }
                                            if (ocr_angle) {
                                                myBoundingBox = boundingBoxRotated;
                                            }
                                            var width, height = null;
                                            x = Math.round((myBoundingBox[0].x + myBoundingBox[3].x) / 2);
                                            y = Math.round((myBoundingBox[0].y + myBoundingBox[1].y) / 2);
                                            width = Math.round((myBoundingBox[1].x - myBoundingBox[0].x + myBoundingBox[2].x - myBoundingBox[3].x) / 2);
                                            height = Math.round((myBoundingBox[2].y - myBoundingBox[1].y + myBoundingBox[3].y - myBoundingBox[0].y) / 2);
                                            if (importcardscanid && text) {
                                                myResult = myResult + x + "," + y + "," + width + "," + height + "," + lfHeight + "," + text + "\n";
                                            }
                                        }
                                    }
                                }
                                var fields = result.documents && result.documents[0] && result.documents[0].fields;
                                if (fields) {
                                    for (var fieldName in fields) {
                                        if (fields.hasOwnProperty(fieldName) && fields[fieldName]) {
                                            var values = fields[fieldName].values;
                                            if (values && values[0]) {
                                                if (values[0].value &&
                                                    typeof values[0].value === "string") {
                                                    var text = values[0].value.replace(/\n/g," ");
                                                    Log.print(Log.l.trace, fieldName + ": " + text + " (confidence: " + values[0].confidence + ")");
                                                    myResult = myResult + fieldName + "," + text + "\n";
                                                } else if (values[0].value &&
                                                    typeof values[0].value === "object") {
                                                    var value = values[0].value;
                                                    for (var valueName in value) {
                                                        if (value.hasOwnProperty(valueName) && 
                                                            typeof value[valueName] === "string") {
                                                            text = value[valueName].replace(/\n/g," ");
                                                            Log.print(Log.l.trace, valueName + ": " + text + " (confidence: " + values[0].confidence + ")");
                                                            myResult = myResult + valueName + "," + text + "\n";
                                                        }
                                                    }
                                                } else {
                                                    var properties = values[0].properties;
                                                    if (properties) {
                                                        for (var propertyName in properties) {
                                                            if (properties.hasOwnProperty(propertyName) && 
                                                                properties[propertyName] &&
                                                                properties[propertyName].value &&
                                                                typeof properties[propertyName].value === "string") {
                                                                text = properties[propertyName].value.replace(/\n/g," ");
                                                                Log.print(Log.l.trace, propertyName + ": " + text + " (confidence: " + values[0].confidence + ")");
                                                                myResult = myResult + propertyName + "," + text + "\n";
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                                if (myResult &&
                                    typeof myResult === "string") {
                                    myResult = myResult.replace(/\n$/, " ");
                                } else {
                                    Log.print(Log.l.error, "no result error!");
                                }
                                promise._completed();
                            } catch (exception) {
                                that.errorCount++;
                                Log.print(Log.l.error, "resource parse error " + (exception && exception.message) +
                                 that.successCount + " success / " + that.errorCount + " errors");
                                that.timestamp = new Date();
                                err = {
                                    status: 500,
                                    statusText: "data parse error " + (exception && exception.message)
                                };
                                promise.cancel();
                            }
                        } else {
                            Log.print(Log.l.error, "no result error!");
                            promise.cancel();
                        }
                    }, function (error) {
                        Log.print(Log.l.error, "beginAnalyzeDocument error!");
                        promise.cancel();
                    });
                    return WinJS.Promise.timeout(30000);
                });
                return promise;
            }).then(function importCardscanBulk() {
                Log.call(Log.l.trace, "recognizeBusinessCard.", "importcardscanid=" + importcardscanid);
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
                Log.call(Log.l.trace, "recognizeBusinessCard.", "importcardscanid=" + importcardscanid);
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
                Log.ret(Log.l.trace);
                return that._importCardscan_ODataView.selectById(function (json) {
                    Log.print(Log.l.info, "_importCardscan_ODataView select: success!");
                    if (json) {
                        dataImportCardscan = json.d;
                        importcardscanid = dataImportCardscan.IMPORT_CARDSCANVIEWID;
                    }
                }, function (error) {
                    that.errorCount++;
                    Log.print(Log.l.error, "_importCardscan_ODataView error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, importcardscanid);
            }).then(function updateImportCardscan() {
                Log.call(Log.l.trace, "recognizeBusinessCard.", "importcardscanid=" + importcardscanid);
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
            }).then(function doRepeate() {
                if (pAktionStatus === "OCR_DONE") {
                    return that.activity();
                } else {
                    return WinJS.Promise.as();
                }
            });
            Log.ret(Log.l.trace);
            return ret;
        },

        dispose: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");
            var infoText = this.successCount + " success / " + this.errorCount + " errors ";
            Log.ret(Log.l.trace);
            return infoText;
        }
    };
    module.exports = dispatcher;
})();
