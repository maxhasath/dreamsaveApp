import { BasePage, s } from './BasePage';

const BACKUP_TIMEOUT_MS = 300_000;

export class BackupPage extends BasePage {
  async tapBackUpNow(): Promise<void> {
    await this.waitForElement(s('btn_backup_now'));
    await this.waitAndTap(s('btn_backup_now'));
  }

  async waitForBackupToComplete(): Promise<void> {
    await browser.waitUntil(
      async () => {
        // If "Back Up Later" option appears (network problem dialog), choose it and treat as done.
        if (await this.isDisplayed(s('rd_backup_later'))) {
          await this.waitAndTap(s('rd_backup_later'), 3000).catch(() => {});
          await this.waitAndTap(s('btn_ok'), 5000).catch(() => {});
          return false;
        }
        // Backup complete: app shows btn_next (by resource-id, consistent with rest of app).
        if (await $(s('btn_next')).isDisplayed().catch(() => false)) return true;
        if (await $(s('btn_done')).isDisplayed().catch(() => false)) return true;
        // Fallback: check for text-based "Next" or "Done" buttons.
        if (await $('android=new UiSelector().text("Next")').isDisplayed().catch(() => false)) return true;
        return $('android=new UiSelector().text("Done")').isDisplayed().catch(() => false);
      },
      {
        timeout: BACKUP_TIMEOUT_MS,
        timeoutMsg: `Backup did not complete within ${BACKUP_TIMEOUT_MS / 1000}s`,
        interval: 3000,
      },
    );
  }

  async getBackupStatusText(): Promise<string> {
    // Try the sync status badge element first.
    try {
      const badge = await $('~sync_status_badge');
      if (await badge.isDisplayed().catch(() => false)) {
        return badge.getText();
      }
    } catch {}
    // Scan page source for completion status keywords in UIAutomator2 XML format.
    // The app may show a "Success!" screen (view_success) or a status badge.
    try {
      const source = await this.getPageSource();
      if (source.includes(':id/view_success') || source.includes('text="Success!"')) {
        return 'Success!';
      }
      const match = source.match(/text="(backed up|backup complete|synced)"/i);
      if (match) return match[1];
    } catch {}
    return '';
  }

  async waitForSyncStatus(expectedStatus: string, timeout = 60000): Promise<void> {
    await browser.waitUntil(
      async () => {
        const badge = await $('~sync_status_badge');
        const text = await badge.getText();
        return text.includes(expectedStatus);
      },
      { timeout, timeoutMsg: `Sync status did not reach "${expectedStatus}" within ${timeout}ms` },
    );
  }

  async isBackupErrorDisplayed(): Promise<boolean> {
    try {
      const errEl = await $('android=new UiSelector().textContains("Error")');
      return await errEl.isDisplayed();
    } catch {
      return false;
    }
  }
}
