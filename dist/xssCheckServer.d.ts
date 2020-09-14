interface XssObj {
    checkTime: Date;
    checkUrl: string;
    hasXss: boolean;
    searchString: string;
    xssData: Array<XssDataObj>;
}
interface XssDataObj {
    eventType: string;
    eventMsg: string;
}
interface HttpPostParms {
    searchfor: string;
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
declare const debugMode: boolean;
declare const versionNum: string;
declare let listenHost: string;
declare let listenPort: string;
declare const webService: any;
//# sourceMappingURL=xssCheckServer.d.ts.map