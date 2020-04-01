# puppeteer-interceptor

Simplifies intercepting requests and modifying responses within puppeteer scripts.

If you find yourself wanting additional functionality for Puppeteer, you should consider checking out [puppeteer-extra](https://github.com/berstend/puppeteer-extra) and the plugin version of this library, [puppeteer-extra-interceptor](http://github.com/jsoverson/puppeteer-extra-interceptor).

## Status : Experimental

The underlying APIs in the Chrome Devtools Protocol are all labeled "Experimental" so this plugin should be considered experimental as well.

The lifecycle events should be considered unstable. I don't plan on changing them for my use case but if other use cases are considered then behavior might be adjusted.

## Who is this for

- Developers troubleshooting in production
- QA Engineers
- Reverse Engineers
- Penetration Testers

## Documentation

## Installation

```shell
$ npm install puppeteer-interceptor
```

## Usage

```js
const puppeteer = require('puppeteer');

const { intercept, patterns } = require('puppeteer-interceptor');

(async function(){

  const browser = await puppeteer.launch({ headless:false, devtools:true });
  const [ page ] = await browser.pages();

  intercept(page, patterns.Script('*'), {
    onInterception: event => {
      console.log(`${event.request.url} intercepted.`)
    },
    onResponseReceived: event => {
      console.log(`${event.request.url} intercepted, going to modify`)
      event.response.body += `\n;console.log("This script was modified inline");`
      return event.response;
    }
  });

  await page.goto(`https://stackoverflow.com`);
  
}())
```

## Events

### onInterception(event, { abort(ERROR_REASON) })

Event is the event as received from [`Fetch.requestPaused`](https://chromedevtools.github.io/devtools-protocol/tot/Fetch#event-requestPaused).

You can call `abort()` to abort the request and specify a valid ERROR_REASON. You can import the `ERROR_REASON` variable from this library for quick access to valid reasons:

```js
ERROR_REASON = {
  "FAILED": "Failed",
  "ABORTED": "Aborted",
  "TIMEDOUT": "TimedOut",
  "ACCESS_DENIED": "AccessDenied",
  "CONNECTION_CLOSED": "ConnectionClosed",
  "CONNECTION_RESET": "ConnectionReset",
  "CONNECTION_REFUSED": "ConnectionRefused",
  "CONNECTION_ABORTED": "ConnectionAborted",
  "CONNECTION_FAILED": "ConnectionFailed",
  "NAME_NOT_RESOLVED": "NameNotResolved",
  "INTERNET_DISCONNECTED": "InternetDisconnected",
  "ADDRESS_UNREACHABLE": "AddressUnreachable",
  "BLOCKED_BY_CLIENT": "BlockedByClient",
  "BLOCKED_BY_RESPONSE": "BlockedByResponse"
}
```

### onResponseReceived({request, response})

This handler is called with the request from onInterception and the response that has been received and decoded. If a response is returned then the request will be fulfilled with the new response replacing the original.

**WARNING**

This library was put together to analyze and troubleshoot JavaScript, i.e. text files that are relatively small. Intercepting large, binary files may cause unforeseen problems. There are alternatives to processing responses as a stream but that has not been exposed in this library. 

## Patterns

This library exposes utility functions that make it easier to create RequestPatterns, the matcher data type that Chrome expects.

There is a utility function for each of the [Resource Types](https://chromedevtools.github.io/devtools-protocol/tot/Network#type-ResourceType) under the `patterns` export, e.g.

```js
const { patterns } = require('puppeteer-interceptor');

const requestPatterns = patterns.Script('*jquery*');

console.log(requestPatterns);

// Outputs:
// [
//  {
//    urlPattern: '*jquery*',
//    resourceType: 'Script',
//    requestStage: 'Response'
//  }
// ]
```

Using `patterns` is not required and you can have greater control specifying these yourself. There is plenty of room for error though, save yourself a few hours of wasted troubleshooting by avoiding it if you can.  

## Troubleshooting

This library uses `debug` logging. You can view extra log output via:

```shell
$ DEBUG=puppeteer-interceptor node index.js
```