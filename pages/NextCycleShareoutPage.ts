import { s } from './BasePage';
import { MEETINGS_TAB } from './MeetingBasePage';
import { NextCycleBasePage } from './NextCycleBasePage';

export type OtherFundsAction = 'transfer' | 'payout';

// Meetings tab → View Shareout Calculator → shareout by group / by members → Other Funds.
export class NextCycleShareoutPage extends NextCycleBasePage {

  async getScreenTitle(): Promise<string> {
    return (await this.waitForElement(s('tv_title'), 15000)).getText();
  }

  async openShareoutCalculator(): Promise<void> {
    await this.waitAndTap(MEETINGS_TAB, 15000);
    await this.swipeToAndTap(s('view_shareout_info'));
    await this.waitForElement(s('vp_shareout_calculator'), 15000);
  }

  // "Continue to Shareout" at the bottom of the By Group tab opens the By Members tab.
  async continueToShareoutByGroup(): Promise<void> {
    await this.swipeToAndTap(s('btn_group_share_out'));
    await this.waitForElement(s('rcv_shareout_members'), 15000);
  }

  // "Continue to Shareout" at the bottom of the By Members tab. Sharing out before the planned
  // date asks "Are you sure?" (YES) — conditional, so it is only answered when it appears.
  async continueToShareoutByMembers(): Promise<boolean> {
    await this.swipeToAndTap(s('btn_member_share_out'));
    const asked = await this.waitForOptionalElement(s('btn_ok'), 5000);
    if (asked) await this.waitAndTap(s('btn_ok'));
    await this.waitForElement(s('rcv_member_shareout'), 15000);
    return asked;
  }

  // Names listed on "Shareout By Members".
  async getShareoutMembers(): Promise<string[]> {
    return this.readAllTexts(s('tv_member_name'));
  }

  // A tap can be lost (e.g. a system notification banner pops up), so retry until the next
  // screen — Other Funds, or the backup prompt when no fund has a balance — appears.
  private async tapCompleteShareout(): Promise<void> {
    const nextScreen = [s('rd_transfer'), s('rd_payout_now'), s('btn_backup_now')];
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.swipeToAndTap(s('btn_done'));
      const opened = await browser.waitUntil(async () => {
        for (const selector of nextScreen) {
          if (await this.isDisplayed(selector)) return true;
        }
        return false;
      }, { timeout: 8000, interval: 500 }).catch(() => false);
      if (opened) return;
    }
    throw new Error('Complete Shareout did not open the next screen after 3 taps');
  }

  // "Complete Shareout" on the member list, then (when other funds hold a balance) the Other
  // Funds choice and a second "Complete Shareout". Returns true when Other Funds was shown.
  async completeShareout(otherFunds: OtherFundsAction): Promise<boolean> {
    await this.tapCompleteShareout();
    const optionId = otherFunds === 'transfer' ? 'rd_transfer' : 'rd_payout_now';
    const shown = await this.waitForOptionalElement(s(optionId), 10000);
    if (shown) {
      const option = await $(s(optionId));
      if ((await option.getAttribute('checked')) !== 'true') {
        await this.tapElement(option);
        await this.waitForCheckedState(option);
      }
      await this.swipeToAndTap(s('btn_group_share_out'));
    }
    return shown;
  }

  async isBackupPromptShown(): Promise<boolean> {
    return this.waitForOptionalElement(s('btn_backup_now'), 30000);
  }

  // After the backup's "Success!" screen, Next leads to the cycle-completed Congratulations.
  async continueToCycleCompleted(): Promise<void> {
    await this.waitAndTap(s('btn_next'), 15000);
    await this.waitForElement(s('btn_start_new_cycle'), 15000);
  }
}
