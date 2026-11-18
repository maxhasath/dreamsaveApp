import { BasePage, s, byText, APP_PKG } from './BasePage';

const ALLOW_BTN            = 'id:com.android.permissioncontroller:id/permission_allow_button';
const ALLOW_FOREGROUND_BTN = 'id:com.android.permissioncontroller:id/permission_allow_foreground_only_button';

// Scroll a named container into view, then return the selector for a child field inside it.
// Using container-scoped child selectors avoids instance() ambiguity when the keyboard
// shifts the ScrollView position between fields.
function scrollToSlot(container: string): string {
  return (
    `android=new UiScrollable(new UiSelector().scrollable(true))` +
    `.scrollIntoView(new UiSelector().resourceId("${APP_PKG}:id/${container}"))`
  );
}

function childOf(container: string, childId: string): string {
  return (
    `android=new UiSelector()` +
    `.resourceId("${APP_PKG}:id/${container}")` +
    `.childSelector(new UiSelector().resourceId("${APP_PKG}:id/${childId}"))`
  );
}

// UiScrollable helper: scroll to the Nth (0-based) element with a given resource ID.
// Used only for elements that don't live inside a named slot container (e.g. btn_login).
function scrollIntoViewInstance(shortId: string, instance: number): string {
  return (
    `android=new UiScrollable(new UiSelector().scrollable(true))` +
    `.scrollIntoView(new UiSelector().resourceId("${APP_PKG}:id/${shortId}").instance(${instance}))`
  );
}

const SLOT_CONTAINERS = [
  'view_first_login_credential',
  'view_second_login_credential',
  'view_third_login_credential',
];

export interface LoginOptions {
  country:   string;
  dreamId1:  string; passcode1: string;
  dreamId2:  string; passcode2: string;
  dreamId3:  string; passcode3: string;
  groupName: string;
}

export class LoginPage extends BasePage {

  async selectCountryAndStart(country: string): Promise<void> {
    // Language defaults to English; only the country needs changing.
    await this.waitAndTap(s('spinner_country'), 15000);
    // Zambia is near the end of the alphabetical dropdown — scroll until it appears.
    for (let i = 0; i < 6; i++) {
      if (await this.waitForOptionalElement(byText('tv_item_name', country), 1000)) break;
      await this.scrollDown(400, 1200, 0.8);
    }
    // The first tap can be swallowed while the list is still settling from its scroll;
    // the dropdown then stays open, so tap the country again until Start appears.
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.waitAndTap(byText('tv_item_name', country), 5000);
      if (await this.waitForOptionalElement(s('btn_start_app'), 3000)) break;
    }
    await this.waitAndTap(s('btn_start_app'), 5000);
    // "Is <COUNTRY> the correct country selection?" confirmation dialog
    if (await this.waitForOptionalElement(s('btn_ok'), 6000)) {
      await this.waitAndTap(s('btn_ok'));
    }
  }

  async dismissPermissionsAndModals(): Promise<void> {
    // "Important Note" in-app dialog
    if (await this.waitForOptionalElement(s('btn_ok'), 10000)) {
      await this.waitAndTap(s('btn_ok'));
    }
    // Android system permission dialogs (phone, SMS, notifications — up to 6 prompts)
    for (let i = 0; i < 6; i++) {
      let dismissed = false;
      for (const sel of [ALLOW_BTN, ALLOW_FOREGROUND_BTN]) {
        if (await this.waitForOptionalElement(sel, 1500)) {
          await this.waitAndTap(sel);
          dismissed = true;
          break;
        }
      }
      if (!dismissed) break;
    }
  }

  async tapGroupLogin(): Promise<void> {
    // Welcome screen → "Already have an account? Log in"  (resource-id: tv_login)
    // Absent when the app already shows the login-type selection (logged-out cold start).
    if (await this.waitForOptionalElement(s('tv_login'), 8000)) {
      await this.waitAndTap(s('tv_login'));
    }
    // Login-type selection → "Group Login"  (resource-id: btn_group_login)
    await this.waitAndTap(s('btn_group_login'), 10000);
  }

  // Scrolls the slot's container into view, taps the Dream ID radio inside it, then injects
  // the ID via ADB shell — the field auto-formats hyphens (500-195-228) on text change,
  // so raw digits work.
  private async fillDreamId(container: string, dreamId: string): Promise<void> {
    await $(scrollToSlot(container));
    const rdEl = await $(childOf(container, 'rb_dream_id'));
    await this.tapElement(rdEl);

    const idEl = await $(childOf(container, 'edt_phone_or_dream_id'));
    await this.tapElement(idEl); // use nav-bar-safe tap — Dream ID inputs for lower slots fall below navBarY
    await browser.pause(300); // intentional stabilization: focus settle before ADB shell text injection
    await driver.execute('mobile: shell', { command: 'input', args: ['text', dreamId] });
    await this.hideKeyboard();
    await this.waitForKeyboardClosed();
    await browser.pause(400); // intentional stabilization: ScrollView reflow settle after keyboard dismiss
  }

  // UiScrollable.scrollIntoView() only scrolls FORWARD (down) from the current position.
  // After keyboard dismiss the ScrollView may reset to show the form's top, leaving the
  // passCode row below the viewport. Scroll down (up to 3 passes) until it appears.
  private async fillPasscode(container: string, passcode: string): Promise<void> {
    for (let i = 0; i < 3; i++) {
      if (await this.waitForOptionalElement(childOf(container, 'edt_passCode'), 1500)) break;
      await this.scrollDown();
      await browser.pause(300); // intentional stabilization: swipe animate settle
    }

    // waitForElement (not bare $) absorbs any brief re-render after Dream ID validation.
    const pcEl = await this.waitForElement(childOf(container, 'edt_passCode'), 15000);
    await pcEl.clearValue();
    await pcEl.setValue(passcode);
    await this.hideKeyboard();
    await this.waitForKeyboardClosed();
    await browser.pause(300); // intentional stabilization: keyboard dismiss settle before next slot scroll
  }

  // Fills one member credential slot on the Group Login screen. Each slot's unique container
  // resource-id (view_first/second/third_login_credential) anchors every lookup, so the field
  // search starts from a known scroll position regardless of keyboard-induced shifts.
  async enterCredentialSlot(slot: number, dreamId: string, passcode: string): Promise<void> {
    const container = SLOT_CONTAINERS[slot - 1];
    await this.fillDreamId(container, dreamId);
    await this.fillPasscode(container, passcode);
  }

  async submitLogin(): Promise<void> {
    await this.hideKeyboard();
    // isExisting() works even when btn_login is below the fold; isDisplayed() would miss it.
    // Skip only if the button is gone — that means the form auto-submitted after the 3rd slot.
    const loginInDom = await $(s('btn_login')).isExisting().catch(() => false);
    if (loginInDom) {
      const loginEl = await $(scrollIntoViewInstance('btn_login', 0));
      await this.tapElement(loginEl);
    }
    // "Downloading new updates for your group…" sync progress — Village Sunrise needs up to 3 min.
    // The Android notification permission dialog may appear mid-sync and block tv_group_name,
    // so dismiss it inside the loop rather than waiting until after.
    await this.waitForOptionalElement(s('pb_sync_progress'), 3000);
    await browser.waitUntil(
      async () => {
        // s('permission_allow_button') is the in-app pre-prompt; ALLOW_BTN/ALLOW_FOREGROUND_BTN
        // are the Android system dialog that may follow after the user taps Allow on that one.
        for (const sel of [s('permission_allow_button'), ALLOW_BTN, ALLOW_FOREGROUND_BTN]) {
          if (await this.waitForOptionalElement(sel, 500)) {
            await this.waitAndTap(sel);
            break;
          }
        }
        return this.isDisplayed(s('tv_title'));
      },
      { timeout: 180000, interval: 1000 },
    );
  }

  async isDashboardVisible(): Promise<boolean> {
    return this.isDisplayed(s('tv_title'));
  }

  async getGroupName(): Promise<string> {
    const el = await this.waitForElement(s('tv_title'));
    return el.getText();
  }

  async getBackupStatus(): Promise<string> {
    const el = await this.waitForElement(s('tv_backup_status'));
    return el.getText();
  }

  async getTotalSavings(): Promise<string> {
    const el = await this.waitForElement(s('tv_total_savings'));
    return el.getText();
  }

  async ensureLoggedIn(opts: LoginOptions): Promise<void> {
    if (await this.waitForOptionalElement(s('tv_title'), 3000)) return;
    // A cold start always opens on the country screen, even with a group logged in;
    // choosing the country then lands directly on the Dashboard.
    await this.selectCountryAndStart(opts.country);
    await this.dismissPermissionsAndModals();
    if (await this.waitForOptionalElement(s('tv_title'), 10000)) {
      await this.dismissPermissionsAndModals();
      return;
    }
    await this.tapGroupLogin();
    await this.enterCredentialSlot(1, opts.dreamId1, opts.passcode1);
    await this.enterCredentialSlot(2, opts.dreamId2, opts.passcode2);
    await this.enterCredentialSlot(3, opts.dreamId3, opts.passcode3);
    await this.submitLogin();
    // "Important Note" / permission prompts can still appear over the Dashboard after sync
    // and would block the tab strip.
    await this.dismissPermissionsAndModals();
  }
}
