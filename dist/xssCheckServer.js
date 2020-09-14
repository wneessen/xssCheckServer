"use strict";
var wpObj = require('webpage').create();
var wsObj = require('webserver').create();
var debugMode = false;
var versionNum = '1.0.1';
wpObj.settings.userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 xssCheckServer/" + versionNum;
wpObj.settings.XSSAuditingEnabled = false;
wpObj.settings.webSecurityEnabled = false;
wpObj.settings.loadImages = true;
wpObj.settings.javascriptEnabled = true;
wpObj.settings.localToRemoteUrlAccessEnabled = true;
wpObj.settings.resourceTimeout = 5000;
var listenHost = '127.0.0.1';
var listenPort = '8099';
console.log("This is xssCheckServer v" + versionNum);
console.log("Starting webserver on http://" + listenHost + ":" + listenPort);
var webService = wsObj.listen(listenHost + ":" + listenPort, function (reqObj, resObj) {
    var dateObj = new Date();
    var searchMsg = 'XSSed!';
    var xssObj = {
        hasXss: false,
        xssData: [],
        checkUrl: '',
        checkTime: dateObj,
        searchString: ''
    };
    var foundXss = function (eventType, eventMsg) {
        if (debugMode) {
            console.log("An event has been executed on " + webUrl);
            console.log("==> EventType: \"" + eventType + "\" // EventData: \"" + eventMsg + "\"");
        }
        if (eventMsg === searchMsg) {
            if (debugMode) {
                console.log('Possible XSS! The eventMsg matches the search string: "' + searchMsg + '"\n');
            }
            xssObj.hasXss = true;
            xssObj.xssData.push({ eventType: eventType, eventMsg: eventMsg });
        }
    };
    wpObj.onAlert = function (eventMsg) { foundXss('alert()', eventMsg); };
    wpObj.onConsoleMessage = function (eventMsg) { foundXss('console.log()', eventMsg); };
    wpObj.onPrompt = function (eventMsg) { foundXss('prompt()', eventMsg); };
    wpObj.onConfirm = function (eventMsg) { foundXss('confirm()', eventMsg); };
    if (debugMode) {
        wpObj.onError = function () { return; };
    }
    else {
        wpObj.onError = function (errorMsg) { console.error("An error was caught: " + errorMsg); };
    }
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
                searchMsg = reqObj.post.searchfor;
                xssObj.searchString = searchMsg;
            }
            if (reqObj.post.url) {
                var webUrl = reqObj.post.url;
                xssObj.checkUrl = webUrl;
                wpObj.open(webUrl, function (statusObj) {
                    if (statusObj !== 'success') {
                        console.error("Unable to download URL: " + webUrl);
                    }
                    else {
                        wpObj.evaluate(function () {
                            return;
                        });
                    }
                    ;
                    resObj.statusCode = 200;
                    resObj.write(JSON.stringify(xssObj));
                    resObj.close();
                });
            }
            else {
                resObj.statusCode = 400;
                resObj.write('Missing data');
                resObj.close();
            }
        }
        else {
            resObj.statusCode = 404;
            resObj.write('File not allowed');
            resObj.close();
        }
    }
    else {
        resObj.statusCode = 404;
        resObj.write('File not found');
        resObj.close();
    }
});
