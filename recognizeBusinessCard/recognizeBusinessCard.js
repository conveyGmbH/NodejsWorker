/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    const { DocumentAnalysisClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");
    const fs = require("fs");

    var fileName = "images/business_card.jpg";

    // Set up the request
    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");
            this.timestamp = null;
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 60000;

            // You will need to set these environment variables or edit the following values
            this.endpoint = "https://westeurope.api.cognitive.microsoft.com/";
            this.apiKey = "eb0abaaf63d3477c95c3f6f645be1eab";

            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");

            var readStream = fs.createReadStream(fileName);

            var client = new DocumentAnalysisClient(this.endpoint, new AzureKeyCredential(this.apiKey));

            var promise = new WinJS.Promise.timeout(0).then(function() {
                client.beginAnalyzeDocument("prebuilt-businessCard", readStream).then(function (poller) {
                    return poller.pollUntilDone();
                }).then(function (result) {
                    if (result && result.documents && result.documents[0]) {
                        var fields = result.documents[0].fields;
                        for (var fieldName in fields) {
                            if (fields.hasOwnProperty(fieldName)) {
                                var values = fields[fieldName] && fields[fieldName].values;
                                if (values && values[0] && values[0].value) {
                                    Log.print(Log.l.trace, fieldName + ": " + values[0].value.replace(/\n/g," ") + " (confidence: " + values[0].confidence + "%)");
                                }
                            }
                        }
                    }
                    promise._completed();
                });
                return WinJS.Promise.timeout(30000);
            });
            Log.ret(Log.l.trace);
            return promise;
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
