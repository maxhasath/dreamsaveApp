import { BasePage, s, byText } from './BasePage';

export class FinancialRulesPage extends BasePage {
  // Constitution wizard page 1: Savings intro
  // Constitution wizard page 2: Savings (shares) — enters share price
  // Constitution wizard page 3: Loans (max loan amount) — selects 3x
  async enterSharePrice(priceZmw: string): Promise<void> {
    const constitutionEl = await $(byText('txt_item', 'Constitution'));
    const onChecklist = await constitutionEl.isDisplayed().catch(() => false);
    if (onChecklist) {
      await this.tapElement(constitutionEl);
    }

    // Page 1 — Savings intro
    await this.waitAndTap(s('rd_yes'), 15000);
    await this.waitAndTap(s('btn_next'));

    // Page 2 — Savings (shares)
    await this.typeText(s('edt_share_price'), priceZmw);
    await this.hideKeyboard();
    await this.waitAndTap(s('cb_no_min_share'));
    await this.waitAndTap(s('cb_no_max_share'));
    await this.waitAndTap(s('btn_next'));

    // Page 3 — Loans: select 3x max loan amount
    await this.waitAndTap(s('rd_three_amount'));
    await this.waitAndTap(s('btn_next'));
  }

  // Constitution wizard pages 4–5: Interest Method Step 1 and Step 2
  async selectLoanInterestType(type: string): Promise<void> {
    if (type.toLowerCase().includes('one-time') || type.toLowerCase().includes('one time')) {
      await this.waitAndTap(s('rd_one_time'));
    } else {
      await this.waitAndTap(s('rd_monthly_type'));
    }
    if (type.toLowerCase().includes('added')) {
      await this.waitAndTap(s('rd_added'));
    } else {
      await this.waitAndTap(s('rd_subtract'));
    }
    await this.waitAndTap(s('btn_next'));
  }

  // Constitution wizard page after Interest Method: enters interest rate
  async enterLoanInterestRate(rate: string): Promise<void> {
    const visible = await $(s('edt_interest_rate')).waitForDisplayed({ timeout: 3000 }).catch(() => false);
    if (!visible) return;
    await this.typeText(s('edt_interest_rate'), rate);
    await this.hideKeyboard();
    await this.waitAndTap(s('btn_next'));
  }

  // Taps the target checkbox, handling the case where the app pre-checks it on render
  // (which keeps btn_next hidden until any tap fires the lazy-render callback).
  private async ensureCheckboxSelected(
    checkboxes: WebdriverIO.ElementArray,
    targetIndex: number,
  ): Promise<void> {
    const cb = checkboxes[targetIndex];
    if (await cb.getAttribute('checked') === 'true') {
      // Tap a neighbour to surface btn_next, then restore the target if it got unchecked.
      const altIndex = targetIndex > 0 ? targetIndex - 1 : targetIndex + 1;
      await this.tapElement(checkboxes[altIndex]);
      await this.waitForCheckedState(checkboxes[altIndex]);
      if (await cb.getAttribute('checked') !== 'true') {
        await this.tapElement(cb);
        await this.waitForCheckedState(cb);
      }
    } else {
      await this.tapElement(cb);
      await this.waitForCheckedState(cb);
      if (await cb.getAttribute('checked') !== 'true') {
        await this.tapElement(cb);
        await this.waitForCheckedState(cb);
      }
    }
  }

  // Fills all per-term interest rate pages shown after the loan term selection.
  // The app renders one page per selected term; we loop until no fields are visible.
  private async fillPerTermInterestPages(rate: string): Promise<void> {
    for (let page = 0; page < 5; page++) {
      await browser.waitUntil(
        async () => {
          const ff = await $$(s('edt_interest_rate'));
          return ff.length > 0 && await ff[0].isDisplayed().catch(() => false);
        },
        { timeout: 5000, interval: 300 },
      ).catch(() => {});
      const fields = await $$(s('edt_interest_rate'));
      if (fields.length === 0) break;
      if (!await fields[0].isDisplayed().catch(() => false)) break;
      for (const field of fields) {
        if (await field.isDisplayed().catch(() => false)) {
          await field.clearValue();
          await field.clearValue();
          await field.setValue(rate);
          await this.hideKeyboard();
          await this.waitForKeyboardClosed();
        }
      }
      await this.waitAndTap(s('btn_next'), 10000);
    }
  }

  // Constitution wizard Loan Terms page: selects term checkbox and advances.
  // btn_next only appears in DOM after a checkbox is explicitly tapped — the app renders it
  // lazily once the user has made a selection.
  async enterLoanTermMonths(months: string, perTermInterestRate?: string): Promise<void> {
    const checkboxes = await $$(s('cb_loan_term'));
    if (checkboxes.length === 0) return;
    const targetIndex = parseInt(months, 10) - 1;
    if (targetIndex < 0 || targetIndex >= checkboxes.length) return;
    await this.ensureCheckboxSelected(checkboxes, targetIndex);
    // btn_next is a RecyclerView footer below all 12 rows — scroll to bring it into view.
    await this.scrollIntoViewAndTap('btn_next');
    if (perTermInterestRate) {
      await this.fillPerTermInterestPages(perTermInterestRate);
    }
  }

  // Constitution wizard Co-Signers page
  async setCoSignersRequired(required: boolean): Promise<void> {
    if (required) {
      await this.waitAndTap(s('rd_have_co_signer'), 15000);
    } else {
      await this.waitAndTap(s('rd_no_co_signer'), 15000);
    }
    await this.waitAndTap(s('btn_next'));
  }

  // Constitution wizard pages: Social Fund → Additional Funds → Fines
  async selectFineIncomeRouting(destination: string): Promise<void> {
    // Social Fund: always select voluntary (flexible contributions)
    await this.waitAndTap(s('rd_voluntary'));
    await this.waitAndTap(s('btn_next'));

    // Additional Funds: page has many items before btn_next — scroll to reveal it.
    await this.scrollIntoViewAndTap('btn_next');

    // Fines: select routing destination
    if (destination === 'Loan Fund') {
      await this.waitAndTap(s('rd_loan_fund'));
    } else {
      await this.waitAndTap(s('rd_social_fund'));
    }
    await this.waitAndTap(s('btn_next'));
  }

  // Constitution wizard page 12 (Notifications) — selects receipt preference and ends wizard.
  async setSmsReceiptsEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      await this.waitAndTap(s('rd_send_receipt'));
    } else {
      await this.waitAndTap(s('rd_no_send_receipt'));
    }
    await this.waitAndTap(s('btn_done'));
  }

  // Cycle Schedule: navigates from checklist → Cycle Schedule page, selects frequency
  async selectMeetingFrequency(frequency: string): Promise<void> {
    const cycleScheduleEl = await $(byText('txt_item', 'Cycle Schedule'));
    await cycleScheduleEl.waitForDisplayed({ timeout: 10000 });
    await this.tapElement(cycleScheduleEl);

    const freqMap: Record<string, string> = {
      Weekly:   'rd_weekly',
      BiWeekly: 'rd_biWeekly',
      Monthly:  'rd_monthly',
    };
    const radioId = freqMap[frequency] ?? 'rd_weekly';
    await this.waitAndTap(s(radioId));
  }

  // Cycle Schedule: selects meeting day from horizontal picker
  async selectMeetingDay(day: string): Promise<void> {
    await this.waitAndTap(s('edt_meeting_day'));
    const itemEl = await $(byText('tv_value_item', day));
    await itemEl.waitForDisplayed({ timeout: 5000 });
    await this.tapElement(itemEl);
    await this.waitAndTap(s('btn_ok'));
  }

  // Reads the calendar's actual displayed month and year from its header element.
  // The calendar may open at a cached month from a prior session — reading the live header
  // lets us compute the correct number of navigation taps regardless of cached state.
  private async detectCalendarOpenedMonth(): Promise<{ month: number; year: number }> {
    const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    try {
      const headerEl = await $(s('tv_month'));
      await headerEl.waitForExist({ timeout: 3000 });
      const parts = (await headerEl.getText()).trim().split(/\s+/);
      const year = parseInt(parts[parts.length - 1], 10);
      let idx = SHORT_MONTHS.indexOf(parts[0]);
      if (idx === -1) idx = MONTHS.indexOf(parts[0]);
      if (idx !== -1 && !isNaN(year)) return { month: idx + 1, year };
    } catch {}
    // Fallback to system clock — calendar opens at current month by default when not cached.
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  // Opens the calendar for the given field ID, navigates to the target month (calculated
  // from the calendar's ACTUAL displayed month, not assumed current month), then taps the day.
  // dateStr format: 'DD/MM/YYYY'
  private async setCalendarDate(fieldId: string, dateStr: string): Promise<void> {
    const [dayStr, monthStr, yearStr] = dateStr.split('/');
    const day          = parseInt(dayStr, 10);
    const targetMonth  = parseInt(monthStr, 10); // 1-indexed
    const targetYear   = parseInt(yearStr, 10);

    // Scroll the date field into view before tapping (it sits below the fold
    // after the meeting-day picker on the Cycle Schedule screen).
    await this.scrollIntoViewAndTap(fieldId);
    // Wait for navigation arrows to confirm the calendar is open
    await browser.waitUntil(
      async () => {
        const prevVisible = await $(s('view_prev')).isDisplayed().catch(() => false);
        const nextVisible = await $(s('view_next')).isDisplayed().catch(() => false);
        return prevVisible || nextVisible;
      },
      { timeout: 5000, timeoutMsg: `Calendar for '${fieldId}' did not open` },
    );

    // Detect the ACTUAL month the calendar opened at — it may be cached from a prior run.
    const { month: calOpenMonth, year: calOpenYear } = await this.detectCalendarOpenedMonth();
    const monthsToNavigate = (targetYear - calOpenYear) * 12 + (targetMonth - calOpenMonth);

    const navBtn = monthsToNavigate > 0 ? s('view_next') : s('view_prev');
    for (let i = 0; i < Math.abs(monthsToNavigate); i++) {
      await this.waitAndTap(navBtn);
      await browser.pause(400); // intentional stabilization: calendar month-nav animation — no end signal
    }

    // Tap the day — only one element with this numeric text is visible in a month-view calendar.
    const dayEl = await $(`android=new UiSelector().text("${day}")`);
    await dayEl.waitForDisplayed({ timeout: 3000 });
    await this.tapElement(dayEl);

    await this.waitAndTap(s('tv_ok'));
    await $(s('tv_ok')).waitForExist({ timeout: 3000, reverse: true }).catch(() => {});
    await browser.pause(600); // intentional stabilization: calendar close settle — allow app to process OK and return
  }

  // Taps "Yes, continue" if the date-confirmation dialog is currently visible.
  // Uses a short poll timeout inside the save loop, longer for the standalone early check.
  private async dismissYesContinueIfPresent(waitTimeout = 2000, afterPause = 800): Promise<void> {
    const exists = await $('android=new UiSelector().text("Yes, continue")')
      .waitForExist({ timeout: waitTimeout })
      .then(() => true)
      .catch(() => false);
    if (exists) {
      await this.tapElement(await $('android=new UiSelector().text("Yes, continue")'));
      await browser.pause(afterPause); // intentional stabilization: parameterized dialog close settle
    }
  }

  // Polls until the setup checklist (Member Profiles row) reappears, dismissing any
  // confirmation dialogs (start-date confirm, day-of-week mismatch) along the way.
  private async waitForChecklistAfterSave(): Promise<void> {
    for (let i = 0; i < 15; i++) {
      await browser.pause(800); // intentional stabilization: polling loop interval — waitForChecklistAfterSave rhythm
      if (await this.isDisplayed(s('tv_ok'))) await this.waitAndTap(s('tv_ok'));
      await this.dismissYesContinueIfPresent(400, 500);
      const confirmExists = await $(s('tv_dialog_confirm_start_date_desc'))
        .waitForExist({ timeout: 400 })
        .catch(() => false);
      if (confirmExists) {
        if (await $(s('btn_ok')).waitForExist({ timeout: 2000 }).catch(() => false)) {
          await this.waitAndTap(s('btn_ok'), 3000);
        }
        await browser.pause(500); // intentional stabilization: post-dialog dismiss settle inside poll iteration
      } else {
        if (await $(s('btn_ok')).waitForExist({ timeout: 400 }).catch(() => false)) {
          await this.waitAndTap(s('btn_ok'));
        }
      }
      const onChecklist = await $(byText('txt_item', 'Member Profiles'))
        .waitForExist({ timeout: 400 })
        .catch(() => false);
      if (onChecklist) break;
    }
  }

  // Cycle Schedule: sets start and shareout dates, then saves.
  // Dates must be in DD/MM/YYYY format. Both are expected to be future dates.
  async tapSave(startDate: string, shareOutDate: string): Promise<void> {
    await this.setCalendarDate('edt_start_date', startDate);
    // The app may show "Are you sure?" immediately after start date — dismiss before share-out.
    await this.dismissYesContinueIfPresent(2000, 800);
    await this.setCalendarDate('edt_share_out_date', shareOutDate);
    await this.hideKeyboard();
    await this.scrollIntoViewAndTap('btn_done');
    await this.waitForChecklistAfterSave();
  }
}
