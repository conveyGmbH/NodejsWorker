/// <reference path="../../lib/WinJS/scripts/base.js" />
/// <reference path="../../lib/convey/scripts/strings.js" />
/// <reference path="../../lib/convey/scripts/logging.js" />
/// <reference path="../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../lib/convey/scripts/dataService.js" />


(function () {
    "use strict";

    var UUID = require("uuid-js");
    var b64js = require("base64-js");
    var zlib = require("zlib");
    var vCard = require("vcard-parser");
    // var polyfills = require("mdn-polyfills/String.prototype.startsWith");

    var crypto = require("crypto");
    var algorithm = "bf-ecb";
    //public key
    var key = [0xad, 0x00, 0xe0, 0x7b, 0x4b, 0xf0, 0xde, 0x4a];
    //var decipher = crypto.createDecipheriv(algorithm, new Buffer(key), '');
    //decipher.setAutoPadding(false);

    var dispatcher = {
        startup: function () {
            Log.call(Log.l.trace, "bcrService.");
            this.successCount = 0;
            this.errorCount = 0;
            this.waitTimeMs = 2000;
            this.timestamp = null;

            this._importCardscan_ODataView = AppData.getFormatView("IMPORT_CARDSCAN", 0, false);
            this._importBarcodeScan_ODataView = AppData.getFormatView("ImportBarcodeScan", 0, false);

            this.results = [];
            var uuid = UUID.create();
            this.bcrUuid = uuid.toString();
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        activity: function () {
            var startOk = false;
            var finishedOk = false;
            //var isValidBase64String = false;
            var myResult = "";
            var myvCardResult = "";
            var name = "";

            var nachname = "";
            var vorname = "";
            var weiterename = "";
            var geschlecht = "";
            var anrede = null;
            var academicTitle = "";
            var companyname = "";

            var poBox = "";
            var extendedAddress = "";
            var street = "";
            var state = "";
            var residence = "";
            var postCode = "";
            var country = "";

            var telefone = "";
            var mobilePhone = "";
            var teleFax = "";
            var email = "";
            var url = "";
            var title = "";
            var requestBarcode = "";

            var importBarcodeScanData = null;
            var dataVCard = null; // {}
            var importcardscanid = 0;
            //var cardscanbulkid = 0;
            var dataImportCardscan = {};
            var dataImportCardscanVcard = null;
            var that = this;
            var pAktionStatus = "VCARD_START" + this.bcrUuid; //"bcr_START" + this.bcrUuid;

            var ret = AppData.call("PRC_STARTVCARD",
                {
                    pAktionStatus: pAktionStatus
                },
                function (json) {
                    Log.print(Log.l.trace, "PRC_STARTVCARD success!");
                    if (json && json.d && json.d.results && json.d.results.length > 0) {
                        importcardscanid = json.d.results[0].Import_CARDSCANVIEWID;
                        Log.print(Log.l.trace, "importcardscanid=" + importcardscanid);
                        var barcode2Result = json.d.results[0].Barcode2;
                        dataImportCardscanVcard = json.d.results[0];
                        if (barcode2Result) {
                            myResult = barcode2Result;
                            //isValidBase64String = myResult.search("/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/");
                            //Log.print(Log.l.trace, "isValidBase64String: " + isValidBase64String);
                        }
                    }
                    startOk = true;
                },
                function (error) {
                    that.errorCount++;
                    Log.print(Log.l.error,
                        "PRC_STARTVCARD error! " + that.successCount + " success / " + that.errorCount + " errors");
                    that.timestamp = new Date();
                })/*.then(function selectimportCardscanODataView() {
                    Log.call(Log.l.trace, "bcrService.", "pAktionStatus=" + pAktionStatus);
                    if (!startOk) {
                        Log.ret(Log.l.trace, "PRC_STARTVCARD failed!");
                        return WinJS.Promise.as();
                    }
                    if (!that._importCardscan_ODataView) {
                        that.errorCount++;
                        that.timestamp = new Date();
                        Log.ret(Log.l.error,
                            "_importCardscan_ODataView not initialized! " +
                            that.successCount +
                            " success / " +
                            that.errorCount +
                            " errors");
                        return WinJS.Promise.as();
                    }
                    Log.ret(Log.l.trace);
                    return that._importCardscan_ODataView.select(function (json) {
                        Log.print(Log.l.trace, "importCardscan_ODataView: success!");
                        if (json && json.d && json.d.results && json.d.results.length > 0) {
                            importcardscanid = json.d.results[0].IMPORT_CARDSCANVIEWID;
                            Log.print(Log.l.trace, "importcardscanid=" + importcardscanid);
                            var barcode2Result = json.d.results[0].Barcode2;
                            dataImportCardscanVcard = json.d.results[0];
                            if (barcode2Result) {
                                myResult = barcode2Result;
                                //isValidBase64String = myResult.search("/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/");
                                //Log.print(Log.l.trace, "isValidBase64String: " + isValidBase64String);
                            }
                        }

                        return WinJS.Promise.as();
                    },
                        function (error) {
                            Log.print(Log.l.error, "select error=" + AppData.getErrorMsgFromResponse(error));
                            that.errorCount++;
                            Log.print(Log.l.error,
                                "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                            that.timestamp = new Date();
                        },
                        {
                            Button: pAktionStatus
                        });
                })*/.then(function () {
                    Log.call(Log.l.trace, "bcrService.", "pAktionStatus=" + pAktionStatus + "myResult=" + myResult);
                    if (!startOk) {
                        Log.ret(Log.l.trace, "PRC_STARTVCARD failed!");
                        return WinJS.Promise.as();
                    }
                    if (!myResult) {
                        Log.ret(Log.l.trace, "no valid base64String! myResult=" + myResult);
                        return WinJS.Promise.as();
                    }
                    if (myResult.substr(0, "#LSAD01".length) === "#LSAD01") {
                        myResult = myResult.substring(7);
                        //console.log(myResult);
                        //console.log(new Buffer(myResult, 'base64').toString('binary').length);
                        Log.call(Log.l.trace, "bcrService.", "myResult= after substring(7)" + myResult);
                        // decrypt
                        var keyBuffer = Buffer.from(key);
                        var decipher = crypto.createDecipheriv('bf-ecb', keyBuffer, '');
                        myResult = decipher.update(myResult, "base64", "base64");
                        // unzip
                        var mybuffer = Buffer.from(myResult, 'base64');
                        return new WinJS.Promise(function (complete, error) {
                            zlib.unzip(mybuffer, { finishFlush: zlib.constants.Z_SYNC_FLUSH },
                                function (err, buffer) {
                                    Log.print(Log.l.error,
                                        "err:" + err);
                                    if (!err) {
                                        //flag für ist entschlüsselt und unzip
                                        Log.print(Log.l.error,
                                            "buffer.toSTring:" + buffer.toString());
                                        dataVCard = buffer.toString();
                                        finishedOk = true;
                                        complete();
                                    } else {
                                        finishedOk = false;
                                        that.errorCount++;
                                        Log.print(Log.l.error,
                                            "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                                        that.timestamp = new Date();
                                        //error();
                                    }
                                    return WinJS.Promise.as();
                                });
                        }, function (error) {
                            that.errorCount++;
                            Log.print(Log.l.error,
                                "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                            that.timestamp = new Date();
                        });
                    }
                    return WinJS.Promise.as();
                }).then(function unzipResult() {
                    Log.call(Log.l.trace, "bcrService.", "myResult=" + myResult);
                    if (!myResult) {
                        Log.ret(Log.l.trace, "no valid base64String! myResult=" + myResult);
                        return WinJS.Promise.as();
                    }
                    Log.call(Log.l.trace, "callBcr.", "dataVCard=" + dataVCard);
                    if (myResult && myResult.substr(0, "#LSAD00".length) === "#LSAD00") {
                        myResult = myResult.substring(7);
                        var buffer = Buffer.from(myResult, 'base64');
                        return new WinJS.Promise(function (complete, error) {
                            zlib.unzip(buffer, { finishFlush: zlib.constants.Z_SYNC_FLUSH },
                                function (err, buffer) {
                                    if (!err) {
                                        //flag für ist unzip
                                        dataVCard = buffer.toString();
                                        Log.call(Log.l.trace, "callBcr.", "dataVCard=" + dataVCard);
                                        finishedOk = true;
                                        complete();
                                    } else {
                                        finishedOk = false;
                                        that.errorCount++;
                                        Log.print(Log.l.error,
                                            "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                                        that.timestamp = new Date();
                                        //error();
                                    }
                                });
                        }, function (error) {
                            that.errorCount++;
                            Log.print(Log.l.error,
                                "select error! " + that.successCount + " success / " + that.errorCount + " errors");
                            that.timestamp = new Date();
                        });
                    } else {
                        var tagVcardBeginn = "BEGIN:VCARD";
                        var lstx = "#LSTX";
                        if (myResult.substr(0, tagVcardBeginn.length) === tagVcardBeginn) {
                            dataVCard = myResult;
                        } else if (myResult.substr(0, lstx.length) === lstx) {
                            dataImportCardscanVcard.OTHER = myResult.substr(lstx.length);
                        }
                        Log.ret(Log.l.trace);
                    }
                    return WinJS.Promise.as();
                }).then(function updateImportCardscan() {
                    Log.call(Log.l.trace, "callBcr.", "dataVCard=" + dataVCard);
                    var card = null;
                    //dataVCard = "BEGIN:VCARD\nVERSION:4.0\nN:Mustermann;Erika;;Dr.;\nFN:Dr. Erika Mustermann\nORG:Wikimedia\nROLE:Kommunikation\nTITLE:Redaktion &amp; Gestaltung\nPHOTO;MEDIATYPE=image/jpeg:http://commons.wikimedia.org/wiki/File:Erika_Mustermann_2010.jpg\nTEL;TYPE=work,voice;VALUE=uri:tel:+49-221-9999123\nTEL;TYPE=home,voice;VALUE=uri:tel:+49-221-1234567\nADR;TYPE=home;LABEL=" + "Heidestraße 17\n51147 Köln\nDeutschland" + "\n :;;Heidestraße 17;Köln;;51147;Germany\nEMAIL:erika@mustermann.de\nREV:20140301T221110Z\nEND:VCARD";
                    if (dataVCard)
                        card = vCard.parse(dataVCard);
                    Log.print(Log.l.info, "vcard to json" + card);
                    var tagVcardBeginn = "BEGIN:VCARD";
                    var lstx = "#LSTX";
                    var tagVersion3 = "VERSION:3.0";
                    var tagVersion4 = "VERSION:4.0";
                    var tagVcardEnd = "END:VCARD";

                    var tagName = "N:";
                    var tagformatedName = "FN:";
                    var tagOrganisation = "ORG:";
                    var tagAddress = "ADR:";
                    var tagTelefone = "TEL:";
                    var tagTeleFax = "TEL;TYPE=FAX";
                    var tagEmail = "EMAIL:";
                    var tagXGender = "X-GENDER:";
                    var tagTitle = "TITLE:";
                    var tagUrl = "URL:";
                    var tagXRefcode = "";

                    //var tagXrefcode
                    if (card) {
                        //object hasownproperty
                        for (var prop in card) {
                            if (card.hasOwnProperty(prop)) {
                                for (var i = 0; i < card[prop].length; i++) {
                                    if (card[prop][i].value) {
                                        console.log(card[prop][i].value);
                                        var vCardValues = card[prop][i].value;
                                        switch (prop) {
                                            case "n":
                                                console.log(vCardValues);
                                                nachname = vCardValues[0];
                                                vorname = vCardValues[1];
                                                weiterename = vCardValues[2];
                                                academicTitle = vCardValues[3];
                                                break;
                                            case "org":
                                                console.log(vCardValues);
                                                if (Array.isArray(vCardValues)) { // && vCardValues.length > 1
                                                    for (var y = 0; y < vCardValues.length; y++) {
                                                        companyname = companyname + vCardValues[y] + " ";
                                                    }
                                                } else {
                                                    companyname = companyname + vCardValues;
                                                }
                                                break;
                                            case "adr":
                                                //rowData[1]
                                                //ignore type paramaeter
                                                //Postfach
                                                poBox = vCardValues[0];
                                                extendedAddress = vCardValues[1]; // wird nicht gespeichert
                                                street = vCardValues[2];
                                                residence = vCardValues[3];
                                                state = vCardValues[4];
                                                postCode = vCardValues[5];
                                                country = vCardValues[6];
                                                break;
                                            case "tel": // telefone, mobile, fax 
                                                //meta type fax
                                                if (card.version[0].value < "4.0")
                                                    mobilePhone = card["tel"][0].value;
                                                else {
                                                    mobilePhone = card["tel"][0].value.split(":");
                                                    mobilePhone = mobilePhone[1];
                                                }
                                                if (card["tel"][1])
                                                    telefone = card["tel"][1].value;
                                                break;
                                            case "email":
                                                email = card["email"][0].value;
                                                break;
                                            case "X-GENDER":
                                                //rowData[1]
                                                if (card["X-GENDER"][0].value === "M" || "F") {
                                                    geschlecht = card["X-GENDER"][0].value;
                                                }
                                                if (geschlecht === "M") {
                                                    anrede = 1;
                                                }
                                                if (geschlecht === "F") {
                                                    anrede = 2;
                                                }

                                                //xgender = rowData[1];
                                                break;
                                            case "title":
                                                title = card["title"][0].value;
                                                break;
                                            case "url":
                                                url = card["url"][0].value;
                                                break;
                                            case "X-REFCODE":
                                                // wenn im x-refcode was drin steht, dann soll recherche in server mit dieser nummer gemacht werden
                                                // und da die Daten sich holen
                                                requestBarcode = card["X-REFCODE"][0].value;
                                                break;
                                            default:
                                                Log.print(Log.l.info, "IGNORE DATA");
                                        }
                                    }
                                }
                            }
                        }
                    }
                    //that.myvCardResult
                    Log.print(Log.l.info, "dataImportCardscanVcard=" + dataImportCardscanVcard);
                    if (!importcardscanid) {
                        Log.ret(Log.l.trace, "no record found!");
                        return WinJS.Promise.as();
                    }
                    if (importcardscanid) { //dataImportCardscanVcard !== {}
                        pAktionStatus = "VCARD_DONE";
                    } else {
                        pAktionStatus = "VCARD_ERROR";
                    }
                    Log.ret(Log.l.trace);
                    dataImportCardscanVcard.Button = pAktionStatus;
                    dataImportCardscanVcard.SCANTS = null;
                    if (!requestBarcode) {
                        if (vorname) {
                            dataImportCardscanVcard.FIRSTNAME = vorname;
                        }
                        if (nachname) {
                            dataImportCardscanVcard.LASTNAME = nachname;
                        }

                        dataImportCardscanVcard.MIDDLENAME = weiterename;
                        if (vorname && nachname) {
                            dataImportCardscanVcard.NAME = dataImportCardscanVcard.FIRSTNAME + " " + dataImportCardscanVcard.LASTNAME;
                        }

                        dataImportCardscanVcard.NAMEPREFIX = academicTitle;
                        dataImportCardscanVcard.TITLE = title;
                        dataImportCardscanVcard.COMPANY = companyname;
                        dataImportCardscanVcard.STREETADDRESS = street;
                        dataImportCardscanVcard.CITY = residence;
                        dataImportCardscanVcard.POSTALCODE = postCode;
                        dataImportCardscanVcard.COUNTRY = country;
                        dataImportCardscanVcard.PHONE = telefone;
                        dataImportCardscanVcard.MOBILEPHONE = mobilePhone;
                        dataImportCardscanVcard.FAX = teleFax;
                        dataImportCardscanVcard.EMAIL = email;
                        dataImportCardscanVcard.WEBSITE = url;
                        if (anrede)
                            dataImportCardscanVcard.INITAnredeID = anrede;

                        return that._importCardscan_ODataView.update(function (json) {
                            that.successCount++;
                            Log.print(Log.l.info, "_importCardscan_ODataView update: success! " + that.successCount + " success / " + that.errorCount + " errors");
                            that.timestamp = new Date();
                        }, function (error) {
                            that.errorCount++;
                            Log.print(Log.l.error,
                                "_importCardscan_ODataView error! " +
                                that.successCount +
                                " success / " +
                                that.errorCount +
                                " errors");
                            that.timestamp = new Date();
                        }, importcardscanid, dataImportCardscanVcard);

                    } else {
                        importBarcodeScanData.Request_Barcode = requestBarcode;
                        return that._importBarcodeScan_ODataView.insert(function (json) {
                            Log.print(Log.l.trace, "insert importBarcodeScan: success!");
                            // contactData returns object already parsed from json file in response
                            if (json && json.d) {

                            } else {
                                AppData.setErrorMsg(that.binding, { status: 404, statusText: "no data found" });
                            }
                            complete(json);
                        }, function (errorResponse) {
                            // called asynchronously if an error occurs
                            // or server returns response with an error status.
                            AppData.setErrorMsg(that.binding, errorResponse);
                        }, importBarcodeScanData);
                    }
                });
            return ret;
        },

        dispose: function () {
            Log.call(Log.l.trace, "bcrService.");
            this.dbEngine = null;
            Log.ret(Log.l.trace);
            return WinJS.Promise.as();
        },

        info: function () {
            Log.call(Log.l.trace, "bcrService.");
            var infoText = this.successCount + " success / " + this.errorCount + " errors";
            if (this.timestamp) {
                infoText += "\n" + this.timestamp.toLocaleTimeString();
            }
            if (this.results) {
                for (var i = 0; i < this.results.length; i++) {
                    infoText += "\n" + "[" + i + "]: " + this.results[i];
                }
            }
            Log.ret(Log.l.trace);
            return infoText;
        }
    };
    module.exports = dispatcher;
})();