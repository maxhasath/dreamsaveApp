// PermissionsPage — handles the in-app "Important Note" dialog and Android system
// permission dialogs (camera, photos, SMS, phone, location).

import { BasePage, s } from './BasePage';

// System permission dialog button IDs (AOSP PermissionController)
const ALLOW_BTN             = 'id:com.android.permissioncontroller:id/permission_allow_button';
const ALLOW_FOREGROUND_BTN  = 'id:com.android.permissioncontroller:id/permission_allow_foreground_only_button';
const WHILE_USING_BTN       = '~While using the app';
const MAX_PERMISSION_DIALOGS = 8;

export class PermissionsPage extends BasePage {
  // Dismisses the in-app "Important Note" permissions explainer if visible.
  private async dismissImportantNote(): Promise<void> {
    try {
      await this.waitAndTap(s('btn_ok'), 15000);
      await browser.pause(500); // dialog close animation
    } catch { /* not present */ }
  }

  // Grants one Android system permission dialog if displayed; returns true if dismissed.
  private async allowPermission(): Promise<boolean> {
    for (const selector of [ALLOW_BTN, ALLOW_FOREGROUND_BTN, WHILE_USING_BTN]) {
      if (await this.isDisplayed(selector)) {
        await this.waitAndTap(selector, 3000);
        return true;
      }
    }
    return false;
  }

  // Dismisses the "Important Note" in-app dialog then cycles through any system
  // permission prompts DreamSave triggers on first launch.
  async grantAllRequiredPermissions(): Promise<void> {
    await this.dismissImportantNote();
    for (let i = 0; i < MAX_PERMISSION_DIALOGS; i++) {
      const dismissed = await this.allowPermission();
      if (!dismissed) break;
      await browser.pause(1500); // polling: sequential permission dialogs need settle time between dismissals
    }
  }
}
