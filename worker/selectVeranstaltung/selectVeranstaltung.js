/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    var dispatcher = {
        startup: function() {
            Log.call(Log.l.trace, "veranstaltungSelect.");
            this.successCount = 0;
            this.errorCount = 0;
            this.timestamp = null;
            this.dbEngine = AppData.getFormatView("Veranstaltung", 0, false);
            this.results = [];
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            var ret = null;
            var that = this;
            Log.call(Log.l.trace, "veranstaltungSelect.");
            if (this.dbEngine) {
                ret = this.dbEngine.select(function(json) {
                    that.results = [];
                    if (json && json.d && json.d.results) {
                        for (var i = 0; i < json.d.results.length; i++) {
                            Log.print(Log.l.info, "[" + i + "]: " + json.d.results[i].Name);
                            that.results.push(json.d.results[i].Name);
                        }
                    }
                    that.successCount++;
                    Log.print(Log.l.info, "select success! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                }, function(error) {
                    that.results = [];
                    that.errorCount++;
                    Log.print(Log.l.error, "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                });
            } else {
                Log.Print(Log.l.error, "not initialized!");
                ret = WinJS.Promise.as();
            }
            Log.ret(Log.l.trace);
            return ret;
        },

        dispose: function() {
            Log.call(Log.l.trace, "veranstaltungSelect.");
            this.dbEngine = null;
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        //waitTimeMs: 5000,

        info: function () {
            var infoText = this.successCount + " success / " + this.errorCount + " errors";
            if (this.timestamp) {
                infoText += "\n" + this.timestamp.toLocaleTimeString();
            }
            Log.call(Log.l.trace, "veranstaltungSelect.");
            for (var i = 0; i < this.results.length; i++) {
                infoText += "\n" + "[" + i + "]: " + this.results[i];
            }
            Log.ret(Log.l.trace);
            return infoText;
        }
    };
    module.exports = dispatcher;
})();