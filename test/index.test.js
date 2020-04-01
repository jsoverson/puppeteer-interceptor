const assert = require('assert');
const puppeteer = require('puppeteer');

const { intercept, patterns } = require('../src');

const { start, stop } = require('./__server.js');

describe('interceptor', function() {
  let browser, context, page;
  const port = 5599;
  let baseUrl = `http://127.0.0.1:${port}/`;

  before(done => {
    puppeteer.launch().then(b => {
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

  after(done => {
    browser.close().then((_ = stop(done)));
  });

  it('should not cause problems on the page', async function() {
    await page.goto(baseUrl);
    intercept(page, patterns.All('*'));
    const title = await page.title();
    assert.equal(title, 'Test page');

    const staticHeader = await page.$('h1');
    const headerContents = await page.evaluate(header => header.innerHTML, staticHeader);
    assert.equal(headerContents, 'Test header');

    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate(header => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Dynamic header');
  });

  it('should call onInterception', async function() {
    const promise = new Promise((resolve, reject) => {
      intercept(page, patterns.Script('*dynamic.js'), {
        onInterception: resolve,
      });
    });
    await page.goto(baseUrl);
    return promise;
  });

  it('should pass response to onResponseReceived', async function() {
    const promise = new Promise((resolve, reject) => {
      intercept(page, patterns.Script('*dynamic.js'), {
        onResponseReceived: event => {
          assert(event.response.body.match('Dynamic'));
          resolve();
        },
      });
    });
    await page.goto(baseUrl);
    return promise;
  });

  it('should allow replacing response bodies', async function() {
    intercept(page, patterns.Script('*dynamic.js'), {
      onResponseReceived: ({response}) => {
        response.body = response.body.replace('Dynamic', 'Intercepted');
        return response;
      },
    });
    await page.goto(baseUrl);
    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate(header => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Intercepted header');
  });

  it('should allow cancelling requests', async function() {
    intercept(page, patterns.Script('*'), {
      onInterception: (event, { abort }) => {
        if (event.request.url.match('dynamic.js')) abort('Aborted');
      },
    });
    await page.goto(baseUrl);
    const dynamicHeader = await page.$('#dynamic');
    const dynamicContents = await page.evaluate(header => header.innerHTML, dynamicHeader);
    assert.equal(dynamicContents, 'Unmodified header');
  });
});
