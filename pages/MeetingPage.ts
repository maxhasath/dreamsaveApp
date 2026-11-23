import { s, byText } from './BasePage';
import { MeetingBasePage, MEETINGS_TAB } from './MeetingBasePage';
import { PAGE_SWIPE } from './gestures';

const ALLOW_LOCATION = 'id:com.android.permissioncontroller:id/permission_allow_foreground_only_button';
const SEND_SMS       = 'android=new UiSelector().className("android.widget.Button").textMatches("(?i)send.*")';

export interface OpeningBalances { funds: number[]; total: number; }
export interface ClosingSummary {
  startingBalance: number; newSavings: number; loanRepayments: number;
  newLoans: number; fines: number; endBalance: number; signer: string;
}
export interface EndMeetingResult { backupTitle: string; completedMeeting: string; }

// Meeting lifecycle screens: Meetings tab, start, Attendance, Opening Summary,
// Closing Summary and Back up / End. Savings, Fines and the loan screens have their own pages.
export class MeetingPage extends MeetingBasePage {

  // ─── Meetings tab ───────────────────────────────────────────────────────────

  async getMeetingsCompletedCount(): Promise<number> {
    await this.waitAndTap(MEETINGS_TAB, 10000);
    return this.readNumber(s('tv_meeting_completed'));
  }

  // ─── Step 1: Start Meeting ───────────────────────────────────────────────────

  // Returns the meeting title and how many meetings were completed before it.
  async startMeeting(): Promise<{ title: string; completedBefore: number }> {
    // With a meeting in progress, a cold start opens directly on its menu (no tabs),
    // so the completed count is derived from the meeting number instead of the tab.
    if (await this.waitForOptionalElement(s('rcv_meeting_menu'), 3000)) {
      const resumedTitle = await (await this.waitForElement(s('tv_title'))).getText();
      return { title: resumedTitle, completedBefore: this.toNumber(resumedTitle) - 1 };
    }
    const completedBefore = await this.getMeetingsCompletedCount();
    await this.waitAndTap(s('btn_start'), 10000);
    await this.passStartPrompts();
    const title = await (await this.waitForElement(s('tv_title'))).getText();
    return { title, completedBefore };
  }

  // Between the tab and the meeting menu the app may show, depending on state:
  //   - "Welcome to Meeting N" → Start Now! (absent when resuming a meeting in progress)
  //   - "Are you sure?" → YES (starting sooner than the weekly schedule)
  //   - location permission (first meeting after a fresh login)
  private async passStartPrompts(): Promise<void> {
    const prompts = [s('btn_start_meeting'), byText('btn_ok', 'YES'), ALLOW_LOCATION];
    await browser.waitUntil(
      async () => {
        if (await this.isDisplayed(s('rcv_meeting_menu'))) return true;
        for (const prompt of prompts) {
          if (await this.isDisplayed(prompt)) {
            await this.waitAndTap(prompt);
            break;
          }
        }
        return false;
      },
      { timeout: 30000, interval: 500 },
    );
  }

  // ─── Step 2: Attendance ─────────────────────────────────────────────────────

  // Members default to Present; only un-checked rows need a tap. The list is a RecyclerView
  // (only visible rows exist), so scroll through it, then return to the top.
  private async markAllPresent(): Promise<void> {
    for (let pass = 0; pass < 4; pass++) {
      for (const radio of await $$(s('rd_attend'))) {
        if ((await radio.getAttribute('checked')) !== 'true') {
          await this.tapElement(radio);
          await this.waitForCheckedState(radio);
        }
      }
      await this.swipeList('down');
    }
    await this.swipeList('up', 4);
  }

  // Returns the group roster as listed on the Attendance screen (the source of truth for
  // the later steps' member checks).
  async doAttendance(): Promise<string[]> {
    await this.tapMenuItem('Attendance');
    await this.waitForElement(s('rcv_member_attendance'), 15000);
    const members = await this.readAllTexts(s('tv_member_name'));
    await this.markAllPresent();

    await this.scrollToAndTap(s('btn_done'));
    await this.dismissAwardDialogs();
    await this.waitForMenu();
    return members;
  }

  // ─── Step 3: Opening Summary ─────────────────────────────────────────────────

  async doOpeningSummary(): Promise<OpeningBalances> {
    await this.tapMenuItem('Opening Summary');
    const total = await this.readNumber(s('tv_total_fund'));
    const funds = await this.readNumbers(s('tv_fund_amount'));

    await this.scrollToAndTap(s('btn_verify'));
    // "Verify Opening Balance" confirmation dialog
    await this.waitAndTap(s('btn_ok'), 10000);
    await this.waitForMenu();
    return { funds, total };
  }

  // ─── Step 8: Closing Summary ─────────────────────────────────────────────────

  // The Done footer can sit entirely under the nav bar on a taller page (e.g. one with a Group
  // Goal section), where it cannot even be located and scrollGesture does not scroll the page.
  // Swipe with a finger until it is clear of the nav bar; when it already is, nothing is swiped.
  private async tapClosingDone(): Promise<void> {
    for (let i = 0; i < 8; i++) {
      if (await this.waitForOptionalElement(s('btn_verify'), 1000) && await this.isClearOfNavBar(s('btn_verify'))) break;
      await driver.execute('mobile: swipeGesture', PAGE_SWIPE);
      await browser.pause(300); // intentional stabilization: swipe momentum — no UIAutomator2 end signal
    }
    await this.tapElement(await this.waitForElement(s('btn_verify'), 10000));
  }

  async doClosingSummary(): Promise<ClosingSummary> {
    await this.tapMenuItem('Closing Summary');
    const figures = {
      startingBalance: await this.readNumber(s('tv_loan_fund_starting_balance')),
      newSavings:      await this.readNumber(s('tv_loan_fund_new_savings')),
      loanRepayments:  await this.readNumber(s('tv_loan_repayments')),
      newLoans:        await this.readNumber(s('tv_new_loans')),
      fines:           await this.readNumber(s('tv_fines')),
      endBalance:      await this.readNumber(s('tv_loan_fund_end_balance')),
    };

    // The signing-officer row opens the signature screen.
    await this.scrollTo(s('view_officer_selected'));
    const signerEl = await this.waitForElement(s('tv_signer_name'));
    const signer   = await signerEl.getText();
    await this.waitAndTap(s('view_officer_selected'), 10000);
    await this.signAndConfirm();

    await this.tapClosingDone();
    await this.dismissAwardDialogs(); // conditional award / intro screen before the menu returns
    await this.waitForMenu();
    return { ...figures, signer };
  }

  // ─── Step 9: Back Up and End Meeting ─────────────────────────────────────────

  // Upload time depends on the network. Groups on a hot streak get "...backed up" (btn_continue);
  // others get "Success! Meeting N is now saved to the internet" (btn_next).
  private async confirmBackup(): Promise<string> {
    const confirmations = [s('tv_title_hot_streak'), s('tv_message')];
    let shown = '';
    await browser.waitUntil(async () => {
      for (const sel of confirmations) {
        if (await this.isDisplayed(sel)) { shown = sel; return true; }
      }
      return false;
    }, { timeout: 120000, interval: 1000, timeoutMsg: 'backup confirmation did not appear' });
    return (await this.waitForElement(shown)).getText();
  }

  // Success / hot-streak screens (each optional) lead to the Congratulations screen.
  private async advanceToCongratulations(): Promise<void> {
    for (let i = 0; i < 4 && !(await this.isDisplayed(s('tv_meeting_name'))); i++) {
      for (const next of [s('btn_continue'), s('btn_next')]) {
        if (await this.waitForOptionalElement(next, 2000)) { await this.waitAndTap(next); break; }
      }
    }
  }

  async endMeeting(): Promise<EndMeetingResult> {
    await this.waitForMenu();
    await this.scrollToAndTap(s('btn_end_meeting'));
    // "Please Confirm" → YES
    await this.waitAndTap(s('btn_ok'), 10000);
    // SMS-receipt prompt — shown only when the group has SMS receipts to send.
    if (await this.waitForOptionalElement(SEND_SMS, 3000)) {
      await this.waitAndTap(SEND_SMS);
    }

    await this.waitAndTap(s('btn_backup_now'), 15000);
    const backupTitle = await this.confirmBackup();
    await this.advanceToCongratulations();

    // "Congratulations! <Group> — Meeting N is now completed"
    const meetingNameEl    = await this.waitForElement(s('tv_meeting_name'), 15000);
    const completedMeeting = await meetingNameEl.getText();
    await this.waitAndTap(s('tv_name_button'), 10000);
    // Lands on the group home — Dashboard or Meetings tab, depending on where the session began.
    await this.waitForElement(MEETINGS_TAB, 15000);
    return { backupTitle, completedMeeting };
  }
}
