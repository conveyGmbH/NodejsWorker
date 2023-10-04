/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";
    var urls = [
        'https://leadsuccess.convey.de/LSModata_online/MitarbeiterVIEW_20431?$format=json',
        'https://leadsuccess.convey.de/LS1Modata_online/MitarbeiterVIEW_20431?$format=json',
        'https://leadsuccess.convey.de/LS2Modata_online/MitarbeiterVIEW_20431?$format=json',
        'https://leadsuccess.convey.de/LS3Modata_online/MitarbeiterVIEW_20431?$format=json',
        'https://leadsuccess.convey.de/LS4Modata_online/MitarbeiterVIEW_20431?$format=json'/*,
        'https://leadsuccess.convey.de/LSNodata_online/MitarbeiterVIEW_20431?$format=json'*/
    ];
    var userList = [
        { login: '', password: '' }
    ];
    var userCounter = Math.floor(Math.random() * userList.length);

    // Set up the request
    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, "xhrRequest.");
            this.timestamp = null;
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = Math.floor(250 + Math.random() * 500);
            this.lastLogin = "";
            this.lastCount = 0;
            this.duration = 0;
            this.lastUrlIdx = 0

            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            Log.call(Log.l.trace, "xhrRequest.");
            userCounter++;
            if (userCounter >= userList.length) {
                userCounter = 0;
            }
            var user = userList[userCounter].login;
            var password = userList[userCounter].password;
            var idx = Math.floor(Math.random() * urls.length);
            var url = urls[idx];
            var options = {
                type: "GET",
                url: url,
                user: user,
                password: password,
                customRequestInitializer: function (req) {
                    if (typeof req.withCredentials !== "undefined") {
                        req.withCredentials = true;
                    }
                },
                headers: {
                    "Authorization": "Basic " + btoa(user + ":" + password)
                }
            };
            Log.print(Log.l.info, "calling xhr method=GET user[" + userCounter + "]=" + userList[userCounter].login);
            var that = this;
            var startTS = new Date();
            var ret = WinJS.xhr(options).then(function (response) {
                Log.print(Log.l.info, "select success! " + that.successCount + " success / " + that.errorCount + " errors");
                that.lastCount++;
                that.lastLogin = user;
                var now = new Date();
                that.duration = now.getTime() - startTS.getTime();
                that.timestamp = now;
                that.lastUrlIdx = idx;
            }, function (errorResponse) {
                that.errorCount++;
                Log.print(Log.l.error, "error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                that.timestamp = new Date();
            });
            Log.ret(Log.l.trace);
            return ret;
        },

        dispose: function () {
            Log.call(Log.l.trace, "xhrRequest.");
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            Log.call(Log.l.trace, "xhrRequest.");
            var infoText = this.lastCount + " success / " + this.errorCount + " errors " + this.duration + "ms login " + this.lastLogin + " url-idx " + this.lastUrlIdx;
            if (this.timestamp) {
                infoText += "\n" + this.timestamp.toLocaleTimeString();
            }
            Log.ret(Log.l.trace);
            return infoText;
        }
    };
    module.exports = dispatcher;
})();
