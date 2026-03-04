/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    const UUID = require("uuid-js");
    const b64js = require("base64-js");
    const logPrefix = 'recognizeBusinessCardAI'
    const fs = require('fs');

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
            this.aiocrUuid = uuid.toString();
            
            // Initialize Azure AI Config
            this.endpoint = "https://ki-ocr-layer.services.ai.azure.com/providers/mistral/azure/ocr";
            this.apiKey = process.env.AZURE_AI_APIKEY;
            
            // Initialize your OData views
            this._importCardscan_ODataView = AppData.getFormatView("IMPORT_CARDSCAN", 0, false);
            this._importCardscanBulk_ODataView = AppData.getFormatView("ImportCardScanBulk", 0, false);
            
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            const testing = process.env.TESTING
            Log.call(Log.l.trace, `${logPrefix}.activity`);
            var that = this;
            const pAktionStatus = `BCI_START-${this.aiocrUuid}`;

            var currentId = null;
            var imageBuffer = null;
            var aiResult = null;
            var err = null;
            
            // Step 1: Get next row to process
            var ret = AppData.call("PRC_STARTCARDBCIEX", {
                pAktionStatus: pAktionStatus
            }, 
            function callStartSuccess (json) { // Success Callback
                if (json.d.results && json.d.results.length > 0) {
                    Log.print(Log.l.info, "Got row to process");
                    currentId = json.d.results[0].IMPORT_CARDSCANVIEWID;

                    var doccnt1 = json.d.results[0].DocContentDOCCNT1;
                    if (doccnt1) {
                        var sub = doccnt1.search("\r\n\r\n");
                        if (sub >= 0) {
                            imageBuffer = doccnt1.substr(sub + 4).replace(/\s+/g, '');
                        }
                    }
                } else {
                    Log.print(Log.l.info, "No rows to process");
                    if (testing) {
                        Log.print(Log.l.info, "Setting test ID and test BLOB!");
                        currentId = 14600;
                        var fileBuffer = fs.readFileSync("/Users/emi/Documents/gitProjects/NodejsWorker/debug/card.txt");
                        var doccnt1 = fileBuffer.toString(); // Convert Buffer to string
                        if (doccnt1) {
                            // Try Windows line endings first, then Unix
                            var sub = doccnt1.search("\r\n\r\n");
                            if (sub < 0) {
                                sub = doccnt1.search("\n\n");
                            }
                            Log.print(Log.l.info, "Header separator position: " + sub);
                            if (sub >= 0) {
                                var headerLength = (doccnt1.indexOf("\r\n\r\n") >= 0) ? 4 : 2;
                                imageBuffer = doccnt1.substr(sub + headerLength).replace(/\s+/g, '');
                                Log.print(Log.l.info, "Image buffer length: " + imageBuffer.length);
                            }
                        }
                    }
                };
            }, 
            function callStartError (error) { // Error Callback
                that.errorCount++;
                err = error;
                Log.print(Log.l.error, "Error: " + error);
            }).then(function processWithAI() {
                Log.call(Log.l.trace, `${logPrefix}.processWithAI`)
                if (!currentId || err) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as()
                };

                Log.print(Log.l.info, "Calling Mistral Document AI...");

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                var fetchReq = fetch(that.endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${that.apiKey}`
                    },
                    body: JSON.stringify({
                        model: "mistral-document-ai-2512",
                        document: {
                            type: "image_url",
                            image_url: `data:image/jpeg;base64,${imageBuffer}`
                        },
                        document_annotation_format: {
                            type: "json_schema",
                            json_schema: {
                                schema: {
                                    properties: {
                                        CompanyName:   { title: "CompanyName",   type: "string" },
                                        AcademicTitle: { title: "AcademicTitle", type: "string" },
                                        FirstName:     { title: "FirstName",     type: "string" },
                                        MiddleName:    { title: "MiddleName",    type: "string" },
                                        LastName:      { title: "LastName",      type: "string" },
                                        EMail:         { title: "EMail",         type: "string" },
                                        JobTitle:      { title: "JobTitle",      type: "string" },
                                        Department:    { title: "Department",    type: "string" },
                                        Phone:         { title: "Phone",         type: "string" },
                                        Mobile:        { title: "Mobile",        type: "string" },
                                        Fax:           { title: "Fax",           type: "string" },
                                        AddressData:   { title: "AddressData",   type: "string" },
                                        ZipCode:       { title: "ZipCode",       type: "string" },
                                        City:          { title: "City",          type: "string" },
                                        Website:       { title: "Website",       type: "string" },
                                        Remarks:       { title: "Remarks",       type: "string" }
                                    },
                                    required: ["CompanyName","AcademicTitle","FirstName","MiddleName","LastName","EMail","JobTitle","Department","Phone","Mobile","Fax","AddressData","ZipCode","City","Website","Remarks"],
                                    title: "BusinessCard",
                                    type: "object",
                                    additionalProperties: false
                                },
                                name: "business_card",
                                strict: true
                            }
                        }
                    }),
                    signal: controller.signal
                }).then(function(res) { return res.text(); });

                return toWinJSPromise(
                    fetchReq,
                    function onCancel() {
                        clearTimeout(timeoutId);
                        controller.abort();
                    }
                ).then(function(responseText) {
                    clearTimeout(timeoutId);
                    try {
                        var data = JSON.parse(responseText);
                        aiResult = JSON.parse(data.document_annotation);
                        that.successCount++;
                        Log.print(Log.l.info, "AI processing successful");
                    } catch (e) {
                        that.errorCount++;
                        err = e;
                        Log.print(Log.l.error, "Failed to parse AI response: " + e);
                        Log.print(Log.l.error, "Response text: " + responseText);
                    }
                    Log.ret(Log.l.trace);
                }).then(null, function(error) {
                    clearTimeout(timeoutId);
                    that.errorCount++;
                    err = error;
                    Log.print(Log.l.error, "AI call failed: " + error);
                    Log.ret(Log.l.trace);
                });
            }).then(function insertResult() {
                Log.call(Log.l.trace, `${logPrefix}.insertResult`);
                if (!currentId || err) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }
                if (testing) {
                    Log.print(Log.l.info, "TESTING mode: skipping database insert. AI result: " + JSON.stringify(aiResult));
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }

                // Normal insert path
                var lines = [];
                function kv(k, v) {
                    if (v === null || v === undefined) return null;
                    const s = String(v).replace(/[\r\n,]+/g, ' ').trim();
                    return s ? `${k},${s}` : null;
                }
                lines.push(
                    kv('CompanyNames', aiResult.CompanyName),
                    kv('FirstName', aiResult.FirstName),
                    kv('LastName', aiResult.LastName),
                    kv('AcademicTitle', aiResult.AcademicTitle),
                    kv('JobTitles', aiResult.JobTitle),
                    kv('Departments', aiResult.Department),
                    kv('WorkPhones', aiResult.Phone),
                    kv('MobilePhones', aiResult.Mobile),
                    kv('Faxes', aiResult.Fax),
                    kv('Emails', aiResult.EMail),
                    kv('Websites', aiResult.Website),
                    kv('streetAddress', aiResult.AddressData),
                    kv('ZipCode', aiResult.ZipCode),
                    kv('city', aiResult.City)
                );
                var ocrData = lines.filter(Boolean).join('\n');

                Log.print(Log.l.info, `Inserting with ${lines.filter(Boolean).length} fields`);

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
            }).then(function updateOnError() {
                if (!err || !currentId) {
                    return WinJS.Promise.as();
                }
                Log.call(Log.l.trace, `${logPrefix}.updateOnError`);
                return that._importCardscan_ODataView.update(
                    function ok() {
                        Log.print(Log.l.info, "Marked IMPORT_CARDSCAN as BCI_ERROR");
                    },
                    function ko(e) {
                        Log.print(Log.l.error, "Failed to mark BCI_ERROR: " + (e && (e.statusText || e.status) || e));
                    },
                    currentId,
                    { Button: "BCI_ERROR" }
                ).then(function () {
                    Log.ret(Log.l.trace);
                });
            }).then(function doRepeate() {
                Log.call(Log.l.trace, `${logPrefix}.doRepeate: pAktionStatus=${pAktionStatus}`);
                if (!currentId) {
                    Log.print(Log.l.info, "No rows to process, stopping loop");
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as()
                };
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
