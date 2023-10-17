## Convey Lib UI

A JavaScript Library to build interactive Mobile Apps and Web Browser Apps with data bindings to OData Server or local SQLite storage.

### Installation

Include the following files into jour project:

#### This library ist based on Microsoft WinJS library (minimum Version: 4.4.4 2017-07-24), so include at least into your project:

- base.js / base.min.js
- ui.s / ui.min.js

#### Compatibility to ECMAScript ES6 Promise requires 

- winjs-es6promise.js

#### Convey Lib Base components

- logging.js 
- strings.js 
- appSettings.js 
- dataService.js 
- dbinit.js 

#### For use with local sqlite storage and database replication: 

- sqlite.js 
- replService.js 

#### Main components: 

- appbar.js
- pageController.js
- fragmentController.js
- navigator.js
- pageFrame.js
- colors.js
- colorPicker.js
- inertia.js


### Using the library ##

Since data schema ist retrieved from RelationSpec/ AttribSpec tables, DB schema configuration has to be done via Convey Application Builder.

Follows the [OData Schema spec](https://github.com/conveyGmbH/LSOdata), so that it works with the OData server.

The code structure for us roughly follows the MWWM model, with always one folder per UI interface, i.e. "page" or "page fragment". Always divided into three source code parts as different files in each folder: "UI frame class", "DB service class" and "controller class".

In the "controller-class" the objects from the UI-lib are addressed which are needed for user interface control.