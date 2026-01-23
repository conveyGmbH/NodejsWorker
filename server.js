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

    if (typeof navigator === 'undefined') {
        global.navigator = {
            platform: "node"
        };
    }
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

    var hostName, onlinePath, login, password;
	var logLevel;
    if (process && process.env) {
        hostName = process.env.ODATA_HOST_NAME;
        onlinePath = process.env.ODATA_ONLINE_PATH;
        login = process.env.ODATA_LOGIN;
        password = process.env.ODATA_PASSWORD;
		switch(process.env.DEBUGLEVEL) {
			case '0':
			case 'none':
				logLevel = Log.l.none;
				break;
			case '1':
			case 'error':
				logLevel = Log.l.error;
				break;
			case '2':
			case 'warnings':
				logLevel = Log.l.warn;
				break;
			case '3':
			case 'info':
				logLevel = Log.l.info;
				break;
			case '4':
			case 'trace':
				logLevel = Log.l.trace;
				break;
			case '5':
			case 'user1':
				logLevel = Log.l.u1;
				break;
			case '6':
			case 'user2':
				logLevel = Log.l.u2;
				break;
		}
    }

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
            hostName: hostName,
            onlinePort: 443,
            urlSuffix: null,
            onlinePath: onlinePath,
            login: login,
            password: password,
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
        level: (logLevel===undefined?Log.l.trace:logLevel),
        group: false,
		// Ted 20240827: Was soll es bringen das auf true zu setzen? Es bringt auf jeden Fall den Call-Stack von Logging
		//               durcheinander wenn das Log.call und das Log.ret unterschiedliche Debug-Levels verwenden.
        noStack: false 
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
    var workerServiceOptions = [
        //{ name: "selectMitarbeiter", count: 100 }
        // "selectVeranstaltung",
        // "selectKontakt"
        //"xhrRequest"
        //{ name: "callOcr", count: 5 },
        //{ name: "bcrService", count: 5 },
        //{ name: "recognizeBusinessCard", count: 2 }
        //{ name: "bcrService", count: 2 },
        //{ name: "dbSyncService", count: 2 },
        { name: "callOcr", count: 2 },
        //"callOcr",
        //"bcrService",
        //"dbSyncService"
        {name: "recognizeBusinessCardAI", count: 1}
    ];
    if (process && process.env && process.env.WORKER_SERVICE_OPTIONS) {
        try {
            workerServiceOptions = JSON.parse(process.env.WORKER_SERVICE_OPTIONS);
        } catch(ex) {
            Log.print(Log.l.info, "Exception occured! WORKER_SERVICE_OPTIONS=" + process.env.WORKER_SERVICE_OPTIONS);
        }
    }
    var workLoop = new WorkerService.WorkLoop(workerServiceOptions, port);

    /*
    * Start the work loop object
    */
    workLoop.start();
})();

