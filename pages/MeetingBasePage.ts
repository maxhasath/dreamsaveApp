import { BasePage, s, byText } from './BasePage';

// Tabs are id-less TextViews inside the tab strip, so text is the only stable locator.
export const MEETINGS_TAB = 'android=new UiSelector().className("android.widget.TextView").text("Meetings")';
const NAV_BAR = 'id:android:id/navigationBarBackground';

// Shared behaviour for every screen inside a running meeting: menu navigation, list and
// scroll handling, number parsing, self-formatting amount fields, signatures and the
// Dream Star award screens. Screen-specific flows live in the page objects that extend this.
export class MeetingBasePage extends BasePage {

  // ─── Reading values ─────────────────────────────────────────────────────────

  protected toNumber(text: string): number {
    return parseInt(text.replace(/[^\d-]/g, ''), 10) || 0;
  }

  protected async readNumber(selector: string): Promise<number> {
    const el = await this.waitForElement(selector, 15000);
    return this.toNumber(await el.getText());
  }

  protected async readNumbers(selector: string): Promise<number[]> {
    const values: number[] = [];
    for (const el of await $$(selector)) {
      values.push(this.toNumber(await el.getText()));
    }
    return values;
  }

  protected async readTexts(selector: string): Promise<string[]> {
    const values: string[] = [];
    for (const el of await $$(selector)) {
      values.push(await el.getText());
    }
    return values;
  }

  // ─── Scrolling ──────────────────────────────────────────────────────────────

  // The one place a list is swiped: every other helper scrolls through here.
  protected async swipeList(direction: 'up' | 'down', times = 1): Promise<void> {
    for (let i = 0; i < times; i++) {
      if (direction === 'down') {
        await this.scrollDown(400, 1200, 0.5);
      } else {
        await this.scrollUp(400, 1200, 0.5);
      }
      await browser.pause(300); // intentional stabilization: scroll gesture momentum — no UIAutomator2 end signal
    }
  }

  // "Displayed" is not enough: bottom buttons render underneath the system nav bar,
  // where a tap lands on Home instead of the button.
  protected async isClearOfNavBar(selector: string): Promise<boolean> {
    const el = await $(selector);
    if (!(await el.isDisplayed().catch(() => false))) return false;
    const navBar = await $(NAV_BAR);
    if (!(await navBar.isExisting().catch(() => false))) return true;
    const { y } = await el.getLocation();
    const { height } = await el.getSize();
    return y + height <= (await navBar.getLocation()).y;
  }

  private async topOf(selector: string): Promise<number | null> {
    const el = await $(selector);
    return (await el.isExisting().catch(() => false)) ? (await el.getLocation()).y : null;
  }

  protected async scrollTo(selector: string, maxSwipes = 10): Promise<boolean> {
    for (let i = 0; i < maxSwipes; i++) {
      if (await this.waitForOptionalElement(selector, 1000) && await this.isClearOfNavBar(selector)) return true;
      const before = await this.topOf(selector);
      await this.swipeList('down');
      // scrollGesture finds no scrollable on some taller pages (e.g. Attendance with 8 members),
      // leaving the target under the nav bar. If it did not move, swipe the page with a finger.
      if (before !== null && before === await this.topOf(selector)) {
        await driver.execute('mobile: swipeGesture', { left: 100, top: 400, width: 880, height: 1200, direction: 'up', percent: 0.5 });
        await browser.pause(300); // intentional stabilization: swipe momentum — no UIAutomator2 end signal
      }
    }
    return this.isClearOfNavBar(selector);
  }

  protected async scrollToAndTap(selector: string, maxSwipes = 10): Promise<void> {
    await this.scrollTo(selector, maxSwipes);
    // At the end of a page the button can stay partly under the nav bar; tapElement
    // aims at the part of the element that is above it.
    await this.tapElement(await this.waitForElement(selector, 10000));
  }

  // Lists are RecyclerViews: only visible rows exist, so scroll down collecting names
  // until a pass adds nothing new, then return to the top.
  protected async readAllTexts(selector: string): Promise<string[]> {
    const seen = new Set<string>();
    for (let pass = 0; pass < 6; pass++) {
      const before = seen.size;
      (await this.readTexts(selector)).forEach(name => seen.add(name));
      if (pass > 0 && seen.size === before) break;
      await this.swipeList('down');
    }
    await this.swipeList('up', 6);
    return [...seen];
  }

  // A row may be above or below the viewport (lists reorder after an entry is saved).
  protected async tapMemberRow(name: string): Promise<void> {
    const row = byText('tv_member_name', name);
    for (let i = 0; i < 6 && !(await this.waitForOptionalElement(row, 800)); i++) {
      await this.swipeList('up');
    }
    await this.scrollToAndTap(row);
    await this.dismissAwardDialogs(1500);
  }

  // ─── Meeting menu ───────────────────────────────────────────────────────────

  protected async waitForMenu(): Promise<void> {
    await this.waitForElement(s('rcv_meeting_menu'), 15000);
  }

  // The menu keeps its scroll position between steps, so the item may be above or below.
  protected async tapMenuItem(name: string): Promise<void> {
    await this.waitForMenu();
    const item = byText('txt_item', name);
    if (!(await this.scrollTo(item, 4))) {
      for (let i = 0; i < 6 && !(await this.isClearOfNavBar(item)); i++) {
        await this.swipeList('up');
      }
    }
    // A tap on a row that is still settling from the scroll can be lost, leaving the menu
    // on screen; retry until the menu closes or a confirmation dialog opens over it.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.waitAndTap(item, 5000);
      const opened = await browser.waitUntil(
        async () => !(await this.isDisplayed(s('rcv_meeting_menu'))) || await this.isDisplayed(s('btn_ok')),
        { timeout: 4000, interval: 300 },
      ).catch(() => false);
      if (opened) break;
    }
    // Conditional full-screen "New Feature!" intros (closed with the X). A btn_ok here is a
    // confirmation dialog the caller handles, so it is left alone.
    if (!(await this.isDisplayed(s('btn_ok')))) await this.dismissFeatureIntros();
  }

  private async dismissFeatureIntros(): Promise<void> {
    for (let i = 0; i < 3 && await this.waitForOptionalElement(s('view_close'), i === 0 ? 2500 : 1500); i++) {
      await this.waitAndTap(s('view_close'));
    }
  }

  // Goal-achievement / perfect-attendance / early-repayment Dream Star screens — zero or
  // more, depending on the group's history. The close icon is always at the top; btn_ok can
  // sit below a long member list, so it is only the fallback.
  // Also clears the conditional full-screen intros ("Here it is!" data-sharing / Additional
  // Funds) that some groups see when opening a step or a member; `waitMs` bounds the check
  // so the step passes whether or not one appears.
  protected async dismissAwardDialogs(waitMs = 2500): Promise<void> {
    for (let i = 0; i < 4; i++) {
      let dismissed = false;
      for (const control of [s('view_close'), s('btn_ok')]) {
        if (await this.waitForOptionalElement(control, waitMs)) {
          await this.waitAndTap(control);
          dismissed = true;
          break;
        }
      }
      if (!dismissed) return;
    }
  }

  // ─── Input ──────────────────────────────────────────────────────────────────

  // Amount fields are self-formatting ("0 ZMW", "20,000 ZMW"): setValue corrupts them,
  // so existing digits are deleted with key events and the new value is injected via ADB.
  protected async enterDigits(selector: string, value: string): Promise<void> {
    await this.scrollTo(selector);
    const el = await this.waitForElement(selector, 10000);
    const existingDigits = (await el.getText()).replace(/\D/g, '').length;
    await this.tapElement(el);
    await browser.pause(300); // intentional stabilization: focus settle before key events and ADB shell text injection
    await driver.pressKeyCode(123); // KEYCODE_MOVE_END
    for (let i = 0; i < existingDigits; i++) {
      await driver.pressKeyCode(67); // KEYCODE_DEL
    }
    await driver.execute('mobile: shell', { command: 'input', args: ['text', value] });
    await browser.waitUntil(
      async () => (await el.getText()).replace(/\D/g, '') === value,
      { timeout: 5000, interval: 200 },
    );
    await this.hideKeyboard();
    await this.waitForKeyboardClosed();
  }

  // Single-stroke signature across the pad using element bounds —
  // no hardcoded coordinates; adapts to the landscape signature screen.
  protected async signAndConfirm(): Promise<void> {
    const pad = await this.waitForElement(s('signature_pad'), 15000);
    const { x, y }          = await pad.getLocation();
    const { width, height } = await pad.getSize();
    await driver.execute('mobile: dragGesture', {
      startX: x + Math.floor(width * 0.2),
      startY: y + Math.floor(height * 0.5),
      endX:   x + Math.floor(width * 0.8),
      endY:   y + Math.floor(height * 0.6),
      speed:  1500,
    });
    await this.waitAndTap(s('btn_confirm'), 10000);
  }
}
