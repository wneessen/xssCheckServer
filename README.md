# Depreciation note
**xssCheckServer has been deprecated due to the deprecation of the PhantomJS project. Please consider using [xssScanService](https://github.com/wneessen/xssScanService) instead. xssScanService is complete rewrite of xssCheckServer. It is NodeJS/ExpressJS based and uses Google's Puppeteer framework for the website evaluation instead of PhantomJS.**

# xssCheckServer
A simple phantomJS-based webservice, that downloads and evaluates a given URL and searches for typical XSS-events like ```alert()```, ```prompt()```, ```console.log()``` or ```confirm()```. If such event occurs on the given website, the message that is triggered by the event will be compared to a provided search string and marked as "possible XSS", in case it matches.

Different to typical XSS tools, the aim of this tool is to find XSS vulnerabilities in dynamic code of webpages (JavaScript, Images, external resources). Usual XSS tools submit their XSS-identification strings via the query parameters and check the resulting HTML for the same string. As the xssCheckServer uses phantomJS, it is able to evaluate the result of the webpage as if it would have been opened in a normal browser, including the evaluation of the DOM, JavaScript resources, images and 3rd party scripts.

## Features
- TypeScripted source for ease of extension
- Simple phantomJS-based JavaScript
- Includes a webserver

## Usage
Simply run the script via phantomJS:
```sh
$ phantomjs dist/xssCheckServer.min.js
```

Once started, the server will (by default) listen on http://localhost:8099 and will look for POST requests on the /check route.

The server will now fetch and evaluate the website. On any alert(), console.log(), prompt() or confirm() event, the server will compare the received message against the ```searchfor``` parameter.

### Supported POST parameters
The following POST request parameters are supported:

- ```url```: The base URL to be checked by the webservice
- ```querystring```: The query string to be used for the XSS attack (When using special characters, make sure to URLencode them first)
- ```reqmethod```: The request method to be used (currently "GET" and "POST" are supported)
- ```searchfor```: The string that the service compares, when an event fires (Default: 'XSSed!')
- ```everyevent```: When this parameters is set to "true", the service will report any event that triggered without comparing the searchstring

### Example request (via cURL)
To have a website checked, you can issue the URL and the searchfor-parameter via your favourite web client:
```sh
$ curl -qsS -k -d url='https://www.example.com' --data-urlencode querystring='badparam=/test\"};alert(1234);/*' -d searchfor=1234 -d reqmethod=GET http://localhost:8099/check
```

### Example responses
The server will respond with a JSON object. On a successfull identification of a potential XSS, the response can look like this:
```json
{
  "hasXss": true,
  "xssData": [
    {
      "eventType": "alert()",
      "eventMsg": "1234"
    },
    {
      "eventType": "console.log()",
      "eventMsg": "1234"
    },
    {
      "eventType": "prompt()",
      "eventMsg": "1234"
    },
  ],
  "blockedUrls": [
    "https://cdn.optimizely.com/js/123456789.js",
    "https://www.googletagmanager.com/gtm.js?id=GTM-123456",
    "https://www.google-analytics.com/analytics.js"
  ],
  "checkTime": "2020-09-16T07:56:17.166Z",
  "responseData": {
    "requestTime": 390,
    "statusMsg": "success",
    "statusCode": 200
  },
  "requestData": {
    "alertOnAnyEvent": false,
    "checkUrl": "https://www.example.com",
    "queryString": "badparam=/test\\\"};alert(1234);/*",
    "reqMethod": "POST",
    "searchString": "1234"
  },
  "checkTime": "2020-09-16T07:37:26.627Z",
  "resourceErrors": []
}
```

In case the page seems clean, the response can look like this:
```json
{
  "blockedUrls": [
    "https://cdn.optimizely.com/js/123456789.js",
    "https://www.googletagmanager.com/gtm.js?id=GTM-123456",
    "https://www.google-analytics.com/analytics.js"
  ],
  "checkTime": "2020-09-16T07:56:17.166Z",
  "responseData": {
    "requestTime": 390,
    "statusMsg": "success",
    "statusCode": 200
  },
  "requestData": {
    "alertOnAnyEvent": false,
    "checkUrl": "https://www.example.com",
    "queryString": "badparam=/test\\\"};alert(1234);/*",
    "reqMethod": "GET",
    "searchString": "1234"
  },
  "hasXss": false,
  "xssData": [],
  "resourceErrors": []
}
```

### Response JSON parameters
- ```blockedUrls (Array<string>)```: Returns an array of resources that were blocked because the domains are in the blocklist
- ```checkTime (Date)```: Returns the timestamp of when the check was executed
- ```hasXss (boolean)```: Returns ```true``` if a possible XSS was found
- ```requestData (RequestData)```: Returns a ```RequestData``` object.
- ```responeData (ResponeData)```: Returns a ```ResponeData``` object.
- ```resourceErrors (Array<ResourceError>)```: Returns an array of ```ResourceError``` objects for each resource that could not be loaded.
- ```xssData (Array<EventData>)```: Returns an array of ```EventData``` objects for any event that fired.

### Response JSON sub-objects
- ```EventData (object)```: Returns an object that consists of:
  -  ```eventType (string)```: The event type that was triggered (alert(), console.log(), etc.)
  -  ```eventMsg (string)```: The message that was triggered by the event
- ```RequestData (object)```: Returns an object that consists of the following objects:
  - ```alertOnAnyEvent (boolean)```: Returns ```true``` when the ```everyevent``` POST parameter was set in the request
  - ```checkUrl (string)```: Returns the provided URL
  - ```queryString (string)```: Returns the provided query string
  - ```reqMethod (string)```: Returns the provided request method
  - ```searchString (string)```: Returns the used searchfor-string for reference
- ```ResponeData (object)```: Returns an object that consists of the following objects:
  - ```requestTime (number)```: Returns the time in ms that the request took to complete
  - ```statusMsg (string)```: Returns status message of the webpage() call ("fail" or "success")
  - ```statusCode (number)```: Returns the HTTP status code
  - ```errorMsg (string)```: Returns an error message when a request failed (if a reason is available)
- ```ResourceError (object)```: Returns an object that consists of the following objects:
  - ```errorCode (number)```: Returns an [error code](https://doc.qt.io/archives/qt-4.8/qnetworkreply.html#NetworkError-enum)
  - ```errorString (string)```: Returns a descriptive string for the error
  - ```url (string)```: Returns the URL that caused the error

## CLI Options
The server provides the following CLI parameters to override defaults

- ```-b <comma-separated list of domains>```: Add additional blocklist domains
- ```-l <IP address or hostname>```: The IP/hostname for the server to listen on (Default: 127.0.0.1)
- ```-p <Port>```: The port for the server to listen on (Default: 8099)
- ```-d```: Enable DEBUG mode (more logging)
- ```-h```: Show usage

## Startup script
The service comes with a startup script in the ```./bin```-directory called ```startProdServer.sh```
The script looks for a local config file ```./bin/prodServer.local.conf``` which can be used to override the default parameters of the script.

The following parameters can be overwritten:
```sh
PHANTOMJS=<Path to your phantomJS binary>
LISTENHOST=<IP/hostname to listen on>
LISTENPORT=<Port to listen on>
```

To start the service you run: ```./bin/startProdServer.sh start```

To stop the service you run: ```./bin/startProdServer.sh stop```

## Systemd
In the ```./systemd```-directory you find an example service-file to use for your systemd to use. Please adjust the path accordingly.A

Copy the file to your systemd-services-directory and run ```sudo systemctl daemon-reload``` to update your systemd-services

To enable the service run: ```systemctl enable xss-check-server```
To start the service run: ```systemctl start xss-check-server```


## License
[MIT](./LICENSE)
