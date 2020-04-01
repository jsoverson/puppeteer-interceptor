const atob = require('atob');
const btoa = require('btoa');

const debug = require('debug')('puppeteer-interceptor');

exports.ERROR_REASON = require('./types');
exports.patterns = require('./request-patterns');

exports.intercept = async function intercept(page, patterns = [], eventHandlers = {}) {
  debug(`Registering interceptors for ${patterns.length} patterns`);

  const client = await page.target().createCDPSession();

  await client.send('Fetch.enable', { patterns });

  client.on('Fetch.requestPaused', async event => {
    const { requestId, request } = event;

    debug(`Request ${event.request.url} (${requestId}) paused.`);

    if (eventHandlers.onInterception) {
      let errorReason = false;
      let shouldContinue = true;
      const abort = msg => {
        shouldContinue = false;
        errorReason = msg;
      };
      eventHandlers.onInterception(event, { abort });
      if (!shouldContinue) {
        debug(`Aborting request ${requestId} with reason "${errorReason}"`);
        await client.send('Fetch.failRequest', { requestId, errorReason });
        return;
      }
    }

    let newResponse = null;

    if (eventHandlers.onResponseReceived) {
      if (!event.responseStatusCode) {
        debug(
          `Warning: onResponseReceived handler passed but ${requestId} intercepted at Request stage. Handler can not be called.`,
        );
      } else {
        const responseCdp = await client.send('Fetch.getResponseBody', {
          requestId,
        });
        const response = {
          requestId,
          body: responseCdp.base64Encoded ? atob(responseCdp.body) : responseCdp.body,
          headers: event.responseHeaders,
          errorReason: event.responseErrorReason,
          statusCode: event.responseStatusCode,
        };
        newResponse = eventHandlers.onResponseReceived({response, request});
      }
    }

    if (newResponse) {
      debug(`Fulfilling request ${requestId} with response returned from onResponseReceived`);
      await client.send('Fetch.fulfillRequest', {
        requestId,
        responseCode: newResponse.statusCode,
        responseHeaders: newResponse.headers,
        body: newResponse.base64Body ? newResponse.base64Body : btoa(newResponse.body),
        responsePhrase: newResponse.statusMessage,
      });
    } else {
      await client.send('Fetch.continueRequest', { requestId });
    }
  });
};
