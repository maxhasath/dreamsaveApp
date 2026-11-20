import { s, byText } from './BasePage';
import { MEETINGS_TAB } from './MeetingBasePage';
import { NextCycleBasePage } from './NextCycleBasePage';
import { TIMEOUT } from './timeouts';

const ALLOW_WHILE_USING = 'id:com.android.permissioncontroller:id/permission_allow_foreground_only_button';
const CHECKED_RADIO     = 'android=new UiSelector().className("android.widget.RadioButton").checked(true)';

// "Let's get ready for the next cycle!" setup checklist and its wizards. Most fields arrive
// pre-filled from the previous cycle, so wizard pages are accepted as they are (nothing cleared
// or re-entered); only empty required fields (cycle schedule, starting investment) are filled.
export class NextCycleSetupPage extends NextCycleBasePage {

  // ─── Group state (precondition checks) ───────────────────────────────────────

  // The group name shown in the header of the Dashboard / Meetings tabs.
  async getGroupHeaderName(): Promise<string> {
    return (await this.waitForElement(s('tv_title'), TIMEOUT.screen)).getText();
  }

  // Label of the main action on the Meetings tab: "Start New Meeting" for a group in an active
  // cycle, "Create New Cycle" for one that has already been shared out.
  async getMeetingsTabAction(): Promise<string> {
    await this.waitAndTap(MEETINGS_TAB, TIMEOUT.screen);
    return (await this.waitForElement(s('btn_start'), TIMEOUT.screen)).getText();
  }

  async isOnChecklist(): Promise<boolean> {
    return this.waitForOptionalElement(s('rcv_group_menu'), TIMEOUT.screen);
  }

  // ─── Checklist entry ─────────────────────────────────────────────────────────

  // The shareout's Congratulations screen "Start New Cycle" (or the Meetings tab "Create New
  // Cycle") opens a "Let's Get Started!" notice, then the checklist.
  async startSetup(): Promise<void> {
    for (const entry of [s('btn_start_new_cycle'), s('btn_start')]) {
      if (await this.waitForOptionalElement(entry, TIMEOUT.brief)) {
        await this.waitAndTap(entry);
        break;
      }
    }
    await this.waitAndTap(s('btn_ok'), TIMEOUT.ui);
    await this.waitForElement(s('rcv_group_menu'), TIMEOUT.screen);
  }

  private async openChecklistItem(name: string): Promise<void> {
    const item = byText('txt_item', name);
    await this.waitForElement(item, TIMEOUT.screen);
    await this.tapElement(await $(item));
  }

  // ─── Pre-filled wizards (Group Profile, Constitution) ────────────────────────

  // Location permission, intro notices and the country confirmation can each appear first.
  private async dismissPrompts(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      if (await this.waitForOptionalElement(ALLOW_WHILE_USING, TIMEOUT.quick)) {
        await this.waitAndTap(ALLOW_WHILE_USING);
      } else if (await this.waitForOptionalElement(s('btn_ok'), TIMEOUT.quick)) {
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
      if (await this.waitForOptionalElement(control, TIMEOUT.quick)) {
        await this.tapElement(await $(control));
        return;
      }
    }
    for (let swipe = 0; swipe < 5; swipe++) {
      await this.swipePageDown();
      if (await this.waitForOptionalElement(s('btn_next'), TIMEOUT.probe)) {
        await this.tapElement(await $(s('btn_next')));
        return;
      }
    }
    await this.tapElement(await $(CHECKED_RADIO));
  }

  private async currentTitle(): Promise<string | null> {
    const title = await $(s('tv_title'));
    return (await title.isExisting().catch(() => false)) ? (await title.getText()).trim() : null;
  }

  // Walks the wizard page by page and returns the titles of the pages it passed through
  // (consecutive repeats, such as a two-step page, are collapsed). The spec asserts that
  // sequence, so a new, missing or reordered page fails visibly instead of being tapped through.
  private async walkWizard(): Promise<string[]> {
    const pages: string[] = [];
    for (let page = 0; page < 25; page++) {
      await this.dismissPrompts();
      if (await this.isDisplayed(s('rcv_group_menu'))) return pages;
      const title = await this.currentTitle();
      if (title && title !== pages[pages.length - 1]) pages.push(title);
      await this.advancePage();
    }
    await this.waitForElement(s('rcv_group_menu'), TIMEOUT.ui);
    return pages;
  }

  private async acceptWizard(item: string): Promise<string[]> {
    await this.openChecklistItem(item);
    return this.walkWizard();
  }

  // Returns the pages passed through and the group name that was pre-filled on the first page.
  async reviewGroupProfile(): Promise<{ pages: string[]; groupName: string }> {
    await this.openChecklistItem('Group Profile');
    await this.dismissPrompts();
    const groupName = await (await this.waitForElement(s('edt_group_name'), TIMEOUT.screen)).getText();
    return { pages: await this.walkWizard(), groupName };
  }

  async reviewConstitution(): Promise<string[]> {
    return this.acceptWizard('Constitution');
  }

  // Officers (and the bookkeeper) carry over from the previous cycle: accept them as they are.
  async electOfficers(): Promise<string[]> {
    return this.acceptWizard('Elect Officers');
  }

  // ─── Cycle Schedule ──────────────────────────────────────────────────────────

  // Opens the screen and clears its intro notice; the empty day and date fields are then filled
  // with FinancialRulesPage.selectMeetingDay / tapSave.
  async openCycleSchedule(): Promise<void> {
    await this.openChecklistItem('Cycle Schedule');
    await this.waitAndTap(s('btn_ok'), TIMEOUT.ui);
    await this.waitForElement(s('edt_meeting_day'), TIMEOUT.ui);
  }

  // ─── Member Profiles ─────────────────────────────────────────────────────────

  async openMemberProfiles(): Promise<string[]> {
    await this.openChecklistItem('Member Profiles');
    await this.waitAndTap(s('tv_confirm'), TIMEOUT.ui); // "Current Members / New Members" notice
    await this.waitForElement(s('rcv_member_list'), TIMEOUT.ui);
    return this.readAllTexts(s('tv_name'));
  }

  // Opens the member; an unfinished profile first asks what to do (default: Finish this member).
  private async openMember(name: string): Promise<void> {
    await this.scrollToAndTap(byText('tv_name', name));
    await browser.waitUntil(async () => {
      if (await this.isDisplayed(s('rv_profile_steps'))) return true;
      if (await this.isDisplayed(s('btn_ok'))) await this.waitAndTap(s('btn_ok'));
      return false;
    }, { timeout: TIMEOUT.long, interval: 500, timeoutMsg: `Profile Overview did not open for ${name}` });
  }

  private async ensureChecked(selector: string): Promise<void> {
    const el = await this.waitForElement(selector, TIMEOUT.ui);
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
    if (await this.waitForOptionalElement(s('btn_ok'), TIMEOUT.brief)) {
      await this.waitAndTap(s('btn_ok'));
    }
    await this.waitForElement(s('rv_profile_steps'), TIMEOUT.screen);
  }

  // Returns the amount the app calculated (e.g. "10,000 ZMW").
  private async addStartingInvestment(shares: string): Promise<string> {
    await this.waitAndTap(s('rd_buy_share'), TIMEOUT.screen);
    await this.enterDigits(s('edt_initial_input'), shares);
    const amount = await (await this.waitForElement(s('tv_initial_amount'))).getText();
    await this.waitAndTap(s('btn_create_member_profile'));
    await this.waitAndTap(s('btn_ok'), TIMEOUT.ui); // "Confirm Starting Investment" → Yes, continue
    return amount;
  }

  // "Goal for <member>" intro → (suggested goal from last cycle's savings) → personal goal.
  // The suggested goal pre-fills the cost, so no amount is typed.
  private async setPersonalGoal(): Promise<void> {
    await this.waitAndTap(s('btn_next'), TIMEOUT.screen);
    if (await this.waitForOptionalElement(s('rd_save_more'), TIMEOUT.short)) {
      await this.waitAndTap(s('rd_save_more'));
      await this.waitAndTap(s('btn_ok'));
    }
    await this.waitForElement(s('rcv_personal_goal'), TIMEOUT.screen);
    await this.tapElement(await $(s('view_personal_goal_logo')));
    await this.scrollToAndTap(s('btn_save_goal'));
    await this.waitForElement(s('rcv_member_list'), TIMEOUT.screen);
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
    await this.waitForElement(s('rcv_group_menu'), TIMEOUT.screen);
  }

  // ─── Register the cycle ──────────────────────────────────────────────────────

  // Opens "Register New Cycle", which shows the Confirm Cycle Data review (ReviewPage handles it).
  async openRegisterCycle(): Promise<void> {
    await this.openChecklistItem('Register New Cycle');
    await this.waitForElement(s('tv_confirm_cycle_data_title'), TIMEOUT.long);
  }

  // Meetings completed / remaining shown on the Confirm Cycle Data review.
  async getCycleProgress(): Promise<{ completed: number; remaining: number }> {
    return {
      completed: await this.readNumber(s('tv_meetings_completed')),
      remaining: await this.readNumber(s('tv_meetings_remaining')),
    };
  }

  // After the final backup: "Success! … Now it's time to log in!" → Group Login Instructions.
  async continueToLoginInstructions(): Promise<string> {
    const message = await (await this.waitForElement(s('tv_desc'), TIMEOUT.long)).getText();
    await this.waitAndTap(s('btn_next'), TIMEOUT.ui);
    await this.waitForElement(s('btn_try_it'), TIMEOUT.screen);
    return message;
  }
}
