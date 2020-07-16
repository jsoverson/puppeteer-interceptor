import atob from 'atob';
import btoa from 'btoa';

import DEBUG from 'debug';
import Protocol from 'devtools-protocol';
import { Page, CDPSession } from 'puppeteer';

const debug = DEBUG('puppeteer-interceptor');

export * from './types';
export * from './request-patterns';

export namespace Interceptor {
  export interface OnResponseReceivedEvent {
    request: Protocol.Network.Request;
    response: InterceptedResponse;
  }

  export interface OnInterceptionEvent extends Protocol.Fetch.RequestPausedEvent {}

  export interface EventHandlers {
    onResponseReceived?: (
      event: OnResponseReceivedEvent,
    ) => Promise<InterceptedResponse | void> | InterceptedResponse | void;
    onInterception?: (event: OnInterceptionEvent, control: ControlCallbacks) => Promise<void> | void;
  }

  export interface ControlCallbacks {
    abort: (msg: string) => void;
  }

  export interface InterceptedResponse {
    body: string;
    headers: Protocol.Fetch.HeaderEntry[] | undefined;
    errorReason?: Protocol.Network.ErrorReason;
    statusCode: number;
    base64Body?: string;
    statusMessage?: string;
  }
}

export class InterceptionHandler {
  page: Page;
  patterns: Protocol.Fetch.RequestPattern[] = [];
  eventHandlers: Interceptor.EventHandlers = {};
  client?: CDPSession;
  disabled = false;
  constructor(
    page: Page,
    patterns: Protocol.Fetch.RequestPattern[] = [],
    eventHandlers: Interceptor.EventHandlers = {},
  ) {
    this.page = page;
    this.patterns = patterns;
    this.eventHandlers = eventHandlers;
  }
  disable() {
    this.disabled = true;
  }
  enable() {
    this.disabled = false;
  }
  async initialize() {
    this.client = await this.page.target().createCDPSession();
    await this.client.send('Fetch.enable', { patterns: this.patterns });
    this.client.on('Fetch.requestPaused', async (event: Protocol.Fetch.RequestPausedEvent) => {
      const { requestId, request } = event;

      if (this.disabled) {
        debug(`Interception handler disabled, continuing request.`);
        await this.client.send('Fetch.continueRequest', { requestId });
        return;
      }

      debug(`Request ${event.request.url} (${requestId}) paused.`);

      if (this.eventHandlers.onInterception) {
        let errorReason: Protocol.Network.ErrorReason = 'Aborted';
        let shouldContinue = true;
        const control = {
          abort: (msg: Protocol.Network.ErrorReason) => {
            shouldContinue = false;
            errorReason = msg;
          },
        };

        await this.eventHandlers.onInterception(event, control);
        if (!shouldContinue) {
          debug(`Aborting request ${requestId} with reason "${errorReason}"`);
          await this.client.send('Fetch.failRequest', { requestId, errorReason });
          return;
        }
      }

      let newResponse = null;

      if (this.eventHandlers.onResponseReceived) {
        if (!event.responseStatusCode) {
          debug(
            `Warning: onResponseReceived handler passed but ${requestId} intercepted at Request stage. Handler can not be called.`,
          );
        } else {
          const responseCdp = (await this.client.send('Fetch.getResponseBody', {
            requestId,
          })) as Protocol.Fetch.GetResponseBodyResponse;
          const response: Interceptor.InterceptedResponse = {
            body: responseCdp.base64Encoded ? atob(responseCdp.body) : responseCdp.body,
            headers: event.responseHeaders,
            errorReason: event.responseErrorReason,
            statusCode: event.responseStatusCode,
          };
          newResponse = await this.eventHandlers.onResponseReceived({ response, request });
        }
      }

      if (newResponse) {
        debug(`Fulfilling request ${requestId} with response returned from onResponseReceived`);
        await this.client.send('Fetch.fulfillRequest', {
          requestId,
          responseCode: newResponse.statusCode,
          responseHeaders: newResponse.headers,
          body: newResponse.base64Body ? newResponse.base64Body : btoa(newResponse.body),
          responsePhrase: newResponse.statusMessage,
        });
      } else {
        await this.client.send('Fetch.continueRequest', { requestId });
      }
    });
  }
}

export async function intercept(
  page: Page,
  patterns: Protocol.Fetch.RequestPattern[] = [],
  eventHandlers: Interceptor.EventHandlers = {},
) {
  debug(`Registering interceptors for ${patterns.length} patterns`);
  const interceptionHandler = new InterceptionHandler(page, patterns, eventHandlers);
  await interceptionHandler.initialize();
  return interceptionHandler;
}
