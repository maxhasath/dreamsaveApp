import { s } from './BasePage';
import { MEETINGS_TAB } from './MeetingBasePage';
import { NextCycleBasePage } from './NextCycleBasePage';
import { TIMEOUT } from './timeouts';

export type OtherFundsAction = 'transfer' | 'payout';

// Meetings tab → View Shareout Calculator → shareout by group / by members → Other Funds.
export class NextCycleShareoutPage extends NextCycleBasePage {

  async getScreenTitle(): Promise<string> {
    return (await this.waitForElement(s('tv_title'), TIMEOUT.screen)).getText();
  }

  async openShareoutCalculator(): Promise<void> {
    await this.waitAndTap(MEETINGS_TAB, TIMEOUT.screen);
    await this.swipeToAndTap(s('view_shareout_info'));
    await this.waitForElement(s('vp_shareout_calculator'), TIMEOUT.screen);
  }

  // Group figures on the By Group tab (read before continuing): total savings, total profit and
  // the combined "Savings + Profit" that is shared out.
  async getGroupTotals(): Promise<{ savings: number; profit: number; shareTotal: number }> {
    return {
      savings:    await this.readNumber(s('tv_total_savings')),
      profit:     await this.readNumber(s('tv_total_profit')),
      shareTotal: await this.readNumber(s('tv_share_total')),
    };
  }

  // Each member's total savings on the By Members tab, collected while paging through the list.
  // Member cards are tall, so a card's name can be on screen before its total: every total is
  // paired with the nearest member name above it, and paging stops after several quiet passes.
  async getMemberSavings(): Promise<Record<string, number>> {
    const savings: Record<string, number> = {};
    let quietPasses = 0;
    for (let pass = 0; pass < 12 && quietPasses < 3; pass++) {
      const known = Object.keys(savings).length;
      const names: { name: string; y: number }[] = [];
      for (const el of await $$(s('tv_name'))) {
        names.push({ name: await el.getText(), y: (await el.getLocation()).y });
      }
      for (const el of await $$(s('tv_total_savings'))) {
        const { y } = await el.getLocation();
        const owner = names.filter(n => n.y < y).sort((a, b) => b.y - a.y)[0];
        if (owner) savings[owner.name] = this.toNumber(await el.getText());
      }
      quietPasses = Object.keys(savings).length === known ? quietPasses + 1 : 0;
      await this.swipePageSlowly();
    }
    return savings;
  }

  // "Continue to Shareout" at the bottom of the By Group tab opens the By Members tab.
  async continueToShareoutByGroup(): Promise<void> {
    await this.swipeToAndTap(s('btn_group_share_out'));
    await this.waitForElement(s('rcv_shareout_members'), TIMEOUT.screen);
  }

  // "Continue to Shareout" at the bottom of the By Members tab. Sharing out before the planned
  // date asks "Are you sure?" (YES) — conditional, so it is only answered when it appears.
  async continueToShareoutByMembers(): Promise<boolean> {
    await this.swipeToAndTap(s('btn_member_share_out'));
    const asked = await this.waitForOptionalElement(s('btn_ok'), TIMEOUT.short);
    if (asked) await this.waitAndTap(s('btn_ok'));
    await this.waitForElement(s('rcv_member_shareout'), TIMEOUT.screen);
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
      }, { timeout: TIMEOUT.moderate, interval: 500 }).catch(() => false);
      if (opened) return;
    }
    throw new Error('Complete Shareout did not open the next screen after 3 taps');
  }

  // "Complete Shareout" on the member list, then (when other funds hold a balance) the Other
  // Funds choice and a second "Complete Shareout". Returns true when Other Funds was shown.
  async completeShareout(otherFunds: OtherFundsAction): Promise<{ otherFundsShown: boolean; balance: number }> {
    await this.tapCompleteShareout();
    const optionId = otherFunds === 'transfer' ? 'rd_transfer' : 'rd_payout_now';
    const shown = await this.waitForOptionalElement(s(optionId), TIMEOUT.ui);
    const balance = shown ? await this.readNumber(s('tv_balance_amount')) : 0;
    if (shown) {
      const option = await $(s(optionId));
      if ((await option.getAttribute('checked')) !== 'true') {
        await this.tapElement(option);
        await this.waitForCheckedState(option);
      }
      await this.swipeToAndTap(s('btn_group_share_out'));
    }
    return { otherFundsShown: shown, balance };
  }

  async isBackupPromptShown(): Promise<boolean> {
    return this.waitForOptionalElement(s('btn_backup_now'), TIMEOUT.long);
  }

  // After the backup's "Success!" screen, Next leads to the cycle-completed Congratulations.
  async continueToCycleCompleted(): Promise<void> {
    await this.waitAndTap(s('btn_next'), TIMEOUT.screen);
    await this.waitForElement(s('btn_start_new_cycle'), TIMEOUT.screen);
  }
}
