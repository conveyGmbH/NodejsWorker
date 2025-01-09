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
    var uriBase = "https://westeurope.cognitiveservices.azure.com/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read";
    //var uriBase = "https://westeurope.cognitiveservices.azure.com/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read";
    //var uriBase = "https://westeurope.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-layout:analyze?_overload=analyzeDocument&api-version=2024-07-31-preview";
    var UUID = require("uuid-js");
    var b64js = require("base64-js");


    var dispatcher = {

        startup: function () {
            Log.call(Log.l.trace, "callOcr.");
            this.successCount = 0;
            this.errorCount = 0;
            this.lastJob = null;
            this.lastImportcardscanid = 0;
            this.lastAction = null;
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
                customRequestInitializer: function (req) {
                    req.timeout = 60000;
                    req.ontimeout = function () {
                        Log.print(Log.l.error, "request timeout!");
                        req.abort();
                    };
                },
                headers: {
                    "Content-Type": "application/octet-stream",
                    "Ocp-Apim-Subscription-Key": subscriptionKey
                }
            };
            var startOk = false;
            var myResult = "";
            var bulkError = false;
            var importcardscanid = 0;
            var docContent = null;
            var cardscanbulkid = 0;
            var dataImportCardscan = {};
            var that = this;
            var pAktionStatus = "OCR_START" + this.ocrUuid; //"OCR_START" + this.ocrUuid;
            var responseText = null;
            Log.call(Log.l.trace, "callOcr.");
            var err = null;
            that.lastAction = 'PRC_STARTCARDOCREX';
            var ret = AppData.call("PRC_STARTCARDOCREX", {
                pAktionStatus: pAktionStatus
            }, function (json) {
                Log.print(Log.l.trace, "PRC_STARTCARDOCREX success!");
                if (json && json.d && json.d.results && json.d.results.length > 0) {
                    that.lastJob = new Date();
                    importcardscanid = json.d.results[0].IMPORT_CARDSCANVIEWID;
                    that.lastImportcardscanid = importcardscanid;
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
                that.lastImportcardscanid = 0;
                Log.print(Log.l.error, "PRC_STARTCARDOCREX error! " + that.successCount + " success / " + that.errorCount + " errors");
                that.timestamp = new Date();
            }).then(function ocrPostRequest() {
                if (!importcardscanid) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "callOcr.", "ocrPostRequest: importcardscanid=" + importcardscanid + " pAktionStatus=" + pAktionStatus);
                if (!startOk) {
                    Log.ret(Log.l.trace, "PRC_STARTCARDOCREX failed!");
                    return WinJS.Promise.as();
                }
                if (!options.data) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.trace, "no data returned! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                that.lastAction = 'ocrPostRequest';
                var promise = WinJS.xhr(options).then(function (response) {
                    responseText = response && response.responseText;
                    var url = response && response.getResponseHeader("Operation-Location");
                    Log.print(Log.l.trace, "ocrPostRequest: OCR POST success! url=" + url);
                    return url;
                }, function (errorResponse) {
                    that.errorCount++;
                    Log.print(Log.l.error, "ocrPostRequest: error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                    that.timestamp = new Date();
                });
                Log.ret(Log.l.trace);
                return promise;
            }).then(function handleResponseHeader(url) {
                if (!url) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "callOcr.", "handleResponseHeader: calling OCR Operation-Location=" + url);
                var optionsUrl = {
                    type: "GET",
                    url: url,
                    headers: {
                        "Ocp-Apim-Subscription-Key": subscriptionKey
                    }
                };
                that.lastAction = 'handleResponseHeader';
                var promise = WinJS.xhr(optionsUrl).then(function (response) {
                    try {
                        var myresultJson = JSON.parse(response.responseText);
                        if (myresultJson && myresultJson.status !== "succeeded") {
                            Log.print(Log.l.trace, "OCR GET status=" + myresultJson.status);
                            return handleResponseHeader(optionsUrl.url);
                        } else {
                            Log.print(Log.l.trace, "OCR GET success!");
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
                Log.ret(Log.l.trace);
                return promise;
            }).then(function importCardscanBulk() {
                if (!importcardscanid) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "callOcr.", "importCardscanBulk: importcardscanid=" + importcardscanid);
                if (responseText) {
                    Log.print(Log.l.trace, "handle responseText: responseText=" + responseText.substr(0, 128));
                    try {
                        var pi = Math.PI;
                        var i, j, k, myBoundingBox, ocr_angle = 0, lfHeight, text, boundingBoxRotated, l, x, y, rotatedPoint, width, height;
                        var radians_to_degrees = function (radians) {
                            var pi = Math.PI;
                            return radians * (180 / pi);
                        };
                        var degrees_to_radians = function (degrees) {
                            return degrees * (pi / 180);
                        };
                        var getAngle = function(points) {
                            var ret = 0;
                            if (!points || points.length !== 4) {
                                return ret;
                            }
                            var dy = (points[2].y - points[3].y + points[1].y - points[0].y) / 2;
                            var dx = (points[2].x - points[3].x + points[1].x - points[0].x) / 2;
                            if (!dx || !dy) {
                                return ret;
                            }
                            if (dx > 0) {
                                if (dy > 0) {
                                    if (dx >= dy) {
                                        ret = Math.round(radians_to_degrees(Math.atan(dy / dx)));
                                    } else {
                                        ret = 90 - Math.round(radians_to_degrees(Math.atan(dx / dy)));
                                    }
                                } else {
                                    if (dx >= -dy) {
                                        ret = 360 - Math.round(radians_to_degrees(Math.atan(dy / -dx)));
                                    } else {
                                        ret = 270 + Math.round(radians_to_degrees(Math.atan(dx / -dy)));
                                    }
                                }
                            } else {
                                if (dy > 0) {
                                    if (-dx >= dy) {
                                        ret = 180 - Math.round(radians_to_degrees(Math.atan(dy / -dx)));
                                    } else {
                                        ret = 90 + Math.round(radians_to_degrees(Math.atan(-dx / dy)));
                                    }
                                } else {
                                    if (-dx >= -dy) {
                                        ret = 180 + Math.round(radians_to_degrees(Math.atan(-dy / -dx)));
                                    } else {
                                        ret = 270 - Math.round(radians_to_degrees(Math.atan(-dx / -dy)));
                                    }
                                }
                            }
                            //Log.print(Log.l.trace, "getAngle returned: " + ret);
                            return ret;
                        };
                        var rotatePoint = function (point, degrees) {
                            var radians = degrees_to_radians(degrees);
                            var cos_rad = Math.cos(radians);
                            var sin_rad = Math.sin(radians);
                            var qx = cos_rad * point.x + sin_rad * point.y;
                            var qy = cos_rad * point.y - sin_rad * point.x;
                            return { x: qx, y: qy };
                        };
                        var myresultJson = JSON.parse(responseText);
                        Log.print(Log.l.trace, "handle responseText: myresultJson.status=" + (myresultJson && myresultJson.status));
                        if (myresultJson && myresultJson.status === "succeeded" &&
                            myresultJson.analyzeResult &&
                            myresultJson.analyzeResult.readResults) {
                            Log.print(Log.l.trace, "handleResponseText: OCR Document Intelligence result!");
                            var readResults = myresultJson.analyzeResult.readResults;
                            if (readResults && readResults.length > 0) {
                                for (i = 0; i < readResults.length; i++) {
                                    for (j = 0; j < readResults[i].lines.length; j++) {
                                        for (k = 0; k < readResults[i].lines[j].words.length; k++) {
                                            myBoundingBox = readResults[i].lines[j].words[k].boundingBox;
                                            ocr_angle = readResults[i].angle;
                                            lfHeight = 15;
                                            text = readResults[i].lines[j].words[k].text;
                                            if (ocr_angle) {
                                                boundingBoxRotated = [];
                                                for (l = 0; l < myBoundingBox.length - 1; l = l + 2) {
                                                    x = parseInt(myBoundingBox[l]);
                                                    y = parseInt(myBoundingBox[l + 1]);
                                                    rotatedPoint = rotatePoint({ x: x, y: y }, ocr_angle);
                                                    boundingBoxRotated.push(rotatedPoint.x);
                                                    boundingBoxRotated.push(rotatedPoint.y);
                                                }
                                                if (ocr_angle) {
                                                    myBoundingBox = boundingBoxRotated;
                                                }
                                            }
                                            x = Math.round((myBoundingBox[0] + myBoundingBox[6]) / 2);
                                            y = Math.round((myBoundingBox[1] + myBoundingBox[3]) / 2);
                                            width = Math.round((myBoundingBox[2] - myBoundingBox[0] + myBoundingBox[4] - myBoundingBox[6]) / 2);
                                            height = Math.round((myBoundingBox[5] - myBoundingBox[3] + myBoundingBox[7] - myBoundingBox[1]) / 2);
                                            if (text) {
                                                myResult = myResult + x + "," + y + "," + width + "," + height + "," + lfHeight + "," + text + "\n";
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (myresultJson && myresultJson.readResult &&
                            (myresultJson.readResult.blocks)) {
                            Log.print(Log.l.trace, "handleResponseText: OCR Image Analysis blocks result!");
                            var blocks = myresultJson.readResult.blocks;
                            //Log.print(Log.l.trace, "blocks.length=" + blocks.length);
                            for (i = 0; i < blocks.length; i++) {
                                var lines = blocks[i].lines;
                                //Log.print(Log.l.trace, "blocks[" + i + "].lines.length=" + lines.length);
                                if (lines) for (j = 0; j < lines.length; j++) {
                                    myBoundingBox = lines[j].boundingPolygon;
                                    //Log.print(Log.l.trace, 
                                    //    "p0: x=" + myBoundingBox[0].x + ", y=" +  myBoundingBox[0].y +
                                    //    " p1: x=" + myBoundingBox[1].x + ", y=" +  myBoundingBox[1].y +
                                    //    " p2: x=" + myBoundingBox[2].x + ", y=" +  myBoundingBox[2].y +
                                    //    " p3: x=" + myBoundingBox[3].x + ", y=" +  myBoundingBox[3].y
                                    //);
                                    ocr_angle = lines[j].angle || getAngle(myBoundingBox);
                                    var words = lines[j].words;
                                    //Log.print(Log.l.trace, "lines[" + j + "].words.length=" + words.length);
                                    for (k = 0; k < words.length; k++) {
                                        myBoundingBox = words[k].boundingPolygon;
                                        if (myBoundingBox.length === 4) {
                                            //Log.print(Log.l.trace, 
                                            //    "p0: x=" + myBoundingBox[0].x + ", y=" +  myBoundingBox[0].y +
                                            //    " p1: x=" + myBoundingBox[1].x + ", y=" +  myBoundingBox[1].y +
                                            //    " p2: x=" + myBoundingBox[2].x + ", y=" +  myBoundingBox[2].y +
                                            //    " p3: x=" + myBoundingBox[3].x + ", y=" +  myBoundingBox[3].y
                                            //);
                                            lfHeight = 15;
                                            text = words[k].text;
                                            //Log.print(Log.l.trace, "words[" + k + "].text=" + text);
                                            if (ocr_angle) {
                                                for (l = 0; l < myBoundingBox.length; l++) {
                                                    myBoundingBox[l] = rotatePoint(myBoundingBox[l], ocr_angle);
                                                }
                                                //Log.print(Log.l.trace, 
                                                //    "p0: x=" + myBoundingBox[0].x + ", y=" +  myBoundingBox[0].y +
                                                //    " p1: x=" + myBoundingBox[1].x + ", y=" +  myBoundingBox[1].y +
                                                //    " p2: x=" + myBoundingBox[2].x + ", y=" +  myBoundingBox[2].y +
                                                //    " p3: x=" + myBoundingBox[3].x + ", y=" +  myBoundingBox[3].y
                                                //);
                                            }
                                            x = Math.round((myBoundingBox[0].x + myBoundingBox[3].x) / 2);
                                            y = Math.round((myBoundingBox[0].y + myBoundingBox[1].y) / 2);
                                            width = Math.round((myBoundingBox[1].x - myBoundingBox[0].x +
                                                                myBoundingBox[2].x - myBoundingBox[3].x) / 2);
                                            height = Math.round((myBoundingBox[2].y - myBoundingBox[1].y +
                                                                 myBoundingBox[3].y - myBoundingBox[0].y) / 2);
                                            //Log.print(Log.l.trace, "x=" + x + " y=" + y + " width=" + width + " height=" + height);
                                            if (text) {
                                                myResult = myResult + x + "," + y + "," + width + "," + height + "," + lfHeight + "," + text + "\n";
                                            }
                                        }
                                    }
                                }
                            }
                        } else if (myresultJson && myresultJson.readResult &&
                            (myresultJson.readResult.pages)) {
                            Log.print(Log.l.trace, "handleResponseText: OCR Image Analysis pages result!");
                            var pages = myresultJson.readResult.pages;
                            for (i = 0; i < pages.length; i++) {
                                for (k = 0; k < pages[i].words.length; k++) {
                                    myBoundingBox = pages[i].words[k].boundingBox;
                                    ocr_angle = pages[i].angle || 0;
                                    lfHeight = 15;
                                    text = pages[i].words[k].content;
                                    if (ocr_angle) {
                                        boundingBoxRotated = [];
                                        for (l = 0; l < myBoundingBox.length - 1; l = l + 2) {
                                            x = parseInt(myBoundingBox[l]);
                                            y = parseInt(myBoundingBox[l + 1]);
                                            rotatedPoint = rotatePoint({ x: x, y: y }, ocr_angle);
                                            boundingBoxRotated.push(rotatedPoint.x);
                                            boundingBoxRotated.push(rotatedPoint.y);
                                        }
                                        if (ocr_angle) {
                                            myBoundingBox = boundingBoxRotated;
                                        }
                                    }
                                    x = Math.round((myBoundingBox[0] + myBoundingBox[6]) / 2);
                                    y = Math.round((myBoundingBox[1] + myBoundingBox[3]) / 2);
                                    width = Math.round((myBoundingBox[2] -
                                        myBoundingBox[0] +
                                        myBoundingBox[4] -
                                        myBoundingBox[6]) /
                                        2);
                                    height = Math.round((myBoundingBox[5] -
                                        myBoundingBox[3] +
                                        myBoundingBox[7] -
                                        myBoundingBox[1]) /
                                        2);
                                    if (text) {
                                        myResult = myResult + x + "," + y + "," + width + "," + height + "," + lfHeight + "," + text + "\n";
                                    }
                                }
                            }
                        } else {
                            Log.print(Log.l.error, "handleResponseText: no data in OCR result!");
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
                that.lastAction = 'importcardscanBulk';
                var promise = that._importCardscanBulk_ODataView.insert(function (json) {
                    Log.print(Log.l.info, "importcardscanBulk: insert success!");
                    if (json && json.d) {
                        Log.print(Log.l.info, "importcardscanBulk: cardscanbulkid=" + json.d.ImportCardScanBulkVIEWID);
                        cardscanbulkid = json.d.ImportCardScanBulkVIEWID;
                    }
                }, function (error) {
                    that.errorCount++;
                    bulkError = true;
                    Log.print(Log.l.error, "importcardscanBulk: insert error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, dataImportCardscanBulk);
                Log.ret(Log.l.trace);
                return promise;
            }).then(function selectImportCardscan() {
                if (!importcardscanid) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "callOcr.", "selectImportCardscan: importcardscanid=" + importcardscanid);
                if (!that._importCardscan_ODataView) {
                    that.errorCount++;
                    that.timestamp = new Date();
                    Log.ret(Log.l.error, "_importCardscan_ODataView not initialized! " + that.successCount + " success / " + that.errorCount + " errors");
                    return WinJS.Promise.as();
                }
                that.lastAction = 'selectImportCardscan';
                var promise = that._importCardscan_ODataView.selectById(function (json) {
                    Log.print(Log.l.info, "selectImportCardscan: select success!");
                    if (json && json.d) {
                        dataImportCardscan = json.d;
                    }
                }, function (error) {
                    that.errorCount++;
                    Log.print(Log.l.error, "selectImportCardscan: _importCardscan_ODataView error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, importcardscanid);
                Log.ret(Log.l.trace);
                return promise;
            }).then(function updateImportCardscan() {
                if (!importcardscanid) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "callOcr.", "updateImportCardscan: importcardscanid=" + importcardscanid);
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
                Log.print(Log.l.trace, "updateImportCardscan: cardscanbulkid=" + cardscanbulkid);
                if (!myResult || bulkError) {
                    Log.print(Log.l.error, "updateImportCardscan: OCR_ERROR");
                    pAktionStatus = "OCR_ERROR";
                    dataImportCardscan.Button = pAktionStatus;
                    that.lastAction = 'updateImportCardscan';
                    var promise = that._importCardscan_ODataView.update(function (json) {
                        that.errorCount++;
                        Log.print(Log.l.info, "_importCardscan_ODataView update OCR_ERROR: success! " + that.successCount + " success / " + that.errorCount + " errors");
                        that.timestamp = new Date();
                    }, function (error) {
                        that.errorCount++;
                        Log.print(Log.l.error, "_importCardscan_ODataView error! " + that.successCount + " success / " + that.errorCount + " errors");
                        that.timestamp = new Date();
                    }, importcardscanid, dataImportCardscan);
                    Log.ret(Log.l.trace);
                    return promise;
                } else {
                    that.successCount++;
                    Log.print(Log.l.info, "success! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                    Log.ret(Log.l.trace);
                    return WinJS.promise.as();
                }
            }).then(function doRepeate() {
                if (!importcardscanid) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "callOcr.", "doRepeate: pAktionStatus=" + pAktionStatus);
                var promise;
                if (myResult) {
                    promise = that.activity();
                } else {
                    promise = WinJS.Promise.as();
                }
                Log.ret(Log.l.trace);
                return promise;
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
            infoText += "\nlast action: " + this.lastAction;
            infoText += "\nlatest job start: ";
            if (this.lastJob) {
                infoText += this.lastJob.toISOString() + ", ImportCardScanID " + this.lastImportcardscanid;
            } else {
                infoText += 'never';
            }
            if (this.timestamp) {
                infoText += "\nlatest status change: " + this.timestamp.toISOString();
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