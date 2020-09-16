/******************************************************************************
* Interfaces and declarations
******************************************************************************/
/**
 * XSS object
 *
 * @interface XssObj
*/
interface XssObj {
    checkTime: Date,
    hasXss: boolean,
    requestData: XssReqObj,
    responseData: XssResObj,
    xssData: Array<XssDataObj>,
    resourceErrors?: Array<ReturnResourceError>,
    blockedUrls?: Array<string>,
}

/**
 * XSS data object
 *
 * @interface XssDataObj
*/
interface XssDataObj {
    eventType: string,
    eventMsg: string,
}

/**
 * XSS request object
 *
 * @interface XssReqObj
*/
interface XssReqObj {
    alertOnAnyEvent?: boolean,
    checkUrl: string,
    queryString: string,
    reqMethod: string,
    searchString: string,
}

/**
 * XSS response object
 *
 * @interface XssResObj
*/
interface XssResObj {
    errorMsg?: string,
    requestTime?: number
    statusCode: number,
    statusMsg: string,
}

/**
 * Post params
 *
 * @interface HttpPostParms
*/
interface HttpPostParms {
    everyevent: string,
    querystring: string,
    reqmethod: string,
    searchfor: string,
    url: string
}

/**
 * HTTP request Object
 *
 * @interface HttpReqObj
*/
interface HttpReqObj {
    method: string,
    url: string,
    post: HttpPostParms
}

/**
 * HTTP response Object
 *
 * @interface HttpResObj
*/
interface HttpResObj {
    statusCode: number,
}
declare class HttpResObj {
    write(httpRespone: string): void;
    close(): void;
}
/**
 * Resource error Object
 *
 * @interface ResourceError
*/
interface ResourceError {
    url: string,
    errorCode: string,
    errorString: string,
    id: number,
    status?: string,
    statusText?: string
}
interface ReturnResourceError {
    url: string,
    errorCode: string,
    errorString: string
}

/**
 * phantomJS NetworkRequest Class
*/
declare class PhantomNetworkRequest {
    abort(): void;
    changeUrl(newUrl: string): void;
    setHeader(key: string, value: string): void;
}

/******************************************************************************
* Actual script
******************************************************************************/
// Initiate plugins
const wpObj = require('webpage').create();
const wsObj = require('webserver').create();
const sysObj = require("system");

// Global settings
const versionNum: string = '1.1.0';
let debugMode: boolean = false;
let returnResErrors: boolean = false;

// Webpage object settings
wpObj.settings.userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 xssCheckServer/${versionNum}`;
wpObj.settings.XSSAuditingEnabled = false;
wpObj.settings.webSecurityEnabled = false;
wpObj.settings.loadImages = false;
wpObj.settings.javascriptEnabled = true;
wpObj.settings.localToRemoteUrlAccessEnabled = true;
wpObj.settings.resourceTimeout = 3000;

// Resource blacklist
const resBlackList: Array<string> = [
    'googletagmanager.com', 'google-analytics.com', 'optimizely.com', '.amazon-adsystem.com',
    'device-metrics-us.amazon.com', 'crashlytics.com', 'doubleclick.net'
];

// Resource Error ignore list
const resErrorIgnoreList: Array<number> = [5, 301];

// Web server settings
let listenHost = '127.0.0.1';
let listenPort = '8099';

// Read system parameters
let cliArgs = sysObj.args;
cliArgs.forEach(function(cliArg: string, cliIdx: string) {
    if(cliArg.match(/^-/) && cliArg !== '-') {
        let curArg = cliArgs[cliIdx];
        let curParam = cliArgs[(cliIdx + 1)];
        if(curArg === '-h') {
            console.log(`Usage: ${sysObj.args[0]} [-l 127.0.0.1, -p 8099, -d, -h]`);
            phantom.exit(0);
        }
        if(curArg === '-l') {
            listenHost = curParam;
        }
        if(curArg === '-p') {
            listenPort = curParam;
        }
        if(curArg === '-d') {
            debugMode = true;
        }
        if(curArg === '-b') {
            let domainList: string = curParam;
            domainList.split(',').forEach(blackListDomain => {
                resBlackList.push(blackListDomain)
            });
        }
    }
});

// Run the webservice
console.log(`This is xssCheckServer v${versionNum}`);
console.log(`Starting webserver on http://${listenHost}:${listenPort}`);
const webService = wsObj.listen(`${listenHost}:${listenPort}`, (reqObj: HttpReqObj, resObj: HttpResObj) => {
    const dateObj = new Date();
    let benchMark = Date.now();
    let requestData: XssReqObj = {
        alertOnAnyEvent: false,
        checkUrl: null,
        queryString: null,
        reqMethod: 'GET',
        searchString: 'XSSed!',
    };
    let responseData: XssResObj = {
        requestTime: 0,
        statusMsg: null,
        statusCode: 0,
    };
    let xssObj: XssObj = {
        blockedUrls: [],
        checkTime: dateObj,
        responseData: responseData,
        requestData: requestData,
        hasXss: false,
        xssData: [],
        resourceErrors: []
    };

    // Process the event data if event triggered
    let eventTriggered = (eventType: string, eventMsg: string) => {
        if(debugMode) {
            console.log(`An event has been executed on ${xssObj.requestData.checkUrl}`);
            console.log(`==> EventType: "${eventType}" // EventData: "${eventMsg}"`);
        }
        if(eventMsg === xssObj.requestData.searchString || xssObj.requestData.alertOnAnyEvent === true) {
            if(debugMode) {
                console.log('Possible XSS! The eventMsg matches the search string: "' + xssObj.requestData.searchString + '"\n');
            }
            xssObj.hasXss = true;
            xssObj.xssData.push({eventType: eventType, eventMsg: eventMsg});
        }
    }

    // The events handler
    wpObj.onAlert = (eventMsg: string)          => { eventTriggered('alert()', eventMsg) };
    wpObj.onConfirm = (eventMsg: string)        => { eventTriggered('confirm()', eventMsg) };
    wpObj.onConsoleMessage = (eventMsg: string) => { eventTriggered('console.log()', eventMsg) };
    wpObj.onPrompt = (eventMsg: string)         => { eventTriggered('prompt()', eventMsg) };
    if(debugMode) {
        wpObj.onError = (errorMsg: string)      => { console.error(`An error was caught: ${errorMsg}`) };
    }
    else {
        wpObj.onError = ()                      => { return };
    }

    // Block blacklisted domains
    wpObj.onResourceRequested = function(httpRequestData: HttpReqObj, networkRequest: PhantomNetworkRequest) {
        const isBlacklisted = (blackListItem: string) => {
            let regEx = new RegExp(blackListItem, 'g');
            return httpRequestData.url.match(regEx);
        };
        if(resBlackList.some(isBlacklisted)) {
            if(debugMode) {
                console.log(`${httpRequestData.url} is blacklisted. Not loading resource.`);
            }
            xssObj.blockedUrls.push(httpRequestData.url);
            networkRequest.abort();
        }
    };

    // Resource errors
    wpObj.onResourceError = function(resourceError: ResourceError) {
        if(debugMode) {
            console.error(`Unable to load resource (#${resourceError.id.toString()} => URL:${resourceError.url})`);
            console.error(`Error code: ${resourceError.errorCode}. Description: ${resourceError.errorString}`);
        };
        if(returnResErrors && resErrorIgnoreList.indexOf(parseInt(resourceError.errorCode)) === -1) {
            xssObj.resourceErrors.push({
                url: resourceError.url,
                errorCode: resourceError.errorCode,
                errorString: resourceError.errorString,
            });
        }
    };

    // We received a request
    if(debugMode) {
        console.log('Received new HTTP request');
        console.log(`Method: ${reqObj.method}`);
        console.log(`Path: ${reqObj.url}`);
        if(reqObj.post) {
            console.log(`postData: ${JSON.stringify(reqObj.post)}`);
        }
        console.log(' ');
    }
    
    // We can only process POST requests on /check
    if(reqObj.url === '/check') {
        if(reqObj.method === 'POST') {
            if(reqObj.post.searchfor) {
                xssObj.requestData.searchString = reqObj.post.searchfor;
            }
            if(reqObj.post.everyevent && reqObj.post.everyevent === 'true') {
                xssObj.requestData.alertOnAnyEvent = true;
            }
            if(reqObj.post.reqmethod) {
                if(reqObj.post.reqmethod.toUpperCase() !== 'POST' && reqObj.post.reqmethod.toUpperCase() !== 'GET') {
                    xssObj.requestData.reqMethod = `${reqObj.post.reqmethod.toUpperCase()}_NOT_SUPPORTED`;
                }
                else {
                    xssObj.requestData.reqMethod = reqObj.post.reqmethod.toUpperCase();
                }
            }
            if(reqObj.post.url) {
                xssObj.requestData.checkUrl = reqObj.post.url;
            }
            if(reqObj.post.querystring) {
                xssObj.requestData.queryString = reqObj.post.querystring;
            }
            if(
                (!xssObj.requestData.checkUrl || xssObj.requestData.checkUrl === '') ||
                xssObj.requestData.reqMethod === 'INVALID' ||
                (xssObj.requestData.queryString === null && xssObj.requestData.alertOnAnyEvent === false)
            ) {
                resObj.statusCode = 400;
                xssObj.responseData.statusCode = 400;
                xssObj.responseData.errorMsg = 'Missing request parameters';
                resObj.write(JSON.stringify(xssObj));
                resObj.close();
            }
            else {
                if(xssObj.requestData.reqMethod === 'GET') {
                    wpObj.open(`${xssObj.requestData.checkUrl}?${xssObj.requestData.queryString}`, (statusObj: string) => {
                        benchMark = Date.now() - benchMark;
                        if(statusObj !== 'success') {
                            if(debugMode) {
                                console.error(`Unable to download URL: ${xssObj.requestData.checkUrl}`);
                            }
                            xssObj.responseData.statusCode = 500;
                            xssObj.responseData.statusMsg = statusObj;
                            xssObj.responseData.errorMsg = 'Unabled to download provided URL';
                        }
                        else {
                            xssObj.responseData.statusCode = 200;
                            xssObj.responseData.statusMsg = statusObj;
                            wpObj.evaluate(() => {
                                return;
                            });
                        };
                        xssObj.responseData.requestTime = benchMark;
                        if(debugMode) {
                            console.log(`Request completed in ${(benchMark / 1000)} sec`);
                        }
                        resObj.statusCode = 200;
                        resObj.write(JSON.stringify(xssObj));
                        resObj.close();
                    });
                }
                else if(xssObj.requestData.reqMethod === 'POST') {
                    wpObj.open(xssObj.requestData.checkUrl, 'POST', xssObj.requestData.queryString, (statusObj: string) => {
                        benchMark = Date.now() - benchMark;
                        if(statusObj !== 'success') {
                            if(debugMode) {
                                console.error(`Unable to download URL: ${xssObj.requestData.checkUrl}`);
                            }
                            xssObj.responseData.statusCode = 500;
                            xssObj.responseData.statusMsg = statusObj;
                            xssObj.responseData.errorMsg = 'Unabled to download provided URL';
                        }
                        else {
                            xssObj.responseData.statusCode = 200;
                            xssObj.responseData.statusMsg = statusObj;
                            wpObj.evaluate(() => {
                                return;
                            });
                        };
                        xssObj.responseData.requestTime = benchMark;
                        if(debugMode) {
                            console.log(`Request completed in ${(benchMark / 1000)} sec`);
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