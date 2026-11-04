// BasePage — shared wait/interaction utilities for all DreamSave page objects.
// Assertions are NOT placed here; they belong in the test files.
//
// Locator verification: run `adb shell uiautomator dump /sdcard/dump.xml && adb pull /sdcard/dump.xml`
// or use Appium Inspector to confirm all accessibility IDs before execution.

import { APP_PKG as _APP_PKG } from '../config/env';
export const APP_PKG = _APP_PKG;

// Builds a full resource-id selector from the short element name.
export const s = (name: string) => `id:${APP_PKG}:id/${name}`;

// Builds a UIAutomator2 selector matching both resource-id and text.
export const byText = (resId: string, text: string) =>
  `android=new UiSelector().resourceId("${APP_PKG}:id/${resId}").text("${text}")`;

export class BasePage {
  // Cached nav-bar threshold derived from actual device height on first use.
  // Elements whose centre falls at or below this y are nudged up to avoid the nav bar.
  private static _navBarY: number | null = null;

  private async getNavBarThreshold(): Promise<number> {
    if (BasePage._navBarY === null) {
      try {
        const { height } = await driver.getWindowSize();
        BasePage._navBarY = Math.floor(height * 0.92);
      } catch {
        BasePage._navBarY = 2310; // fallback if getWindowSize() is unavailable
      }
    }
    return BasePage._navBarY;
  }
  // Waits for a full-screen loading overlay to disappear.
  async waitForLoader(timeout = 30000): Promise<void> {
    try {
      const loader = await $('~loading_indicator');
      if (await loader.isDisplayed()) {
        await loader.waitForDisplayed({ reverse: true, timeout });
      }
    } catch {
      // Loader was not present — safe to continue
    }
  }

  async waitForElement(selector: string, timeout = 30000): Promise<WebdriverIO.Element> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    return el;
  }

  // Taps an element via Appium's mobile: clickGesture — works on clickable:false elements.
  // Nav-bar-safe: nudges the tap point up when the element centre falls in the nav-bar zone.
  async tapElement(el: WebdriverIO.Element): Promise<void> {
    const { x, y } = await el.getLocation();
    const { width, height } = await el.getSize();
    const cx = x + width / 2;
    const cy = y + height / 2;
    const navBarY = await this.getNavBarThreshold();
    await driver.execute('mobile: clickGesture', { x: cx, y: cy > navBarY ? y + 10 : cy });
  }

  async tap(selector: string): Promise<void> {
    const el = await this.waitForElement(selector);
    await el.click();
  }

  async typeText(selector: string, text: string): Promise<void> {
    const el = await this.waitForElement(selector);
    await el.clearValue();
    await el.setValue(text);
  }

  // Types text via ADB shell — avoids clearValue/setValue keyboard garbage on this device.
  // The field must be empty on entry; click focuses it before the ADB input fires.
  protected async typeViaShell(selector: string, text: string): Promise<void> {
    const el = await $(selector);
    await el.waitForExist({ timeout: 10000 });
    await el.click();
    await browser.pause(300); // intentional stabilization: allow focus to settle before ADB shell text injection
    await driver.execute('mobile: shell', { command: 'input', args: ['text', text] });
  }

  // Scrolls down by performing a mobile: scrollGesture in the given viewport band.
  // Pass a narrower height to target only the upper portion of the screen (e.g. to avoid
  // a nested RecyclerView that starts around y=1900 on the Review screen).
  async scrollDown(top = 400, height = 1400, percent = 0.8): Promise<void> {
    await driver.execute('mobile: scrollGesture', {
      left: 100, top, width: 880, height, direction: 'down', percent,
    });
  }

  async scrollUp(top = 400, height = 1400, percent = 0.8): Promise<void> {
    await driver.execute('mobile: scrollGesture', {
      left: 100, top, width: 880, height, direction: 'up', percent,
    });
  }

  protected async hideKeyboard(): Promise<void> {
    await driver.hideKeyboard().catch(() => {});
  }

  async waitForKeyboardClosed(timeout = 3000): Promise<void> {
    try {
      await browser.waitUntil(
        async () => !(await driver.isKeyboardShown()),
        { timeout, interval: 100 },
      );
    } catch {
      console.warn('waitForKeyboardClosed: timed out — keyboard state uncertain, continuing');
    }
  }

  async waitForOptionalElement(selector: string, timeout = 600): Promise<boolean> {
    try {
      await browser.waitUntil(
        () => $(selector).isDisplayed().catch(() => false),
        { timeout, interval: 100 },
      );
      return true;
    } catch {
      return false;
    }
  }

  async waitForCheckedState(el: WebdriverIO.Element, expected = 'true', timeout = 2000): Promise<void> {
    try {
      await browser.waitUntil(
        async () => (await el.getAttribute('checked').catch(() => null)) === expected,
        { timeout, interval: 100 },
      );
    } catch {
      console.warn('waitForCheckedState: timed out — checked state uncertain, continuing');
    }
  }

  protected async getPageSource(): Promise<string> {
    return driver.getPageSource();
  }

  async scrollToElement(selector: string): Promise<WebdriverIO.Element> {
    const el = await $(selector);
    await el.scrollIntoView();
    await el.waitForDisplayed({ timeout: 15000 });
    return el;
  }

  async isDisplayed(selector: string): Promise<boolean> {
    try {
      const el = await $(selector);
      return await el.isDisplayed();
    } catch {
      return false;
    }
  }

  async selectDropdownOption(dropdownSelector: string, optionText: string): Promise<void> {
    await this.tap(dropdownSelector);
    await this.tap(`~${optionText}`);
  }

  async tapIfDisplayed(selector: string): Promise<boolean> {
    const displayed = await this.isDisplayed(selector);
    if (displayed) await this.waitAndTap(selector);
    return displayed;
  }

  // Waits for selector then taps via mobile: clickGesture (nav-bar-safe).
  async waitAndTap(selector: string, timeout = 6000): Promise<void> {
    const el = await $(selector);
    await el.waitForDisplayed({ timeout });
    await this.tapElement(el);
  }

  // Scrolls the given resource ID (short form, without package prefix) into view then taps it.
  async scrollIntoViewAndTap(resourceId: string): Promise<void> {
    const el = await $(
      `android=new UiScrollable(new UiSelector().scrollable(true))` +
      `.scrollIntoView(new UiSelector().resourceId("${APP_PKG}:id/${resourceId}"))`,
    );
    await this.tapElement(el);
  }

}
