interface XssObj {
    checkTime: Date;
    checkUrl: string;
    hasXss: boolean;
    searchString: string;
    statusCode: number;
    statusMsg: string;
    xssData: Array<XssDataObj>;
    resourceErrors?: Array<ReturnResourceError>;
    alertOnAnyEvent?: boolean;
    blockedUrls?: Array<string>;
    errorMsg?: string;
    requestTime?: number;
}
interface XssDataObj {
    eventType: string;
    eventMsg: string;
}
interface HttpPostParms {
    searchfor: string;
    everyevent: string;
    url: string;
}
interface HttpReqObj {
    method: string;
    url: string;
    post: HttpPostParms;
}
interface HttpResObj {
    statusCode: number;
}
declare class HttpResObj {
    write(httpRespone: string): void;
    close(): void;
}
interface ResourceError {
    url: string;
    errorCode: string;
    errorString: string;
    id: number;
    status?: string;
    statusText?: string;
}
interface ReturnResourceError {
    url: string;
    errorCode: string;
    errorString: string;
}
declare class PhantomNetworkRequest {
    abort(): void;
    changeUrl(newUrl: string): void;
    setHeader(key: string, value: string): void;
}
declare const wpObj: any;
declare const wsObj: any;
declare const sysObj: any;
declare const versionNum: string;
declare let debugMode: boolean;
declare let returnResErrors: boolean;
declare const resBlackList: Array<string>;
declare const resErrorIgnoreList: Array<number>;
declare let listenHost: string;
declare let listenPort: string;
declare let cliArgs: any;
declare const webService: any;
//# sourceMappingURL=xssCheckServer.d.ts.map