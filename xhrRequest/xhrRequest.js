/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";
    var subscriptionKey = "a12ee952460d409f9f66d1536dd97318";
    var sourceImageUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Atomist_quote_from_Democritus.png/338px-Atomist_quote_from_Democritus.png";
    var uriBase = "https://westeurope.api.cognitive.microsoft.com/vision/v1.0/ocr?language=de";

    var imageRecord = {
        url: sourceImageUrl
    };

    var options = {
        type: "POST",
        url: uriBase,
        data: JSON.stringify(imageRecord),
        headers: {
            "Content-Type": "application/json",
            "Ocp-Apim-Subscription-Key": subscriptionKey
        }
    };

    // Set up the request
    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, "xhrRequest.");
            this.timestamp = null;
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 20000;

            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            Log.print(Log.l.info, "calling xhr method=POST url=" + sourceImageUrl);
            var that = this;
            return WinJS.xhr(options).then(function (response) {
                var err;
                Log.print(Log.l.trace, "success!");
                try {
                    var obj = response;
                    console.log(obj);
                    var myresultJson = JSON.parse(response.responseText);
                    if (obj && obj.responseText) {
                        that.successCount++;
                        Log.print(Log.l.info, "select success! " + that.successCount + " success / " + that.errorCount + " errors");
                        that.timestamp = new Date();
                    } else {
                        that.errorCount++;
                        Log.print(Log.l.error, "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                        that.timestamp = new Date();
                        err = { status: 404, statusText: "no data found" };
                    }
                    var myResultSet = "";
                    var dummyResult = "";
                    if (myresultJson && myresultJson.regions.length > 0) {
                        for (var i = 0; i < myresultJson.regions.length; i++) {
                            for (var j = 0; j < myresultJson.regions[i].lines.length; j++) {
                                for (var k = 0; k < myresultJson.regions[i].lines[j].words.length; k++) {
                                    var myBoundingBox = myresultJson.regions[i].lines[j].words[k].boundingBox;
                                    var myNewboundingBox = myBoundingBox.split(",");
                                    myResultSet = myResultSet + "(x = " + myNewboundingBox[0] + ", y = " + myNewboundingBox[1] + ", width = " + myNewboundingBox[2] + ", height = " + myNewboundingBox[3] + ", text = "
                                        + myresultJson.regions[i].lines[j].words[k].text + "); ";
                                    var text = (myresultJson.regions[i].lines[j].words[k].text).replace(",", ".");
                                    dummyResult = myNewboundingBox[0] + ", " + myNewboundingBox[1] + ", " + myNewboundingBox[2] + ", " + text + "\n";

                                }
                            }
                        }
                    }
                    console.log(dummyResult);
                } catch (exception) {
                    that.errorCount++;
                    Log.print(Log.l.error, "resource parse error " + (exception && exception.message) + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                    err = { status: 500, statusText: "data parse error " + (exception && exception.message) };
                }
                return WinJS.Promise.as();
            }, function (errorResponse) {
                that.errorCount++;
                Log.print(Log.l.error, "error status=" + that.errorResponse.status + " statusText=" + that.errorResponse.statusText);
                that.timestamp = new Date();
            });
        },

        dispose: function () {
            Log.call(Log.l.trace, "xhrRequest.");
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            Log.call(Log.l.trace, "xhrRequest.");
            var infoText = this.successCount + " success / " + this.errorCount + " errors";
            if (this.timestamp) {
                infoText += "\n" + this.timestamp.toLocaleTimeString();
            }
            Log.ret(Log.l.trace);
            return infoText;
        }
    };
    module.exports = dispatcher;
})();