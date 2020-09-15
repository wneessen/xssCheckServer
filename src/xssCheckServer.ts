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
    xssData: Array<XssDataObj>,
    errorMsg?: string,
    alertOnAnyEvent: boolean
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

/******************************************************************************
* Actual script
******************************************************************************/
// Initiate plugins
const wpObj = require('webpage').create();
const wsObj = require('webserver').create();
const sysObj = require("system");

// Global settings
const versionNum: string = '1.0.5';
let debugMode: boolean = false;

// Webpage object settings
wpObj.settings.userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 xssCheckServer/${versionNum}`;
wpObj.settings.XSSAuditingEnabled = false;
wpObj.settings.webSecurityEnabled = false;
wpObj.settings.loadImages = true;
wpObj.settings.javascriptEnabled = true;
wpObj.settings.localToRemoteUrlAccessEnabled = true;
wpObj.settings.resourceTimeout = 5000;

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
            console.log(`Usage: ${sysObj.args[0]} [-l 127.0.0.1 -p 8099]`);
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
    let searchMsg = 'XSSed!';
    let xssObj: XssObj = {
        hasXss: false,
        xssData: [],
        checkUrl: '',
        checkTime: dateObj,
        searchString: '',
        alertOnAnyEvent: false
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
            console.log(reqObj.post.searchfor);
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
                    if(statusObj !== 'success') {
                        console.error(`Unable to download URL: ${webUrl}`);
                    }
                    else {
                        wpObj.evaluate(() => {
                            return;
                        });
                    };
                    resObj.statusCode = 200;
                    resObj.write(JSON.stringify(xssObj));
                    resObj.close();
                });
            }
            else {
                resObj.statusCode = 400;
                xssObj.errorMsg = 'Missing data';
                resObj.write(JSON.stringify(xssObj));
                resObj.close();
            }
        }
        else {
            resObj.statusCode = 404;
            xssObj.errorMsg = 'Invalid request method';
            resObj.write(JSON.stringify(xssObj));
            resObj.close();
        }
    }
    else {
        resObj.statusCode = 404;
        xssObj.errorMsg = 'Route not found';
        resObj.write(JSON.stringify(xssObj));
        resObj.close();
    }
});