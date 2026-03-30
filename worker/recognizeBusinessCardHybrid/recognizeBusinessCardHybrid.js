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
    //var uriBase = "https://westeurope.cognitiveservices.azure.com/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read";
    //var uriBase = "https://westeurope.cognitiveservices.azure.com/documentintelligence/documentModels/prebuilt-layout:analyze?_overload=analyzeDocument&api-version=2024-07-31-preview";
    var uriBase = "https://lsocr.cognitiveservices.azure.com/computervision/imageanalysis:analyze?api-version=2024-02-01&features=read";
    if (process && process.env && process.env.COGNITIVESERVICES_URL) {
        subscriptionKey = process.env.COGNITIVESERVICES_URL;
    }
    var UUID = require("uuid-js");
    var b64js = require("base64-js");
    var { AzureOpenAI } = require("openai");

    var aiClient = new AzureOpenAI({
        endpoint: process.env.AZURE_AI_ENDPOINT,
        apiKey: process.env.AZURE_AI_APIKEY,
        deployment: process.env.AZURE_AI_DEPLOYMENT || "KI-OCR-Businesscards",
        apiVersion: "2024-08-01-preview"
    });

    var systemPrompt = `
        You are a business card OCR expert. Extract structured contact information from the raw OCR text of a business card.

        Logic Rules:
        1. Identify the person's first and last name. If the name is in all caps (e.g., PIOTR), proper-case it (e.g., Piotr). Keep special characters like 'ń', 'ł', 'ä', 'ö' intact.
        2. Identify the company name, job title, email addresses, phone numbers (work and mobile), fax numbers, website URLs, and address fields (street, city, postal code).
        3. Strip out any OCR noise or UI navigation junk like "Scan Badge", "Tap here", "Number of Scans", or "Atrás".
        4. If the data is clearly NOT a business card (like an eBay pickup code or a grocery receipt), return null for all name fields.
        5. If there are multiple values for a field (e.g., two phone numbers), join them with a semicolon (e.g., '+49 123; +49 456').

        Output:
        Return ONLY a valid JSON object with these EXACT keys:
        CompanyNames, FirstName, LastName, JobTitles, Emails, WorkPhones, MobilePhones, Websites, streetAddress, city, postalCode.

        Important: All fields in the JSON must be Strings, not Arrays. If a field has no value, use null.
    `;

    var ALLOWED_KEYS = [
        'CompanyNames', 'FirstName', 'LastName', 'Emails', 'Faxes',
        'JobTitles', 'Departments', 'MobilePhones', 'Websites',
        'WorkPhones', 'streetAddress', 'houseNumber', 'road',
        'postalCode', 'city'
    ];
    var kv = function (k, v) {
        if (!ALLOWED_KEYS.includes(k) || v === null || v === undefined || v === '') return null;
        var s = String(v).replace(/'/g, ' ').replace(/,/g, ' ').trim();
        return k + ',' + s;
    };

    function toWinJSPromise(nativePromise, onCancel) {
    return new WinJS.Promise(function (complete, error /*, progress */) {
        try {
            nativePromise.then(complete, error);
        } catch (e) {
            error(e);
        }
    }, onCancel);
    };


    var dispatcher = {

        startup: function () {
            Log.call(Log.l.trace, "recognizeBusinessCardHybrid.");
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
            var pAktionStatus = "BCI_START" + this.ocrUuid; //"OCR_START" + this.ocrUuid;
            var responseText = null;
            var ocrStartTime = 0;
            Log.call(Log.l.trace, "recognizeBusinessCardHybrid.");
            var err = null;
            that.lastAction = 'PRC_STARTCARDBCIEX';
            var ret = AppData.call("PRC_STARTCARDBCIEX", {
                pAktionStatus: pAktionStatus
            }, function (json) {
                Log.print(Log.l.trace, "PRC_STARTCARDBCIEX success!");
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
                Log.call(Log.l.trace, "recognizeBusinessCardHybrid.", "ocrPostRequest: importcardscanid=" + importcardscanid + " pAktionStatus=" + pAktionStatus);
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
                ocrStartTime = Date.now();
                var promise = WinJS.xhr(options).then(function (response) {
                    responseText = response && response.responseText;
                    var url = response && response.getResponseHeader("Operation-Location");
                    if (!url) {
                        Log.print(Log.l.info, "callOcr request time: " + (Date.now() - ocrStartTime) + "ms");
                    }
                    Log.print(Log.l.trace, "ocrPostRequest: OCR POST success! url=" + url);
                    return url;
                }, function (errorResponse) {
                    Log.print(Log.l.error, "callOcr request time: " + (Date.now() - ocrStartTime) + "ms (failed)");
                    that.errorCount++;
                    Log.print(Log.l.error, "ocrPostRequest: error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                    that.timestamp = new Date();
                    err = errorResponse;
                });
                Log.ret(Log.l.trace);
                return promise;
            }).then(function handleResponseHeader(url) {
                if (!url || err) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "recognizeBusinessCardHybrid.", "handleResponseHeader: calling OCR Operation-Location=" + url);
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
                            Log.print(Log.l.info, "callOcr request time: " + (Date.now() - ocrStartTime) + "ms");
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
                if (!importcardscanid || err || !responseText) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "recognizeBusinessCardHybrid.", "importCardscanBulk: importcardscanid=" + importcardscanid + " pAktionStatus=" + pAktionStatus);
                
                var rawText = "";
                try {
                    var myresultJson = JSON.parse(responseText);

                    var textLines = [];

                    if (myresultJson && myresultJson.status === "succeeded" &&
                        myresultJson.analyzeResult && myresultJson.analyzeResult.readResults) {
                        // older API format
                        var readResults = myresultJson.analyzeResult.readResults;
                        for (var i = 0; i < readResults.length; i++) {
                            for (var j = 0; j < readResults[i].lines.length; j++) {
                                textLines.push(readResults[i].lines[j].text);
                            }
                        }
                    } else if (myresultJson && myresultJson.readResult && myresultJson.readResult.blocks) {
                        // newer API format with blocks
                        var blocks = myresultJson.readResult.blocks;
                        for (var i = 0; i < blocks.length; i++) {
                            for (var j = 0; j < blocks[i].lines.length; j++) {
                                textLines.push(blocks[i].lines[j].text);
                            }
                        }
                    } else {
                        Log.print(Log.l.error, "importCardscanBulk: no recognizable data in OCR response");
                        err = { status: 500, statusText: "unrecognized OCR response format" };
                    }

                    rawText = textLines.join('\n');
                    Log.print(Log.l.trace, "importCardscanBulk: rawText=" + rawText.substring(0, 128));

                } catch (exception) {
                    Log.print(Log.l.error, "importCardscanBulk: JSON parse error " + exception.message);
                    err = { status: 500, statusText: "JSON parse error " + exception.message };
                }

                return toWinJSPromise(
                    aiClient.chat.completions.create({
                        model: process.env.AZURE_AI_DEPLOYMENT || "KI-OCR-Businesscards",
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: "Extract business card fields from this text:\n" + rawText }
                        ],
                        response_format: { type: "json_object"}
                    })
                ).then(function(completion) {
                    var aiResponse = JSON.parse(completion.choices[0].message.content);
                    const lines = [
                        kv('CompanyNames', aiResponse.CompanyNames),
                        kv('FirstName', aiResponse.FirstName),
                        kv('LastName', aiResponse.LastName),
                        kv('JobTitles', aiResponse.JobTitles),
                        kv('Emails', aiResponse.Emails),
                        kv('WorkPhones', aiResponse.WorkPhones),
                        kv('MobilePhones', aiResponse.MobilePhones),
                        kv('Websites', aiResponse.Websites),
                        kv('streetAddress', aiResponse.streetAddress),
                        kv('city', aiResponse.city),
                        kv('postalCode', aiResponse.postalCode)
                    ];
                    const ocrDataString = lines.filter(Boolean).join('\n');
                    return that._importCardscanBulk_ODataView.insert(
                    function insertSuccess() {
                        Log.print(Log.l.info, "ImportCardScanBulk insert success");
                    },
                    function insertError(e) {
                        Log.print(Log.l.error, "ImportCardScanBulk insert callback error: " + (e && (e.statusText || e.status) || e));
                    },
                    {
                        IMPORT_CARDSCANID: currentId,
                        OCRData: ocrData
                    }
                ).then(function () {
                    Log.ret(Log.l.trace);
                }, function (e) {
                    that.errorCount++;
                    err = e;
                    Log.print(Log.l.error, "ImportCardScanBulk insert failed: " + (e && (e.statusText || e.status) || e));
                });
                })
                Log.ret(Log.l.trace);
                return WinJS.Promise.as()
            }).then(function selectImportCardscan() {
                if (!importcardscanid || err) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, "recognizeBusinessCardHybrid.", "selectImportCardscan: importcardscanid=" + importcardscanid);
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
                Log.call(Log.l.trace, "recognizeBusinessCardHybrid.", "updateImportCardscan: importcardscanid=" + importcardscanid);
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
                if (bulkError || err) {
                    Log.print(Log.l.error, "updateImportCardscan: OCR_ERROR");
                    pAktionStatus = "OCR_ERROR";
                    dataImportCardscan.Button = pAktionStatus;
                    if (!dataImportCardscan.INITLandID) {
                        dataImportCardscan.INITLandID = 0;
                    }
                    if (!dataImportCardscan.INITAnredeID) {
                        dataImportCardscan.INITAnredeID = 0;
                    }
                    if (!dataImportCardscan.IMPORT_CARDSCANVIEWID) {
                        dataImportCardscan.IMPORT_CARDSCANVIEWID = importcardscanid;
                    }
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
                Log.call(Log.l.trace, "recognizeBusinessCardHybrid.", "doRepeate: pAktionStatus=" + pAktionStatus);
                var promise;
                if (!bulkError && !err) {
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
            Log.call(Log.l.trace, "recognizeBusinessCardHybrid.");
            this.dbEngine = null;
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            Log.call(Log.l.trace, "recognizeBusinessCardHybrid.");
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