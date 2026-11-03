// @ts-nocheck
// WDIO's config parser runs its own TS compilation pass that doesn't honour transpileOnly,
// causing false-positive type errors on appium:* capability keys. @ts-nocheck disables
// type checking for this file only; test files remain fully type-checked.
import type { Options } from '@wdio/types';
import { APP_PKG, APP_PATH } from './config/env';

export const config: Options.Testrunner = {
  runner: 'local',

  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: './tsconfig.json',
    },
  },

  // Appium server port — must match a running Appium 2 instance
  port: 4723,

  specs: ['./tests/**/*.test.ts'],
  exclude: [],
  maxInstances: 1,

  capabilities: [
    {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      // Providing the APK lets Appium read the correct launcher activity from the manifest,
      // avoiding the cross-package activity-name mangling in UiAutomator2 v3.
      'appium:app': APP_PATH,
      'appium:appPackage': APP_PKG,
      // noReset:true skips reinstall (app is already on device). Data is cleared in the
      // `before` hook via mobile:clearApp so each run starts from the welcome screen.
      'appium:noReset': true,
      'appium:newCommandTimeout': 300,
      'appium:androidInstallTimeout': 90000,
      'appium:autoGrantPermissions': false,
    },
  ],

  logLevel: 'info',
  bail: 1,
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  // Starts and stops Appium server automatically
  services: [
    [
      'appium',
      {
        command: 'appium',
        args: {
          relaxedSecurity: true,
          log: './appium.log',
        },
      },
    ],
  ],

  framework: 'mocha',
  reporters: ['spec'],

  mochaOpts: {
    ui: 'bdd',
    timeout: 300000, // 5 min per test — allows for slow sync/backup steps
  },

  // Clear app data before each suite so the group creation flow always starts from scratch.
  // This is the correct substitute for fullReset/fastReset when no APK path is available.
  before: async () => {
    const appId = APP_PKG;
    await driver.execute('mobile: terminateApp', { appId });
    await driver.execute('mobile: clearApp', { appId });
    await driver.execute('mobile: activateApp', { appId });
  },

  // Capture a screenshot whenever a test step fails — aids offline failure diagnosis.
  afterTest: async function (test, context, { passed }) {
    if (!passed) {
      const fs  = require('fs');
      const dir = './screenshots';
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const safeName = test.title.replace(/[^a-zA-Z0-9._-]/g, '_');
      await browser.saveScreenshot(`${dir}/${safeName}.png`);
    }
  },
};
