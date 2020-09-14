# xssCheckServer
A simple phantomJS-based webservice, that downloads and evaluates a given URL and searches for typical XSS-events like alert(), prompt(), console.log() or confirm(). If such event occurs on the given website, the message that is triggered by the event will be compared to a provided search string and marked as "possible XSS", in case it matches.


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

To have a website checked, you can issue the URL and the searchfor-parameter via your favourite web client:
```sh
$ curl -qsS --data-urlencode url='https://www.yourwebsite.com/some/script.php?param1=12345&cfg=/ihackyou\%22};alert(99191999191999);/*' -d searchfor='99191999191999' http://localhost:8099/check
```

The server will now fetch and evaluate the website. On any alert(), console.log(), prompt() or confirm() event, the server will compare the received message against the ```searchfor``` parameter.

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
  "checkUrl": "https://www.yourwebsite.com/some/script.php?param1=12345&cfg=/ihackyou\\%22};alert(99191999191999);/*",
  "checkTime": "2020-09-14T21:35:16.361Z",
  "searchString": "99191999191999"
}
```

In case the page seems clean, the response can look like this:
```json
{
  "hasXss": false,
  "xssData": [],
  "checkUrl": "https://www.yourwebsite.com/some/script.php?param1=12345&cfg=/ihackyou\\%22};alert(99191999191999);/*",
  "checkTime": "2020-09-14T21:49:20.018Z",
  "searchString": "99191999191999"
}
```

## License
[MIT](./LICENSE)