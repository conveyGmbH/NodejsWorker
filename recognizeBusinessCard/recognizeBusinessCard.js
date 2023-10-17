/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    //const { FormRecognizerClient, AzureKeyCredential } = require("@azure/ai-form-recognizer");
    //const fs = require("fs");

    //var fileName = "images/business_card.jpg";

    // Set up the request
    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");
            this.timestamp = null;
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 60000;

            // You will need to set these environment variables or edit the following values
            //this.endpoint = "https://westeurope.api.cognitive.microsoft.com/";
            //this.apiKey = "eb0abaaf63d3477c95c3f6f645be1eab";

            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");

            /*var readStream = fs.createReadStream(fileName);

            var client = new FormRecognizerClient(this.endpoint, new AzureKeyCredential(this.apiKey));

            var promise = client.beginRecognizeBusinessCards(readStream, {
                contentType: "image/jpeg",
                onProgress: (state) => {
                    Log.print(Log.l.trace, "status: " + state.status);
                }
            }).then(function (poller) {
                return poller.pollUntilDone();
            }).then(function (businessCard) {
                Log.print(Log.l.trace, businessCard.toString());
            });*/

            var winPromise = WinJS.Promise.as();//toWinJSPromise(promise);


            Log.ret(Log.l.trace);
            return winPromise;
        },

        dispose: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            Log.call(Log.l.trace, "recognizeBusinessCard.");
            var infoText = this.lastCount + "recognizeBusinessCard: success / " + this.errorCount + " errors ";
            Log.ret(Log.l.trace);
            return infoText;
        }
    };
    module.exports = dispatcher;
})();
