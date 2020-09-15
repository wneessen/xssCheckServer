interface XssObj {
    checkTime: Date;
    checkUrl: string;
    hasXss: boolean;
    searchString: string;
    xssData: Array<XssDataObj>;
    errorMsg?: string;
    alertOnAnyEvent: boolean;
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
declare const wpObj: any;
declare const wsObj: any;
declare const sysObj: any;
declare const versionNum: string;
declare let debugMode: boolean;
declare let listenHost: string;
declare let listenPort: string;
declare let cliArgs: any;
declare const webService: any;
//# sourceMappingURL=xssCheckServer.d.ts.map