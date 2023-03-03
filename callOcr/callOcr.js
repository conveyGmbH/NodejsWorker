/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    var subscriptionKey = "a12ee952460d409f9f66d1536dd97318";
    var uriBase = "https://westeurope.api.cognitive.microsoft.com/vision/v3.2/read/analyze?detectOrientation=true";
    var UUID = require("uuid-js");
    var b64js = require("base64-js");


    var dispatcher = {

        startup: function () {
            Log.call(Log.l.trace, "callOcr.");
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 1000;
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
                    "Content-Type": "application/octet-stream",
                    "Ocp-Apim-Subscription-Key": subscriptionKey
                }
            };
            var startOk = false;
            var myResult = "";
            var importcardscanid = 0;
            var cardscanbulkid = 0;
            var languageCode = "";
            var dataImportCardscan = {};
            /*var uuid = UUID.create();
            this.ocrUuid = uuid.toString();*/
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
                        Log.print(Log.l.trace, "POST success!");
                        var url = response && response.getResponseHeader("Operation-Location");
                        return url;
                        //return WinJS.Promise.as();
                    }, function (errorResponse) {
                        that.errorCount++;
                        Log.print(Log.l.error, "error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                        that.timestamp = new Date();
                    });
                }).then(function handleResponseHeader(url) {
                    var err;
                    if (url) {
                        var optionsUrl = {
                            type: "GET",
                            url: url,
                            headers: {
                                "Ocp-Apim-Subscription-Key": subscriptionKey
                            }
                        };
                        return WinJS.xhr(optionsUrl).then(function (response) {
                            Log.print(Log.l.trace, "GET success!");
                            try {
                                var myresultJson = JSON.parse(response.responseText);
                                if (myresultJson.status !== "succeeded") {
                                    return handleResponseHeader(optionsUrl.url);
                                } else {
                                    return optionsUrl.url;
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
                        });
                    } else {
                        return WinJS.Promise.as();
                    }
                }).then(function handleResponseHeader(url) {
                    var err;
                    if (url) {
                        var optionsUrl = {
                            type: "GET",
                            url: url,
                            headers: {
                                "Ocp-Apim-Subscription-Key": subscriptionKey
                            }
                        };
                        return WinJS.xhr(optionsUrl).then(function (response) {
                            Log.print(Log.l.trace, "GET success!");
                            try {
                                var myresultJson = JSON.parse(response.responseText);
                                function degrees_to_radians(degrees) {
                                    var pi = Math.PI;
                                    return degrees * (pi / 180);
                                };

                                var radians = null;

                                function rotateX(x_point, y_point, x_origin, y_origin, degrees) {
                                    radians = degrees_to_radians(degrees);
                                    var x = x_point;
                                    var y = y_point
                                    var offset_x = x_origin;
                                    var offset_y = y_origin;
                                    var adjusted_x = (x - offset_x);
                                    var adjusted_y = (y - offset_y);
                                    var cos_rad = Math.cos(radians);
                                    var sin_rad = degrees < 0 ? Math.sin(radians) : -Math.sin(radians) ;

                                    var qx = offset_x + cos_rad * adjusted_x - sin_rad * adjusted_y;
                                    var qy = offset_y + sin_rad * adjusted_x + cos_rad * adjusted_y;

                                    return qx;
                                };

                                function rotateY(x_point, y_point, x_origin, y_origin, degrees) {
                                    radians = degrees_to_radians(degrees);
                                    var x = x_point;
                                    var y = y_point
                                    var offset_x = x_origin;
                                    var offset_y = y_origin;
                                    var adjusted_x = (x - offset_x);
                                    var adjusted_y = (y - offset_y);
                                    var cos_rad = Math.cos(radians);
                                    var sin_rad = degrees < 0 ? Math.sin(radians) : -Math.sin(radians);

                                    var qx = offset_x + cos_rad * adjusted_x - sin_rad * adjusted_y;
                                    var qy = offset_y + sin_rad * adjusted_x + cos_rad * adjusted_y;

                                    return qy;
                                };

                                if (myresultJson &&
                                    myresultJson.status === "succeeded" &&
                                    myresultJson.analyzeResult &&
                                    myresultJson.analyzeResult.readResults) {
                                    var readResults = myresultJson.analyzeResult.readResults;
                                    if (readResults && readResults.length > 0) {
                                        for (var i = 0; i < readResults.length; i++) {
                                            for (var j = 0; j < readResults[i].lines.length; j++) {
                                                for (var k = 0; k < readResults[i].lines[j].words.length; k++) {
                                                    var myBoundingBox = readResults[i].lines[j].words[k].boundingBox;
                                                    var ocr_angle = ocr_angle = readResults[i].angle;
                                                    var lfHeight = 15;
                                                    var text = readResults[i].lines[j].words[k].text;
                                                    var boundingBoxRotated = [];
                                                    for (var l = 0; l < myBoundingBox.length - 1; l = l + 2) {
                                                        var x = parseInt(myBoundingBox[l]);
                                                        var y = parseInt(myBoundingBox[l + 1]);
                                                        var rotatedx, rotatedy = null;
                                                        if (ocr_angle < 0) {
                                                            rotatedx = rotateX(x, - y, 0, 0, ocr_angle);
                                                            rotatedy = - rotateY(x, - y, 0, 0, ocr_angle);
                                                        } else {
                                                            rotatedx = rotateX(x, y, 0, 0, ocr_angle);
                                                            rotatedy = rotateY(x, y, 0, 0, ocr_angle);
                                                        }

                                                        boundingBoxRotated.push(rotatedx);
                                                        boundingBoxRotated.push(rotatedy);
                                                    }
                                                    if (ocr_angle) {
                                                        myBoundingBox = boundingBoxRotated;
                                                    }
                                                    var width, height = null;
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
                        });
                    } else {
                        return WinJS.Promise.as();
                    }
                }).then(function importCardscanBulk() {
                    Log.call(Log.l.trace, "callOcr.", "importcardscanid=" + importcardscanid);
                    if (!importcardscanid) {
                        Log.ret(Log.l.trace, "no record found!");
                        return WinJS.Promise.as();
                    }
                    if (!myResult) {
                        Log.ret(Log.l.error, "no result found!");
                        return WinJS.Promise.as();
                        /* return that._importCardscan_ODataView.update(function (json) {
                             that.successCount++;
                             Log.print(Log.l.info, "_importCardscan_ODataView update: success! " + that.successCount + " success / " + that.errorCount + " errors");
                             that.timestamp = new Date();
                         }, function (error) {
                             that.errorCount++;
                             Log.print(Log.l.error, "_importCardscan_ODataView error! " + that.successCount + " success / " + that.errorCount + " errors");
                             that.timestamp = new Date();
                         }, importcardscanid, { Button: "OCR_TODO" });*/
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
                            /*languageCode = json.d.LanguageCode;
                            if (languageCode) {
                                var language = languageCode.split("-");
                                //options.url = uriBase + "&language=" + language[0];
                            }*/
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