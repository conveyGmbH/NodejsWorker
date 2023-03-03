﻿// base-class for page controller helper object
/// <reference path="../../../lib/WinJS/scripts/base.js" />
/// <reference path="../../../lib/WinJS/scripts/ui.js" />
/// <reference path="../../../lib/convey/scripts/logging.js" />
/// <reference path="../../../lib/convey/scripts/appSettings.js" />
/// <reference path="../../../lib/convey/scripts/dataService.js" />
/// <reference path="../../../lib/convey/scripts/appbar.js" />

(function () {
    "use strict";

    WinJS.Utilities._require([
        'WinJS/Core/_Global'
    ], function (_Global) {
        var head = _Global.document.head || _Global.document.getElementsByTagName("head")[0];

        WinJS.Namespace.define("Application", {
            /**
             * @class Controller 
             * @memberof Application
             * @param {Object} element - The HTML root element of the page
             * @param {Object} addPageData - An object to add to the page data binding proxy
             * @param {Object[]} commandList -  List of command properties
             * @param {boolean} isMaster - True if the page is to be used as master view
             * @description This class implements the base class for page controller
             */
            Controller: WinJS.Class.define(function Controller(pageElement, addPageData, commandList, isMaster) {
                Log.call(Log.l.trace, "Application.Controller.");
                var controllerElement = pageElement;
                while (controllerElement &&
                    controllerElement.className.indexOf("data-container") < 0) {
                    controllerElement = controllerElement.firstElementChild || controllerElement.firstChild;
                }
                if (controllerElement) {
                    Log.print(Log.l.trace, "controllerElement: #" + controllerElement.id);
                    controllerElement.winControl = this;
                    WinJS.Utilities.addClass(controllerElement, "win-disposable");
                    this._element = controllerElement;
                }
                this._disposed = false;
                this._derivedDispose = null;
                this._pageData = {
                    generalData: AppData.generalData,
                    appSettings: AppData.appSettings,
                    resources: {},
                    messageText: null,
                    error: {
                        errorMsg: "",
                        displayErrorMsg: "none"
                    }
                };
                this.isMaster = isMaster;
                this._commandList = commandList;
                this._eventHandlers = {};
                this._disableHandlers = {};

                // record set forward!
                this._records = null;

                // Set scope only if commandList is specified - don't use commandList for master views!
                if (!isMaster) {
                    if (typeof commandList !== "undefined") {
                        AppBar.commandList = commandList;
                    }
                    AppBar.scope = this;
                }

                var that = this;

                this.scripts = {};
                var headScriptsInitialized = false;
                var headScripts = {};
                var addScript = function (scriptTag, fragmentHref, position, lastNonInlineScriptPromise) {
                    // We synthesize a name for inline scripts because today we put the
                    // inline scripts in the same processing pipeline as src scripts. If
                    // we seperated inline scripts into their own logic, we could simplify
                    // this somewhat.
                    //
                    var src = scriptTag.src;
                    var inline = !src;
                    if (inline) {
                        src = fragmentHref + "script[" + position + "]";
                    }
                    src = src.toLowerCase();

                    if (!headScriptsInitialized) {
                        headScriptsInitialized = true;
                        var scriptElements = head.querySelectorAll("script");
                        if (scriptElements && scriptElements.length > 0) {
                            for (var i = 0; i < scriptElements.length; i++) {
                                var e = scriptElements[i];
                                headScripts[e.src.toLowerCase()] = true;
                            }
                        }
                    }

                    if (!(src in headScripts) && !(src in that.scripts)) {
                        var promise = null;

                        var n = _Global.document.createElement("script");
                        if (scriptTag.language) {
                            n.setAttribute("language", "javascript");
                        }
                        n.setAttribute("type", scriptTag.type);
                        n.setAttribute("async", "false");
                        if (scriptTag.id) {
                            n.setAttribute("id", scriptTag.id);
                        }
                        if (inline) {
                            var text = scriptTag.text;
                            promise = lastNonInlineScriptPromise.then(function () {
                                n.text = text;
                            }).then(null, function () {
                                // eat error
                            });
                        } else {
                            promise = new WinJS.Promise(function (c) {
                                n.onload = n.onerror = function () {
                                    c();
                                };

                                // Using scriptTag.src to maintain the original casing
                                n.setAttribute("src", scriptTag.src);
                            });
                        }
                        that.scripts[src] = n;
                        head.appendChild(n);

                        return {
                            promise: promise,
                            inline: inline
                        };
                    } else {
                        return lastNonInlineScriptPromise;
                    }
                };

                // First, we call WinJS.Binding.as to get the bindable proxy object
                /**
                 * @property {Object} binding - Bindable proxy object connected to page data 
                 * @memberof Application.Controller
                 * @description Read/Write. 
                 *  Use this property to retrieve or set the page data via bindable proxy object.
                 *  Changes in the binding member of the controller are automatically synchronized between bound page control elements and the data members.
                 *  See {@link https://msdn.microsoft.com/en-us/library/windows/apps/br229801.aspx WinJS.Binding.as} for furher informations.
                 */
                this.binding = WinJS.Binding.as(this._pageData);
                var propertyName;
                AppData.setErrorMsg(this.binding);
                // Then, we add all properties of derived class to the bindable proxy object
                var sp = [];
                if (addPageData) {
                    for (propertyName in addPageData) {
                        if (addPageData.hasOwnProperty(propertyName)) {
                            if (propertyName === "scripts" && Array.isArray(addPageData[propertyName])) {
                                var scripts = addPageData[propertyName];
                                if (scripts.length > 0 && controllerElement.winControl) {
                                    var lastNonInlineScriptPromise = WinJS.Promise.as();
                                    scripts.forEach(function (e, i) {
                                        var result = addScript(e, controllerElement.winControl.uri, i, lastNonInlineScriptPromise);
                                        if (result) {
                                            if (!result.inline) {
                                                lastNonInlineScriptPromise = result.promise;
                                            }
                                            sp.push(result.promise);
                                        }
                                    });
                                }
                            } else {
                                Log.print(Log.l.trace, "added " + propertyName + "=" + addPageData[propertyName]);
                                this.binding.addProperty(propertyName, addPageData[propertyName]);
                            }
                        }
                    }
                }
                if (sp.length > 0) {
                    this.addPagePromise = WinJS.Promise.join(sp);
                } else {
                    this.addPagePromise = null;
                }

                this._eventHandlerRemover = [];
                /**
                 * @function addRemovableEventListener
                 * @param {Object} e - The HTML element to add an event listener to
                 * @param {string} eventName - The name of the event
                 * @param {function} handler - The event handler function
                 * @param {bool} capture - Controls if the event bubbles through the event handler chain
                 * @memberof Application.Controller
                 * @description Call this function to add event listener to avoid memory leaks due to not removed event listeners on unload of the page.
                 *  Do not use the addEventListener() inside the derived page controller class!
                 *  All event handlers added by this functions are automatically removed on unload of the page.
                 */
                this.addRemovableEventListener = function (e, eventName, handler, capture) {
                    e.addEventListener(eventName, handler, capture);
                    that._eventHandlerRemover.push(function () {
                        e.removeEventListener(eventName, handler);
                    });
                };

                this._disposablePromises = [];
                /**
                 * @function addDisposablePromise
                 * @param {Object} promise - The promise to add to disposable list
                 * @memberof Application.Controller
                 * @description Call this function to add a promise to a list of disposable promises
                 *  All disposable promises added by this functions are automatically calcelled on dispose of the page.
                 */
                this.addDisposablePromise = function (promise) {
                    if (this._disposablePromises &&
                        typeof this._disposablePromises.push === "function") {
                        this._disposablePromises.push(promise);
                    }
                    return promise;
                };
                /**
                 * @function removeDisposablePromise
                 * @param {Object} promise - The promise to remove from disposable list
                 * @memberof Application.Controller
                 * @description Call this function to remove a promise from a list of disposable promises
                 */
                this.removeDisposablePromise = function (promise) {
                    if (this._disposablePromises && this._disposablePromises.length > 0) {
                        for (var i = 0; i < this._disposablePromises.length; i++) {
                            if (this._disposablePromises[i] === promise) {
                                this._disposablePromises.splice(i, 1);
                                break;
                            }
                        }
                    }
                    return promise;
                };

                Log.ret(Log.l.trace);
            }, {
                /**
                 * @property {Object} pageData - Root element of bindable page data
                 * @property {Object} pageData.generalData - Data member prefilled with application wide used data members
                 * @property {Object} pageData.appSettings - Data member prefilled with application settings data members
                 * @property {string} pageData.messageText - Page message text
                 * @property {Object} pageData.error - Error status of page
                 * @property {string} pageData.error.errorMsg - Error message to be shown in alert flyout
                 * @property {boolean} pageData.error.displayErrorMsg - True, if the error alert flyout should be visible
                 * @memberof Application.Controller
                 * @description Read/Write. 
                 *  Use this property to retrieve or set the page data used by the binding proxy.
                 */
                pageData: {
                    get: function () {
                        return this._pageData;
                    },
                    set: function (newPageData) {
                        this._pageData = newPageData;
                    }
                },
                _disableHandlers: {},
                /**
                 * @property {Object} disableHandlers - Object with member functions controlling disabled/enabled sate of command handlers in the page
                 * @memberof Application.Controller
                 * @description Read/Write. 
                 *  Use this property to retrieve or set the enable/disable handler for command ids to be used in the page controller.
                 *  The disableHandlers object can contain a member function named with the command id.
                 *  If the disableHandlers member function of the command returns true, the command is disabled in the application toolbar control.
                 *  See {@link https://msdn.microsoft.com/en-us/library/windows/apps/hh700497.aspx WinJS.UI.AppBarCommand} for further informations.
                 */
                disableHandlers: {
                    get: function () {
                        return this._disableHandlers;
                    },
                    set: function (newDisableHandlers) {
                        this._disableHandlers = newDisableHandlers;
                        // don't do this for master views!
                        if (!this.isMaster) {
                            AppBar.disableHandlers = this._disableHandlers;
                        }
                    }
                },
                _eventHandlers: {},
                /**
                 * @property {Object} eventHandlers - Object with member functions to handle commands in the page
                 * @memberof Application.Controller
                 * @description Read/Write. 
                 *  Use this property to retrieve or set the event handlers for command ids to be used in the page controller.
                 *  The eventHandlers object must contain a member function named with the command id for each command id the page controller should handle.
                 *  See {@link https://msdn.microsoft.com/en-us/library/windows/apps/hh700497.aspx WinJS.UI.AppBarCommand} for further informations.
                 */
                eventHandlers: {
                    get: function () {
                        return this._eventHandlers;
                    },
                    set: function (newEventHandlers) {
                        this._eventHandlers = newEventHandlers;
                        // don't do this for master views!
                        if (!this.isMaster) {
                            AppBar.eventHandlers = this._eventHandlers;
                        }
                    }
                },
    			addScrollIntoViewCheck: function (input, scrollSurface) {
			        var that = this;
			        if (input) {
				        var prevBlurHandler = input.onblur;
				        var prevFocusHandler = input.onfocus;
				        input.onfocus = function (event) {
				            input._scrollIntoViewCheck = function (repeat) {
					        var activeElement = document.activeElement;
	                        var pageElement = Application.navigator.pageElement;
					        if (activeElement === input &&
					            pageElement.contains(that.element)) {
						        function scrollIntoView() {
                                    if (scrollSurface && scrollSurface.scrollHeight > 0) {
                                        var position = WinJS.Utilities._getPositionRelativeTo(input, scrollSurface);
                                        var top = position.top - scrollSurface.scrollTop;
                                        var height = position.height;
                                        var clientHeight = scrollSurface.clientHeight;
                                        if (top < 20) {
                                            Log.print(Log.l.trace, "scrollIntoView: scrollTop " + scrollSurface.scrollTop + "=>" + (scrollSurface.scrollTop - (20 - top)).toString());
                                            scrollSurface.scrollTop -= 20 - top;
                                        } else if ((top + height) > clientHeight) {
                                            Log.print(Log.l.trace, "scrollIntoView: scrollTop " + scrollSurface.scrollTop + "=>" + (scrollSurface.scrollTop + (top + height - clientHeight)).toString());
                                            scrollSurface.scrollTop += top + height - clientHeight;
                                        } else {
                                            Log.print(Log.l.trace, "scrollIntoView: top=" + top + " clientHeight=" + clientHeight + " scrollTop=" + scrollSurface.scrollTop);
                                        }
                                    }
						        }
						        function resizeView() {
						            var clientHeight = pageElement.clientHeight;
						            if (AppBar.commandList &&
							            AppBar.commandList.length > 0 &&
							            AppBar.barElement &&
							            AppBar.barElement.clientHeight > 0) {
							                var positionContent = WinJS.Utilities._getPositionRelativeTo(pageElement, null);
							                var positionAppBar = WinJS.Utilities._getPositionRelativeTo(AppBar.barElement, null);
							                var newHeight = positionAppBar.top - positionContent.top;
							                if (newHeight < clientHeight) {
							                    Log.print(Log.l.trace, "resizeView: height " + clientHeight + "=>" + newHeight);
							                    pageElement.style.height = newHeight + "px";
							                    var contentarea = pageElement.querySelector(".contentarea");
							                    if (contentarea && contentarea.style) {
							                        contentarea.style.height = newHeight.toString() + "px";
							                    }
							                    Application.navigator.elementUpdateLayout(pageElement);
							                } else {
							                    Log.print(Log.l.trace, "resizeView: positionContent.top=" + positionContent.top + " positionAppBar.top=" + positionAppBar.top + " clientHeight=" + clientHeight);
							                }
						                }
						            }
						            WinJS.Promise.timeout(50).then(function () {
						                if (!AppBar.hasShowingKeyboardHandler) {
							                resizeView();
						                }
						                return WinJS.Promise.timeout(50);
						            }).then(function () {
						                scrollIntoView();
						                return WinJS.Promise.timeout(100);
						            }).then(function () {
						                if (typeof repeat === "number" && repeat > 1 &&
						                    typeof input._scrollIntoViewCheck === "function") {
							                input._scrollIntoViewCheck(--repeat);
						                }
						            });
					            }
				            }
				            var target = event.target;
				            if (target === input && 
				                typeof input._scrollIntoViewCheck === "function") {
					            input._scrollIntoViewCheck(5);
				            }
				            if (typeof prevFocusHandler === "function") {
					            return prevFocusHandler(event);
				            } else {
					            return true;
				            }
				        }
				        input.onblur = function (event) {
				            WinJS.Promise.timeout(0).then(function () {
				                var pageElement = Application.navigator.pageElement;
					            if (pageElement) {
					                Application.navigator.resizePageElement(pageElement);
					            }
				            });
				            if (input._scrollIntoViewCheck) {
					            delete input._scrollIntoViewCheck;
				            }
				            if (typeof prevBlurHandler === "function") {
					            return prevBlurHandler(event);
				            } else {
					            return true;
				            }
				        }
			        }
			    },
                addScrollIntoViewCheckForInputElements: function(listView) {
                    if (typeof device === "object" &&
                        (device.platform === "windows" || device.platform === "Android")) {
                        var scrollSurface = listView.querySelector(".win-viewport");
                        if (scrollSurface) {
                            var inputs = scrollSurface.querySelectorAll("input, textarea");
                            if (inputs && inputs.length > 0) {
                                for (var j = 0; j < inputs.length; j++) {
                                    this.addScrollIntoViewCheck(inputs[j], scrollSurface);
                                }
                            }
                        }
                    }
                },
                /**
               * @function processAll
               * @returns {WinJS.Promise} The fulfillment of the binding processing is returned in a {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211867.aspx WinJS.Promise} object.
               * @memberof Application.Controller
               * @description Call this function at the end of the constructor function of the derived fragment controller class to process resource load and data binding in the page.
               *  See {@link https://msdn.microsoft.com/en-us/library/windows/apps/br211864.aspx WinJS.Resources.processAll} and {@link https://msdn.microsoft.com/en-us/library/windows/apps/br229846.aspx WinJS.Binding.processAll} for further informations.
               */
                processAll: function () {
                    var that = this;
                    var ret = WinJS.Resources.processAll(that.element).then(function () {
                        return WinJS.Binding.processAll(that.element, that.binding);
                    }).then(function () {
                        if (typeof device === "object") {
                            if (device.platform === "windows") {
                                if (AppBar.barControl &&
                                    !AppBar.barControl._handleShowingKeyboardNew &&
                                    typeof AppBar.barControl._handleShowingKeyboardBound === "function") {
                                    var prevHandleShowingKeyboardBound = AppBar.barControl._handleShowingKeyboardBound;
                                    WinJS.Utilities._inputPaneListener.removeEventListener(AppBar.barControl._dom.root, "showing", AppBar.barControl._handleShowingKeyboardBound);
                                    AppBar.barControl._handleShowingKeyboardNew = function (event) {
                                        AppBar.hasShowingKeyboardHandler = true;
                                        var occludedRect = null;
                                        var ret = prevHandleShowingKeyboardBound(event) || WinJS.Promise.as();
                                        // disable automatic focused-element-in-view behavior on Windows devices!
                                        if (event && event.detail && event.detail.originalEvent && event.detail.originalEvent.detail) {
                                            var inputPaneVisibilityEventArgs = event.detail.originalEvent.detail[0];
                                            if (inputPaneVisibilityEventArgs) {
                                                inputPaneVisibilityEventArgs.ensuredFocusedElementInView = true;
                                                occludedRect = inputPaneVisibilityEventArgs.occludedRect;
                                            }
                                        }
                                        var pageElement = Application.navigator.pageElement;
                                        return ret.then(function () {
                                            if (occludedRect && occludedRect.height > 0) {
                                                if (pageElement && pageElement.style) {
                                                    var newHeight = pageElement.clientHeight - occludedRect.height;
                                                    pageElement.style.height = newHeight + "px";
                                                    var contentarea = pageElement.querySelector(".contentarea");
                                                    if (contentarea && contentarea.style) {
                                                        contentarea.style.height = newHeight.toString() + "px";
                                                    }
                                                    Application.navigator.elementUpdateLayout(pageElement);
                                                }
                                                return WinJS.Promise.timeout(0);
                                            } else {
                                                return WinJS.Promise.timeout(250);
                                            }
                                        }).then(function () {
                                            if (pageElement && pageElement.style) {
                                                var clientHeight = pageElement.clientHeight;
                                                if (AppBar.commandList &&
                                                    AppBar.commandList.length > 0 &&
                                                    AppBar.barElement &&
                                                    AppBar.barElement.clientHeight > 0) {
                                                    var positionContent = WinJS.Utilities._getPositionRelativeTo(pageElement, null);
                                                    var positionAppBar = WinJS.Utilities._getPositionRelativeTo(AppBar.barElement, null);
                                                    var newHeight = positionAppBar.top - positionContent.top;
                                                    if (newHeight < clientHeight) {
                                                        pageElement.style.height = newHeight + "px";
                                                        var contentarea = pageElement.querySelector(".contentarea");
                                                        if (contentarea && contentarea.style) {
                                                            contentarea.style.height = newHeight.toString() + "px";
                                                        }
                                                        Application.navigator.elementUpdateLayout(pageElement);
                                                    }
                                                }
                                            }
                                            var activeElement = document.activeElement;
                                            if (activeElement &&
                                                typeof activeElement._scrollIntoViewCheck === "function") {
                                                activeElement._scrollIntoViewCheck(5);
                                            }
                                        });
                                    }
                                    AppBar.barControl._handleShowingKeyboardBound = AppBar.barControl._handleShowingKeyboardNew.bind(AppBar.barControl);
                                    WinJS.Utilities._inputPaneListener.addEventListener(AppBar.barControl._dom.root, "showing", AppBar.barControl._handleShowingKeyboardBound);
                                }
                                if (AppBar.barControl &&
                                    !AppBar.barControl._handleHidingKeyboardNew &&
                                    typeof AppBar.barControl._handleHidingKeyboardBound === "function") {
                                    var prevHandleHidingKeyboardBound = AppBar.barControl._handleHidingKeyboardBound;
                                    WinJS.Utilities._inputPaneListener.removeEventListener(AppBar.barControl._dom.root, "hiding", AppBar.barControl._handleHidingKeyboardBound);
                                    AppBar.barControl._handleHidingKeyboardNew = function (event) {
                                        var ret = prevHandleHidingKeyboardBound(event) || WinJS.Promise.as();
                                        var pageElement = Application.navigator.pageElement;
                                        return ret.then(function () {
                                            if (pageElement) {
                                                Application.navigator.resizePageElement(pageElement);
                                            }
                                        });
                                    }
                                    AppBar.barControl._handleHidingKeyboardBound = AppBar.barControl._handleHidingKeyboardNew.bind(AppBar.barControl);
                                    WinJS.Utilities._inputPaneListener.addEventListener(AppBar.barControl._dom.root, "hiding", AppBar.barControl._handleHidingKeyboardBound);
                                }
                            }
                            if (device.platform === "windows" || device.platform === "Android") {
                                var scrollSurface = that.element.querySelector(".contentarea");
                                var inputs = that.element.querySelectorAll("input, textarea");
                                if (inputs && inputs.length > 0) {
                                    for (var i = 0; i < inputs.length; i++) {
                                        that.addScrollIntoViewCheck(inputs[i], scrollSurface);
                                    }
                                }
                            }
                        }
                    });
                    if (this.addPagePromise) {
                        return this.addPagePromise.then(function () {
                            return ret;
                        });
                    } else {
                        return ret;
                    }
                },
                _disposed: false,
                _dispose: function () {
                    var i;
                    Log.call(Log.l.trace, "Application.Controller.");
                    if (this._disposed) {
                        Log.ret(Log.l.trace, "extra ignored!");
                        return;
                    }
                    this._disposed = true;
                    if (this._disposablePromises && this._disposablePromises.length > 0) {
                        for (i = 0; i < this._disposablePromises.length; i++) {
                            var promise = this._disposablePromises[i];
                            if (promise && typeof promise.cancel === "function") {
                                Log.print(Log.l.info, "cancelling disposablePromises[" + i + "]");
                                promise.cancel();
                            }
                        }
                        this._disposablePromises = null;
                    }
                    if (this._derivedDispose) {
                        this._derivedDispose();
                    }
                    if (this.records) {
                        // free record set!
                        this.records = null;
                    }
                    if (this.scripts) {
                        var src;
                        for (src in this.scripts) {
                            if (this.scripts.hasOwnProperty(src)) {
                                var s = this.scripts[src];
                                s.parentNode.removeChild(s);
                            }
                        }
                    }
                    if (this._eventHandlerRemover) {
                        for (i = 0; i < this._eventHandlerRemover.length; i++) {
                            this._eventHandlerRemover[i]();
                        }
                        this._eventHandlerRemover = null;
                    }
                    this.binding = WinJS.Binding.unwrap(this.binding);
                    this._element = null;
                    Log.ret(Log.l.trace);
                },
                _derivedDispose: null,
                /**
                 * @property {function} dispose
                 * @memberof Application.Controller
                 * @description Read/Write. 
                 *  Use this property to overwrite the dispose function in the derived controller class.
                 *  The framework calls the function returned from this property to dispose the page controller. 
                 *  If a new dispose function is set in the derived controller class, this function is called on retrieval of the property by the framework.
                 *  Do not retrieve this property in your application.
                 */
                dispose: {
                    get: function () {
                        return this._dispose;
                    },
                    set: function (newDispose) {
                        if (typeof newDispose === "function") {
                            this._derivedDispose = newDispose;
                        }
                    }
                },
                /**
                 * @property {Object} element
                 * @memberof Application.Controller
                 * @description Read/Write. 
                 *  Use this property to retrieve or set the HTML root element of the page.
                 */
                element: {
                    get: function () {
                        return this._element;
                    },
                    set: function (newElement) {
                        this._element = newElement;
                    }
                },
                commandList: {
                    get: function () {
                        return this._commandList;
                    }
                },
                setFocusOnItemInListView: function(listView) {
                    var that = this;
                    if (listView && listView.winControl) {
                        var getTextareaForFocus = function(element) {
                            var focusElement = null;
                            if (element) {
                                var textareas = element.querySelectorAll(".win-textarea, .win-textbox");
                                if (textareas)
                                    for (var i = 0; i < textareas.length; i++) {
                                        var textarea = textareas[i];
                                        if (textarea) {
                                            var position = WinJS.Utilities.getPosition(textarea);
                                            if (position) {
                                                var left = position.left;
                                                var top = position.top;
                                                var width = position.width;
                                                var height = position.height;
                                                if (that.cursorPos.x >= left &&
                                                    that.cursorPos.x <= left + width &&
                                                    that.cursorPos.y >= top &&
                                                    that.cursorPos.y <= top + height + 2) {
                                                    focusElement = textarea;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                            }
                            Log.ret(Log.l.trace);
                            return focusElement;
                        }
                        var trySetActive = function(element, scroller) {
                            var success = true;
                            // don't call setActive() if a dropdown control has focus!
                            var comboInputFocus = element.querySelector(".win-dropdown:focus");
                            if (!comboInputFocus) {
                                var focusElement = getTextareaForFocus(element);
                                try {
                                    if (typeof element.setActive === "function") {
                                        element.setActive();
                                        if (focusElement && focusElement !== element) {
                                            focusElement.focus();
                                        }
                                    }
                                } catch (e) {
                                    // setActive() raises an exception when trying to focus an invisible item. Checking visibility is non-trivial, so it's best
                                    // just to catch the exception and ignore it. focus() on the other hand, does not raise exceptions.
                                    success = false;
                                }
                                if (success) {
                                    // check for existence of WinRT
                                    var resources = Resources.get();
                                    if (resources) {
                                        if (focusElement && focusElement !== element) {
                                            function trySetFocus(fe, retry) {
                                                try {
                                                    fe.focus();
                                                } catch (e) {
                                                    // avoid exception on hidden element
                                                }
                                                WinJS.Promise.timeout(100)
                                                    .then(function() {
                                                        if (typeof retry === "number" && retry > 1 && listView.contains(fe)) {
                                                            trySetFocus(fe, --retry);
                                                        }
                                                    });
                                            }

                                            trySetFocus(focusElement, 5);
                                        }
                                    }
                                }
                            }
                            return success;
                        };
                        // overwrite _setFocusOnItem for this ListView to supress automatic
                        // scroll-into-view when calling item.focus() in base.js implementation
                        // by prevent the call of _ElementUtilities._setActive(item);
                        listView.winControl._setFocusOnItem = function ListView_setFocusOnItem(entity) {
                            this._writeProfilerMark("_setFocusOnItem,info");
                            if (this._focusRequest) {
                                this._focusRequest.cancel();
                            }
                            if (this._isZombie()) {
                                return;
                            }
                            var winControl = this;
                            var setFocusOnItemImpl = function(item) {
                                if (winControl._isZombie()) {
                                    return;
                                }

                                if (winControl._tabManager.childFocus !== item) {
                                    winControl._tabManager.childFocus = item;
                                }
                                winControl._focusRequest = null;
                                if (winControl._hasKeyboardFocus && !winControl._itemFocused) {
                                    if (winControl._selection._keyboardFocused()) {
                                        winControl._drawFocusRectangle(item);
                                    }
                                    // The requestItem promise just completed so _cachedCount will
                                    // be initialized.
                                    if (entity.type === WinJS.UI.ObjectType.groupHeader ||
                                        entity.type === WinJS.UI.ObjectType.item) {
                                        winControl._view
                                            .updateAriaForAnnouncement(item,
                                                (
                                                    entity.type === WinJS.UI.ObjectType.groupHeader
                                                        ? winControl._groups.length()
                                                        : winControl._cachedCount));
                                    }

                                    // Some consumers of ListView listen for item invoked events and hide the listview when an item is clicked.
                                    // Since keyboard interactions rely on async operations, sometimes an invoke event can be received before we get
                                    // to WinJS.Utilities._setActive(item), and the listview will be made invisible. If that happens and we call item.setActive(), an exception
                                    // is raised for trying to focus on an invisible item. Checking visibility is non-trivial, so it's best
                                    // just to catch the exception and ignore it.
                                    winControl._itemFocused = true;
                                    trySetActive(item);
                                }
                            };

                            if (entity.type === WinJS.UI.ObjectType.item) {
                                this._focusRequest = this._view.items.requestItem(entity.index);
                            } else if (entity.type === WinJS.UI.ObjectType.groupHeader) {
                                this._focusRequest = this._groups.requestHeader(entity.index);
                            } else {
                                this._focusRequest = WinJS.Promise.wrap(entity.type === WinJS.UI.ObjectType.header ? this._header : this._footer);
                            }
                            this._focusRequest.then(setFocusOnItemImpl);
                        };
                    }
                }
            })
        });
    });


    WinJS.Namespace.define("Application", {
        /**
         * @class RecordsetController 
         * @memberof Application
         * @param {Object} element - The HTML root element of the page
         * @param {Object} addPageData - An object to add to the page data binding proxy
         * @param {Object[]} commandList -  List of command properties
         * @param {boolean} isMaster - True if the page is to be used as master view
         * @param {Object} tableView - database service view object used to modify table data
         * @param {Object} showView - database service view object used to select table data
         * @description This class implements the base class for page controller including recordset selection and modification
         */
        RecordsetController: WinJS.Class.derive(Application.Controller, function RecordsetController(pageElement, addPageData, commandList, isMaster, tableView, showView, listView) {
            Log.call(Log.l.trace, "RecordsetController.Controller.");
            Application.Controller.apply(this, [pageElement, addPageData, commandList, isMaster]);
            if (showView && !tableView) {
                tableView = showView;
            }
            if (!tableView) {
                Log.print(Log.l.error, "tableView missing!");
            } else {
                Log.print(Log.l.trace, "tableView: relationName=" + tableView.relationName);
                if (!showView) {
                    showView = tableView;
                } else {
                    Log.print(Log.l.trace, "showView: relationName=" + showView.relationName);
                }
            }
            this.tableView = tableView;
            this.showView = showView;
            this.listView = listView;
            this.nextUrl = null;
            this.loading = false;
            this.curRecId = 0;
            this.prevRecId = 0;
        }, {
            mergeRecord: function (prevRecord, newRecord) {
                Log.call(Log.l.trace, "RecordsetController.Controller.");
                var ret = false;
                for (var prop in newRecord) {
                    if (newRecord.hasOwnProperty(prop)) {
                        if (newRecord[prop] !== prevRecord[prop]) {
                            prevRecord[prop] = newRecord[prop];
                            ret = true;
                        }
                    }
                }
                Log.ret(Log.l.trace, ret);
                return ret;
            },
            selectRecordId: function (recordId) {
                Log.call(Log.l.trace, "RecordsetController.Controller.", "recordId=" + recordId);
                if (this.records && this.showView &&
                    recordId && this.listView && this.listView.winControl && this.listView.winControl.selection) {
                    for (var i = 0; i < this.records.length; i++) {
                        var record = this.records.getAt(i);
                        if (record && typeof record === "object" &&
                            this.showView.getRecordId(record) === recordId) {
                            this.listView.winControl.selection.set(i);
                            break;
                        }
                    }
                }
                Log.ret(Log.l.trace);
            },
            scopeFromRecordId: function (recordId) {
                var ret = null;
                Log.call(Log.l.trace, "RecordsetController.Controller.", "recordId=" + recordId);
                if (this.records && this.showView && recordId) {
                    var i, item = null;
                    for (i = 0; i < this.records.length; i++) {
                        var record = this.records.getAt(i);
                        if (record && typeof record === "object" &&
                            this.showView.getRecordId(record) === recordId) {
                            item = record;
                            break;
                        }
                    }
                    if (item) {
                        Log.print(Log.l.trace, "found i=" + i);
                        ret = { index: i, item: item };
                    } else {
                        Log.print(Log.l.trace, "not found");
                    }
                }
                Log.ret(Log.l.trace, ret);
                return ret;
            },
            deleteData: function (complete, error) {
                var ret = null;
                Log.call(Log.l.trace, "RecordsetController.Controller.");
                if (this.tableView && typeof this.tableView.deleteRecord === "function" && this.curRecId) {
                    var that = this;
                    var recordId = that.curRecId;
                    AppBar.busy = true;
                    AppData.setErrorMsg(that.binding);
                    ret = that.tableView.deleteRecord(function (response) {
                        that.curRecId = 0;
                        AppData.setRecordId(that.tableView.relationName, that.curRecId);
                        AppBar.busy = false;
                        // called asynchronously if ok
                        if (typeof complete === "function") {
                            complete(response);
                            return WinJS.Promise.as();
                        } else {
                            return that.loadData();
                        }
                    }, function (errorResponse) {
                        AppBar.busy = false;
                        if (typeof error === "function") {
                            error(errorResponse);
                        } else {
                            // delete ERROR
                            var message = null;
                            Log.print(Log.l.error, "error status=" + errorResponse.status + " statusText=" + errorResponse.statusText);
                            if (errorResponse.data && errorResponse.data.error) {
                                Log.print(Log.l.error, "error code=" + errorResponse.data.error.code);
                                if (errorResponse.data.error.message) {
                                    Log.print(Log.l.error, "error message=" + errorResponse.data.error.message.value);
                                    message = errorResponse.data.error.message.value;
                                }
                            }
                            if (!message) {
                                message = getResourceText("error.delete");
                            }
                            AppData.setErrorMsg(that.binding, message);
                        }
                    }, recordId);
                }
                if (!ret) {
                    ret = new WinJS.Promise.as().then(function () {
                        complete({});
                    });
                }
                Log.ret(Log.l.trace, ret);
                return ret;
            },
            saveData: function (complete, error) {
                var ret = null;
                Log.call(Log.l.trace, "RecordsetController.Controller.");
                if (this.tableView && typeof this.tableView.update === "function") {
                    var that = this;
                    // standard call via modify
                    var recordId = that.prevRecId;
                    if (!recordId) {
                        // called via canUnload
                        recordId = that.curRecId;
                    }
                    that.prevRecId = 0;
                    if (recordId) {
                        var curScope = that.scopeFromRecordId(recordId);
                        if (curScope && curScope.item) {
                            var newRecord = that.getFieldEntries(curScope.index);
                            if (that.mergeRecord(curScope.item, newRecord) || AppBar.modified) {
                                AppData.setErrorMsg(that.binding);
                                Log.print(Log.l.trace, "save changes of recordId:" + recordId);
                                ret = that.tableView.update(function (response) {
                                    Log.print(Log.l.info, "RecordsetController.Controller. update: success!");
                                    // called asynchronously if ok
                                    AppBar.modified = false;
                                    if (typeof complete === "function") {
                                        complete(response);
                                        return WinJS.Promise.as();
                                    } else {
                                        return that.loadData(recordId);
                                    }
                                }, function (errorResponse) {
                                    if (typeof error === "function") {
                                        error(errorResponse);
                                    } else {
                                        AppData.setErrorMsg(that.binding, errorResponse);
                                    }
                                }, recordId, curScope.item);
                            } else {
                                Log.print(Log.l.trace, "no changes in recordId:" + recordId);
                            }
                        }
                    }
                }
                if (!ret) {
                    ret = new WinJS.Promise.as().then(function () {
                        if (typeof complete === "function") {
                            complete({});
                        }
                    });
                }
                Log.ret(Log.l.trace, ret);
                return ret;
            },
            insertData: function(complete, error) {
                var ret = null;
                Log.call(Log.l.trace, "RecordsetController.Controller.");
                if (this.tableView && typeof this.tableView.insert === "function") {
                    var that = this;
                    AppBar.busy = true;
                    AppData.setErrorMsg(that.binding);
                    ret = that.saveData(function (response) {
                        Log.print(Log.l.trace, "record saved");
                        return that.tableView.insert(function (json) {
                            // this callback will be called asynchronously
                            // when the response is available
                            Log.print(Log.l.info, "record insert: success!");
                            // contactData returns object already parsed from json file in response
                            if (json && json.d) {
                                that.curRecId = that.tableView.getRecordId(json.d);
                                Log.print(Log.l.trace, "inserted recordId=" + that.curRecIdd);
                                AppData.setRecordId(that.tableView.relationName, that.curRecId);
                            }
                            AppBar.busy = false;
                            if (typeof complete === "function") {
                                complete(json);
                                return WinJS.Promise.as();
                            } else {
                                return that.loadData().then(function () {
                                    that.selectRecordId(that.curRecId);
                                });
                            }
                        }, function (errorResponse) {
                            AppBar.busy = false;
                            if (typeof error === "function") {
                                error(errorResponse);
                            } else {
                                AppData.setErrorMsg(that.binding, errorResponse);
                            }
                        });
                    }, function(errorResponse) {
                        AppBar.busy = false;
                        if (typeof error === "function") {
                            error(errorResponse);
                        } else {
                            AppData.setErrorMsg(that.binding, errorResponse);
                        }
                    });
                }
                if (!ret) {
                    ret = new WinJS.Promise.as().then(function () {
                        if (typeof complete === "function") {
                            complete({});
                        }
                    });
                }
                Log.ret(Log.l.trace, ret);
                return ret;
            },
            selectionChanged: function (complete, error) {
                var ret = null;
                Log.call(Log.l.trace, "RecordsetController.Controller.");
                if (this.tableView && this.listView && this.listView.winControl) {
                    var listControl = this.listView.winControl;
                    var that = this;
                    if (listControl && listControl.selection) {
                        var selectionCount = listControl.selection.count();
                        if (selectionCount === 1) {
                            // Only one item is selected, show the page
                            ret = listControl.selection.getItems().then(function (items) {
                                var item = items[0];
                                that.currentlistIndex = items[0].index;
                                var newRecId = item.data && that.tableView.getRecordId(item.data);
                                if (newRecId) {
                                    Log.print(Log.l.trace, "RecordsetController.Controller.selectionChanged: newRecId=" + newRecId + " curRecId=" + that.curRecId);
                                    if (newRecId !== that.curRecId) {
                                        AppData.setRecordId(that.tableView.relationName, newRecId);
                                        if (that.curRecId) {
                                            that.prevRecId = that.curRecId;
                                        }
                                        that.curRecId = newRecId;
                                        if (that.prevRecId !== 0) {
                                            return that.saveData(complete, function (errorResponse) {
                                                that.selectRecordId(that.prevRecId);
                                                if (typeof error === "function") {
                                                    error(errorResponse);
                                                } else {
                                                    AppData.setErrorMsg(that.binding, errorResponse);
                                                }
                                            });
                                        } else {
                                            if (typeof complete === "function") {
                                                complete({});
                                            }
                                            return WinJS.Promise.as();
                                        }
                                    } else {
                                        if (typeof complete === "function") {
                                            complete({});
                                        }
                                        return WinJS.Promise.as();
                                    }
                                } else {
                                    if (typeof complete === "function") {
                                        complete({});
                                    }
                                    return WinJS.Promise.as();
                                }
                            });
                        }
                    }
                }
                if (!ret) {
                    ret = new WinJS.Promise.as().then(function () {
                        if (typeof complete === "function") {
                            complete({});
                        }
                    });
                }
                Log.ret(Log.l.trace, ret);
                return ret;
            },
            loadNext: function(complete, error) {
                var ret = null;
                Log.call(Log.l.trace, "RecordsetController.Controller.");
                if (this.records && this.showView && typeof this.showView.selectNext === "function" && typeof this.showView.getNextUrl === "function") {
                    var that = this;
                    Log.print(Log.l.trace, "calling selectNext...");
                    var nextUrl = that.nextUrl;
                    that.nextUrl = null;
                    AppData.setErrorMsg(that.binding);
                    ret = that.showView.selectNext(function (json) {
                        // this callback will be called asynchronously
                        // when the response is available
                        Log.print(Log.l.info, "RecordsetController.Controller.loadNext: selectNext success!");
                        // selectNext returns object already parsed from json file in response
                        if (json && json.d) {
                            that.nextUrl = that.showView.getNextUrl(json);
                            var results = json.d.results;
                            results.forEach(function (item) {
                                that.binding.count = that.records.push(item);
                            });
                        }
                        if (typeof complete === "function") {
                            complete(json);
                        }
                    }, function (errorResponse) {
                        // called asynchronously if an error occurs
                        // or server returns response with an error status.
                        that.loading = false;
                        if (typeof error === "function") {
                            error(errorResponse);
                        } else {
                            AppData.setErrorMsg(that.binding, errorResponse);
                        }
                    }, null, nextUrl);

                }               
                if (!ret) {
                    ret = new WinJS.Promise.as().then(function () {
                        if (typeof complete === "function") {
                            complete({});
                        }
                    });
                }
                Log.ret(Log.l.trace, ret);
                return ret;
            },
            loadData: function (restriction, options, itemRenderer, complete, error) {
                var ret = null;
                Log.call(Log.l.trace, "RecordsetController.Controller.");
                if (this.listView && this.showView && typeof this.showView.select === "function") {
                    var listControl = this.listView.winControl;
                    var that = this;
                    var recordId = null;
                    if (typeof restriction === "number") {
                        recordId = restriction;
                        if (that.tableView && that.tableView.relationName &&
                            that.tableView.relationName.substr(0, 4) === "LGNT") {
                            // recordId is in fact foreign key to INIT-relation in case of LGNTINIT-relation!
                            restriction = {};
                            var initkeyId = that.tableView.relationName.substr(4) + "ID";
                            restriction[initkeyId] = recordId;
                        }
                        Log.print(Log.l.trace, "calling select... recordId=" + recordId);
                    } else {
                        Log.print(Log.l.trace, "calling select...");
                    }
                    AppData.setErrorMsg(that.binding);
                    ret = that.showView.select(function (json) {
                        // this callback will be called asynchronously
                        // when the response is available
                        Log.print(Log.l.info, "RecordsetController.Controller.loadData select success!");
                        // select returns object already parsed from json file in response
                        if (!recordId) {
                            if (json && json.d) {
                                that.binding.count = json.d.results.length;
                                if (typeof that.showView.getNextUrl === "function") {
                                    that.nextUrl = that.showView.getNextUrl(json);
                                } else {
                                    that.nextUrl = null;
                                }
                                var results = json.d.results;
                                if (typeof that.resultConverter === "function") {
                                    results.forEach(function(item, index) {
                                        that.resultConverter(item, index);
                                    });
                                }
                                // Now, we call WinJS.Binding.List to get the bindable list
                                that.records = new WinJS.Binding.List(results);

                                if (listControl) {
                                    var trySetActive = function(element, scroller) {
                                        var success = true;
                                        // don't call setActive() if a dropdown control has focus!
                                        var comboInputFocus = element.querySelector(".win-dropdown:focus");
                                        if (!comboInputFocus) {
                                            try {
                                                if (typeof element.setActive === "function") {
                                                    element.setActive();
                                                }
                                            } catch (e) {
                                                // setActive() raises an exception when trying to focus an invisible item. Checking visibility is non-trivial, so it's best
                                                // just to catch the exception and ignore it. focus() on the other hand, does not raise exceptions.
                                                success = false;
                                            }
                                        }
                                        return success;
                                    };
                                    // overwrite _setFocusOnItem for this ListView to supress automatic
                                    // scroll-into-view when calling item.focus() in base.ls implementation
                                    // by prevent the call of _ElementUtilities._setActive(item);
                                    listControl._setFocusOnItem = function ListView_setFocusOnItem(entity) {
                                        this._writeProfilerMark("_setFocusOnItem,info");
                                        if (this._focusRequest) {
                                            this._focusRequest.cancel();
                                        }
                                        if (this._isZombie()) {
                                            return;
                                        }
                                        var that = this;
                                        var setFocusOnItemImpl = function(item) {
                                            if (that._isZombie()) {
                                                return;
                                            }

                                            if (that._tabManager.childFocus !== item) {
                                                that._tabManager.childFocus = item;
                                            }
                                            that._focusRequest = null;
                                            if (that._hasKeyboardFocus && !that._itemFocused) {
                                                if (that._selection._keyboardFocused()) {
                                                    that._drawFocusRectangle(item);
                                                }
                                                // The requestItem promise just completed so _cachedCount will
                                                // be initialized.
                                                if (entity.type === WinJS.UI.ObjectType.groupHeader || entity.type === WinJS.UI.ObjectType.item) {
                                                    that._view.updateAriaForAnnouncement(item, (entity.type === WinJS.UI.ObjectType.groupHeader ? that._groups.length() : that._cachedCount));
                                                }

                                                // Some consumers of ListView listen for item invoked events and hide the listview when an item is clicked.
                                                // Since keyboard interactions rely on async operations, sometimes an invoke event can be received before we get
                                                // to WinJS.Utilities._setActive(item), and the listview will be made invisible. If that happens and we call item.setActive(), an exception
                                                // is raised for trying to focus on an invisible item. Checking visibility is non-trivial, so it's best
                                                // just to catch the exception and ignore it.
                                                that._itemFocused = true;
                                                trySetActive(item);
                                            }
                                        };

                                        if (entity.type === WinJS.UI.ObjectType.item) {
                                            this._focusRequest = this._view.items.requestItem(entity.index);
                                        } else if (entity.type === WinJS.UI.ObjectType.groupHeader) {
                                            this._focusRequest = this._groups.requestHeader(entity.index);
                                        } else {
                                            this._focusRequest = WinJS.Promise.wrap(
                                                entity.type === WinJS.UI.ObjectType.header
                                                ? this._header
                                                : this._footer);
                                        }
                                        this._focusRequest.then(setFocusOnItemImpl);
                                    };

                                    listControl._supressScrollIntoView = true;
                                    if (typeof itemRenderer === "function") {
                                        // add ListView itemTemplate
                                        listControl.itemTemplate = itemRenderer.bind(that);
                                    }
                                    // add ListView dataSource
                                    listControl.itemDataSource = that.records.dataSource;
                                }
                            }
                        } else {
                            if (json && json.d && that.records) {
                                // return only the current record
                                var objectrec = that.scopeFromRecordId(recordId);
                                var record = json.d.results ? json.d.results[0] : json.d;
                                if (typeof that.resultConverter === "function") {
                                    that.resultConverter(record, objectrec.index);
                                }
                                that.records.setAt(objectrec.index, record);
                            }
                        }
                        AppBar.busy = false;
                    }, function (errorResponse) {
                        // called asynchronously if an error occurs
                        // or server returns response with an error status.
                        AppData.setErrorMsg(that.binding, errorResponse);
                        AppBar.busy = false;
                    }, restriction, options);
                }
                if (!ret) {
                    ret = new WinJS.Promise.as().then(function () {
                        if (typeof complete === "function") {
                            complete({});
                        }
                    });
                }
                Log.ret(Log.l.trace, ret);
                return ret;

            }
        })
    });
})();

