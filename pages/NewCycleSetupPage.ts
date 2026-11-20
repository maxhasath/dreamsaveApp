import { BasePage, s, byText } from './BasePage';
import { TIMEOUT } from './timeouts';

// New-cycle group setup steps that differ from the mid-cycle flows.
export class NewCycleSetupPage extends BasePage {

  // Page 1: tick "This is our first cycle". Page 2: "We are starting a new cycle".
  // A new cycle has no Current Cycle Data page — the app returns to the setup checklist.
  async startNewCycleAsFirstCycle(): Promise<void> {
    const cb = await this.waitForElement(s('cb_first_cycle'));
    if ((await cb.getAttribute('checked')) !== 'true') {
      await this.waitAndTap(s('cb_first_cycle'));
      await this.waitForCheckedState(cb);
    }
    await this.waitAndTap(s('btn_next'), TIMEOUT.ui);

    await this.waitAndTap(s('rd_opt_two'), TIMEOUT.ui);
    await this.waitAndTap(s('btn_next'), TIMEOUT.ui);
  }

  async isOnSetupChecklist(): Promise<boolean> {
    return this.waitForOptionalElement(s('rcv_group_menu'), TIMEOUT.screen);
  }

  // After the last member the app shows the Member Profiles list; Done returns to the checklist
  // (where Elect Officers is available). A tap made while the list is still settling can be lost,
  // so retry Done until the checklist shows.
  async finishMemberList(): Promise<void> {
    const elect = byText('txt_item', 'Elect Officers');
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.waitForOptionalElement(elect, TIMEOUT.brief)) return;
      if (await this.waitForOptionalElement(s('btn_done'), TIMEOUT.ui)) {
        await this.tapElement(await this.waitForElement(s('btn_done')));
      }
      if (await this.waitForOptionalElement(elect, TIMEOUT.moderate)) return;
    }
    await this.waitForElement(elect, TIMEOUT.ui);
  }

  // Back on the checklist after the officers, "Register Group" is the last item to open.
  async tapRegisterGroup(): Promise<void> {
    const register = byText('txt_item', 'Register Group');
    await this.waitForElement(register, TIMEOUT.long);
    await this.tapElement(await $(register));
  }

  // A new cycle has no Confirm Cycle Data review: after the officers the app registers the group
  // and shows "Congratulations! <group> — Your group setup is now complete".
  async waitForSetupComplete(): Promise<{ groupName: string; message: string }> {
    const messageEl = await this.waitForElement(s('tv_setup_completed'), TIMEOUT.sync);
    const nameEl    = await this.waitForElement(s('tv_name'));
    return { groupName: await nameEl.getText(), message: await messageEl.getText() };
  }

  // Next on the completion screen leads to "Back up Group".
  async continueToBackup(): Promise<void> {
    await this.waitAndTap(s('btn_next'), TIMEOUT.ui);
    await this.waitForElement(s('btn_backup_now'), TIMEOUT.long);
  }
}
