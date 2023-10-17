## Convey Lib Base

A JavaScript Library to build interactive Mobile Apps, Web Browser Apps or NodeJS Service Workers with data bindings to OData Server or local SQLite storage.

### Installation

Include the following files into jour project:

#### This library ist based on Microsoft WinJS library (minimum Version: 4.4.4 2017-07-24), so include at least into your project:

- base.js / base.min.js
- ui.s / ui.min.js

#### Compatibility to ECMAScript ES6 Promise requires 

- winjs-es6promise.js

#### Main components

- logging.js 
- strings.js 
- appSettings.js 
- dataService.js 
- dbinit.js 

#### For use with local sqlite storage and database replication: 

- sqlite.js 
- replService.js 

#### For use as NodeJS service worker in addition: 

- workerService.js

### Using the library ##

Since data schema ist retrieved from RelationSpec/ AttribSpec tables, DB schema configuration has to be done via Convey Application Builder.

Follows the [OData Schema spec](https://github.com/conveyGmbH/LSOdata), so that it works with the OData server.

The code structure for us roughly follows the MWWM model, with always one folder per UI interface, i.e. "page" or "page fragment". Always divided into three source code parts as different files in each folder: "UI frame class", "DB service class" and "controller class".

In the "DB-Service-class" the objects from the base-lib are addressed which are needed for binding.