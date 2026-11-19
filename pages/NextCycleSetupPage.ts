import { s, byText } from './BasePage';
import { MeetingBasePage } from './MeetingBasePage';

const ALLOW_WHILE_USING = 'id:com.android.permissioncontroller:id/permission_allow_foreground_only_button';
const CHECKED_RADIO     = 'android=new UiSelector().className("android.widget.RadioButton").checked(true)';

// "Let's get ready for the next cycle!" setup checklist and its wizards. Most fields arrive
// pre-filled from the previous cycle, so wizard pages are accepted as they are (nothing cleared
// or re-entered); only empty required fields (cycle schedule, starting investment) are filled.
export class NextCycleSetupPage extends MeetingBasePage {

  async isOnChecklist(): Promise<boolean> {
    return this.waitForOptionalElement(s('rcv_group_menu'), 15000);
  }

  // ─── Checklist entry ─────────────────────────────────────────────────────────

  // The shareout's Congratulations screen "Start New Cycle" (or the Meetings tab "Create New
  // Cycle") opens a "Let's Get Started!" notice, then the checklist.
  async startSetup(): Promise<void> {
    for (const entry of [s('btn_start_new_cycle'), s('btn_start')]) {
      if (await this.waitForOptionalElement(entry, 3000)) {
        await this.waitAndTap(entry);
        break;
      }
    }
    await this.waitAndTap(s('btn_ok'), 10000);
    await this.waitForElement(s('rcv_group_menu'), 15000);
  }

  private async openChecklistItem(name: string): Promise<void> {
    const item = byText('txt_item', name);
    await this.waitForElement(item, 15000);
    await this.tapElement(await $(item));
  }

  // ─── Pre-filled wizards (Group Profile, Constitution) ────────────────────────

  // Location permission, intro notices and the country confirmation can each appear first.
  private async dismissPrompts(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      if (await this.waitForOptionalElement(ALLOW_WHILE_USING, 1500)) {
        await this.waitAndTap(ALLOW_WHILE_USING);
      } else if (await this.waitForOptionalElement(s('btn_ok'), 1500)) {
        await this.waitAndTap(s('btn_ok'));
      } else {
        return;
      }
    }
  }

  // Next / Done where visible; below the fold on long pages; and on single-choice pages Next only
  // appears after the pre-selected option is tapped.
  private async advancePage(): Promise<void> {
    for (const control of [s('btn_next'), s('btn_done'), s('btn_start')]) {
      if (await this.waitForOptionalElement(control, 1500)) {
        await this.tapElement(await $(control));
        return;
      }
    }
    for (let swipe = 0; swipe < 5; swipe++) {
      await this.swipeList('down');
      if (await this.waitForOptionalElement(s('btn_next'), 1000)) {
        await this.tapElement(await $(s('btn_next')));
        return;
      }
    }
    await this.tapElement(await $(CHECKED_RADIO));
  }

  private async acceptWizard(item: string): Promise<void> {
    await this.openChecklistItem(item);
    for (let page = 0; page < 25; page++) {
      await this.dismissPrompts();
      if (await this.isDisplayed(s('rcv_group_menu'))) return;
      await this.advancePage();
    }
    await this.waitForElement(s('rcv_group_menu'), 10000);
  }

  async reviewGroupProfile(): Promise<void> {
    await this.acceptWizard('Group Profile');
  }

  async reviewConstitution(): Promise<void> {
    await this.acceptWizard('Constitution');
  }

  // Officers (and the bookkeeper) carry over from the previous cycle: accept them as they are.
  async electOfficers(): Promise<void> {
    await this.acceptWizard('Elect Officers');
  }

  // ─── Cycle Schedule ──────────────────────────────────────────────────────────

  // Opens the screen and clears its intro notice; the empty day and date fields are then filled
  // with FinancialRulesPage.selectMeetingDay / tapSave.
  async openCycleSchedule(): Promise<void> {
    await this.openChecklistItem('Cycle Schedule');
    await this.waitAndTap(s('btn_ok'), 10000);
    await this.waitForElement(s('edt_meeting_day'), 10000);
  }

  // ─── Member Profiles ─────────────────────────────────────────────────────────

  async openMemberProfiles(): Promise<string[]> {
    await this.openChecklistItem('Member Profiles');
    await this.waitAndTap(s('tv_confirm'), 10000); // "Current Members / New Members" notice
    await this.waitForElement(s('rcv_member_list'), 10000);
    return this.readAllTexts(s('tv_name'));
  }

  // Opens the member; an unfinished profile first asks what to do (default: Finish this member).
  private async openMember(name: string): Promise<void> {
    await this.scrollToAndTap(byText('tv_name', name));
    await browser.waitUntil(async () => {
      if (await this.isDisplayed(s('rv_profile_steps'))) return true;
      if (await this.isDisplayed(s('btn_ok'))) await this.waitAndTap(s('btn_ok'));
      return false;
    }, { timeout: 30000, interval: 500, timeoutMsg: `Profile Overview did not open for ${name}` });
  }

  private async ensureChecked(selector: string): Promise<void> {
    const el = await this.waitForElement(selector, 10000);
    if ((await el.getAttribute('checked')) !== 'true') {
      await this.tapElement(el);
      await this.waitForCheckedState(el);
    }
  }

  // Terms & Permissions is the only profile section a continuing member must complete.
  private async grantTermsAndPermissions(): Promise<void> {
    await this.scrollToAndTap(byText('tv_eligibility_name', 'Terms & Permissions'));
    await this.ensureChecked(s('rd_yes'));
    await this.scrollTo(s('cb_agreement'));
    await this.ensureChecked(s('cb_agreement'));
    await this.scrollToAndTap(s('btn_create'));
    // Conditional: country confirmation when the phone number is from another country.
    if (await this.waitForOptionalElement(s('btn_ok'), 3000)) {
      await this.waitAndTap(s('btn_ok'));
    }
    await this.waitForElement(s('rv_profile_steps'), 15000);
  }

  // Returns the amount the app calculated (e.g. "10,000 ZMW").
  private async addStartingInvestment(shares: string): Promise<string> {
    await this.waitAndTap(s('rd_buy_share'), 15000);
    await this.enterDigits(s('edt_initial_input'), shares);
    const amount = await (await this.waitForElement(s('tv_initial_amount'))).getText();
    await this.waitAndTap(s('btn_create_member_profile'));
    await this.waitAndTap(s('btn_ok'), 10000); // "Confirm Starting Investment" → Yes, continue
    return amount;
  }

  // "Goal for <member>" intro → (suggested goal from last cycle's savings) → personal goal.
  // The suggested goal pre-fills the cost, so no amount is typed.
  private async setPersonalGoal(): Promise<void> {
    await this.waitAndTap(s('btn_next'), 15000);
    if (await this.waitForOptionalElement(s('rd_save_more'), 5000)) {
      await this.waitAndTap(s('rd_save_more'));
      await this.waitAndTap(s('btn_ok'));
    }
    await this.waitForElement(s('rcv_personal_goal'), 15000);
    await this.tapElement(await $(s('view_personal_goal_logo')));
    await this.scrollToAndTap(s('btn_save_goal'));
    await this.waitForElement(s('rcv_member_list'), 15000);
  }

  async completeMemberProfile(name: string, shares: string): Promise<string> {
    await this.openMember(name);
    await this.grantTermsAndPermissions();
    await this.scrollToAndTap(s('btn_proceed')); // Profile Overview → Done
    const investment = await this.addStartingInvestment(shares);
    await this.setPersonalGoal();
    return investment;
  }

  // Done on the member list returns to the checklist.
  async finishMemberProfiles(): Promise<void> {
    await this.scrollToAndTap(s('btn_done'));
    await this.waitForElement(s('rcv_group_menu'), 15000);
  }

  // ─── Register the cycle ──────────────────────────────────────────────────────

  // Opens "Register New Cycle", which shows the Confirm Cycle Data review (ReviewPage handles it).
  async openRegisterCycle(): Promise<void> {
    await this.openChecklistItem('Register New Cycle');
    await this.waitForElement(s('tv_confirm_cycle_data_title'), 30000);
  }

  // After the final backup: "Success! … Now it's time to log in!" → Group Login Instructions.
  async continueToLoginInstructions(): Promise<string> {
    const message = await (await this.waitForElement(s('tv_desc'), 30000)).getText();
    await this.waitAndTap(s('btn_next'), 10000);
    await this.waitForElement(s('btn_try_it'), 15000);
    return message;
  }
}
