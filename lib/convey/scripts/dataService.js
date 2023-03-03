﻿// general data services
/// <reference path="../../../lib/WinJS/scripts/base.js" />
/// <reference path="../../../lib/convey/scripts/logging.js" />
/// <reference path="../../../lib/convey/scripts/sqlite.js" />
/// <reference path="../../../lib/convey/scripts/strings.js" />
/// <reference path="../../../lib/convey/scripts/appbar.js" />
/// <reference path="../../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../../lib/convey/scripts/dbinit.js" />

(function () {
    "use strict";

    WinJS.Namespace.define("AppData", {
        DocGroup: {
            Image: 1,
            Text: 3,
            Video: 5,
            Audio: 6
        },
        isSvg: function(docGroup, docFormat) {
            if (docGroup === AppData.DocGroup.Text && docFormat === 75) {
                return true;
            } else {
                return false;
            }
        },
        isImg: function (docGroup, docFormat) {
            if (docGroup === AppData.DocGroup.Image) {
                return true;
            } else {
                return false;
            }
        },
        isAudio: function (docGroup, docFormat) {
            if (docGroup === AppData.DocGroup.Audio) {
                return true;
            } else {
                return false;
            }
        },
        isVideo: function (docGroup, docFormat) {
            if (docGroup === AppData.DocGroup.Video) {
                return true;
            } else {
                return false;
            }
        },
        _docFormat: {
            "bmp": 1,
            "tif": 2,
            "tiff": 2,
            "jpg": 3,
            "jpeg": 3,
            "pcx": 4,
            "gif": 5,
            "eps": 6,
            "ps": 7,
            "dcx": 10,
            "avi": 13,
            "wav": 14,
            "pcd": 15,
            "wmf": 16,
            "cdr": 17,
            "plt": 18,
            "dxf": 21,
            "dwg": 22,
            "hgl": 23,
            "hpgl": 23,
            "cgm": 24,
            "ctm": 25,
            "ch3": 26,
            "cgt": 27,
            "clp": 28,
            "clx": 29,
            "rtf": 30,
            "htm": 31,
            "html": 31,
            "wri": 32,
            "drw": 33,
            "dsf": 34,
            "dwf": 35,
            "flw": 36,
            "fmv": 37,
            "fpx": 38,
            "gal": 39,
            "gdf": 40,
            "gem": 41,
            "hgw": 42,
            "ico": 43,
            "igs": 44,
            "img": 45,
            "met": 46,
            "mnp": 47,
            "nap": 48,
            "pct": 49,
            "pdf": 50,
            "pic": 51,
            "pif": 52,
            "png": 53,
            "ppt": 54,
            "psd": 55,
            "ras": 56,
            "rnd": 57,
            "sat": 58,
            "shw": 59,
            "mid": 60,
            "midi": 60,
            "tga": 61,
            "vsd": 62,
            "wpg": 63,
            "xbm": 64,
            "xpm": 65,
            "xwd": 66,
            "mp3": 67,
            "mpa": 67,
            "m2a": 67,
            "m3a": 67,
            "m4a": 67,
            "3g2": 67,
            "3gp": 67,
            "3ggp": 67,
            "3gpp": 67,
            "mov": 68,
            "au": 69,
            "asc": 70,
            "ascii": 70,
            "txt": 70,
            "aif": 71,
            "aiff": 71,
            "mpg": 72,
            "mpeg": 72,
            "cmx": 73,
            "can": 74,
            "canv": 74,
            "svg": 75,
            "svgz": 76,
            "svz": 76,
            "emf": 77,
            "asf": 81,
            "wma": 82,
            "wmv": 83,
            "swf": 1704
        },
        _docFormatContentType: {
            1: "image/bmp",
            2: "image/tiff",
            3: "image/jpeg",
            5: "image/gif",
            6: "application/postscript",
            7: "application/postscript",
            13: "video/avi",
            14: "audio/wav",
            16: "image/x-wmf",
            30: "application/msword",
            31: "text/html",
            50: "application/pdf",
            53: "image/png",
            67: "audio/mpeg",
            68: "video/quicktime",
            72: "video/mpeg",
            82: "audio/x-ms-wma",
            83: "video/x-ms-wmv"
        },
        getDocType: function (format) {
            return AppData._docFormatContentType[format];
        },
        getDocFormatFromExt: function(fileExt) {
            return AppData._docFormat[fileExt];
        },
        _sqlFilterReplacement: {
            "!": "NOT",
            ">=": ">=",
            "<=": "<=",
            ">": ">",
            "<": ">"
        },
        replaceSqlFilter: function (restriction, isString) {
            var sqlRestriction = null;
            Log.call(Log.l.u1, "AppData.", "restriction=" + restriction);
            if (typeof restriction === "string") {
                for (var op in AppData._sqlFilterReplacement) {
                    if (AppData._sqlFilterReplacement.hasOwnProperty(op)) {
                        if (restriction.indexOf(op) === 0) {
                            sqlRestriction = " " + AppData._sqlFilterReplacement[op] +
                                (isString ? " '" : " ") + 
                                restriction.substr(op.length) +
                                (isString ? "' " : " ");
                            break;
                        }
                    }
                }
                if (!sqlRestriction) {
                    sqlRestriction = " =" +
                        (isString ? " '" : " ") +
                        restriction +
                        (isString ? "' " : " ");
                }
            } else {
                sqlRestriction = " =" +
                    (isString ? " '" : " ") +
                    restriction +
                    (isString ? "' " : " ");
            }
            Log.ret(Log.l.u1, "sqlQuery=" + sqlRestriction);
            return sqlRestriction;
        },
        _odataFilterReplacement: {
            "!": "ne",
            ">=": "ge",
            "<=": "le",
            ">": "gt",
            "<": "lt"
        },
        replaceOdataFilter: function (restriction, isString) {
            var odataRestriction = null;
            Log.call(Log.l.u1, "AppData.", "restriction=" + restriction);
            if (typeof restriction === "string") {
                for (var op in AppData._odataFilterReplacement) {
                    if (AppData._odataFilterReplacement.hasOwnProperty(op)) {
                        if (restriction.indexOf(op) === 0) {
                            odataRestriction = "%20" +
                                (isString ? "'" : "") +
                                AppData._odataFilterReplacement[op] +
                                (isString ? "'" : "") +
                                "%20" +
                                restriction.substr(op.length);
                            break;
                        }
                    }
                }
                if (!odataRestriction) {
                    odataRestriction = "%20eq%20" +
                        (isString ? "'" : "") +
                        restriction +
                        (isString ? "'" : "");
                }
            } else {
                odataRestriction = "%20eq%20" +
                    (isString ? "'" : "") +
                    restriction +
                    (isString ? "'" : "");
            }
            Log.ret(Log.l.u1, "odataFilter=" + odataRestriction);
            return odataRestriction;
        },
        /**
         * @class formatViewData 
         * @memberof AppData
         * @param {string} relationName - Name of a database table.
         * @param {number} formatId - Number of a format view to be used to display data in the app UI, e.g. in forms or list views.
         * @param {boolean} [isLocal] - True, if the relation object should represent a table or view in local SQLite storage. 
         *  False, if the relation object should represent a table or view on the database server to be accessed via OData. Default: undefined
         * @param {boolean} [isRegister] - True, if the relation object should represent table or view is used in registration user context. Default: false
         * @param {boolean} [isRepl] - True, if the relation object should represent table or view is used for background data replication. Default: false
         * @description This class is used by the framework to select data from database tables or views and store data in database tables.
         *  If a format view number is specified the cossresponding view of name <relationName>VIEW_<formatId> is used to retrieve data for displaying in the app UI, e.g. in forms or list views.
         *  Use formatId=0 to access a database table with the given name.
         * 
         *  If the isLocal parameter is undefined, the formatViewData object represents a local SQLite storage object if the table or view exists is configured to be a local.
         *  This willl be selected automatically from ReplicationSpec configuration metadata.
         * 
         *  There is a primary key attribute of type number to select database records by record id in each table or view.
         *  You can use the formatViewData.pkName property to retrieve the name of this attribute.
         * 
         *  Do not use this constructor to create database interface objects. Use the function {@link AppData.getFormatView} instead!
         */
        formatViewData: WinJS.Class.define(function formatViewData(relationName, formatId, isLocal, isRegister, isRepl) {
            Log.call(Log.l.trace, "AppData.", "relationName=" + relationName + " formatId=" + formatId);
            this._relationName = relationName;
            if (typeof isRegister === "boolean") {
                this._isRegister = isRegister;
            } else {
                this._isRegister = false;
            }
            if (typeof formatId !== "undefined") {
                this._formatId = formatId;
            }
            if (typeof isLocal === "boolean") {
                this._isLocal = isLocal;
            } else {
                this._isLocal = AppData.isLocalRelation(relationName);
            }
            if (relationName.substr(0, 4) === "RINF") {
                this._isRinf = true;
            } else {
                this._isRinf = false;
            }
            if (typeof isRepl === "boolean") {
                this._isRepl = isRepl;
            } else {
                this._isRepl = false;
            }
            Log.ret(Log.l.trace);
        }, {
            _isRepl: false,
            /**
             * @property {boolean} isRepl - Retrieves replication usage
             * @memberof AppData.formatViewData
             * @description Read-only. True, if the relation object should represent table or view is used for background data replication. Otherwise false.
             */
            isRepl: {
                get: function () {
                    return this._isRepl;
                }
            },
            _isRinf: false,
            _relationName: null,
            _formatId: 0,
            _useDialogId: 0,
            _viewRelationName: null,
            _attribSpecs: null,
            _isRegister: false,
            /**
             * @property {boolean} isRegister - Retrieves register user context usage
             * @memberof AppData.formatViewData
             * @description Read-only. True, if the relation object should represent table or view is used in registration user context. Otherwise false
             */
            isRegister: {
                get: function () {
                    return this._isRegister;
                }
            },
            _isLocal: false,
            _maxPageSize: 0,
            maxPageSize: {
                get: function() {
                    return this._maxPageSize;
                },
                set: function(newMaxPageSize) {
                    this._maxPageSize = newMaxPageSize;
                }
            },
            _pages: [],
            /**
             * @property {boolean} isLocal - Retrieves if the relation object relies in local SQLite databese storage
             * @memberof AppData.formatViewData
             * @description Read-only. True, if the relation object should represent a table or view in local SQLite storage. Otherwise false.
             */
            isLocal: {
                get: function() {
                    return this._isLocal;
                }
            },
            _oDataPkName: null,
            _pkName: null,
            /**
             * @property {string} pkName - Column name of primary key
             * @memberof AppData.formatViewData
             * @description Read-only. Retrieves the name of the primary key attribute in the relation object
             */
            pkName: {
                get: function() {
                    if (!this._pkName && this._attribSpecs) {
                        for (var i = 0; i < this._attribSpecs.length; i++) {
                            var attribSpec = this._attribSpecs[i];
                            if (attribSpec.Function & 2048) { // primary key flag
                                this._pkName = attribSpec.Name;
                                this._oDataPkName = attribSpec.ODataAttributeName;
                                break;
                            }
                        }
                    }
                    return this._pkName;
                }
            },
            /**
             * @property {string} oDataPkName - Column name of primary key in OData view
             * @memberof AppData.formatViewData
             * @description Read-only. Retrieves the name of the primary key attribute in the OData view
             */
            oDataPkName: {
                get: function () {
                    if (!this._oDataPkName && this._attribSpecs) {
                        for (var i = 0; i < this._attribSpecs.length; i++) {
                            var attribSpec = this._attribSpecs[i];
                            if (attribSpec.Function & 2048) { // primary key flag
                                this._pkName = attribSpec.Name;
                                this._oDataPkName = attribSpec.ODataAttributeName;
                                break;
                            }
                        }
                    }
                    return this._oDataPkName;
                }
            },
            db: {
                get: function() {
                    if (this.isRepl) {
                        return (AppRepl.replicator && AppRepl.replicator._db);
                    } else {
                        return AppData._db;
                    }
                }
            },
            connectionType: {
                get: function() {
                    if (this.isRepl) {
                        return (AppRepl.replicator && AppRepl.replicator._connectionType);
                    } else {
                        return 0;
                    }
                }
            },
            /**
             * @property {string} relationName - Database table or view name
             * @memberof AppData.formatViewData
             * @description Read-only. Retrieves the name of the database table or view connected to the current AppData.formatViewData object
             */
            relationName: {
                get: function() {
                    return this._relationName;
                }
            },
            /**
             * @property {string} viewRelationName - Database view name
             * @memberof AppData.formatViewData
             * @description Read-only. Retrieves the name of the database view connected to the current AppData.formatViewData object
             */
            viewRelationName: {
                get: function() {
                    return this._viewRelationName;
                }
            },
            /**
             * @property {number} formatId - Format view id 
             * @memberof AppData.formatViewData
             * @description Read-only. Retrieves the number of the format view connected to the current AppData.formatViewData object.
             *  The value is 0 for table obkects.
             */
            formatId: {
                get: function() {
                    return this._formatId;
                }
            },
            /**
             * @property {Object[]} attribSpecs - Array of attribute spec data records.
             * @memberof AppData.formatViewData
             * @description Read-only. Retrieves the attribute specs of the current database relation.
             */
            attribSpecs: {
                get: function() {
                    return this._attribSpecs;
                }
            },
            fetchNextAttribSpecs: function (that, results, next, followFunction, complete, error, param1, param2) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "next=" + next);
                var user = AppData.getOnlineLogin(that._isRegister);
                var password = AppData.getOnlinePassword(that._isRegister);
                var options = {
                    type: "GET",
                    url: next,
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
                Log.print(Log.l.info, "calling xhr method=GET url=" + next);
                var ret = WinJS.xhr(options).then(function xhrSuccess(response) {
                    Log.call(Log.l.trace, "AppData.formatViewData.", "method=GET");
                    try {
                        var obj = jsonParse(response.responseText);
                        if (obj && obj.d) {
                            results = results.concat(obj.d.results);
                            var next = that.getNextUrl(obj);
                            if (next) {
                                return that.fetchNextAttribSpecs(that, results, next, followFunction, complete, error, param1, param2);
                            } else {
                                that._attribSpecs = results;
                                followFunction(that, complete, error, param1, param2);
                            }
                        } else {
                            var err = { status: 404, statusText: "no data found" };
                            error(err);
                        }
                    } catch (exception) {
                        Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                        error({ status: 500, statusText: "data parse error " + (exception && exception.message) });
                    }
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }, function (errorResponse) {
                    Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                    error(errorResponse);
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            fetchAllAttribSpecs: function (that, obj, followFunction, complete, error, param1, param2) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "");
                var retNext;
                var next = that.getNextUrl(obj);
                if (next) {
                    retNext = that.fetchNextAttribSpecs(that, obj.d.results, next, followFunction, complete, error, param1, param2);
                } else {
                    if (obj && obj.d) {
                        that._attribSpecs = obj.d.results;
                    }
                    followFunction(that, complete, error, param1, param2);
                    retNext = WinJS.Promise.as();
                }
                Log.ret(Log.l.trace);
                return retNext;
            },
            getAttribSpecs: function(that, followFunction, complete, error, param1, param2) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + that.relationName + " formatId=" + that.formatId + " isRegister=" + that._isRegister);
                var ret;
                var loadAttribSpecs = function() {
                    var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.getOnlinePath(that._isRegister);
                    url += "/AttribSpecExtView?$filter=(";
                    if (that.formatId) {
                        if (that.viewRelationName) {
                            url += "RelationName%20eq%20'" + that.viewRelationName + "'";
                        } else if (that._useDialogId) {
                            url += "BaseRelationName%20eq%20'" + that.relationName + "'%20and%20DialogID%20eq%20" + that.formatId.toString();
                        } else {
                            url += "RelationName%20eq%20'" + that.relationName + "VIEW_" + that.formatId.toString() + "'";
                        }
                    } else {
                        url += "RelationName%20eq%20'" + that.relationName + "'";
                    }
                    url += ")&$format=json&$orderby=AttributeIDX";
                    var user = AppData.getOnlineLogin(that._isRegister);
                    var password = AppData.getOnlinePassword(that._isRegister);
                    Log.print(Log.l.trace, "user=" + user );
                    var options = {
                        type: "GET",
                        url: url,
                        user: user,
                        password: password,
                        customRequestInitializer: function(req) {
                            if (typeof req.withCredentials !== "undefined") {
                                req.withCredentials = true;
                            }
                        },
                        headers: {
                            "Authorization" : "Basic " + btoa(user + ":" + password)
                        }
                    };
                    Log.print(Log.l.trace, "user=" + user + " password=" + password + " Authorization=" + options.headers["Authorization"] );
                    Log.print(Log.l.info, "calling xhr method=GET url=" + url);
                    return WinJS.xhr(options).then(function xhrSuccess(responseAttribSpec) {
                        Log.call(Log.l.trace, "AppData.formatViewData.", "method=GET");
                        try {
                            var json = jsonParse(responseAttribSpec.responseText);
                            if (json && json.d && json.d.results && json.d.results.length > 0) {
                                if (that.formatId) {
                                    that._viewRelationName = json.d.results[0].RelationName;
                                    Log.ret(Log.l.trace, "retrieved viewRelationName=" + that._viewRelationName);
                                }
                                return that.fetchAllAttribSpecs(that, json, followFunction, complete, error, param1, param2);
                            } else if (!that._useDialogId) {
                                that._useDialogId = true;
                                Log.ret(Log.l.trace, "try again with DialogID...");
                                return that.getAttribSpecs(that, followFunction, complete, error, param1, param2);
                            } else {
                                that._useDialogId = false;
                                Log.ret(Log.l.trace, "no data found!");
                                if (json && json.d) {
                                    that._attribSpecs = json && json.d.results;
                                }
                                followFunction(that, complete, error, param1, param2);
                                return WinJS.Promise.as();
                            }
                        } catch (exception) {
                            Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                            error({ status: 500, statusText: "AttribSpecExtView parse error " + (exception && exception.message) });
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }
                    }, function (errorResponse) {
                        Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                        error(errorResponse);
                    });
                }
                if (that._isLocal && AppData._dbInit) {
                    var relationName;
                    if (that.formatId) {
                        relationName = that.relationName + "VIEW_" + that.formatId.toString();
                    } else {
                        relationName = that.relationName;
                    }
                    ret = AppData._dbInit.getAttribSpecs(AppData._dbInit, relationName, function (results) {
                        that._attribSpecs = results;
                        return followFunction(that, complete, error, param1, param2);
                    }, function (err) {
                        error(err);
                    });
                } else {
                    ret = loadAttribSpecs();
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            viewRecordFromTableRecord: function (that, tableRecord) {
                var viewRecord = {};
                if (tableRecord && that.attribSpecs && that.attribSpecs.length > 0) {
                    for (var i = 0; i < that.attribSpecs.length; i++) {
                        var baseAttributeName = that.attribSpecs[i].BaseAttributeName;
                        if (baseAttributeName && typeof tableRecord[baseAttributeName] !== "undefined") {
                            var viewAttributeName = that.attribSpecs[i].ODataAttributeName;
                            Log.print(Log.l.trace, viewAttributeName + ": " + tableRecord[baseAttributeName]);
                            viewRecord[viewAttributeName] = tableRecord[baseAttributeName];
                        }
                    }
                }
                return viewRecord;
            },
            extractTableRecord: function(that, complete, error, viewRecord) {
                var ret;
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + that.relationName + " formatId=" + that.formatId);
                if (!that.attribSpecs) {
                    ret = that.getAttribSpecs(that, that.extractTableRecord, complete, error, viewRecord);
                } else {
                    ret = new WinJS.Promise.as().then(function() {
                        var tableRecord = {};
                        if (viewRecord && that.attribSpecs && that.attribSpecs.length > 0) {
                            for (var i = 0; i < that.attribSpecs.length; i++) {
                                if (that.attribSpecs[i].BaseAttributeName) {
                                    var viewAttributeName = that.attribSpecs[i].ODataAttributeName;
                                    var viewAttributeValue = stripControlCodes(viewRecord[viewAttributeName]);
                                    if (typeof viewAttributeValue !== "undefined") {
                                        if (typeof viewAttributeValue === "string" && viewAttributeValue.length === 0) {
                                            viewAttributeValue = null;
                                        }
                                        if (that._isLocal) {
                                            var baseAttributeName = that.attribSpecs[i].BaseAttributeName;
                                            Log.print(Log.l.trace, baseAttributeName + ": " + viewRecord[viewAttributeName]);
                                            tableRecord[baseAttributeName] = viewAttributeValue;
                                        } else {
                                            Log.print(Log.l.trace, viewAttributeName + ": " + viewRecord[viewAttributeName]);
                                            tableRecord[viewAttributeName] = viewAttributeValue;
                                        }
                                    }
                                }
                            }
                            complete(tableRecord);
                        } else {
                            Log.print(Log.l.error, "no data in AttribSpecs");
                            var err = { status: 500, statusText: "no data in AttribSpecs" };
                            error(err);
                        }
                    });
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            extractRestriction: function(that, complete, error, restriction) {
                var ret;
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + that.relationName + " formatId=" + that.formatId);
                if (!that.attribSpecs) {
                    ret = that.getAttribSpecs(that, that.extractRestriction, complete, error, restriction);
                } else {
                    ret = new WinJS.Promise.as().then(function() {
                        if (that.attribSpecs && that.attribSpecs.length > 0) {
                            var filterString = "";
                            if (restriction) {
                                var viewAttributeName, i, curRestriction, j, hasRestriction, r, curFilterString, isString;
                                var length = 1;
                                if (that._isLocal) {
                                    for (r = 0; r < length; r++) {
                                        curFilterString = "";
                                        for (i = 0; i < that.attribSpecs.length; i++) {
                                            if (that.attribSpecs[i].Name) {
                                                viewAttributeName = that.attribSpecs[i].ODataAttributeName;
                                                curRestriction = restriction[viewAttributeName];
                                                if (typeof curRestriction !== "undefined" &&
                                                    !(curRestriction === null) &&
                                                    !(typeof curRestriction === "string" && curRestriction.length === 0)) {
                                                    Log.print(Log.l.trace, that.attribSpecs[i].Name + "=" + curRestriction);
                                                    if (curFilterString.length > 0) {
                                                        curFilterString += " AND ";
                                                    }
                                                    isString = that.attribSpecs[i].ExtType === 3;
                                                    if (isString && !restriction.bExact) {
                                                        // string attribute: generate <attribute> LIKE '<restriction>%' query
                                                        if (typeof curRestriction === "object") {
                                                            if (restriction.bAndInEachRow) {
                                                                if (curRestriction.length > r) {
                                                                    if (length < curRestriction.length) {
                                                                        length = curRestriction.length;
                                                                    }
                                                                    if (curRestriction[r] === null) {
                                                                        // ignore null restrictions
                                                                    } else {
                                                                        curFilterString += that.attribSpecs[i].Name + " LIKE '" + curRestriction[r] + "%'";
                                                                    }
                                                                }
                                                            } else if (curRestriction.length > 0) {
                                                                hasRestriction = false;
                                                                for (j = 0; j < curRestriction.length; j++) {
                                                                    if (curRestriction[j]) {
                                                                        hasRestriction = true;
                                                                        if (j === 0) {
                                                                            curFilterString += "(";
                                                                        } else if (j > 0) {
                                                                            curFilterString += " OR ";
                                                                        }
                                                                        curFilterString += that.attribSpecs[i].Name + " LIKE '" + curRestriction[j] + "%'";
                                                                    }
                                                                }
                                                                curFilterString += ")";
                                                            }
                                                        } else {
                                                            curFilterString += that.attribSpecs[i].Name + " LIKE '" + curRestriction + "%'";
                                                        }
                                                        // for timestamp as atttribute type
                                                    } else {
                                                        if (typeof curRestriction === "object") {
                                                            if (restriction.bAndInEachRow) {
                                                                if (curRestriction.length > r) {
                                                                    if (length < curRestriction.length) {
                                                                        length = curRestriction.length;
                                                                    }
                                                                    if (curRestriction[r] === null) {
                                                                        // ignore null restrictions
                                                                    } else {
                                                                        curFilterString += that.attribSpecs[i].Name + AppData.replaceSqlFilter(curRestriction[r], isString);
                                                                    }
                                                                }
                                                            } else {
                                                                hasRestriction = false;
                                                                curFilterString += that.attribSpecs[i].Name + " IN (";
                                                                for (j = 0; j < curRestriction.length; j++) {
                                                                    if (curRestriction[j]) {
                                                                        hasRestriction = true;
                                                                        if (j > 0) {
                                                                            curFilterString += ",";
                                                                        }
                                                                        curFilterString += curRestriction[j];
                                                                    }
                                                                }
                                                                if (!hasRestriction) {
                                                                    curFilterString += "NULL";
                                                                }
                                                                curFilterString += ")";
                                                            }
                                                        } else {
                                                            if ((that.attribSpecs[i].Function & 16384) &&
                                                                ((restriction[viewAttributeName] === 0 || restriction[viewAttributeName] === "0") && !restriction.bExact || curRestriction === null)) {
                                                                // ignore Entry 0 on INIT columns
                                                            } else {
                                                                if (curRestriction === "NULL") {
                                                                    curFilterString += that.attribSpecs[i].Name + " IS NULL";
                                                                } else {
                                                                    // other attribute: generate <attribute> = <restriction> query
                                                                    curFilterString += that.attribSpecs[i].Name + AppData.replaceSqlFilter(curRestriction, isString);
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        if (curFilterString.length > 0) {
                                            if (restriction.bAndInEachRow && filterString.length > 0) {
                                                filterString += " OR ";
                                            }
                                            filterString += curFilterString;
                                        }
                                    }
                                } else {
                                    var addRestriction = function (prevFilterString, newRestriction) {
                                        if (prevFilterString && prevFilterString.length > 0) {
                                            var addOperator = "";
                                            if (restriction.bUseOr) {
                                                addOperator = "%20or%20";
                                            } else {
                                                addOperator = "%20and%20";
                                            }
                                            return prevFilterString + addOperator + newRestriction;
                                        } else {
                                            return newRestriction;
                                        }
                                    }
                                    for (r = 0; r < length; r++) {
                                        curFilterString = "";
                                        for (i = 0; i < that.attribSpecs.length; i++) {
                                            if (that.attribSpecs[i].Name) {
                                                viewAttributeName = that.attribSpecs[i].ODataAttributeName;
                                                curRestriction = restriction[viewAttributeName];
                                                if (typeof curRestriction !== "undefined" &&
                                                    !(curRestriction === null) &&
                                                    !(typeof curRestriction === "string" && curRestriction.length === 0)) {
                                                    Log.print(Log.l.trace, viewAttributeName + "=" + curRestriction);
                                                    isString = that.attribSpecs[i].AttribTypeID === 3;
                                                    if (isString && !restriction.bExact) {
                                                        // string attribute: generate <attribute> LIKE '<restriction>%' query
                                                        if (typeof curRestriction === "object") {
                                                            if (restriction.bAndInEachRow) {
                                                                if (curRestriction.length > r) {
                                                                    if (length < curRestriction.length) {
                                                                        length = curRestriction.length;
                                                                    }
                                                                    if (curRestriction[r] === null) {
                                                                        // ignore null restrictions
                                                                    } else {
                                                                        curFilterString = addRestriction(curFilterString, "startswith(" + viewAttributeName + ",'" + encodeURL(curRestriction[r]) + "')");
                                                                    }
                                                                }
                                                            } else {
                                                                curFilterString = addRestriction(curFilterString, "");
                                                                hasRestriction = false;
                                                                for (j = 0; j < curRestriction.length; j++) {
                                                                    if (curRestriction[j]) {
                                                                        if (!hasRestriction) {
                                                                            curFilterString += "(";
                                                                        } else {
                                                                            curFilterString += "%20or%20";
                                                                        }
                                                                        if (curRestriction[j] === "NULL") {
                                                                            curFilterString += viewAttributeName + "%20eq%20null";
                                                                        } else if (curRestriction[j] === "NOT NULL") {
                                                                            curFilterString += viewAttributeName + "%20ne%20null";
                                                                        } else {
                                                                            curFilterString += "startswith(" + viewAttributeName + ",'" + encodeURL(curRestriction[j]) + "')";
                                                                        }
                                                                        hasRestriction = true;
                                                                    }
                                                                }
                                                                if (!hasRestriction) {
                                                                    curFilterString += viewAttributeName + "%20eq%20null";
                                                                } else {
                                                                    curFilterString += ")";
                                                                }
                                                            }
                                                        } else {
                                                            if (curRestriction === "NULL") {
                                                                curFilterString += viewAttributeName + "%20eq%20null";
                                                            } else if (curRestriction === "NOT NULL") {
                                                                curFilterString += viewAttributeName + "%20ne%20null";
                                                            } else {
                                                            curFilterString = addRestriction(curFilterString, "startswith(" + viewAttributeName + ",'" + encodeURL(curRestriction) + "')");
                                                        }
                                                        }
                                                        // for timestamp as atttribute type
                                                    } else if (that.attribSpecs[i].AttribTypeID === 8 ||
                                                        that.attribSpecs[i].AttribTypeID === 6) {
                                                        var date, day, month, year;
                                                        // date attribute: generate year(<attribute>) = year(restriction) and month(<attribute>) = month(restriction) and ... query
                                                        if (typeof curRestriction === "object" && Array.isArray(curRestriction)) {
                                                            if (restriction.bAndInEachRow) {
                                                                if (curRestriction.length > r) {
                                                                    if (length < curRestriction.length) {
                                                                        length = curRestriction.length;
                                                                    }
                                                                    if (curRestriction[r] === null) {
                                                                        // ignore null restriction
                                                                    } else {
                                                                        date = new Date(curRestriction[r]);
                                                                        day = date.getDate();
                                                                        month = date.getMonth() + 1;
                                                                        year = date.getFullYear();
                                                                        curFilterString = addRestriction(curFilterString,
                                                                            year.toString() + "%20eq%20year(" + viewAttributeName + ")%20and%20" +
                                                                            month.toString() + "%20eq%20month(" + viewAttributeName + ")%20and%20" +
                                                                            day.toString() + "%20eq%20day(" + viewAttributeName + ")");
                                                                    }
                                                                }
                                                            } else {
                                                                curFilterString = addRestriction(curFilterString, "");
                                                                hasRestriction = false;
                                                                for (j = 0; j < curRestriction.length; j++) {
                                                                    if (curRestriction[j]) {
                                                                        if (!hasRestriction) {
                                                                            curFilterString += "(";
                                                                        } else {
                                                                            curFilterString += "%20or%20";
                                                                        }
                                                                        date = new Date(curRestriction[j]);
                                                                        day = date.getDate();
                                                                        month = date.getMonth() + 1;
                                                                        year = date.getFullYear();
                                                                        curFilterString += year.toString() + "%20eq%20year(" + viewAttributeName + ")%20and%20" +
                                                                            month.toString() + "%20eq%20month(" + viewAttributeName + ")%20and%20" +
                                                                            day.toString() + "%20eq%20day(" + viewAttributeName + ")";
                                                                        hasRestriction = true;
                                                                    }
                                                                }
                                                                if (!hasRestriction) {
                                                                    curFilterString += viewAttributeName + "%20eq%20null";
                                                                } else {
                                                                    curFilterString += ")";
                                                                }
                                                            }
                                                        } else {
															if (curRestriction === "NULL") {
															    curFilterString = addRestriction(curFilterString,viewAttributeName + "%20eq%20null");
														    } else if (curRestriction === "NOT NULL") {
														        curFilterString = addRestriction(curFilterString, viewAttributeName + "%20ne%20null");
															} else {
																date = new Date(curRestriction);
																day = date.getDate();
																month = date.getMonth() + 1;
																year = date.getFullYear();
																curFilterString = addRestriction(curFilterString,
																	year.toString() + "%20eq%20year(" + viewAttributeName + ")%20and%20" +
																	month.toString() + "%20eq%20month(" + viewAttributeName + ")%20and%20" +
																	day.toString() + "%20eq%20day(" + viewAttributeName + ")");
															}
                                                        }
                                                    } else {
                                                        if (typeof curRestriction === "object") { //object
                                                            if (restriction.bAndInEachRow) {
                                                                if (curRestriction.length > r) {
                                                                    if (length < curRestriction.length) {
                                                                        length = curRestriction.length;
                                                                    }
                                                                    if (curRestriction[r] === null) {
                                                                        // ignore null restriction
                                                                    } else {
                                                                        curFilterString = addRestriction(curFilterString, viewAttributeName + AppData.replaceOdataFilter(curRestriction[r], isString));
                                                                    }
                                                                }
                                                            } else {
                                                                curFilterString = addRestriction(curFilterString, "");
                                                                hasRestriction = false;
                                                                for (j = 0; j < curRestriction.length; j++) {
                                                                    if (curRestriction[j]) {
                                                                        if (!hasRestriction) {
                                                                            curFilterString += "(";
                                                                        } else {
                                                                            curFilterString += "%20or%20";
                                                                        }
                                                                        if (curRestriction[j] === "NULL") {
                                                                            curFilterString += viewAttributeName + "%20eq%20null";
                                                                        } else if (curRestriction[j] === "NOT NULL") {
                                                                            curFilterString += viewAttributeName + "%20ne%20null";
                                                                        } else {
                                                                            curFilterString += viewAttributeName + AppData.replaceOdataFilter(curRestriction[j], isString);
                                                                        }
                                                                        hasRestriction = true;
                                                                    }
                                                                }
                                                                if (!hasRestriction) {
                                                                    curFilterString += viewAttributeName + "%20eq%20null";
                                                                } else {
                                                                    curFilterString += ")";
                                                                }
                                                            }
                                                        } else {
                                                            if ((that.attribSpecs[i].Function & 16384) &&
                                                                ((curRestriction === 0 || curRestriction === "0") && !restriction.bExact || curRestriction === null)) {
                                                                // ignore Entry 0 on INIT columns
                                                            } else {
                                                                // other attribute: generate <attribute> = <restriction> query
                                                                if (curRestriction === "NULL") {
                                                                    curFilterString = addRestriction(curFilterString, viewAttributeName + "%20eq%20null");
																} else if (curRestriction === "NOT NULL") {
																    curFilterString = addRestriction(curFilterString, viewAttributeName + "%20ne%20null");
                                                                } else {
																    curFilterString = addRestriction(curFilterString, viewAttributeName + AppData.replaceOdataFilter(curRestriction, isString));
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        if (curFilterString.length > 0) {
                                            if (restriction.bAndInEachRow && filterString.length > 0) {
                                                filterString += "%20or%20";
                                            }
                                            filterString += curFilterString;
                                        }
                                    }
                                }
                            }
                            Log.print(Log.l.trace, filterString);
                            complete(filterString);
                        } else {
                            Log.print(Log.l.error, "no data in AttribSpecs");
                            var err = { status: 500, statusText: "no data in AttribSpecs" };
                            error(err);
                        }
                    });
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @callback AppData.formatViewData~complete
             * @param {Object} response - JSON response object returned from database.
             * @description This handler is called after a successfull database operation.
             *  The select and selectNext functions will return the result set in an array of database records in the response.d.results sub-member of response. 
             *  The selectById and insert functions will return the current database record in the response.d member of response. 
             *  The update and deleteRecord functions will not return any database records.
             */
            /**
             * @callback AppData.formatViewData~error
             * @param {Object} errorResponse - Response object, code number or string returned in case or error.
             * @description This handler is called if an error occurs while database operations.
             */

            /**
             * @function select
             * @param {AppData.formatViewData~complete} complete - Success handler callback.
             * @param {AppData.formatViewData~error} error - Error handler callback.
             * @param {Object} restrictions - Object containing query by example attribute restrictions to be used in select statement.
             * @param {Object} [viewOptions] - Object containing options to be used in select statement.
             * @param {boolean} viewOptions.ordered - If true, the result set is in sort order as specified by the other options.
             * @param {string} viewOptions.orderAttribute - Attribute name to be used for sort order. If not specified, the primary key attribute will be used for sort order.
             * @param {boolean} viewOptions.desc - True, if the sort order should be descending.
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.formatViewData
             * @description Use this function to select a result set with the given select restrictions and view options.
             *  The function will return the result set in an array of database records in the response.d.results sub-member of response. 
             *  In remote database server connections via OData producer the result set is usually divided in pieces of about 100 rows per request.
             *  Use the function {@link AppData.getNextUrl} to retrieve an URL to scroll to the next part of the result set.
             */
            select: function (complete, error, restrictions, viewOptions, nextStmt, prevResults) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName + " formatId=" + this.formatId + " nextStmt=" + nextStmt);
                var that = this;
                var fncSelect;
                var filterString = null;
                that._pages = [];
                if (that._isLocal) {
                    fncSelect = function () {
                        var relationName;
                        if (that.formatId) {
                            relationName = that.relationName + "VIEW_" + that.formatId.toString();
                        } else {
                            relationName = that.relationName;
                        }
                        Log.print(Log.l.trace, "calling select: relationName=" + relationName);
                        var stmt;
                        if (nextStmt) {
                            stmt = nextStmt;
                        } else {
                            stmt = "SELECT * FROM \"" + relationName + "\"";
                            if (filterString && filterString.length > 0) {
                                stmt += " WHERE " + filterString;
                            }
                            if (viewOptions) {
                                // select all lines with order by
                                if (viewOptions.ordered) {
                                    var orderBy = " ORDER BY \"";
                                    if (viewOptions.orderAttribute) {
                                        orderBy += viewOptions.orderAttribute;
                                    } else {
                                        orderBy += that.pkName;
                                    }
                                    orderBy += "\"";
                                    if (viewOptions.desc) {
                                        orderBy += " DESC";
                                    }
                                    stmt += orderBy;
                                }
                            }
                            if (that._maxPageSize > 0) {
                                stmt += " LIMIT " + that._maxPageSize;
                            }
                        }
                        var values = [];
                        Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                        return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(res) {
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=SELECT");
                            var results = [];
                            var i, j;
                            if (res && res.rows) {
                                if (that.formatId) {
                                    for (i = 0; i < res.rows.length; i++) {
                                        results[i] = res.rows.item(i);
                                    }
                                } else {
                                    for (i = 0; i < res.rows.length; i++) {
                                        results[i] = that.viewRecordFromTableRecord(that, res.rows.item(i));
                                    }
                                }
                            }
                            var json = {
                                d: {
                                    results: results
                                }
                            }
                            if (that._maxPageSize > 0 && json.d && json.d.results) {
                                if (json.d.results.length > that._maxPageSize) {
                                    for (i = 0, j = 0; i < json.d.results.length; i += that._maxPageSize) {
                                        var page;
                                        if (i + that._maxPageSize < json.d.results.length) {
                                            page = {
                                                results: json.d.results.slice(i, i + that._maxPageSize),
                                                __next: "page://" + (j + 1).toString()
                                            }
                                        } else {
                                            page = {
                                                results: json.d.results.slice(i, json.d.results.length)
                                            }
                                            if (json.d.__next) {
                                                page.__next = json.d.__next;
                                            }
                                        }
                                        that._pages[j++] = page;
                                    }
                                    json.d = that._pages[0];
                                } else if (json.d.results.length === that._maxPageSize) {
                                    var posOffset = stmt.indexOf(" OFFSET ");
                                    if (posOffset > 0) {
                                        var offset = parseInt(stmt.substr(posOffset + 8)) + that._maxPageSize;
                                        Log.print(Log.l.info, "next offset=" + offset);
                                        json.d.__next = stmt.substr(0, posOffset) + " OFFSET " + offset;
                                    } else {
                                        Log.print(Log.l.info, "next offset=" + that._maxPageSize);
                                        json.d.__next = stmt + " OFFSET " + that._maxPageSize;
                                    }
                                }
                            }
                            if (prevResults) {
                                prevResults = prevResults.concat(json.d.results);
                                json.d.results = prevResults;
                            }
                            complete(json);
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (err) {
                            Log.print(Log.l.info, "xsql: SELECT error " + err);
                            error(err);
                        });
                    }
                } else {
                    fncSelect = function () {
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath;
                        if (that._isRinf) {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.relationName + "VIEW");
                            url += "/" + that.relationName + "VIEW";
                        } else if (that.viewRelationName) {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.viewRelationName);
                            url += "/" + that.viewRelationName;
                        } else if (that.formatId) {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.relationName + "VIEW_" + that.formatId.toString());
                            url += "/" + that.relationName + "VIEW_" + that.formatId.toString();
                        } else {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.relationName + "_ODataVIEW");
                            url += "/" + that.relationName + "_ODataVIEW";
                        }
                        url += "?$format=json";
                        if (filterString && filterString.length > 0) {
                            url += "&$filter=(" + filterString + ")";
                        }
                        if (viewOptions) {
                            // select all lines with order by
                            if (viewOptions.ordered) {
                                var orderBy = "&$orderby=";
                                if (viewOptions.orderAttribute) {
                                    orderBy += viewOptions.orderAttribute;
                                } else {
                                    orderBy += that.pkName;
                                }
                                if (viewOptions.desc) {
                                    orderBy += "%20desc";
                                }
                                url += orderBy;
                            }
                        }
                        var user = AppData.getOnlineLogin();
                        var password = AppData.getOnlinePassword();
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
                        Log.print(Log.l.info, "calling xhr method=GET url=" + url);
                        return WinJS.xhr(options).then(function xhrSuccess(response) {
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=GET");
                            try {
                                var json = jsonParse(response.responseText);
                                if (that._maxPageSize && json && json.d && json.d.results && json.d.results.length > that._maxPageSize) {
                                    for (var i = 0, j = 0; i < json.d.results.length; i += that._maxPageSize) {
                                        var page;
                                        if (i + that._maxPageSize < json.d.results.length) {
                                            page = {
                                                results: json.d.results.slice(i, i + that._maxPageSize),
                                                __next: "page://" + (j + 1).toString()
                                            }
                                        } else {
                                            page = {
                                                results: json.d.results.slice(i, json.d.results.length)
                                            }
                                            if (json.d.__next) {
                                                page.__next = json.d.__next;
                                            }
                                        }
                                        that._pages[j++] = page;
                                    }
                                    json.d = that._pages[0];
                                }
                                complete(json);
                            } catch (exception) {
                                Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                                var err = { status: 500, statusText: "data parse error " + (exception && exception.message) }
                                error(err);
                            }
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                        });
                    }
                }
                var ret;
                if (that._isLocal && nextStmt) {
                    ret = fncSelect();
                } else {
                    ret = this.extractRestriction(this, function(fs) {
                        Log.print(Log.l.trace, "extractRestriction: SUCCESS!");
                        filterString = fs;
                    }, error, restrictions).then(function() {
                        if (typeof filterString === "string") {
                            return fncSelect();
                        } else {
                            return WinJS.Promise.as();
                        }
                    });
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function getNextUrl
             * @param {Object} response - Response object from OData select.
             * @memberof AppBar.formatViewData
             * @description Use this function to retrieve the URL used to select next part of a forward scrollable result set.
             */
            getNextUrl: function (response) {
                Log.call(Log.l.trace, "AppData.formatViewData.");
                var url = null;
                if (response && response.d && response.d.__next) {
                    if (response.d.__next.substr(0, 7) === "page://" || response.d.__next.substr(0, 7) === "SELECT ") {
                        url = response.d.__next;
                    } else {
                        var pos = response.d.__next.indexOf("://");
                        if (pos > 0) {
                            var pos2 = response.d.__next.substr(pos + 3).indexOf("/");
                            if (pos2 > 0) {
                                var pos3 = response.d.__next.substr(pos + 3 + pos2 + 1).indexOf("/");
                                if (pos3 > 0) {
                                    url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath +
                                        response.d.__next.substr(pos + 3 + pos2 + 1 + pos3);
                                }
                            }
                        }
                    }
                    Log.ret(Log.l.trace, "next=" + url);
                } else {
                    Log.ret(Log.l.trace, "finished");
                }
                return url;
            },
            /**
             * @function selectNext
             * @param {AppData.formatViewData~complete} complete - Success handler callback.
             * @param {AppData.formatViewData~error} error - Error handler callback.
             * @param {Object[]} prevResults - Optional array of previously fetched records to be concatenated with currently fetched rows. 
             *  Set this param to null if no concatenation is needed.
             * @param {string} nextUrl - URL to be used for fetching necht rows from forward cursor as returned by the function {@link AppData.getNextUrl} from previous call of {@link AppData.formatViewData.select} rsp. {@link AppData.formatViewData.selectNext}. 
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.formatViewData
             * @description Use this function to select a result set with the given select restrictions and view options.
             *  The function will return the result set in an array of database records in the response.d.results sub-member of response. 
             */
            selectNext: function (complete, error, prevResults, nextUrl) {
                Log.call(Log.l.trace, "AppData.formatViewData.");
                var ret, i, j, page;
                var that = this;
                if (nextUrl) {
                    if (nextUrl.substr(0, 7) === "SELECT ") {
                        if (that._isLocal) {
                            ret = that.select(complete, error, null, null, nextUrl, prevResults);
                        } else {
                            ret = WinJS.Promise.as();
                        }
                    } else if (nextUrl.substr(0, 7) === "page://") {
                        i = parseInt(nextUrl.substr(7));
                        if (that._pages && that._pages[i]) {
                            page = that._pages[i];
                        } else {
                            page = {
                                results: []
                            }
                        }
                        var obj = {
                            d: page
                        }
                        ret = WinJS.Promise.as().then(function () {
                            if (obj && obj.d) {
                                if (prevResults) {
                                    prevResults = prevResults.concat(obj.d.results);
                                    obj.d.results = prevResults;
                                }
                                complete(obj);
                            } else {
                                var err = { status: 404, statusText: "no data found" };
                                error(err);
                            }
                        });
                    } else {
                        that._pages = [];
                        var user = AppData.getOnlineLogin();
                        var password = AppData.getOnlinePassword();
                        var options = {
                            type: "GET",
                            url: nextUrl,
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
                        Log.print(Log.l.info, "calling xhr method=GET url=" + nextUrl);
                        ret = WinJS.xhr(options).then(function xhrSuccess(response) {
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=GET");
                            try {
                                var json = jsonParse(response.responseText);
                                if (that._maxPageSize && json && json.d && json.d.results && json.d.results.length > that._maxPageSize) {
                                    for (i = 0, j = 0; i < json.d.results.length; i += that._maxPageSize) {
                                        if (i + that._maxPageSize < json.d.results.length) {
                                            page = {
                                                results: json.d.results.slice(i, i + that._maxPageSize),
                                                __next: "page://" + (j + 1).toString()
                                            }
                                        } else {
                                            page = {
                                                results: json.d.results.slice(i, json.d.results.length)
                                            }
                                            if (json.d.__next) {
                                                page.__next = json.d.__next;
                                            }
                                        }
                                        that._pages[j++] = page;
                                    }
                                    json.d = that._pages[0];
                                }
                                if (json && json.d) {
                                    if (prevResults) {
                                        prevResults = prevResults.concat(json.d.results);
                                        json.d.results = prevResults;
                                    }
                                    complete(json);
                                } else {
                                    var err = { status: 404, statusText: "no data found" };
                                    error(err);
                                }
                            } catch (exception) {
                                Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                                error({ status: 500, statusText: "data parse error " + (exception && exception.message) });
                            }
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                        });
                    }
                } else {
                    ret = WinJS.Promise.as().then(function () {
                        var err = { status: 500, statusText: "invalid data returned" };
                        error(err);
                    });
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function selectById
             * @param {AppData.formatViewData~complete} complete - Success handler callback.
             * @param {AppData.formatViewData~error} error - Error handler callback.
             * @param {number} recordId - Primary key value of the data record to select
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.formatViewData
             * @description Use this function to select a database record with the given recordId (primary key).
             *  The function will return the database record object in the response.d member of response. 
             */
            selectById: function (complete, error, recordId, progress) {
                var ret;
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName + " formatId=" + this.formatId + " recordId=" + recordId);
                var that = this;
                var fncSelectById;
                if (that._isLocal) {
                    fncSelectById = function() {
                        var relationName = that.relationName;
                        if (that.formatId) {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.relationName + "VIEW_" + that.formatId.toString());
                            relationName += "VIEW_" + that.formatId.toString();
                        }
                        var stmt = "SELECT * FROM \"" + relationName + "\" WHERE \"" + that.pkName + "\"=?";
                        var values = [recordId];
                        Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                        return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(res) {
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=SELECT");
                            if (res && res.rows && res.rows.length > 0) {
                                var result;
                                if (that.formatId) {
                                    result = res.rows.item(0);
                                } else {
                                    result = that.viewRecordFromTableRecord(that, res.rows.item(0));
                                }
                                var json = {
                                    d: result
                                }
                                complete(json);
                            } else {
                                var err = { status: 404, statusText: "no data found in " + that.relationName + " for Id " + recordId };
                                error(err);
                            }
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function(err) {
                            error(err);
                        });
                    }
                } else {
                    fncSelectById = function() {
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath;
                        if (that._isRinf) {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.relationName + "VIEW");
                            url += "/" + that.relationName + "VIEW";
                        } else if (that.viewRelationName) {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.viewRelationName);
                            url += "/" + that.viewRelationName;
                        } else if (that.formatId) {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.relationName + "VIEW_" + that.formatId.toString());
                            url += "/" + that.relationName + "VIEW_" + that.formatId.toString();
                        } else {
                            Log.print(Log.l.trace, "calling select: relationName=" + that.relationName + "_ODataVIEW");
                            url += "/" + that.relationName + "_ODataVIEW";
                        }
                        if (typeof recordId === "undefined" || !recordId) {
                            error({
                                status: -1,
                                statusText: "missing recordId"
                            });
                            Log.ret(Log.l.error, "error: missing recordId");
                            return null;
                        }
                        // HTTP-GET request to remote server for JSON file response
                        Log.print(Log.l.trace, "calling select recordId=" + recordId.toString());
                        // select one line via id
                        url += "(" + recordId.toString() + ")?$format=json";
                        var user = AppData.getOnlineLogin();
                        var password = AppData.getOnlinePassword();
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
                        Log.print(Log.l.info, "calling xhr method=GET url=" + url);
                        return WinJS.xhr(options).then(function xhrSuccess(response) {
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=GET");
                            try {
                                var obj = jsonParse(response.responseText);
                                if (obj && obj.d) {
                                    complete(obj);
                                } else {
                                    var err = { status: 404, statusText: "no data found in " + that.relationName + " for Id " + recordId };
                                    error(err);
                                }
                            } catch (exception) {
                                Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                                error({ status: 500, statusText: "data parse error " + (exception && exception.message) });
                            }
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (errorResponse) {
                            if (errorResponse && errorResponse.status === 404) {
                                Log.print(Log.l.info, "record not found in " + that.relationName + " for Id " + recordId );
                            } else {
                                Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            }
                            error(errorResponse);
                            return WinJS.Promise.as();
                        }, progress);
                    }
                }
                if (!that.attribSpecs) {
                    ret = that.getAttribSpecs(that, function () {
                        Log.print(Log.l.trace, "getAttribSpecs: SELECT success");
                    }, complete, error).then(function () {
                        if (that.attribSpecs) {
                            return fncSelectById();
                        } else {
                            var curerr = { status: 404, statusText: "cannot extract attribSpecs" };
                            error(curerr);
                            return WinJS.Promise.as();
                        }
                    });
                } else {
                    ret = fncSelectById();
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function deleteRecord
             * @param {AppData.formatViewData~complete} complete - Success handler callback.
             * @param {AppData.formatViewData~error} error - Error handler callback.
             * @param {number} recordId - Primary key value of the data record to delete
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.formatViewData
             * @description Use this function to delete a row in a table with the given record id (primary key).
             *  The function will not return a database record in response. 
             */
            deleteRecord: function (complete, error, recordId) {
                var ret;
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName + " recordId=" + recordId);
                if (this._isRinf && !this._isRepl) {
                    error({ status: 405, statusText: "Method not allowed on this type of relation!" });
                    Log.ret(Log.l.error);
                    return WinJS.Promise.as();
                }
                var that = this;
                var fncDeleteRecord = function() {
                    if (that._isLocal) {
                        var primKeyId = that.pkName;
                        var stmt = "DELETE FROM \"" + that.relationName + "\" WHERE \"" + primKeyId + "\"=?";
                        var values = [recordId];
                        Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                        ret = SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(res) {
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=DELETE rowsAffected=" + res.rowsAffected);
                            var prevRecId = AppData.getRecordId(that.relationName);
                            if (prevRecId === recordId) {
                                AppData.setRecordId(that.relationName, null);
                            }
                            complete({});
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (curerr) {
                            Log.print(Log.l.error, "xsql: DELETE returned " + curerr);
                            error(curerr);
                        });
                    } else {
                        Log.print(Log.l.trace, "calling deleteRecord: relationName=" + that.relationName + "_ODataVIEW recordId=" + recordId.toString());
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath;
                        url += "/" + that.relationName + "_ODataVIEW(" + recordId.toString() + ")";
                        var user = AppData.getOnlineLogin();
                        var password = AppData.getOnlinePassword();
                        var options = {
                            type: "DELETE",
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
                        Log.print(Log.l.info, "calling xhr method=DELETE url=" + url);
                        ret = WinJS.xhr(options).then(function xhrSuccess(response) {
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=DELETE");
                            var prevRecId = AppData.getRecordId(that.relationName);
                            if (prevRecId === recordId) {
                                AppData.setRecordId(that.relationName, null);
                            }
                            try {
                                complete(response);
                            } catch (exception) {
                                Log.print(Log.l.error, "delete return handler error " + (exception && exception.message));
                                var err = { status: 500, statusText: "delete return handler error " + (exception && exception.message) };
                                error(err);
                            }
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                            return WinJS.Promise.as();
                        });
                    }
                    return ret;
                };
                if (!that.attribSpecs) {
                    ret = that.getAttribSpecs(that, function () {
                        Log.print(Log.l.trace, "getAttribSpecs: SELECT success");
                    }, complete, error).then(function () {
                        if (that.attribSpecs) {
                            return fncDeleteRecord();
                        } else {
                            var curerr = { status: 404, statusText: "cannot extract attribSpecs" };
                            error(curerr);
                            return WinJS.Promise.as();
                        }
                    });
                } else {
                    ret = fncDeleteRecord();
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function update
             * @param {AppData.formatViewData~complete} complete - Success handler callback.
             * @param {AppData.formatViewData~error} error - Error handler callback.
             * @param {number} recordId - Primary key value of the data record to delete
             * @param {Object} viewRecord - Database record object containing the attribute values to update 
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.formatViewData
             * @description Use this function to update a row in a table with the given record id and attribute values.
             *  The function will not return a database record in response. 
             */
            update: function (complete, error, recordId, viewRecord, headers) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName + " formatId=" + this.formatId + " recordId=" + recordId);
                if (this._isRinf && !this._isRepl) {
                    error({ status: 405, statusText: "Method not allowed on this type of relation!" });
                    Log.ret(Log.l.error);
                    return WinJS.Promise.as();
                }
                var that = this;
                var tableRecord = null;
                var updateTableRecord = function () {
                    if (that._isLocal) {
                        var primKeyId = that.pkName;
                        if (typeof tableRecord[primKeyId] !== "undefined") {
                            delete tableRecord[primKeyId];
                        }
                        var values = [];
                        var stmt = "UPDATE \"" + that.relationName + "\"";
                        var stmtValues = null;
                        var i;
                        for (i = 0; i < that.attribSpecs.length; i++) {
                            var baseAttributeName = that.attribSpecs[i].BaseAttributeName;
                            if (baseAttributeName &&
                                typeof tableRecord[baseAttributeName] !== "undefined") {
                                if (!stmtValues) {
                                    stmtValues = " SET ";
                                } else {
                                    stmtValues += ",";
                                }
                                stmtValues += "\"" + baseAttributeName + "\"=?";
                                values.push(tableRecord[baseAttributeName]);
                            }
                        }
                        if (stmtValues) {
                            values.push(recordId);
                            stmt += stmtValues + " WHERE \"" + primKeyId + "\"=?";
                            Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                            return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(res) {
                                Log.call(Log.l.trace, "AppData.formatViewData.", "method=UPDATE rowsAffected=" + res.rowsAffected);
                                complete({});
                                Log.ret(Log.l.trace);
                                return WinJS.Promise.as();
                            }, function (curerr) {
                                Log.print(Log.l.error, "xsql: UPDATE returned " + curerr);
                                error(curerr);
                            });
                        } else {
                            Log.print(Log.l.trace, "nothing to update!");
                            complete({});
                            return WinJS.Promise.as();
                        }
                    } else {
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath;
                        url += "/" + that.relationName + "_ODataVIEW(" + recordId.toString() + ")";
                        var options = {
                            type: "PUT",
                            url: url,
                            data: JSON.stringify(tableRecord)
                        };
                        if (typeof headers === "object") {
                            options.headers = headers;
                        } else {
                            options.headers = {};
                        }
                        options.customRequestInitializer = function(req) {
                            if (typeof req.withCredentials !== "undefined") {
                                req.withCredentials = true;
                            }
                        };
                        options.headers["Accept"] = "application/json";
                        options.headers["Content-Type"] = "application/json";
                        options.user = AppData.getOnlineLogin();
                        options.password = AppData.getOnlinePassword();
                        options.headers["Authorization"] = "Basic " + btoa(options.user + ":" + options.password);
                        Log.print(Log.l.info, "calling xhr method=PUT url=" + url);
                        return WinJS.xhr(options).then(function xhrSuccess(response) {
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=PUT");
                            try {
                                complete(response);
                            } catch (exception) {
                                Log.print(Log.l.error, "update return handler error " + (exception && exception.message));
                                var err = { status: 500, statusText: "update return handler error " + (exception && exception.message) };
                                error(err);
                            }
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function(errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                        });
                    }
                };
                var ret = that.extractTableRecord(that, function(tr) {
                    Log.print(Log.l.trace, "extractTableRecord: SUCCESS!");
                    tableRecord = tr;
                }, error, viewRecord).then(function () {
                    if (tableRecord) {
                        return updateTableRecord();
                    } else {
                        return WinJS.Promise.as();
                    }
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function insert
             * @param {AppData.formatViewData~complete} complete - Success handler callback.
             * @param {AppData.formatViewData~error} error - Error handler callback.
             * @param {Object} viewRecord - Database record object containing the attribute values to insert
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.formatViewData
             * @description Use this function to select a database record. 
             *  If the bWithId parameter is false (default), a new record id will be generated in the database.
             *  The function will return the inserted database record object including the new primary key value in the response.d member of response. 
             */
            insert: function (complete, error, viewRecord, headers, bWithId) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName + " formatId=" + this.formatId + " bWithId=" + bWithId);
                if (this._isRinf && !this._isRepl) {
                    error({ status: 405, statusText: "Method not allowed on this type of relation!" });
                    Log.ret(Log.l.error);
                    return WinJS.Promise.as();
                }
                var that = this;
                var tableRecord;
                var insertTableRecord = function () {
                    var primKeyId;
                    if (that._isLocal) {
                        if (!bWithId) {
                            primKeyId = that.pkName;
                            if (typeof tableRecord[primKeyId] !== "undefined") {
                                delete tableRecord[primKeyId];
                            }
                        }
                        var values = [];
                        var stmt = "INSERT INTO \"" + that.relationName + "\"";
                        var stmtValues = null;
                        var i;
                        for (i = 0; i < that.attribSpecs.length; i++) {
                            var baseAttributeName = that.attribSpecs[i].BaseAttributeName;
                            if (baseAttributeName &&
                                typeof tableRecord[baseAttributeName] !== "undefined") {
                                if (!stmtValues) {
                                    stmt += "(";
                                    stmtValues = ") VALUES (";
                                } else {
                                    stmt += ",";
                                    stmtValues += ",";
                                }
                                stmt += "\"" + baseAttributeName + "\"";
                                stmtValues += "?";
                                values.push(tableRecord[baseAttributeName]);
                            }
                        }
                        if (stmtValues) {
                            stmtValues += ")";
                            stmt += stmtValues;
                        }
                        var recordId = 0;
                        var result = null;
                        Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                        return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(insertRes) {
                            recordId = insertRes.insertId;
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=INSERT recordId=" + recordId);
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function(curerr) {
                            Log.print(Log.l.error, "xsql: INSERT returned " + curerr);
                            error(curerr);
                            return WinJS.Promise.as();
                        }).then(function() {
                            if (recordId) {
                                var relationName = that.relationName;
                                if (that.formatId) {
                                    relationName += "VIEW_" + that.formatId.toString();
                                }
                                stmt = "SELECT * FROM \"" + relationName + "\" WHERE \"" + that.pkName + "\" = " + recordId.toString();
                                values = [];
                                Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                                return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(res) {
                                    Log.call(Log.l.trace, "AppData.formatViewData.", "method=SELECT");
                                    if (res && res.rows && res.rows.length > 0) {
                                        if (that.formatId) {
                                            result = res.rows.item(0);
                                        } else {
                                            result = that.viewRecordFromTableRecord(that, res.rows.item(0));
                                        }
                                        var json = {
                                            d: result
                                        }
                                        complete(json);
                                    } else {
                                        Log.print(Log.l.error, "xsql: no data found in " + that.relationName + " for Id " + recordId);
                                        var curerr = { status: 404, statusText: "no data found in " + that.relationName + " for Id " + recordId };
                                        error(curerr);
                                    }
                                    Log.ret(Log.l.trace);
                                    return WinJS.Promise.as();
                                }, function (curerr) {
                                    Log.print(Log.l.error, "xsql: SELECT returned " + curerr);
                                    error(curerr);
                                });
                            } else {
                                var err = { status: 404, statusText: "no data found" };
                                Log.print(Log.l.error, "xsql: INSERT returned " + err);
                                error(err);
                                return WinJS.Promise.as();
                            }
                        });
                    } else {
                        if (!bWithId) {
                            primKeyId = that.relationName + "VIEWID";
                            if (typeof tableRecord[primKeyId] !== "undefined") {
                                delete tableRecord[primKeyId];
                            }
                        }
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.getOnlinePath(that._isRegister);
                        url += "/" + that.relationName + "_ODataVIEW";
                        var options = {
                            type: "POST",
                            url: url,
                            data: JSON.stringify(tableRecord)
                        };
                        if (typeof headers === "object") {
                            options.headers = headers;
                        } else {
                            options.headers = {};
                        }
                        options.customRequestInitializer = function (req) {
                            if (typeof req.withCredentials !== "undefined") {
                                req.withCredentials = true;
                            }
                        };
                        options.headers["Accept"] = "application/json";
                        options.headers["Content-Type"] = "application/json";
                        options.user = AppData.getOnlineLogin(that._isRegister);
                        options.password = AppData.getOnlinePassword(that._isRegister);
                        options.headers["Authorization"] = "Basic " + btoa(options.user + ":" + options.password);
                        Log.print(Log.l.info, "calling xhr method=POST url=" + url);
                        return WinJS.xhr(options).then(function xhrSuccess(response) {
                            var err;
                            Log.call(Log.l.trace, "AppData.formatViewData.", "method=POST");
                            try {
                                var obj = jsonParse(response.responseText);
                                if (obj && obj.d) {
                                    complete(obj);
                                } else {
                                    err = { status: 404, statusText: "no data found" };
                                    error(err);
                                }
                            } catch (exception) {
                                Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                                err = { status: 500, statusText: "data parse error " + (exception && exception.message) };
                                error(err);
                            }
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function(errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                        });
                    }
                };
                var ret = that.extractTableRecord(that, function (tr) {
                    Log.print(Log.l.trace, "extractTableRecord: SUCCESS!");
                    tableRecord = tr;
                }, error, viewRecord).then(function() {
                    if (tableRecord) {
                        return insertTableRecord();
                    } else {
                        return WinJS.Promise.as();
                    }
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function insertWithId
             * @param {AppData.formatViewData~complete} complete - Success handler callback.
             * @param {AppData.formatViewData~error} error - Error handler callback.
             * @param {Object} viewRecord - Database record object containing the attribute values to insert
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.formatViewData
             * @description Use this function to select a database record with the given primary key value.
             *  The function will return the inserted database record object in the response.d member of response. 
             */
            insertWithId: function (complete, error, viewRecord, headers) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName + " formatId=" + this.formatId);
                var ret = this.insert(complete, error, viewRecord, headers, true);
                Log.ret(Log.l.trace);
                return ret;
            },
            fetchNext: function (that, results, next, complete, error, recordId) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "next=" + next);
                var user = AppData.getOnlineLogin();
                var password = AppData.getOnlinePassword();
                var options = {
                    type: "GET",
                    url: next,
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
                Log.print(Log.l.info, "calling xhr method=GET url=" + next);
                var ret = WinJS.xhr(options).then(function xhrSuccess(response) {
                    Log.call(Log.l.trace, "AppData.formatViewData.", "method=GET");
                    try {
                        var obj = jsonParse(response.responseText);
                        if (obj && obj.d) {
                            results = results.concat(obj.d.results);
                            var next = that.getNextUrl(obj);
                            if (next) {
                                return that.fetchNext(that, results, next, complete, error, recordId);
                            } else {
                                obj.d.results = results;
                                complete(obj);
                            }
                        } else {
                            var err = { status: 404, statusText: "no data found" };
                            error(err);
                        }
                    } catch (exception) {
                        Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                        error({ status: 500, statusText: "data parse error " + (exception && exception.message) });
                    }
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }, function (errorResponse) {
                    Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                    error(errorResponse);
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            fetchAll: function (that, obj, complete, error, recordId) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "");
                var retNext;
                var next = that.getNextUrl(obj);
                if (next) {
                    retNext = that.fetchNext(that, obj.d.results, next, complete, error, recordId);
                } else {
                    complete(obj);
                    retNext = WinJS.Promise.as();
                }
                Log.ret(Log.l.trace);
                return retNext;
            },
            selectAll: function (complete, error, restrictions, viewOptions) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName);
                var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath;
                url += "/LOAD" + this.relationName + "?$format=json";
                Log.print(Log.l.trace, "calling select: relationName=LOAD" + this.relationName);
                var that = this;
                var ret = this.extractRestriction(this, function (filterString) {
                    if (filterString && filterString.length > 0) {
                        url += "&$filter=(" + filterString + ")";
                    }
                    if (viewOptions) {
                        // select all lines with order by
                        if (viewOptions.ordered) {
                            var orderBy = "&$orderby=";
                            if (viewOptions.orderAttribute) {
                                orderBy += viewOptions.orderAttribute;
                            } else {
                                orderBy += that.pkName;
                            }
                            if (viewOptions.desc) {
                                orderBy += "%20desc";
                            }
                            url += orderBy;
                        }
                    }
                    var user = AppData.getOnlineLogin();
                    var password = AppData.getOnlinePassword();
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
                    Log.print(Log.l.info, "calling xhr method=GET url=" + url);
                    return WinJS.xhr(options).then(function xhrSuccess(response) {
                        Log.call(Log.l.trace, "AppData.formatViewData.", "method=GET");
                        try {
                            var obj = jsonParse(response.responseText);
                            Log.ret(Log.l.trace);
                            return that.fetchAll(that, obj, complete, error);
                        } catch (exception) {
                            Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                            var err = { status: 500, statusText: "data parse error " + (exception && exception.message) };
                            error(err);
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }
                    }, function (errorResponse) {
                        Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                        error(errorResponse);
                    });
                }, error, restrictions);
                Log.ret(Log.l.trace);
                return ret;
            },
            dbInsert: function (that, complete, error, results, restriction) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + that.relationName + " formatId=" + that.formatId);
                var ret;
                if (!that.attribSpecs) {
                    ret = that.getAttribSpecs(that, that.dbInsert, complete, error, results, restriction);
                } else {
                    ret = new WinJS.Promise.as().then(function() {
                        var stmt = "INSERT INTO \"" + that.relationName + "\"(";
                        var stmtValues = ") VALUES (";
                        var i;
                        for (i = 0; i < that.attribSpecs.length; i++) {
                            if (that.attribSpecs[i].BaseAttributeName) {
                                if (i > 0) {
                                    stmt += ",";
                                    stmtValues += ",";
                                }
                                stmt += "\"" + that.attribSpecs[i].BaseAttributeName + "\"";
                                stmtValues += "?";
                            }
                        }
                        stmtValues += ")";
                        stmt += stmtValues;
                        Log.print(Log.l.trace, "configViewData.dbInsert: " + stmt);
                        var batch = [];
                        for (var j = 0; j < results.length; j++) {
                            var values = [];
                            var row = results[j];
                            for (i = 0; i < that.attribSpecs.length; i++) {
                                if (that.attribSpecs[i].BaseAttributeName) {
                                    var value = null;
                                    if (typeof row[that.attribSpecs[i].Name] !== "undefined") {
                                        value = row[that.attribSpecs[i].Name];
                                    } else if (that.attribSpecs[i].Function & 2048) { // primary key flag
                                        // use fallback for pk-name of bulk inserts
                                        if (typeof row[that.relationName + "VIEWID"] !== "undefined") {
                                            value = row[that.relationName + "VIEWID"];
                                        } else if (typeof row[that.relationName + "ID"] !== "undefined") {
                                            value = row[that.relationName + "ID"];
                                        }
                                    }
                                    values.push(value);
                                }
                            }
                            var exec = [];
                            exec.push(stmt);
                            exec.push(values);
                            batch.push(exec);
                        }
                        AppData._db.sqlBatch(batch, function () {
                            Log.print(Log.l.trace, "configViewData.dbInsert: " + that.relationName + " success!");
                            complete();
                        }, function (curerr) {
                            Log.print(Log.l.error, "configViewData.dbInsert: sqlBatch " + curerr);
                            error(curerr);
                        });
                        return WinJS.Promise.as();
                    });
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            getRecordId: function (record) {
                var ret = null;
                if (record) {
                    var primKeyId;
                    if (this._isLocal) {
                        primKeyId = this.pkName;
                    } else {
                        primKeyId = this.relationName + "VIEWID";
                    }
                    ret = record[primKeyId];
                }
                return ret;
            }
        }),
        /**
         * @function getFormatView
         * @memberof AppData
         * @param {string} relationName - Name of a database table.
         * @param {number} formatId - Number of a format view to be used to display data in the app UI, e.g. in forms or list views.
         * @param {boolean} [isLocal] - True, if the relation object should represent a table or view in local SQLite storage. 
         *  False, if the relation object should represent a table or view on the database server to be accessed via OData. Default: undefined
         * @param {boolean} [isRegister] - True, if the relation object should represent table or view is used in registration user context. Default: false
         * @param {boolean} [isRepl] - True, if the relation object should represent table or view is used for background data replication. Default: false
         * @returns {AppData.formatViewData} Newly created or already cached database interface object.
         * @description Use this function to retrieve database relation interface objects of type {@link AppData.formatViewData} to select data from database tables or views and store data in database tables.
         *  If a format view number is specified the cossresponding view of name <relationName>VIEW_<formatId> is used to retrieve data for displaying in the app UI, e.g. in forms or list views.
         *  Use formatId=0 to access a database table with the given name.
         * 
         *  If the isLocal parameter is undefined, the formatViewData object represents a local SQLite storage object if the table or view exists is configured to be a local.
         *  This willl be selected automatically from ReplicationSpec configuration metadata.
         * 
         *  There is a primary key attribute of type number to select database records by record id in each table or view.
         *  You can use the formatViewData.pkName property to retrieve the name of this attribute.
         */
        getFormatView: function (relationName, formatId, isLocal, isRegister, isRepl) {
            var ret = null;
            if (!formatId) {
                // handle undefined or null value!
                formatId = 0;
            }
            if (typeof isLocal !== "boolean") {
                isLocal = AppData.isLocalRelation(relationName);
            }
            if (typeof isRegister !== "boolean") {
                isRegister = false;
            }
            if (typeof isRepl !== "boolean") {
                isRepl = false;
            }
            Log.call(Log.l.trace, "AppData.", "relationName=" + relationName + " formatId=" + formatId + " isLocal=" + isLocal);
            for (var i = 0; i < AppData._formatViews.length; i++) {
                var formatView = AppData._formatViews[i];
                if (formatView.relationName === relationName && formatView.formatId === formatId && formatView.isLocal === isLocal && formatView.isRegister === isRegister && formatView.isRepl === isRepl) {
                    ret = formatView;
                    break;
                }
            }
            if (!ret) {
                Log.print(Log.l.info, "getFormatView: create new getFormatView(relationName=" + relationName + ",formatId=" + formatId + ",isLocal=" + isLocal + ",isRegister=" + isRegister + ",isRepl=" + isRepl + ")");
                ret = new AppData.formatViewData(relationName, formatId, isLocal, isRegister, isRepl);
                AppData._formatViews.push(ret);
            }
            Log.ret(Log.l.trace);
            return ret;
        },
        /**
         * @class lgntInitData 
         * @memberof AppData
         * @param {string} relationName - Name of a database table.
         * @param {boolean} [isLocal] - True, if the relation object should represent a table or view in local SQLite storage. 
         *  False, if the relation object should represent a table or view on the database server to be accessed via OData. Default: undefined
         * @param {boolean} [isRegister] - True, if the relation object should represent table or view is used in registration user context. Default: false
         * @description This class is used by the framework to select data from language specific database value list tables, usually id/title pairs.
         *  Value lists can be used to prefill list controls in forms, like e.g. comboboxes or listboxes (HTML select elements) and arrays of checkboxes or radioboxes.
         *  Once selected the result set is cached until the cache is cleared by calling the function AppData.lgntInitData.clear or the active language setting is changed.
         *
         *  If the isLocal parameter is undefined, the lgntInitData object represents a local SQLite storage object if the table or view exists is configured to be a local.
         *  This will be selected automatically from ReplicationSpec configuration metadata.
         * 
         *  You can use the lgntInitData.map and lgntInitData.results properties to access the cached result set and map between list index and id of the list entry.
         * 
         *  Do not use this constructor to create database interface objects. Use the function {@link AppData.getLgntInit} instead!
         */
        lgntInitData: WinJS.Class.define(function lgntInitData(relationName, isLocal, isRegister) {
            Log.call(Log.l.trace, "AppData.", "relationName=" + relationName + " isLocal=" + isLocal + " isRegister=" + isRegister);
            this._relationName = relationName;
            if (typeof isRegister === "boolean") {
                this._isRegister = isRegister;
            } else {
                this._isRegister = false;
            }
            if (this._relationName.substr(0, 4) === "LGNT") {
                this._baseRelationName = this._relationName.substr(4);
            } else {
                this._baseRelationName = this._relationName;
            }
            this._map = [];
            this._results = [];
            if (typeof isLocal === "boolean") {
                this._isLocal = isLocal;
            } else {
                this._isLocal = AppData.isLocalRelation(relationName);
            }
            Log.ret(Log.l.trace);
        }, {
            _isLocal: false,
            isLocal: {
                get: function () {
                    return this._isLocal;
                }
            },
            _isRegister: false,
            isRegister: {
                get: function () {
                    return this._isRegister;
                }
            },
            db: {
                get: function () {
                    return AppData._db;
                }
            },
            _relationName: null,
            _baseRelationName: null,
            /**
             * @property {string} relationName - Name of database table
             * @memberof AppData.lgntInitData
             * @description Read-only. Retrieves the name of the database table connected to the current AppData.lgntInitData object
             */
            relationName: {
                get: function() {
                    return this._relationName;
                }
            },
            baseRelationName: {
                get: function () {
                    return this._baseRelationName;
                }
            },
            _oDataPkName: null,
            _pkName: null,
            /**
             * @property {string} pkName - Column name of primary key
             * @memberof AppData.lgntInitData
             * @description Read-only. Retrieves the name of the primary key attribute in the relation object
             */
            pkName: {
                get: function () {
                    if (!this._pkName && this._attribSpecs) {
                        for (var i = 0; i < this._attribSpecs.length; i++) {
                            var attribSpec = this._attribSpecs[i];
                            if (attribSpec.Function & 2048) { // primary key flag
                                this._pkName = attribSpec.Name;
                                this._oDataPkName = attribSpec.ODataAttributeName;
                                break;
                            }
                        }
                    }
                    return this._pkName;
                }
            },
            /**
             * @property {string} oDataPkName - Column name of primary key in OData view
             * @memberof AppData.formatViewData
             * @description Read-only. Retrieves the name of the primary key attribute in the OData view
             */
            oDataPkName: {
                get: function () {
                    if (!this._oDataPkName && this._attribSpecs) {
                        for (var i = 0; i < this._attribSpecs.length; i++) {
                            var attribSpec = this._attribSpecs[i];
                            if (attribSpec.Function & 2048) { // primary key flag
                                this._pkName = attribSpec.Name;
                                this._oDataPkName = attribSpec.ODataAttributeName;
                                break;
                            }
                        }
                    }
                    return this._oDataPkName;
                }
            },
            /**
             * @function clear
             * @memberof AppData.lgntInitData
             * @description Use this function to free the cached value list results and map array.
             */
            clear: function () {
                this._map = [];
                this._results = [];
            },
            /**
             * @property {number[]} map - Array of list indices to map id to the current index in the results
             * @memberof AppData.lgntInitData
             * @description Read-only. Use this property to map between id and index in the results.
             */
            map: {
                get:function() {
                    return this._map;
                }
            },
            /**
             * @property {Object[]} results - Array of value list items
             * @memberof AppData.lgntInitData
             * @description Read-only. Use this property to access the cachec list value results.
             */
            results: {
                get: function () {
                    return this._results;
                }
            },
            _attribSpecs: null,
            /**
             * @property {Object[]} attribSpecs - Array of attribute spec data records.
             * @memberof AppData.lgntInitData
             * @description Read-only. Retrieves the attribute specs of the list value result items.
             */
            attribSpecs: {
                get: function () {
                    return this._attribSpecs;
                }
            },
            getNextUrl: function (response) {
                Log.call(Log.l.trace, "AppData.lgntInitData.");
                var url = null;
                if (response && response.d && response.d.__next) {
                    var pos = response.d.__next.indexOf("://");
                    if (pos > 0) {
                        var pos2 = response.d.__next.substr(pos + 3).indexOf("/");
                        if (pos2 > 0) {
                            var pos3 = response.d.__next.substr(pos + 3 + pos2 + 1).indexOf("/");
                            if (pos3 > 0) {
                                url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath +
                                    response.d.__next.substr(pos + 3 + pos2 + 1 + pos3);
                            }
                        }
                    }
                    Log.ret(Log.l.trace, "next=" + url);
                } else {
                    Log.ret(Log.l.trace, "finished");
                }
                return url;
            },
            fetchNextAttribSpecs: function (that, results, next, followFunction, complete, error, param) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "next=" + next);
                var user = AppData.getOnlineLogin(that._isRegister);
                var password = AppData.getOnlinePassword(that._isRegister);
                var options = {
                    type: "GET",
                    url: next,
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
                Log.print(Log.l.info, "calling xhr method=GET url=" + next);
                var ret = WinJS.xhr(options).then(function xhrSuccess(response) {
                    Log.call(Log.l.trace, "AppData.lgntInitData.", "method=GET");
                    try {
                        var obj = jsonParse(response.responseText);
                        if (obj && obj.d) {
                            results = results.concat(obj.d.results);
                            var next = that.getNextUrl(obj);
                            if (next) {
                                return that.fetchNextAttribSpecs(that, results, next, followFunction, complete, error, param);
                            } else {
                                that._attribSpecs = results;
                                followFunction(that, complete, error, param);
                            }
                        } else {
                            var err = { status: 404, statusText: "no data found" };
                            error(err);
                        }
                    } catch (exception) {
                        Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                        error({ status: 500, statusText: "data parse error " + (exception && exception.message) });
                    }
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }, function (errorResponse) {
                    Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                    error(errorResponse);
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            fetchAllAttribSpecs: function (that, obj, followFunction, complete, error, param) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "");
                var retNext;
                var next = that.getNextUrl(obj);
                if (next) {
                    retNext = that.fetchNextAttribSpecs(that, obj.d.results, next, followFunction, complete, error, param);
                } else {
                    if (obj && obj.d) {
                        that._attribSpecs = obj.d.results;
                    }
                    followFunction(that, complete, error, param);
                    retNext = WinJS.Promise.as();
                }
                Log.ret(Log.l.trace);
                return retNext;
            },
            getAttribSpecs: function (that, followFunction, complete, error, param) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "relationName=" + that.relationName);
                var ret;
                var loadAttribSpecs = function () {
                    var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath +
                        "/AttribSpecExtView?$filter=(RelationName%20eq%20'" + that.relationName + "')&$format=json&$orderby=AttributeIDX";
                    var user = AppData.getOnlineLogin(that._isRegister);
                    var password = AppData.getOnlinePassword(that._isRegister);
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
                    Log.print(Log.l.info, "calling xhr method=GET url=" + url);
                    return WinJS.xhr(options).then(function xhrSuccess(responseAttribSpec) {
                        Log.call(Log.l.trace, "AppData.lgntInitData.", "method=GET");
                        try {
                            var json = jsonParse(responseAttribSpec.responseText);
                            Log.ret(Log.l.trace);
                            return that.fetchAllAttribSpecs(that, json, followFunction, complete, error, param);
                            //if (json && json.d) {
                            //    that._attribSpecs = json.d.results;
                            //}
                            //return followFunction(that, complete, error, param);
                        } catch (exception) {
                            Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                            error({ status: 500, statusText: "AttribSpecExtView parse error " + (exception && exception.message) });
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }
                    }, function (errorResponse) {
                        Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                        error(errorResponse);
                    });
                }
                if (that._isLocal && AppData._dbInit) {
                    ret = AppData._dbInit.getAttribSpecs(AppData._dbInit, that.relationName, function (results) {
                        that._attribSpecs = results;
                        return followFunction(that, complete, error, param);
                    }, function (err) {
                        error(err);
                    });
                } else {
                    ret = loadAttribSpecs();
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            viewRecordFromTableRecord: function (that, tableRecord) {
                var viewRecord = {};
                if (tableRecord && that.attribSpecs && that.attribSpecs.length > 0) {
                    for (var i = 0; i < that.attribSpecs.length; i++) {
                        var baseAttributeName = that.attribSpecs[i].BaseAttributeName;
                        if (baseAttributeName && typeof tableRecord[baseAttributeName] !== "undefined") {
                            var viewAttributeName = that.attribSpecs[i].ODataAttributeName;
                            Log.print(Log.l.trace, viewAttributeName + ": " + tableRecord[baseAttributeName]);
                            viewRecord[viewAttributeName] = tableRecord[baseAttributeName];
                        }
                    }
                }
                return viewRecord;
            },
            extractTableRecord: function (that, complete, error, viewRecord, bInitTable) {
                var ret;
                Log.call(Log.l.trace, "AppData.lgntInitData.", "relationName=" + that.relationName + " bInitTable=" + bInitTable);
                if (!that.attribSpecs) {
                    ret = that.getAttribSpecs(that, that.extractTableRecord, complete, error, viewRecord);
                } else {
                    ret = new WinJS.Promise.as().then(function () {
                        var tableRecord = {};
                        if (viewRecord && that.attribSpecs && that.attribSpecs.length > 0) {
                            var primKeyId;
                            if (that._isLocal) {
                                primKeyId = that.pkName;
                            } else {
                                primKeyId = that.relationName + "VIEWID";
                            }
                            for (var i = 0; i < that.attribSpecs.length; i++) {
                                var baseAttributeName = that.attribSpecs[i].BaseAttributeName;
                                if (baseAttributeName) {
                                    if (bInitTable &&
                                        (baseAttributeName === primKeyId ||
                                         baseAttributeName === "LanguageSpecID" ||
                                         baseAttributeName === "TranslateStatus")) {
                                        Log.print(Log.l.trace, "extract InitTable: ignore column " + baseAttributeName);
                                        continue;
                                    }
                                    var viewAttributeName = that.attribSpecs[i].ODataAttributeName;
                                    if (typeof viewRecord[viewAttributeName] !== "undefined") {
                                        if (typeof viewRecord[viewAttributeName] === "string" && viewRecord[viewAttributeName].length === 0) {
                                            viewRecord[viewAttributeName] = null;
                                        }
                                        if (that._isLocal) {
                                            Log.print(Log.l.trace, baseAttributeName + ": " + viewRecord[viewAttributeName]);
                                            tableRecord[baseAttributeName] = viewRecord[viewAttributeName];
                                        } else {
                                            Log.print(Log.l.trace, viewAttributeName + ": " + viewRecord[viewAttributeName]);
                                            tableRecord[viewAttributeName] = viewRecord[viewAttributeName];
                                        }
                                    }
                                }
                            }
                            complete(tableRecord);
                        } else {
                            Log.print(Log.l.error, "no data in AttribSpecs");
                            var err = { status: 500, statusText: "no data in AttribSpecs" };
                            error(err);
                        }
                    });
                }
                Log.ret(Log.l.trace);
                return ret;
            },
            fetchNext: function (that, results, next, complete, error, recordId) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "next=" + next);
                var user = AppData.getOnlineLogin(that._isRegister);
                var password = AppData.getOnlinePassword(that._isRegister);
                var options = {
                    type: "GET",
                    url: next,
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
                Log.print(Log.l.info, "calling xhr method=GET url=" + next);
                var ret = WinJS.xhr(options).then(function xhrSuccess(response) {
                    Log.call(Log.l.trace, "AppData.lgntInitData.", "method=GET");
                    try {
                        var obj = jsonParse(response.responseText);
                        if (obj && obj.d) {
                            results = results.concat(obj.d.results);
                            var next = that.getNextUrl(obj);
                            if (next) {
                                Log.ret(Log.l.trace);
                                return that.fetchNext(that, results, next, complete, error, recordId);
                            } else {
                                obj.d.results = results;
                                if (obj.d.results &&  (typeof recordId === "undefined" || recordId === null)) {
                                    that._results = obj.d.results;
                                    that._map = [];
                                    var keyName = that.baseRelationName + "ID";
                                    that._results.forEach(function (item, index) {
                                        var keyId = item[keyName];
                                        that._map[keyId] = index;
                                    });
                                }
                                complete(obj);
                            }
                        } else {
                            var err = { status: 404, statusText: "no data found" };
                            error(err);
                        }
                    } catch (exception) {
                        Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                        error({ status: 500, statusText: "data parse error " + (exception && exception.message) });
                    }
                    Log.ret(Log.l.trace);
                    return WinJS.Promise.as();
                }, function (errorResponse) {
                    Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                    error(errorResponse);
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            fetchAll: function (that, obj, complete, error, recordId) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "");
                var retNext;
                var next = that.getNextUrl(obj);
                if (next) {
                    retNext = that.fetchNext(that, obj.d.results, next, complete, error, recordId);
                } else {
                    if (obj && obj.d && obj.d.results && (typeof recordId === "undefined" || recordId === null)) {
                        that._results = obj.d.results;
                        that._map = [];
                        var keyName = that.baseRelationName + "ID";
                        that._results.forEach(function (item, index) {
                            var keyId = item[keyName];
                            that._map[keyId] = index;
                        });
                    }
                    complete(obj);
                    retNext = WinJS.Promise.as();
                }
                Log.ret(Log.l.trace);
                return retNext;
            },
            /**
             * @callback AppData.lgntInitData~complete
             * @param {Object} response - JSON response object returned from database.
             * @description This handler is called after a successfull database operation.
             *  The select and selectNext functions will return the result set in an array of database records in the response.d.results sub-member of response. 
             *  The selectById and insert functions will return the current database record in the response.d member of response. 
             *  The update and deleteRecord functions will not return any database records.
             */
            /**
             * @callback AppData.lgntInitData~error
             * @param {Object} errorResponse - Response object, code number or string returned in case or error.
             * @description This handler is called if an error occurs while database operations.
             */

            /**
             * @function select
             * @param {AppData.lgntInitData~complete} complete - Success handler callback.
             * @param {AppData.lgntInitData~error} error - Error handler callback.
             * @param {number} [recordId] - Record id restriction to select a single list value item from the database.
             * @param {Object} [viewOptions] - Object containing options to be used in select statement.
             * @param {boolean} viewOptions.ordered - If true, the result set is in sort order as specified by the other options.
             * @param {boolean} viewOptions.orderByValue - If true, the list values will be sorted by id, otherwise by title.
             * @param {boolean} viewOptions.desc - True, if the sort order should be descending.
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.lgntInitData
             * @description Use this function to select a result set with id/title value items.
             *  The function will return the result set in an array of database records in the response.d.results sub-member of response. 
             *  The result set is fetched completely and is cached and accessable by the AppData.lgntInitData.results property.
             */
            select: function (complete, error, recordId, viewOptions) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "relationName=" + this.relationName);
                var that = this;
                var languageId = AppData.getLanguageId();
                var fncSelect;
                if (that._isLocal) {
                    fncSelect = function() {
                        var keyName = that.baseRelationName + "ID";
                        var stmt = "SELECT * FROM \"" + that.relationName + "\" WHERE \"LanguageSpecID\"=?";
                        var values = [languageId];
                        if (typeof recordId === "undefined" || recordId === null) {
                            // select all lines with order by
                            if (viewOptions) {
                                // select all lines with order by
                                if (viewOptions.ordered) {
                                    var orderBy = " ORDER BY ";
                                    if (viewOptions.orderByValue) {
                                        orderBy += "\"" + keyName + "\"";
                                    } else {
                                        orderBy += "\"TITLE\"";
                                    }
                                    if (viewOptions.desc) {
                                        orderBy += " DESC";
                                    }
                                    stmt += orderBy;
                                }
                            }
                        } else {
                            // select one line via id
                            stmt += " AND \"" + keyName + "\"=?";
                            values.push(recordId);
                        }
                        Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                        return SQLite.xsql(that.db, stmt, values).then(function xsqlSuccess(res) {
                            Log.call(Log.l.trace, "AppData.lgntInitData.", "method=SELECT");
                            var results = [];
                            if (res && res.rows) {
                                for (var i = 0; i < res.rows.length; i++) {
                                    results[i] = res.rows.item(i);
                                }
                            }
                            var obj = {
                                d: {
                                    results: results
                                }
                            }
                            if (typeof recordId === "undefined" || recordId === null) {
                                that._results = obj.d.results;
                                that._map = [];
                                that._results.forEach(function (item, index) {
                                    var keyId = item[keyName];
                                    that._map[keyId] = index;
                                });
                            }
                            complete(obj);
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (err) {
                            error(err);
                        });
                    }
                } else {
                    fncSelect = function() {
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath + "/";
                        url += "/" + that.relationName + "_ODataVIEW";
                        // HTTP-GET request to remote server for JSON file response
                        url += "?$filter=(LanguageSpecID%20eq%20" + languageId.toString();
                        if (typeof recordId === "undefined" || recordId === null) {
                            // select all lines with order by
                            var orderBy = "";
                            if (viewOptions) {
                                if (viewOptions.ordered) {
                                    orderBy = "&$orderby=";
                                    if (viewOptions.orderByValue) {
                                        orderBy += that.baseRelationName + "ID";
                                    } else {
                                        orderBy += "TITLE";
                                    }
                                    if (viewOptions.desc) {
                                        orderBy += "%20desc";
                                    }
                                }
                            }
                            url += ")" + orderBy;
                        } else {
                            // select one line via id
                            url += "%20and%20" + that.baseRelationName + "ID%20eq%20" + recordId.toString() + ")";
                        }
                        url += "&$format=json";
                        var user = AppData.getOnlineLogin(that._isRegister);
                        var password = AppData.getOnlinePassword(that._isRegister);
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
                        Log.print(Log.l.info, "calling xhr GET url=" + url);
                        return WinJS.xhr(options).then(function xhrSuccess(response) {
                            Log.call(Log.l.trace, "AppData.lgntInitData.", "method=GET");
                            try {
                                var obj = jsonParse(response.responseText);
                                Log.ret(Log.l.trace);
                                return that.fetchAll(that, obj, complete, error, recordId);
                            } catch (exception) {
                                Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                                error({ status: 500, statusText: "data parse error " + (exception && exception.message) });
                                Log.ret(Log.l.trace);
                                return WinJS.Promise.as();
                            }
                        }, function (errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                        });
                    }
                }
                var ret = fncSelect();
                // this will return a promise to controller
                Log.ret(Log.l.trace);
                return ret;
            },
            selectAll: function (complete, error, recordId, viewOptions) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "relationName=" + this.relationName);
                var that = this;
                var languageId = AppData.getLanguageId();
                var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath + "/";
                url += "/" + that.relationName + "_ODataVIEW";
                // HTTP-GET request to remote server for JSON file response
                url += "?";
                if (typeof recordId === "undefined" || recordId === null) {
                    // select all lines with order by
                    var orderBy = "";
                    if (viewOptions) {
                        if (viewOptions.ordered) {
                            orderBy = "$orderby=";
                            if (viewOptions.orderByValue) {
                                orderBy += that.baseRelationName + "ID";
                            } else {
                                orderBy += "TITLE";
                            }
                            if (viewOptions.desc) {
                                orderBy += "%20desc";
                            }
                        }
                    }
                    if (!(viewOptions && viewOptions.allLanguages)) {
                        url += "$filter=(LanguageSpecID%20eq%20" + languageId.toString() + ")&" + orderBy + "&";
                    } else {
                        url += orderBy + "&";
                    }
                } else {
                    // select one line via id
                    if (!(viewOptions && viewOptions.allLanguages)) {
                        url += "$filter=(LanguageSpecID%20eq%20" + languageId.toString() + "%20and%20" + that.baseRelationName + "ID%20eq%20" + recordId.toString() + ")";
                    } else {
                        url += "$filter=(" + that.baseRelationName + "ID%20eq%20" + recordId.toString() + ")";
                    }
                }
                url += "$format=json";
                var user = AppData.getOnlineLogin(that._isRegister);
                var password = AppData.getOnlinePassword(that._isRegister);
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
                Log.print(Log.l.info, "calling xhr GET url=" + url);
                var ret = WinJS.xhr(options).then(function xhrSuccess(response) {
                    Log.call(Log.l.trace, "AppData.lgntInitData.", "method=GET");
                    try {
                        var obj = jsonParse(response.responseText);
                        Log.ret(Log.l.trace);
                        return that.fetchAll(that, obj, complete, error, recordId);
                    } catch (exception) {
                        Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                        error({ status: 500, statusText: "data parse error " + (exception && exception.message) });
                        Log.ret(Log.l.trace);
                        return WinJS.Promise.as();
                    }
                }, function (errorResponse) {
                    Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                    error(errorResponse);
                });
                // this will return a promise to controller
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function update
             * @param {AppData.lgntInitData~complete} complete - Success handler callback.
             * @param {AppData.lgntInitData~error} error - Error handler callback.
             * @param {number} recordId - Primary key value of the data record to delete
             * @param {Object} viewRecord - Database record object containing the attribute values to update 
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.lgntInitData
             * @description Use this function to update a row in a table with the given record id and attribute values.
             *  The function will not return a database record in response. 
             */
            update: function (complete, error, recordId, viewRecord, headers) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "relationName=" + this.relationName + " recordId=" + recordId);
                var that = this;
                var tableRecord = null;
                var updateTableRecord = function () {
                    var primKeyId;
                    if (that._isLocal) {
                        primKeyId = that.pkName;
                        if (typeof tableRecord[primKeyId] !== "undefined") {
                            recordId = tableRecord[primKeyId];
                            delete tableRecord[primKeyId];
                        }
                        var values = [];
                        var stmt = "UPDATE \"" + that.relationName + "\"";
                        var stmtValues = null;
                        var i;
                        for (i = 0; i < that.attribSpecs.length; i++) {
                            var baseAttributeName = that.attribSpecs[i].BaseAttributeName;
                            if (baseAttributeName &&
                                typeof tableRecord[baseAttributeName] !== "undefined") {
                                if (!stmtValues) {
                                    stmtValues = " SET ";
                                } else {
                                    stmtValues += ",";
                                }
                                stmtValues += "\"" + baseAttributeName + "\"=?";
                                values.push(tableRecord[baseAttributeName]);
                            }
                        }
                        if (stmtValues) {
                            values.push(recordId);
                            stmt += stmtValues + " WHERE \"" + primKeyId + "\"=?";
                            Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                            return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(res) {
                                Log.call(Log.l.trace, "AppData.lgntInitData.", "method=UPDATE rowsAffected=" + res.rowsAffected);
                                complete({});
                                Log.ret(Log.l.trace);
                                return WinJS.Promise.as();
                            }, function (curerr) {
                                Log.print(Log.l.error, "xsql: UPDATE returned " + curerr);
                                error(curerr);
                            });
                        } else {
                            Log.print(Log.l.trace, "nothing to update!");
                            complete({});
                            return WinJS.Promise.as();
                        }
                    } else {
                        primKeyId = that.oDataPkName;
                        if (typeof tableRecord[primKeyId] !== "undefined") {
                            recordId = tableRecord[primKeyId];
                        }
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath;
                        url += "/" + that.relationName + "_ODataVIEW(" + recordId.toString() + ")";
                        var options = {
                            type: "PUT",
                            url: url,
                            data: JSON.stringify(tableRecord)
                        };
                        if (typeof headers === "object") {
                            options.headers = headers;
                        } else {
                            options.headers = {};
                        }
                        options.customRequestInitializer = function (req) {
                            if (typeof req.withCredentials !== "undefined") {
                                req.withCredentials = true;
                            }
                        };
                        options.headers["Accept"] = "application/json";
                        options.headers["Content-Type"] = "application/json";
                        options.user = AppData.getOnlineLogin();
                        options.password = AppData.getOnlinePassword();
                        options.headers["Authorization"] = "Basic " + btoa(options.user + ":" + options.password);
                        Log.print(Log.l.info, "calling xhr method=PUT url=" + url);
                        return WinJS.xhr(options).then(function xhrSuccess(response) {
                            Log.call(Log.l.trace, "AppData.lgntInitData.", "method=PUT");
                            complete(response);
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                        });
                    }
                };
                var ret = that.extractTableRecord(that, function (tr) {
                    Log.print(Log.l.trace, "extractTableRecord: SUCCESS!");
                    tableRecord = tr;
                }, error, viewRecord).then(function () {
                    if (tableRecord) {
                        return updateTableRecord();
                    } else {
                        return WinJS.Promise.as();
                    }
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function deleteRecord
             * @param {AppData.lgntInitData~complete} complete - Success handler callback.
             * @param {AppData.lgntInitData~error} error - Error handler callback.
             * @param {number} recordId - Primary key value of the data record to delete
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.lgntInitData
             * @description Use this function to delete a row in a table with the given record id (primary key).
             *  The function will not return a database record in response. 
             */
            deleteRecord: function (complete, error, recordId) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName + " recordId=" + recordId);
                var that = this;
                var initRelationName = that.relationName;
                if (initRelationName.substr(0, 4) === "LGNT") {
                    initRelationName = initRelationName.substr(4);
                }
                var initKeyId;
                var ret = new WinJS.Promise.as().then(function () {
                    if (that._isLocal) {
                        initKeyId = initRelationName + "ID";
                        Log.print(Log.l.trace, "calling deleteRecord: relationName=" + initRelationName + " recordId=" + recordId.toString());
                        var stmt = "DELETE FROM \"" + initRelationName + "\" WHERE \"" + initKeyId + "\"=?";
                        var values = [recordId];
                        Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                        return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(res) {
                            Log.call(Log.l.trace, "AppData.lgntInitData.", "method=DELETE rowsAffected=" + res.rowsAffected);
                            complete({});
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (curerr) {
                            Log.print(Log.l.error, "xsql: DELETE returned " + curerr);
                            error(curerr);
                        });
                    } else {
                        initKeyId = initRelationName + "VIEWID";
                        Log.print(Log.l.trace, "calling deleteRecord: relationName=" + initRelationName + "_ODataVIEW recordId=" + recordId.toString());
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath;
                        url += "/" + initRelationName + "_ODataVIEW(" + recordId.toString() + ")";
                        var user = AppData.getOnlineLogin();
                        var password = AppData.getOnlinePassword();
                        var options = {
                            type: "DELETE",
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
                        Log.print(Log.l.info, "calling xhr method=DELETE url=" + url);
                        return WinJS.xhr(options).then(function xhrSuccess(response) {
                            Log.call(Log.l.trace, "AppData.lgntInitData.", "method=DELETE");
                            complete(response);
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                        });
                    }
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            /**
             * @function insert
             * @param {AppData.lgntInitData~complete} complete - Success handler callback.
             * @param {AppData.lgntInitData~error} error - Error handler callback.
             * @param {Object} viewRecord - Database record object containing the attribute values to insert
             * @returns {Object} The fulfillment of an asynchronous select operation returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
             * @memberof AppData.lgntInitData
             * @description Use this function to select a database record. 
             *  If the bWithId parameter is false (default), a new record id will be generated in the database.
             *  The function will return the inserted database record object including the new primary key value in the response.d member of response. 
             */
            insert: function (complete, error, viewRecord, headers, bWithId) {
                Log.call(Log.l.trace, "AppData.formatViewData.", "relationName=" + this.relationName + " bWithId=" + bWithId);
                var that = this;
                var tableRecord;
                var languageId = AppData.getLanguageId();
                var insertTableRecord = function () {
                    var initRelationName = that.relationName;
                    if (initRelationName.substr(0, 4) === "LGNT") {
                        initRelationName = initRelationName.substr(4);
                    }
                    var initKeyId;
                    if (!bWithId) {
                        if (typeof tableRecord[initKeyId] !== "undefined") {
                            Log.print(Log.l.info, "remove " + initKeyId + "=" + tableRecord[initKeyId] + " from record");
                            delete tableRecord[initKeyId];
                        }
                    }
                    var recordId = 0;
                    if (that._isLocal) {
                        initKeyId = initRelationName + "ID";
                        if (!bWithId) {
                            if (typeof tableRecord[initKeyId] !== "undefined") {
                                Log.print(Log.l.info, "remove " + initKeyId + "=" + tableRecord[initKeyId] + " from record");
                                delete tableRecord[initKeyId];
                            }
                        }
                        var values = [];
                        var stmt = "INSERT INTO \"" + initRelationName + "\"";
                        var stmtValues = null;
                        var i;
                        for (i = 0; i < that.attribSpecs.length; i++) {
                            var baseAttributeName = that.attribSpecs[i].BaseAttributeName;
                            if (baseAttributeName &&
                                typeof tableRecord[baseAttributeName] !== "undefined") {
                                if (!stmtValues) {
                                    stmt += "(";
                                    stmtValues = ") VALUES (";
                                } else {
                                    stmt += ",";
                                    stmtValues += ",";
                                }
                                stmt += "\"" + baseAttributeName + "\"";
                                stmtValues += "?";
                                values.push(tableRecord[baseAttributeName]);
                            }
                        }
                        if (stmtValues) {
                            stmtValues += ")";
                            stmt += stmtValues;
                        }
                        Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                        return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(insertRes) {
                            recordId = insertRes.insertId;
                            Log.call(Log.l.trace, "AppData.lgntInitData.", "method=INSERT recordId=" + recordId);
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (curerr) {
                            Log.print(Log.l.error, "xsql: INSERT returned " + curerr);
                            error(curerr);
                            return WinJS.Promise.as();
                        }).then(function () {
                            if (recordId) {
                                var relationName = that.relationName;
                                stmt = "SELECT * FROM \"" + relationName + "\" WHERE \"" + initKeyId + "\"=? AND \"LanguageSpecID\"=?";
                                values = [recordId, languageId];
                                Log.print(Log.l.info, "xsql: " + stmt + " [" + values + "]");
                                return SQLite.xsql(that.db, stmt, values, that.connectionType).then(function xsqlSuccess(res) {
                                    Log.call(Log.l.trace, "AppData.lgntInitData.", "method=SELECT");
                                    if (res && res.rows && res.rows.length > 0) {
                                        var result = that.viewRecordFromTableRecord(that, res.rows.item(0));
                                        var json = {
                                            d: result
                                        }
                                        complete(json);
                                    } else {
                                        Log.print(Log.l.error, "xsql: no data found in " + that.relationName + " for Id " + recordId);
                                        var curerr = { status: 404, statusText: "no data found in " + that.relationName + " for Id " + recordId };
                                        error(curerr);
                                    }
                                    Log.ret(Log.l.trace);
                                    return WinJS.Promise.as();
                                }, function (curerr) {
                                    Log.print(Log.l.error, "xsql: SELECT returned " + curerr);
                                    error(curerr);
                                });
                            } else {
                                var err = { status: 404, statusText: "no data found" };
                                Log.print(Log.l.error, "xsql: INSERT returned " + err);
                                error(err);
                                return WinJS.Promise.as();
                            }
                        });
                    } else {
                        initKeyId = initRelationName + "VIEWID";
                        if (!bWithId) {
                            if (typeof tableRecord[initKeyId] !== "undefined") {
                                Log.print(Log.l.info, "remove " + initKeyId + "=" + tableRecord[initKeyId] + " from record");
                                delete tableRecord[initKeyId];
                            }
                        }
                        var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.getOnlinePath(that._isRegister);
                        url += "/" + initRelationName + "_ODataVIEW";
                        var options = {
                            type: "POST",
                            url: url,
                            data: JSON.stringify(tableRecord)
                        };
                        if (typeof headers === "object") {
                            options.headers = headers;
                        } else {
                            options.headers = {};
                        }
                        options.customRequestInitializer = function (req) {
                            if (typeof req.withCredentials !== "undefined") {
                                req.withCredentials = true;
                            }
                        };
                        options.headers["Accept"] = "application/json";
                        options.headers["Content-Type"] = "application/json";
                        options.user = AppData.getOnlineLogin(that._isRegister);
                        options.password = AppData.getOnlinePassword(that._isRegister);
                        options.headers["Authorization"] = "Basic " + btoa(options.user + ":" + options.password);
                        Log.print(Log.l.info, "calling xhr method=POST url=" + url);
                        return WinJS.xhr(options).then(function xhrSuccess(response) {
                            var err;
                            Log.call(Log.l.trace, "AppData.lgntInitData.", "method=INSERT");
                            try {
                                var obj = jsonParse(response.responseText);
                                if (obj && obj.d) {
                                    recordId = obj.d[initKeyId];
                                    Log.print(Log.l.info, "INSERT returned " + initKeyId + "=" + recordId);
                                } else {
                                    err = { status: 404, statusText: "no data found" };
                                    error(err);
                                }
                            } catch (exception) {
                                Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                                err = { status: 500, statusText: "data parse error " + (exception && exception.message) };
                                error(err);
                            }
                            Log.ret(Log.l.trace);
                            return WinJS.Promise.as();
                        }, function (errorResponse) {
                            Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                            error(errorResponse);
                        }).then(function () {
                            if (recordId) {
                                url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.appSettings.odata.onlinePath + "/";
                                url += "/" + that.relationName + "_ODataVIEW";
                                // HTTP-GET request to remote server for JSON file response
                                url += "?$filter=(LanguageSpecID%20eq%20" + languageId.toString();
                                // select one line via id
                                url += "%20and%20" + that.baseRelationName + "ID%20eq%20" + recordId.toString() + ")&$format=json";
                                var user = AppData.getOnlineLogin(that._isRegister);
                                var password = AppData.getOnlinePassword(that._isRegister);
                                options = {
                                    type: "GET",
                                    url: url,
                                    user: user,
                                    password: password,
                                    customRequestInitializer: function(req) {
                                        if (typeof req.withCredentials !== "undefined") {
                                            req.withCredentials = true;
                                        }
                                    },
                                    headers: {
                                        "Authorization": "Basic " + btoa(user + ":" + password)
                                    }
                                };
                                Log.print(Log.l.info, "calling xhr GET url=" + url);
                                return WinJS.xhr(options).then(function xhrSuccess(response) {
                                    Log.call(Log.l.trace, "AppData.lgntInitData.", "method=GET");
                                    try {
                                        var json = jsonParse(response.responseText);
                                        complete(json);
                                    } catch (exception) {
                                        Log.print(Log.l.error,
                                            "resource parse error " + (exception && exception.message));
                                        error({
                                            status: 500,
                                            statusText: "data parse error " + (exception && exception.message)
                                        });
                                    }
                                    Log.ret(Log.l.trace);
                                    return WinJS.Promise.as();
                                }, function(errorResponse) {
                                    Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                                    error(errorResponse);
                                });
                            } else {
                                var err = { status: 404, statusText: "no data found" };
                                Log.print(Log.l.error, "INSERT returned " + err);
                                error(err);
                                return WinJS.Promise.as();
                            }
                        });
                    }
                };
                var ret = that.extractTableRecord(that, function (tr) {
                    Log.print(Log.l.trace, "extractTableRecord: SUCCESS!");
                    tableRecord = tr;
                }, error, viewRecord, true).then(function () {
                    if (tableRecord) {
                        return insertTableRecord();
                    } else {
                        return WinJS.Promise.as();
                    }
                });
                Log.ret(Log.l.trace);
                return ret;
            },
            getRecordId: function (record) {
                var ret = null;
                if (record) {
                    var initRelationName = this.relationName;
                    if (initRelationName.substr(0, 4) === "LGNT") {
                        initRelationName = initRelationName.substr(4);
                    }
                    var initKeyId = initRelationName + "ID";
                    ret = record[initKeyId];
                }
                return ret;
            },
            dbInsert: function (that, complete, error, results) {
                Log.call(Log.l.trace, "AppData.lgntInitData.", "relationName=" + that.relationName);
                var ret;
                if (!that.attribSpecs) {
                    ret = that.getAttribSpecs(that, that.dbInsert, complete, error, results);
                } else {
                    ret = new WinJS.Promise.as().then(function () {
                        var stmt = "INSERT INTO \"" + that.relationName + "\"";
                        var stmtValues = null;
                        var i;
                        for (i = 0; i < that.attribSpecs.length; i++) {
                            if (that.attribSpecs[i].BaseAttributeName) {
                                if (!stmtValues) {
                                    stmt += "(";
                                    stmtValues = ") VALUES (";
                                } else {
                                    stmt += ",";
                                    stmtValues += ",";
                                }
                                stmt += "\"" + that.attribSpecs[i].BaseAttributeName + "\"";
                                stmtValues += "?";
                            }
                        }
                        if (stmtValues) {
                            stmtValues += ")";
                            stmt += stmtValues;
                        }
                        Log.print(Log.l.trace, "lgntInitData.dbInsert: " + stmt);
                        var batch = [];
                        for (var j = 0; j < results.length; j++) {
                            var values = [];
                            var row = results[j];
                            for (i = 0; i < that.attribSpecs.length; i++) {
                                if (that.attribSpecs[i].BaseAttributeName) {
                                    if (typeof row[that.attribSpecs[i].Name] === "undefined") {
                                        values.push(null);
                                    } else {
                                        values.push(row[that.attribSpecs[i].Name]);
                                    }
                                }
                            }
                            var exec = [];
                            exec.push(stmt);
                            exec.push(values);
                            batch.push(exec);
                        }
                        AppData._db.sqlBatch(batch, function () {
                            that._map = [];
                            that._results = [];
                            Log.print(Log.l.trace, "lgntInitData.dbInsert: " + that.relationName + " success!");
                            complete();
                        }, function (curerr) {
                            Log.print(Log.l.error, "lgntInitData.dbInsert: sqlBatch " + curerr);
                            error(curerr);
                        });
                        return WinJS.Promise.as();
                    });
                }
                Log.ret(Log.l.trace);
                return ret;
            }
        }),
        /**
         * @function clearLgntInits
         * @memberof AppData
         * @description Use this function to free the cached value list results and map array of all .
         */
        clearLgntInits: function () {
            Log.call(Log.l.trace, "AppData.");
            for (var i = 0; i < AppData._lgntInits.length; i++) {
                var lgntInit = AppData._lgntInits[i];
                if (lgntInit) {
                    lgntInit.clear();
                }
            }
            Log.ret(Log.l.trace);
        },
        /**
         * @function getLgntInit
         * @memberof AppData
         * @param {string} relationName - Name of a database table.
         * @param {boolean} [isLocal] - True, if the relation object should represent a table or view in local SQLite storage. 
         *  False, if the relation object should represent a table or view on the database server to be accessed via OData. Default: undefined
         * @param {boolean} [isRegister] - True, if the relation object should represent table or view is used in registration user context. Default: false
         * @returns {AppData.lgntInitData} Newly created or already cached database interface object.
         * @description Use this function to retrieve database relation interface objects of type {@link AppData.lgntInitData} to select data from language specific database value list tables, usually id/title pairs.
         *  Value lists can be used to prefill list controls in forms, like e.g. comboboxes or listboxes (HTML select elements) and arrays of checkboxes or radioboxes.
         *  Once selected the result set is cached until the cache is cleared by calling the function AppData.clearLgntInits or the active language setting is changed.
         *
         *  If the isLocal parameter is undefined, the lgntInitData object represents a local SQLite storage object if the table or view exists is configured to be a local.
         *  This will be selected automatically from ReplicationSpec configuration metadata.
         * 
         *  You can use the lgntInitData.map and lgntInitData.results properties to access the cached result set and map between list index and id of the list entry:
         <pre>
         function getInitItemById(id, myTable) {
             var myInitView = getLgntInit(myTable);
             if (myInitView && myInitView.map && myInitView.results &&
                 typeof myInitView.map[id] !== "undefined") {
                 return myInitView.results[myInitView.map[id]];
             } else {
                 return null;
             }
         }
         </pre>
         */
        getLgntInit: function (relationName, isLocal, isRegister) {
            var ret = null;
            if (typeof isLocal !== "boolean") {
                isLocal = AppData.isLocalRelation(relationName);
            }
            if (typeof isRegister !== "boolean") {
                isRegister = false;
            }
            Log.call(Log.l.trace, "AppData.", "relationName=" + relationName + " isLocal=" + isLocal);
            for (var i = 0; i < AppData._lgntInits.length; i++) {
                var lgntInit = AppData._lgntInits[i];
                if (lgntInit.relationName === relationName && lgntInit.isLocal === isLocal && lgntInit.isRegister === isRegister) {
                    ret = lgntInit;
                    break;
                }
            }
            if (!ret) {
                Log.print(Log.l.info, "create new lgntInitData(relationName=" + relationName + ",isLocal=" + isLocal + ",isRegister="+ isRegister + ")");
                ret = new AppData.lgntInitData(relationName, isLocal, isRegister);
                AppData._lgntInits.push(ret);
            }
            Log.ret(Log.l.trace);
            return ret;
        },
        call: function (name, params, complete, error, isRegister) {
            if (typeof isRegister === "boolean") {
                this._isRegister = isRegister;
            } else {
                this._isRegister = false;
            }
            var that = this;
            Log.call(Log.l.trace, "AppData.");
            var url = AppData.getBaseURL(AppData.appSettings.odata.onlinePort) + "/" + AppData.getOnlinePath(that._isRegister);
            url += "/" + name + "?";
            var paramsString = "";
            for (var prop in params) {
                if (params.hasOwnProperty(prop)) {
                    paramsString += prop + "=";
                    Log.print(Log.l.u1, prop + ": " + params[prop]);
                    if (typeof params[prop] === "string") {
                        paramsString += "'" + encodeURL(params[prop]) + "'";
                    } else if (params[prop] || params[prop] === 0) {
                        paramsString += params[prop];
                    } else {
                        paramsString += "null";
                    }
                    paramsString += "&";
                }
            }
            url += paramsString + "$format=json";
            var user = AppData.getOnlineLogin(that._isRegister);
            var password = AppData.getOnlinePassword(that._isRegister);
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
            Log.print(Log.l.info, "calling xhr method=GET url=" + url);
            var ret = WinJS.xhr(options).then(function xhrSuccess(response) {
                Log.call(Log.l.trace, "AppData.call.", "method=GET");
                try {
                    var json = jsonParse(response.responseText);
                    complete(json);
                } catch (exception) {
                    Log.print(Log.l.error, "resource parse error " + (exception && exception.message));
                    error({ status: 500, statusText: "call " + name + " parse error " + (exception && exception.message) });
                }
                Log.ret(Log.l.trace);
                return WinJS.Promise.as();
            }, function (errorResponse) {
                Log.print(Log.l.error, "error=" + AppData.getErrorMsgFromResponse(errorResponse));
                error(errorResponse);
            });
            Log.ret(Log.l.trace);
            return ret;
        },
        toDateString: function (value, noTimeString) {
            if (!value) {
                return "";
            }
            var now = new Date();
            var nowYear = now.getFullYear();
            var nowDay = now.getDate();
            var nowMonth = now.getMonth() + 1;

            // value now in UTC ms!
            var msString = value.replace("\/Date(", "").replace(")\/", "");
            var milliseconds = parseInt(msString) - AppData.appSettings.odata.timeZoneAdjustment * 60000;
            var date = new Date(milliseconds);
            var day = date.getDate();
            var month = date.getMonth() + 1;
            var strMonth;
            var strHours;
            var strMinutes;
            var year = date.getFullYear();
            //return day.toString() + "." + month.toString() + "." + year.toString();
            if (year === nowYear) {
                if (noTimeString ||
                    month !== nowMonth ||
                   (day !== nowDay && (nowDay - day) !== 1)) {
                    switch (month) {
                        case 1:
                            strMonth = getResourceText("general.january");
                            break;
                        case 2:
                            strMonth = getResourceText("general.february");
                            break;
                        case 3:
                            strMonth = getResourceText("general.march");
                            break;
                        case 4:
                            strMonth = getResourceText("general.april");
                            break;
                        case 5:
                            strMonth = getResourceText("general.may");
                            break;
                        case 6:
                            strMonth = getResourceText("general.june");
                            break;
                        case 7:
                            strMonth = getResourceText("general.july");
                            break;
                        case 8:
                            strMonth = getResourceText("general.august");
                            break;
                        case 9:
                            strMonth = getResourceText("general.september");
                            break;
                        case 10:
                            strMonth = getResourceText("general.october");
                            break;
                        case 11:
                            strMonth = getResourceText("general.november");
                            break;
                        case 12:
                            strMonth = getResourceText("general.december");
                            break;
                    }
                    if (day <= 9) {
                        return "0" + day.toString() + ". " + strMonth;
                    } else {
                        return day.toString() + ". " + strMonth;
                    }
                } else {
                    var hours = date.getHours();
                    if (hours <= 9) {
                        strHours = "0" + hours.toString();
                    } else {
                        strHours = hours.toString();
                    }
                    var minutes = date.getMinutes();
                    if (minutes <= 9) {
                        strMinutes = "0" + minutes.toString();
                    } else {
                        strMinutes = minutes.toString();
                    }
                    if (day === nowDay) {
                        return strHours + ":" + strMinutes;
                    } else {
                        return getResourceText("general.yesterday") + " " + strHours + ":" + strMinutes;
                    }
                }
            } else {
                return date.toLocaleDateString();
            }
        }

    });

    /**
     * Use this namespace to extend binding declarations.
     * @namespace Binding
     */

    // usage of twoway-mode in declarative binding
    //
    //<input type="text" 
    //
    //       // activate twoway-mode:
    //
    //       data-win-bind="value: loginModel.userName Binding.Mode.twoway" 
    //
    //       // option to add aditional events:
    //
    //       data-win-bind-onevent="oninput">
    //
    /**
     * Use this namespace to extend binding modes declarations.
     * @namespace Mode
     * @memberof Binding
     */
    WinJS.Namespace.define("Binding.Mode", {
        /**
         * @member twoway
         * @memberof Binding.Mode
         * @description Use the Binding.Mode.twoway to declare two-way binding in HTML element attribute:
         <pre>
         &lt;input class="win-textbox" type="text" data-win-bind="value: myData Binding.Mode.twoway" /&gt;
         </pre>
         */
        twoway: WinJS.Binding.initializer(function (source, sourceProps, dest, destProps) {
            WinJS.Binding.defaultBind(source, sourceProps, dest, destProps);
            var events = dest.dataset['winBindOnevent'] || "onchange";

            return dest[events] = function (event) {
                var d, s, parent, last;

                if (destProps.length === 1) {
                    d = dest[destProps[0]];
                } else {
                    var destLeaf = destProps.slice(-1);
                    var destParent = destProps.slice(0, -1).join('.');
                    d = WinJS.Utilities.getMember(destParent, dest)[destLeaf];
                }
                if (sourceProps.length === 1) {
                    last = null;
                    parent = null;
                    s = source[sourceProps[0]];
                } else {
                    last = sourceProps.slice(-1);
                    parent = sourceProps.slice(0, -1).join('.');
                    s = WinJS.Utilities.getMember(parent, source)[last];
                }
                if (s !== d) {
                    if (sourceProps.length === 1) {
                        source[sourceProps[0]] = d;
                    } else {
                        WinJS.Utilities.getMember(parent, source)[last] = d;
                    }
                    if (typeof AppBar === "object" &&
                        AppBar.notifyModified //&& !AppBar.modified
                        ) {
                        AppBar.modified = true;
                    }
                }
            }
        })
    });

    // usage of binding converters
    //
    //<span 
    //
    //       // display element if value is set:
    //
    //       data-win-bind="textContent: loginModel.userName; style.display: loginModel.userName Binding.Converter.toDisplay" 
    //
    /**
     * Use this namespace to extend binding converters declarations.
     * @namespace Converter
     * @memberof Binding
     */
    WinJS.Namespace.define("Binding.Converter", {
        /**
         * @member toBold
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toBold to covert a value to be used for font-weight style attribute:
         <pre>
         &lt;input class="win-textbox" type="text" data-win-bind="value: myData; style.fontWeight: myBoldFlag Binding.Converter.toBold" /&gt;
         </pre>
         True values are converted to "bold", false or empty values to "normal"
         */
        toBold: WinJS.Binding.converter(function (value) {
            if (value) {
                return "bold";
            } else {
                return "normal";
            }
        }),
        /**
         * @member toVisibility
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toVisibility to covert a value to be used for visibility style attribute:
         <pre>
         &lt;input class="win-textbox" type="text" data-win-bind="value: myData; style.visibility: myShowFlag Binding.Converter.toVisibility" /&gt;
         </pre>
         True values are converted to "visible", false or empty values to "hidden"
         */
        toVisibility: WinJS.Binding.converter(function (value) {
            if (value) {
                return "visible";
            } else {
                return "hidden";
            }
        }),
        /**
         * @member toDisplay
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toVisibility to covert a value to be used for display style attribute:
         <pre>
         &lt;input class="win-textbox" type="text" data-win-bind="value: myData; style.display: myDisplayFlag Binding.Converter.toDisplay" /&gt;
         </pre>
         True values are converted to "", false or empty values to "none"
         */
        toDisplay: WinJS.Binding.converter(function (value) {
            if (value) {
                return "";
            } else {
                return "none";
            }
        }),
        /**
         * @member toDisplayNone
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toVisibility to covert a value to be used for display style attribute:
         <pre>
         &lt;input class="win-textbox" type="text" data-win-bind="value: myData; style.display: myNotDisplayFlag Binding.Converter.toDisplayNone" /&gt;
         </pre>
         True values are converted to "none", false or empty values to ""
         */
        toDisplayNone: WinJS.Binding.converter(function (value) {
            if (value) {
                return "none";
            } else {
                return "";
            }
        }),
        /**
         * @member emptyToHidden
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toVisibility to covert a value to be used for visibility style attribute:
         <pre>
         &lt;input class="win-textbox" type="text" data-win-bind="value: myData; style.visibility: myNotEmptyFlag Binding.Converter.emptyToHidden" /&gt;
         </pre>
         Empty or undefined values are converted to "hidden", other values to "visible"
         */
        emptyToHidden: WinJS.Binding.converter(function (value) {
            if (typeof value === "undefined" || value === null ||
                typeof value === "string" && value === "" ||
                typeof value === "object" && value === {}) {
                return "hidden";
            } else {
                return "visible";
            }
        }),
        /**
         * @member evenToDisplay
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toVisibility to covert a value to be used for display style attribute:
         <pre>
         &lt;input class="win-textbox" type="text" data-win-bind="value: myData; style.display: myIndex Binding.Converter.evenToDisplay" /&gt;
         </pre>
         Even or undefined values are converted to "", odd values to "none"
         */
        evenToDisplay: WinJS.Binding.converter(function (value) {
            if (value % 2 === 0) {
                return "";
            } else {
                return "none";
            }
        }),
        /**
         * @member oddToDisplay
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toVisibility to covert a value to be used for display style attribute:
         <pre>
         &lt;input class="win-textbox" type="text" data-win-bind="value: myData; style.display: myIndex Binding.Converter.oddToDisplay" /&gt;
         </pre>
         Even or undefined values are converted to "none", odd values to ""
         */
        oddToDisplay: WinJS.Binding.converter(function (value) {
            if (value % 2 === 0) {
                return "none";
            } else {
                return "";
            }
        }),
        //@Nedra:19.02.2015 convert the date to String
        /**
         * @member toDateString
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toDateString to covert a UTC Date value to a human readable string:
         <pre>
         &lt;span data-win-bind="textContent: myDateTime Binding.Converter.toDateString"&gt;&lt;/span&gt;
         </pre>
         */
        toDateString: WinJS.Binding.converter(function (value) {
            return AppData.toDateString(value);
        }),
        /**
         * @member toRemoteDateString
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toRemoteDateString to covert a local Date value from a remote database server to a human readable string:
         <pre>
         &lt;span data-win-bind="textContent: myRemoteDateTime Binding.Converter.toRemoteDateString"&gt;&lt;/span&gt;
         </pre>
         */
        toRemoteDateString: WinJS.Binding.converter(function (value) {
            if (!value) {
                return "";
            }
            var now = new Date();
            var nowYear = now.getFullYear();
            var nowDay = now.getDate();
            var nowMonth = now.getMonth() + 1;

            // value now in UTC ms!
            var msString = value.replace("\/Date(", "").replace(")\/", "");
            var milliseconds = parseInt(msString);
            if (AppData.appSettings.odata.timeZoneRemoteAdjustment) {
                milliseconds -= AppData.appSettings.odata.timeZoneRemoteAdjustment * 60000;
            }
            var date = new Date(milliseconds);
            var day = date.getDate();
            var month = date.getMonth() + 1;
            var strMonth;
            var strHours;
            var strMinutes;
            var year = date.getFullYear();
            //return day.toString() + "." + month.toString() + "." + year.toString();
            if (year === nowYear) {
                if (month !== nowMonth ||
                   (day !== nowDay && (nowDay - day) !== 1)) {
                    switch (month) {
                        case 1:
                            strMonth = getResourceText("general.january");
                            break;
                        case 2:
                            strMonth = getResourceText("general.february");
                            break;
                        case 3:
                            strMonth = getResourceText("general.march");
                            break;
                        case 4:
                            strMonth = getResourceText("general.april");
                            break;
                        case 5:
                            strMonth = getResourceText("general.may");
                            break;
                        case 6:
                            strMonth = getResourceText("general.june");
                            break;
                        case 7:
                            strMonth = getResourceText("general.july");
                            break;
                        case 8:
                            strMonth = getResourceText("general.august");
                            break;
                        case 9:
                            strMonth = getResourceText("general.september");
                            break;
                        case 10:
                            strMonth = getResourceText("general.october");
                            break;
                        case 11:
                            strMonth = getResourceText("general.november");
                            break;
                        case 12:
                            strMonth = getResourceText("general.december");
                            break;
                    }
                    if (day <= 9) {
                        return "0" + day.toString() + ". " + strMonth;
                    } else {
                        return day.toString() + ". " + strMonth;
                    }
                } else {
                    var hours = date.getHours();
                    if (hours <= 9) {
                        strHours = "0" + hours.toString();
                    } else {
                        strHours = hours.toString();
                    }
                    var minutes = date.getMinutes();
                    if (minutes <= 9) {
                        strMinutes = "0" + minutes.toString();
                    } else {
                        strMinutes = minutes.toString();
                    }
                    if (day === nowDay) {
                        return strHours + ":" + strMinutes;
                    } else {
                        return getResourceText("general.yesterday") + " " + strHours + ":" + strMinutes;
                    }
                }
            } else {
                return date.toLocaleDateString();
            }
        }),
        toIdWithValue: WinJS.Binding.converter(function (value) {
            if (!value) {
                return "";
            }
            return ("ID: " + value);
        }),
        /**
         * @member xToTrue
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.xToTrue to covert a string value of "X" to true. All other values are converted to false.
         */
        xToTrue: WinJS.Binding.converter(function (value) {
            if (value === "X") {
                return true;
            } else {
                return false;
            }
        }),
        /**
         * @member toBoolean
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toBoolean to covert a string or number value of 1 to true. All other values are converted to false.
         */
        toBoolean: WinJS.Binding.converter(function (value) {
            if (value === 1 || value === "1") {
                return true;
            } else {
                return false;
            }
        }),
        /**
         * @member toInteger
         * @memberof Binding.Converter
         * @description Use the Binding.Converter.toInteger to covert a string into a number. Number type values are passed through.
         */
        toInteger: WinJS.Binding.converter(function (value) {
            if (typeof value === "number") {
                return value;
            } else if (typeof value === "string" &&
                value && value.length > 0 &&
                value[0] >= '0' && value[0] <= '9') {
                return parseInt(value);
            }
            return null;
        })
    });
})();
