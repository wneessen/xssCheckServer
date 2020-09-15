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
    checkUrl: string,
    hasXss: boolean,
    searchString: string,
    statusCode: number,
    statusMsg: string,
    xssData: Array<XssDataObj>,
    resourceErrors?: Array<ReturnResourceError>,
    alertOnAnyEvent?: boolean,
    blockedUrls?: Array<string>,
    errorMsg?: string,
    requestTime?: number
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
 * Post params
 *
 * @interface HttpPostParms
*/
interface HttpPostParms {
    searchfor: string,
    everyevent: string,
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
const versionNum: string = '1.0.10';
let debugMode: boolean = false;
let returnResErrors: boolean = true;

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
    }
});

// Run the webservice
console.log(`This is xssCheckServer v${versionNum}`);
console.log(`Starting webserver on http://${listenHost}:${listenPort}`);
const webService = wsObj.listen(`${listenHost}:${listenPort}`, (reqObj: HttpReqObj, resObj: HttpResObj) => {
    const dateObj = new Date();
    let benchMark = Date.now();
    let searchMsg = 'XSSed!';
    let xssObj: XssObj = {
        blockedUrls: [],
        checkTime: dateObj,
        checkUrl: '',
        hasXss: false,
        searchString: '',
        statusCode: 0,
        statusMsg: '',
        xssData: [],
        alertOnAnyEvent: false,
        requestTime: 0,
        resourceErrors: []
    };

    // Process the event data if event triggered
    let eventTriggered = (eventType: string, eventMsg: string) => {
        if(debugMode) {
            console.log(`An event has been executed on ${webUrl}`);
            console.log(`==> EventType: "${eventType}" // EventData: "${eventMsg}"`);
        }
        if(eventMsg === searchMsg || xssObj.alertOnAnyEvent === true) {
            if(debugMode) {
                console.log('Possible XSS! The eventMsg matches the search string: "' + searchMsg + '"\n');
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
    wpObj.onResourceRequested = function(requestData: HttpReqObj, networkRequest: PhantomNetworkRequest) {
        const isBlacklisted = (blackListItem: string) => {
            let regEx = new RegExp(blackListItem, 'g');
            return requestData.url.match(regEx);
        };
        if(resBlackList.some(isBlacklisted)) {
            if(debugMode) {
                console.log(`${requestData.url} is blacklisted. Not loading resource.`);
            }
            xssObj.blockedUrls.push(requestData.url);
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
                searchMsg = reqObj.post.searchfor;
                xssObj.searchString = searchMsg;
            }
            if(reqObj.post.everyevent && reqObj.post.everyevent === 'true') {
                xssObj.alertOnAnyEvent = true;
            }
            if(reqObj.post.url) {
                var webUrl = reqObj.post.url;
                xssObj.checkUrl = webUrl;
                wpObj.open(webUrl, (statusObj: string) => {
                    benchMark = Date.now() - benchMark;
                    if(statusObj !== 'success') {
                        if(debugMode) {
                            console.error(`Unable to download URL: ${webUrl}`);
                        }
                        xssObj.statusCode = 500;
                        xssObj.statusMsg = statusObj;
                        xssObj.errorMsg = 'Unabled to download provided URL';
                    }
                    else {
                        xssObj.statusCode = 200;
                        xssObj.statusMsg = statusObj;
                        wpObj.evaluate(() => {
                            return;
                        });
                    };
                    xssObj.requestTime = benchMark;
                    if(debugMode) {
                        console.log(`Request completed in ${(benchMark / 1000)} sec`);
                    }
                    resObj.statusCode = 200;
                    resObj.write(JSON.stringify(xssObj));
                    resObj.close();
                });
            }
            else {
                resObj.statusCode = 400;
                xssObj.statusCode = 400;
                xssObj.errorMsg = 'Missing data';
                resObj.write(JSON.stringify(xssObj));
                resObj.close();
            }
        }
        else {
            resObj.statusCode = 404;
            xssObj.statusCode = 404;
            xssObj.errorMsg = 'Invalid request method';
            resObj.write(JSON.stringify(xssObj));
            resObj.close();
        }
    }
    else {
        resObj.statusCode = 404;
        xssObj.statusCode = 404;
        xssObj.errorMsg = 'Route not found';
        resObj.write(JSON.stringify(xssObj));
        resObj.close();
    }
});