"use strict";
var wpObj = require('webpage').create();
var wsObj = require('webserver').create();
var sysObj = require("system");
var versionNum = '1.1.0';
var debugMode = false;
var returnResErrors = false;
wpObj.settings.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 xssCheckServer/" + versionNum;
wpObj.settings.XSSAuditingEnabled = false;
wpObj.settings.webSecurityEnabled = false;
wpObj.settings.loadImages = false;
wpObj.settings.javascriptEnabled = true;
wpObj.settings.localToRemoteUrlAccessEnabled = true;
wpObj.settings.resourceTimeout = 3000;
var resBlackList = [
    'googletagmanager.com', 'google-analytics.com', 'optimizely.com', '.amazon-adsystem.com',
    'device-metrics-us.amazon.com', 'crashlytics.com', 'doubleclick.net'
];
var resErrorIgnoreList = [5, 301];
var listenHost = '127.0.0.1';
var listenPort = '8099';
var cliArgs = sysObj.args;
cliArgs.forEach(function (cliArg, cliIdx) {
    if (cliArg.match(/^-/) && cliArg !== '-') {
        var curArg = cliArgs[cliIdx];
        var curParam = cliArgs[(cliIdx + 1)];
        if (curArg === '-h') {
            console.log("Usage: " + sysObj.args[0] + " [-l 127.0.0.1, -p 8099, -d, -h]");
            phantom.exit(0);
        }
        if (curArg === '-l') {
            listenHost = curParam;
        }
        if (curArg === '-p') {
            listenPort = curParam;
        }
        if (curArg === '-d') {
            debugMode = true;
        }
        if (curArg === '-b') {
            var domainList = curParam;
            domainList.split(',').forEach(function (blackListDomain) {
                resBlackList.push(blackListDomain);
            });
        }
    }
});
console.log("This is xssCheckServer v" + versionNum);
console.log("Starting webserver on http://" + listenHost + ":" + listenPort);
var webService = wsObj.listen(listenHost + ":" + listenPort, function (reqObj, resObj) {
    var dateObj = new Date();
    var benchMark = Date.now();
    var requestData = {
        alertOnAnyEvent: false,
        checkUrl: null,
        queryString: null,
        reqMethod: 'GET',
        searchString: 'XSSed!'
    };
    var responseData = {
        requestTime: 0,
        statusMsg: null,
        statusCode: 0
    };
    var xssObj = {
        blockedUrls: [],
        checkTime: dateObj,
        responseData: responseData,
        requestData: requestData,
        hasXss: false,
        xssData: [],
        resourceErrors: []
    };
    var eventTriggered = function (eventType, eventMsg) {
        if (debugMode) {
            console.log("An event has been executed on " + xssObj.requestData.checkUrl);
            console.log("==> EventType: \"" + eventType + "\" // EventData: \"" + eventMsg + "\"");
        }
        if (eventMsg === xssObj.requestData.searchString || xssObj.requestData.alertOnAnyEvent === true) {
            if (debugMode) {
                console.log('Possible XSS! The eventMsg matches the search string: "' + xssObj.requestData.searchString + '"\n');
            }
            xssObj.hasXss = true;
            xssObj.xssData.push({ eventType: eventType, eventMsg: eventMsg });
        }
    };
    wpObj.onAlert = function (eventMsg) { eventTriggered('alert()', eventMsg); };
    wpObj.onConfirm = function (eventMsg) { eventTriggered('confirm()', eventMsg); };
    wpObj.onConsoleMessage = function (eventMsg) { eventTriggered('console.log()', eventMsg); };
    wpObj.onPrompt = function (eventMsg) { eventTriggered('prompt()', eventMsg); };
    if (debugMode) {
        wpObj.onError = function (errorMsg) { console.error("An error was caught: " + errorMsg); };
    }
    else {
        wpObj.onError = function () { return; };
    }
    wpObj.onResourceRequested = function (httpRequestData, networkRequest) {
        var isBlacklisted = function (blackListItem) {
            var regEx = new RegExp(blackListItem, 'g');
            return httpRequestData.url.match(regEx);
        };
        if (resBlackList.some(isBlacklisted)) {
            if (debugMode) {
                console.log(httpRequestData.url + " is blacklisted. Not loading resource.");
            }
            xssObj.blockedUrls.push(httpRequestData.url);
            networkRequest.abort();
        }
    };
    wpObj.onResourceError = function (resourceError) {
        if (debugMode) {
            console.error("Unable to load resource (#" + resourceError.id.toString() + " => URL:" + resourceError.url + ")");
            console.error("Error code: " + resourceError.errorCode + ". Description: " + resourceError.errorString);
        }
        ;
        if (returnResErrors && resErrorIgnoreList.indexOf(parseInt(resourceError.errorCode)) === -1) {
            xssObj.resourceErrors.push({
                url: resourceError.url,
                errorCode: resourceError.errorCode,
                errorString: resourceError.errorString
            });
        }
    };
    if (debugMode) {
        console.log('Received new HTTP request');
        console.log("Method: " + reqObj.method);
        console.log("Path: " + reqObj.url);
        if (reqObj.post) {
            console.log("postData: " + JSON.stringify(reqObj.post));
        }
        console.log(' ');
    }
    if (reqObj.url === '/check') {
        if (reqObj.method === 'POST') {
            if (reqObj.post.searchfor) {
                xssObj.requestData.searchString = reqObj.post.searchfor;
            }
            if (reqObj.post.everyevent && reqObj.post.everyevent === 'true') {
                xssObj.requestData.alertOnAnyEvent = true;
            }
            if (reqObj.post.reqmethod) {
                if (reqObj.post.reqmethod.toUpperCase() !== 'POST' && reqObj.post.reqmethod.toUpperCase() !== 'GET') {
                    xssObj.requestData.reqMethod = reqObj.post.reqmethod.toUpperCase() + "_NOT_SUPPORTED";
                }
                else {
                    xssObj.requestData.reqMethod = reqObj.post.reqmethod.toUpperCase();
                }
            }
            if (reqObj.post.url) {
                xssObj.requestData.checkUrl = reqObj.post.url;
            }
            if (reqObj.post.querystring) {
                xssObj.requestData.queryString = reqObj.post.querystring;
            }
            if ((!xssObj.requestData.checkUrl || xssObj.requestData.checkUrl === '') ||
                xssObj.requestData.reqMethod === 'INVALID' ||
                (xssObj.requestData.queryString === null && xssObj.requestData.alertOnAnyEvent === false)) {
                resObj.statusCode = 400;
                xssObj.responseData.statusCode = 400;
                xssObj.responseData.errorMsg = 'Missing request parameters';
                resObj.write(JSON.stringify(xssObj));
                resObj.close();
            }
            else {
                if (xssObj.requestData.reqMethod === 'GET') {
                    wpObj.open(xssObj.requestData.checkUrl + "?" + xssObj.requestData.queryString, function (statusObj) {
                        benchMark = Date.now() - benchMark;
                        if (statusObj !== 'success') {
                            if (debugMode) {
                                console.error("Unable to download URL: " + xssObj.requestData.checkUrl);
                            }
                            xssObj.responseData.statusCode = 500;
                            xssObj.responseData.statusMsg = statusObj;
                            xssObj.responseData.errorMsg = 'Unabled to download provided URL';
                        }
                        else {
                            xssObj.responseData.statusCode = 200;
                            xssObj.responseData.statusMsg = statusObj;
                            wpObj.evaluate(function () {
                                return;
                            });
                        }
                        ;
                        xssObj.responseData.requestTime = benchMark;
                        if (debugMode) {
                            console.log("Request completed in " + (benchMark / 1000) + " sec");
                        }
                        resObj.statusCode = 200;
                        resObj.write(JSON.stringify(xssObj));
                        resObj.close();
                    });
                }
                else if (xssObj.requestData.reqMethod === 'POST') {
                    wpObj.open(xssObj.requestData.checkUrl, 'POST', xssObj.requestData.queryString, function (statusObj) {
                        benchMark = Date.now() - benchMark;
                        if (statusObj !== 'success') {
                            if (debugMode) {
                                console.error("Unable to download URL: " + xssObj.requestData.checkUrl);
                            }
                            xssObj.responseData.statusCode = 500;
                            xssObj.responseData.statusMsg = statusObj;
                            xssObj.responseData.errorMsg = 'Unabled to download provided URL';
                        }
                        else {
                            xssObj.responseData.statusCode = 200;
                            xssObj.responseData.statusMsg = statusObj;
                            wpObj.evaluate(function () {
                                return;
                            });
                        }
                        ;
                        xssObj.responseData.requestTime = benchMark;
                        if (debugMode) {
                            console.log("Request completed in " + (benchMark / 1000) + " sec");
                        }
                        resObj.statusCode = 200;
                        resObj.write(JSON.stringify(xssObj));
                        resObj.close();
                    });
                }
            }
        }
        else {
            resObj.statusCode = 404;
            xssObj.responseData.statusCode = 404;
            xssObj.responseData.errorMsg = 'Invalid request method';
            resObj.write(JSON.stringify(xssObj));
            resObj.close();
        }
    }
    else {
        resObj.statusCode = 404;
        xssObj.responseData.statusCode = 404;
        xssObj.responseData.errorMsg = 'Route not found';
        resObj.write(JSON.stringify(xssObj));
        resObj.close();
    }
});
