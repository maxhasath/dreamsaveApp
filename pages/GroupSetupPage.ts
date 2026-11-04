import { BasePage, s, byText, APP_PKG } from './BasePage';

const LOCATION_ALLOW_BTN = 'id:com.android.permissioncontroller:id/permission_allow_foreground_only_button';

export class GroupSetupPage extends BasePage {
  private _groupName = '';

  // Navigates from the new-user intro screen to the Group Profile form.
  async tapCreateNewGroup(): Promise<void> {
    // 1. Tap "Create New Group" on the intro/login screen.
    await this.waitAndTap(s('btn_group_phone'), 15000);

    // 2. Dismiss the "Getting Started with DreamSave!" overlay.
    await this.waitAndTap(s('btn_get_started'), 10000);

    // 3. Tap "Group Profile" from the group setup checklist.
    const groupProfileItem = await $(byText('txt_item', 'Group Profile'));
    await groupProfileItem.waitForDisplayed({ timeout: 10000 });
    await this.tapElement(groupProfileItem);

    // 4. Grant location permission if the system dialog appears.
    await browser.pause(1000); // optional system dialog: location permission may take a moment to appear
    if (await this.isDisplayed(LOCATION_ALLOW_BTN)) {
      await this.waitAndTap(LOCATION_ALLOW_BTN, 5000);
    }

    // 5. Wait for the group profile form.
    await this.waitForElement(s('rv_group_logo'));
  }

  async selectFirstAvailableLogo(): Promise<void> {
    await this.waitForElement(s('rv_group_logo'));
    const logos = await $$(s('anim_group_logo'));
    if (logos.length === 0) throw new Error('No logo options found in logo picker');
    await logos[0].click();
  }

  async enterGroupName(name: string): Promise<void> {
    await this.typeText(s('edt_group_name'), name);
    this._groupName = name;
    await this.hideKeyboard();
    // Village name and meeting location are required fields; use UiScrollable to bring them into view.
    const scrollAndType = async (resourceId: string, value: string) => {
      const sel = `android=new UiScrollable(new UiSelector().scrollable(true)).scrollIntoView(new UiSelector().resourceId("${APP_PKG}:id/${resourceId}"))`;
      const el = await $(sel);
      await el.click();
      await el.setValue(value);
      await this.hideKeyboard();
    };
    await scrollAndType('edt_group_village', 'Test Village');
    await scrollAndType('edt_meeting_location', 'Community Hall');
  }

  async selectGroupType(type: string): Promise<void> {
    await this.hideKeyboard();
    await browser.pause(500); // keyboard close animation
    // rd_real_group / rd_practice_group are below the fold; scroll into view then tap.
    if (type === 'Real Group') {
      await this.scrollIntoViewAndTap('rd_real_group');
    } else {
      await this.scrollIntoViewAndTap('rd_practice_group');
    }
  }

  async selectLocation(location: string): Promise<void> {
    await this.scrollIntoViewAndTap('spinner_country');
    // Group Profile country dropdown uses tv_country (not tv_item_name) and items are clickable:false
    const itemEl = await $(byText('tv_country', location));
    await itemEl.waitForDisplayed({ timeout: 5000 });
    await this.tapElement(itemEl);
  }

  async tapNext(): Promise<void> {
    await this.hideKeyboard();
    // btn_next is below the radio buttons; scroll to it
    await this.scrollIntoViewAndTap('btn_next');
    // A country-mismatch dialog may appear ("Is ZAMBIA the correct country selection?").
    await browser.pause(1000); // optional dialog: country-mismatch confirmation may take a moment to appear
    if (await this.isDisplayed(s('btn_ok'))) {
      await this.waitAndTap(s('btn_ok'), 5000);
    }
  }

  async getGroupName(): Promise<string> {
    if (await this.isDisplayed(s('edt_group_name'))) {
      const el = await $(s('edt_group_name'));
      return el.getValue();
    }
    return this._groupName;
  }
}
