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
    const { AzureOpenAI } = require('openai');

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
            const azureOptions = {
                endpoint: process.env.AZURE_AI_ENDPOINT,
                apiKey: process.env.AZURE_AI_APIKEY,
                deployment: "gpt-4o",
                apiVersion: "2024-04-01-preview"
            };
            this.azureClient = new AzureOpenAI(azureOptions);
            
            // Store LLM Prompt
            this.systemPrompt = `Extract all text from this image. Insert the result in appropriate fields within this JSON Object: {CompanyName: '', AcademicTitle: '', FirstName: '', MiddleName: '', LastName: '', EMail: '', JobTitle: '', Department: '', Industry: '', Phone: '', Mobile: '', Fax: '', AddressData: '', Website: ''}; If a field is not present, set its value to null. Only use these fields and do not add any others. Only return the filled JSON without any extra text. If a full name is present, intelligently split it into "first name" and "last name" using common naming conventions.`;
            
            // Initialize your OData views
            this._importCardscan_ODataView = AppData.getFormatView("IMPORT_CARDSCAN", 0, false);
            this._importCardscanBulk_ODataView = AppData.getFormatView("ImportCardScanBulk", 0, false);
            
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            Log.call(Log.l.trace, `${logPrefix}.activity`);
            var that = this;
            const pAktionStatus = `AI_START-${this.aiocrUuid}`;

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

                Log.print(Log.l.info, "Calling Azure OpenAI...");

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                var aiReq;
                try {
                    aiReq = that.azureClient.chat.completions.create({
                        model: "gpt-4o",
                        max_tokens: 1024,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: that.systemPrompt
                                    },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: `data:image/jpeg;base64,${imageBuffer}`
                                        }
                                    }
                                ]
                            }
                        ],
                        temperature: 0
                    }, { signal: controller.signal })
                } catch (e) {
                    clearTimeout(timeoutId);
                    controller.abort();
                    return WinJS.Promise.wrapError(e);
                }
                return toWinJSPromise(
                    aiReq,
                    function onCancel() { 
                        clearTimeout(timeoutId);
                        controller.abort(); 
                    }
                ).then(function(response) {
                    clearTimeout(timeoutId);
                    try {
                        var content = response.choices?.[0]?.message?.content || '';
                        // strip code fences if present
                        content = content.replace(/```json|```/g, '').trim();
                        aiResult = JSON.parse(content);
                        that.successCount++;
                        Log.print(Log.l.info, "AI processing successful");
                    } catch (e) {
                        that.errorCount++;
                        err = e;
                        Log.print(Log.l.error, "Failed to parse AI response: " + e);
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
                    kv('streetAddress', aiResult.AddressData)
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
