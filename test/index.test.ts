import { Browser } from 'puppeteer/lib/Browser';
import { Page } from 'puppeteer/lib/Page';
import { Interceptor, patterns, intercept } from '../src';

import assert from 'assert';
import puppeteer from 'puppeteer';

import { start, stop } from './server';

describe('interceptor', function () {
  let browser: Browser, context, page: Page;
  const port = 5599;
  let baseUrl = `http://127.0.0.1:${port}/`;

  before((done) => {
    puppeteer.launch().then((b: Browser) => {
      browser = b;
      start(port, done);
    });
  });

  beforeEach(async () => {
    context = await browser.createIncognitoBrowserContext();
    page = await browser.newPage();
  });

  afterEach(async () => {
    return page.close();
  });

  after((done) => {
    browser.close().then((_) => stop(done));
  });

  it('should not cause problems on the page', async function () {
    await page.goto(baseUrl, {});
    intercept(page, patterns.All('*'));
    const title = await page.title();
    assert.equal(title, 'Test page');

    const staticHeader = await page.$('h1');
    const headerContents = await page.evaluate((header) => header.innerHTML, staticHeader);
    assert.equal(headerContents, 'Test header');

    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Dynamic header');
  });

  it('should call onInterception', async function () {
    const promise = new Promise((resolve, reject) => {
      intercept(page, patterns.Script('*dynamic.js'), {
        onInterception: resolve,
      });
    });
    await page.goto(baseUrl, {});
    return promise;
  });

  it('should pass response to onResponseReceived', async function () {
    const promise = new Promise((resolve, reject) => {
      intercept(page, patterns.Script('*dynamic.js'), {
        onResponseReceived: (event: Interceptor.OnResponseReceivedEvent) => {
          assert(event.response.body.match('Dynamic'));
          resolve();
        },
      } as Interceptor.EventHandlers);
    });
    await page.goto(baseUrl, {});
    return promise;
  });

  it('should allow replacing response bodies', async function () {
    intercept(page, patterns.Script('*dynamic.js'), {
      onResponseReceived: (event: Interceptor.OnResponseReceivedEvent) => {
        event.response.body = event.response.body.replace('Dynamic', 'Intercepted');
        return event.response;
      },
    });
    await page.goto(baseUrl, {});
    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Intercepted header');
  });

  it('should support asynchronous transformers', async function () {
    intercept(page, patterns.Script('*dynamic.js'), {
      onResponseReceived: async (event: Interceptor.OnResponseReceivedEvent) => {
        const value: string = await new Promise((resolve) => { setTimeout(() => resolve('Delayed'), 100) });
        event.response.body = event.response.body.replace('Dynamic', value);
        return event.response;
      },
    });
    await page.goto(baseUrl, {});
    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Delayed header');
  });

  it('should allow cancelling requests', async function () {
    intercept(page, patterns.Script('*'), {
      onInterception: (event: Interceptor.OnInterceptionEvent, { abort }: Interceptor.ControlCallbacks) => {
        if (event.request.url.match('dynamic.js')) abort('Aborted');
      },
    } as Interceptor.EventHandlers);
    await page.goto(baseUrl, {});
    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Unmodified header');
  });
});
