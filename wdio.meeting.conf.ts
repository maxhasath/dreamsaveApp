import { config as baseConfig } from './wdio.conf';

// Meeting flow = the shared Appium/WDIO setup from wdio.conf.ts (which clears app data in
// `before`, so the spec's Group Login runs first) plus the overrides below.
export const config: WebdriverIO.Config = {
  ...baseConfig,

  specs: ['./tests/**/*.spec.ts'],

  mochaOpts: {
    ...baseConfig.mochaOpts,
    // Steps are sequential on one device session: stop at the first failure so the
    // app stays on the failing screen for in-place inspection.
    bail: true,
  },

  // On failure keep a screenshot and the UI hierarchy (XML file only — never logged inline).
  afterTest: async function (test, _context, { passed }) {
    if (passed) return;
    const fs  = require('fs');
    const dir = './screenshots';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const safeName = test.title.replace(/[^a-zA-Z0-9._-]/g, '_');
    await browser.saveScreenshot(`${dir}/${safeName}.png`);
    fs.writeFileSync(`${dir}/${safeName}.xml`, await browser.getPageSource());
  },
};
