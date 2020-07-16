import puppeteer, { Browser, Page } from 'puppeteer';
import { Interceptor, patterns, intercept } from '../src';

import assert from 'assert';

import { start, TestServer } from '@jsoverson/test-server';

describe('interceptor', function () {
  let browser: Browser, context, page: Page;
  let server: TestServer;

  before(async () => {
    browser = await puppeteer.launch({ headless: true });
    server = await start(__dirname, 'server_root');
  });

  beforeEach(async () => {
    context = await browser.createIncognitoBrowserContext();
    page = await browser.newPage();
  });

  afterEach(async () => {
    return page.close();
  });

  after(async () => {
    await browser.close();
    await server.stop();
  });

  it('should not cause problems on the page', async function () {
    await page.goto(server.url('index.html'), {});
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
    await page.goto(server.url('index.html'), {});
    return promise;
  });

  it('should support adding multiple, unique interceptors', async function () {
    let dynamicIntercepted = 0;
    let consoleIntercepted = 0;
    intercept(page, patterns.Script('*dynamic.js'), {
      onResponseReceived: () => {
        dynamicIntercepted++;
      },
    });
    intercept(page, patterns.Script('*console.js'), {
      onResponseReceived: () => {
        consoleIntercepted++;
      },
    });
    await page.setCacheEnabled(false);
    await page.goto(server.url('index.html'), {});
    assert.equal(dynamicIntercepted, 1);
    assert.equal(consoleIntercepted, 1);
  });

  it('should support removing interceptions', async function () {
    let timesCalled = 0;
    const pattern = patterns.Script('*dynamic.js');
    const handlers = {
      onResponseReceived: () => {
        timesCalled++;
      },
    };
    const handler = await intercept(page, pattern, handlers);
    await page.setCacheEnabled(false);
    await page.goto(server.url('index.html'), {});
    assert.equal(timesCalled, 1);
    handler.disable();
    await page.goto(server.url('index.html'), {});
    assert.equal(timesCalled, 1);
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
    await page.goto(server.url('index.html'), {});
    return promise;
  });

  it('should allow replacing response bodies', async function () {
    intercept(page, patterns.Script('*dynamic.js'), {
      onResponseReceived: (event: Interceptor.OnResponseReceivedEvent) => {
        event.response.body = event.response.body.replace('Dynamic', 'Intercepted');
        return event.response;
      },
    });
    await page.goto(server.url('index.html'), {});
    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Intercepted header');
  });

  it('should support asynchronous transformers', async function () {
    intercept(page, patterns.Script('*dynamic.js'), {
      onResponseReceived: async (event: Interceptor.OnResponseReceivedEvent) => {
        const value: string = await new Promise((resolve) => {
          setTimeout(() => resolve('Delayed'), 100);
        });
        event.response.body = event.response.body.replace('Dynamic', value);
        return event.response;
      },
    });
    await page.goto(server.url('index.html'), {});
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
    await page.goto(server.url('index.html'), {});
    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate((header) => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Unmodified header');
  });
});
