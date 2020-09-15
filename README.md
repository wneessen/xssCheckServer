# xssCheckServer
A simple phantomJS-based webservice, that downloads and evaluates a given URL and searches for typical XSS-events like ```alert()```, ```prompt()```, ```console.log()``` or ```confirm()```. If such event occurs on the given website, the message that is triggered by the event will be compared to a provided search string and marked as "possible XSS", in case it matches.


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

- ```url```: The URL to be checked by the webservice (When using special characters, make sure to URLencode them first)
- ```searchfor```: The string that the service compares, when an event fires (Default: 'XSSed!')
- ```everyevent```: When this parameters is set to "true", the service will report any event that triggered without comparing the searchstring

### Example request (via cURL)
To have a website checked, you can issue the URL and the searchfor-parameter via your favourite web client:
```sh
$ curl -qsS --data-urlencode url='https://www.yourwebsite.com/some/script.php?param1=12345&cfg=/ihackyou\%22};alert(99191999191999);/*' -d searchfor='99191999191999' http://localhost:8099/check
```

### Example responses
The server will respond with a JSON object. On a successfull identification of a potential XSS, the response can look like this:
```json
{
  "hasXss": true,
  "xssData": [
    {
      "eventType": "alert()",
      "eventMsg": "99191999191999"
    },
    {
      "eventType": "console.log()",
      "eventMsg": "99191999191999"
    },
    {
      "eventType": "prompt()",
      "eventMsg": "99191999191999"
    },
  ],
  "blockedUrls": [
    "https://cdn.optimizely.com/js/123456789.js",
    "https://www.googletagmanager.com/gtm.js?id=GTM-123456",
    "https://www.google-analytics.com/analytics.js"
  ],
  "checkUrl": "https://www.yourwebsite.com/some/script.php?param1=12345&cfg=/ihackyou\\%22};alert(99191999191999);/*",
  "checkTime": "2020-09-14T21:35:16.361Z",
  "searchString": "99191999191999",
  "alertOnAnyEvent": false,
  "requestTime": 1980
}
```

In case the page seems clean, the response can look like this:
```json
{
  "hasXss": false,
  "xssData": [],
  "checkUrl": "https://www.yourwebsite.com/some/script.php?param1=12345&cfg=/ihackyou\\%22};alert(99191999191999);/*",
  "checkTime": "2020-09-14T21:49:20.018Z",
  "blockedUrls": [
    "https://cdn.optimizely.com/js/123456789.js",
    "https://www.googletagmanager.com/gtm.js?id=GTM-123456",
    "https://www.google-analytics.com/analytics.js"
  ],
  "searchString": "99191999191999",
  "alertOnAnyEvent": false,
  "requestTime": 1980
}
```

### Response JSON parameters
- ```alertOnAnyEvent (boolean)```: Returns ```true``` when the ```everyevent``` POST parameter was set in the request
- ```blockedUrls (Array<string>)```: Returns an array of resources that were blocked because the domains are in the blacklist
- ```checkTime (Date)```: Returns the timestamp of when the check was executed
- ```checkUrl (string)```: Returns the provided URL for reference
- ```hasXss (boolean)```: Returns ```true``` if a possible XSS was found
- ```requestTime (number)```: Returns the time in ms that the request took to complete
- ```searchString (string)```: Returns the provided searchfor-string for reference
- ```xssData (Array<EventData>)```: Returns an array for any event that fired. Each ```EventData``` entry consists of a ```eventType (string)``` and the ```eventMsg (string)```

## CLI Options
The server provides the following CLI parameters to override defaults

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
