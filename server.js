/*
 * Worker roles run asynchronous, long-running, or perpetual
 * tasks independent of user interaction or input.
 */
/// <reference path="./lib/WinJS/scripts/base.js" />
/// <reference path="./lib/convey/scripts/strings.js" />
/// <reference path="./lib/convey/scripts/logging.js" />
/// <reference path="./lib/convey/scripts/appSettings.js" />
/// <reference path="./lib/convey/scripts/dataService.js" />
/// <reference path="./lib/convey/scripts/workerService.js" />


(function () {
    "use strict";

    global.navigator = {
        platform: "node"
    };
    function include(f, key) {
        var start = f.lastIndexOf("/") + 1;
        var stop = f.indexOf(".", start);
        if (!key) {
            if (stop > start) {
                key = f.substr(start, stop - start);
            } else {
                key = f.substr(start);
            }
        }
        global[key] = require(f);
    }

    include("btoa");
    include("xhr2", "XMLHttpRequest");
    include("./lib/WinJS/scripts/base.js");
    include("./lib/convey/scripts/strings.js");
    include("./lib/convey/scripts/logging.js");
    include("./lib/convey/scripts/appSettings.js");
    include("./lib/convey/scripts/dataService.js");
    include("./lib/convey/scripts/workerService.js");

    // default settings
    AppData.persistentStatesDefaults = {
        colorSettings: {
            // navigation-color with 100% saturation and brightness
            accentColor: "#ff3c00"
        },
        showAppBkg: false,
        logEnabled: false,
        logLevel: 3,
        logGroup: false,
        logNoStack: true,
        inputBorder: 1,
        odata: {
            https: true,
            hostName: "lstest.convey.de",
            onlinePort: 443,
            urlSuffix: null,
            onlinePath: "odata_online", // serviceRoot online requests Lstest-client01odata_online
            login: "CloudUser", // adminhx
            password: "6hbamVbQxDbSDLEC", // client01     McYxEuBKJZ:tVC4)E
            registerPath: "odata_register", // serviceRoot register requests
            registerLogin: "AppRegister",
            registerPassword: "6530bv6OIUed3",
            useOffline: false,
            replActive: false,
            replInterval: 30,
            replPrevPostMs: 0,
            replPrevSelectMs: 0,
            replPrevFlowSpecId: 0,
            dbSiteId: 0,
            timeZoneAdjustment: 0,
            timeZoneRemoteAdjustment: null,
            timeZoneRemoteDiffMs: 0,
            serverFailure: false
        }
    };

    Log.init({
        target: Log.targets.console,
        level: Log.l.trace,
        group: false,
        noStack: true
    });
    Log.print(Log.l.info, "V8 Version=" + process.versions.v8);

    /*
    * Start a HTTP server
    * for servicing functions and use the following port:
    */
    var port = process.env.port || 1337;

    /*
    * Instanciate and the work loop object
    */
    var workLoop = new WorkerService.WorkLoop([
       //{ name: "selectMitarbeiter", count: 100 },
       // "selectVeranstaltung",
       // "selectKontakt"
       //"xhrRequest"
       { name: "callOcr", count: 1 },
       //{ name: "bcrService", count: 5 },
       //"callOcr"
       // "bcrService",
       //"dbSyncService"
    ], port);

    /*
    * Start the work loop object
    */
    workLoop.start();
})();

