const puppeteer = require('puppeteer');

const { intercept, patterns } = require('.');

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

