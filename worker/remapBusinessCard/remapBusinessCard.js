/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    const UUID = require("uuid-js");
    const logPrefix = 'remapBusinessCard'

    function toWinJSPromise(nativePromise, onCancel) {
        return new WinJS.Promise(function (complete, error /*, progress */) {
            try {
                nativePromise.then(complete, error);
            } catch (e) {
                error(e);
            }
        }, onCancel);
    }

    const systemPrompt = `
    You are a Master Data Auditor for business card OCR results.

    Your Mission:
    Review the provided JSON which contains messy data from an initial OCR pass. The initial pass often fails, leaving 'firstname' and 'lastname' as null while burying the real identity in the 'company' or 'other' fields.

    Logic Rules:
    1. Audit & Correct: If 'firstname' or 'lastname' are null or contain company names (e.g., "GmbH", "Inc"), you MUST hunt for the real person's name in the 'other', 'company', or 'email' fields.
    2. Email Deduction: If names are missing, use the email prefix to deduce them (e.g., 'john.doe@company.com' -> FirstName: John, LastName: Doe).
    3. Field Swaps: If a person's name is currently in the 'Title' or 'Company' field, move it to 'FirstName' and 'LastName'.
    4. Cleaning: Strip out UI navigation junk like "Scan Badge", "Tap here", "Number of Scans", or "Atrás".
    5. Formatting: Proper-case all names (e.g., PIOTR -> Piotr). Keep 'ń', 'ł', 'ä', 'ö' intact.
    6. Validation: If the data is clearly NOT a business card (like an eBay pickup code or a grocery receipt), return null for all name fields.

    Output:
    Return ONLY a valid JSON object with these EXACT keys:
    CompanyNames, FirstName, LastName, JobTitles, Emails, WorkPhones, MobilePhones, Websites, streetAddress, city, postalCode.

    Important: All fields in the JSON must be Strings, not Arrays. If there are multiple values, join them with a semicolon (e.g., 'Email1; Email2').
    `;


    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, `${logPrefix}.startup`);
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 1000;
            
            const uuid = UUID.create();
            this.aiocrUuid = uuid.toString();
            
            // Initialize Azure AI Config
            this.endpoint = "https://ki-ocr-layer.openai.azure.com/openai/v1/chat/completions";
            this.deployment = "gpt-4.1-mini";
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
            var currentData = null;
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

                    currentData = {
                        FIRSTNAME:     json.d.results[0].FIRSTNAME,
                        LASTNAME:      json.d.results[0].LASTNAME,
                        MIDDLENAME:    json.d.results[0].MIDDLENAME,
                        NAMESUFFIX:    json.d.results[0].NAMESUFFIX,
                        NAMEPREFIX:    json.d.results[0].NAMEPREFIX,
                        TITLE:         json.d.results[0].TITLE,
                        COMPANY:       json.d.results[0].COMPANY,
                        ADDRESS:       json.d.results[0].ADDRESS,
                        STREETADDRESS: json.d.results[0].STREETADDRESS,
                        ADDRESSLINE1:  json.d.results[0].ADDRESSLINE1,
                        ADDRESSLINE2:  json.d.results[0].ADDRESSLINE2,
                        ADDRESSLINE3:  json.d.results[0].ADDRESSLINE3,
                        CITY:          json.d.results[0].CITY,
                        STATE:         json.d.results[0].STATE,
                        POSTALCODE:    json.d.results[0].POSTALCODE,
                        COUNTRY:       json.d.results[0].COUNTRY,
                        PHONE:         json.d.results[0].PHONE,
                        MOBILEPHONE:   json.d.results[0].MOBILEPHONE,
                        EMAIL:         json.d.results[0].EMAIL,
                        FAX:           json.d.results[0].FAX,
                        WEBSITE:       json.d.results[0].WEBSITE,
                        OTHER:         json.d.results[0].OTHER
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
                Log.call(Log.l.trace, `${logPrefix}.processWithAI`);
                if (!currentId || err) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }

                Log.print(Log.l.info, "Calling Azure OpenAI...");

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);
                const aiStartTime = Date.now();

                const data = {
                    firstname:     currentData.FIRSTNAME,
                    lastname:      currentData.LASTNAME,
                    middlename:    currentData.MIDDLENAME,
                    namesuffix:    currentData.NAMESUFFIX,
                    nameprefix:    currentData.NAMEPREFIX,
                    title:         currentData.TITLE,
                    company:       currentData.COMPANY,
                    address:       currentData.ADDRESS,
                    streetaddress: currentData.STREETADDRESS,
                    addressline1:  currentData.ADDRESSLINE1,
                    addressline2:  currentData.ADDRESSLINE2,
                    addressline3:  currentData.ADDRESSLINE3,
                    city:          currentData.CITY,
                    state:         currentData.STATE,
                    postalcode:    currentData.POSTALCODE,
                    country:       currentData.COUNTRY,
                    phone:         currentData.PHONE,
                    fax:           currentData.FAX,
                    email:         currentData.EMAIL,
                    website:       currentData.WEBSITE,
                    other:         currentData.OTHER,
                    mobilephone:   currentData.MOBILEPHONE
                };

                var fetchReq = fetch(that.endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "api-key": that.apiKey
                    },
                    body: JSON.stringify({
                        model: that.deployment,
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `Please audit and remap this record: ${JSON.stringify(data)}` }
                        ],
                        response_format: { type: "json_object" }
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
                    Log.print(Log.l.info, `Azure OpenAI request time: ${Date.now() - aiStartTime}ms`);
                    try {
                        var response = JSON.parse(responseText);
                        var usage = response.usage;
                        if (usage) {
                            Log.print(Log.l.info, `TOKEN_USAGE prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens}`);
                        }
                        aiResult = JSON.parse(response.choices[0].message.content);
                        that.successCount++;
                        Log.print(Log.l.info, "AI processing successful");
                    } catch (e) {
                        that.errorCount++;
                        err = e;
                        Log.print(Log.l.error, "Failed to parse AI response: " + e);
                        Log.print(Log.l.error, "Response text: " + responseText);
                    }
                    Log.ret(Log.l.trace);
                }, function(error) {
                    clearTimeout(timeoutId);
                    Log.print(Log.l.error, `Azure OpenAI request time: ${Date.now() - aiStartTime}ms (failed)`);
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
                if (!aiResult) {
                    Log.print(Log.l.error, "aiResult is empty! Skipping insert and setting error...");
                    that.errorCount++;
                    err = "No aiResult received";
                }

                // Normal insert path
                var lines = [];
                function kv(k, v) {
                    if (v === null || v === undefined) return null;
                    const s = String(v).replace(/[\r\n,]+/g, ' ').trim();
                    return s ? `${k},${s}` : null;
                }
                lines.push(
                    kv('CompanyNames', aiResult.CompanyNames),
                    kv('FirstName', aiResult.FirstName),
                    kv('LastName', aiResult.LastName),
                    kv('JobTitles', aiResult.JobTitles),
                    kv('Emails', aiResult.Emails),
                    kv('WorkPhones', aiResult.WorkPhones),
                    kv('MobilePhones', aiResult.MobilePhones),
                    kv('Websites', aiResult.Websites),
                    kv('streetAddress', aiResult.streetAddress),
                    kv('city', aiResult.city),
                    kv('postalCode', aiResult.postalCode)
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
                Log.call(Log.l.trace, `${logPrefix}.updateOnError`);
                if (!err || !currentId) {
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }
                return that._importCardscan_ODataView.selectById(
                    function ok(record) {
                        record.Button = 'BCI_ERROR';
                        that._importCardscan_ODataView.update(
                            function ok() {
                                Log.print(Log.l.info, "Marked IMPORT_CARDSCAN as BCI_ERROR");
                            },
                            function ko(e) {
                                Log.print(Log.l.error, "Failed to mark BCI_ERROR: " + (e && (e.statusText || e.status) || e));
                            },
                            currentId,
                            record
                        )
                    },
                    function ko(e) {
                        Log.print(Log.l.error, "Failed to selectById: " + (e && (e.statusText || e.status) || e));
                    }
                ).then(function () {
                    Log.ret(Log.l.trace);
                });

                // return that._importCardscan_ODataView.update(
                //     function ok() {
                //         Log.print(Log.l.info, "Marked IMPORT_CARDSCAN as BCI_ERROR");
                //     },
                //     function ko(e) {
                //         Log.print(Log.l.error, "Failed to mark BCI_ERROR: " + (e && (e.statusText || e.status) || e));
                //     },
                //     currentId,
                //     { Button: "BCI_ERROR" }
                // ).then(function () {
                //     Log.ret(Log.l.trace);
                // });
            }).then(function doRepeate() {
                Log.call(Log.l.trace, `${logPrefix}.doRepeate: pAktionStatus=${pAktionStatus}`);
                if (!currentId) {
                    Log.print(Log.l.info, "No rows to process, stopping loop");
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as()
                };
                if (!err) {
                    if (that.successCount >= 50) {
                        Log.print(Log.l.info, "Batch cap reached, stopping");
                        Log.ret(Log.l.trace);
                        return WinJS.Promise.as();
                    }
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
