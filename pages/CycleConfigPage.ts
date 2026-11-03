import { BasePage, s } from './BasePage';

export class CycleConfigPage extends BasePage {
  private _loanFundBalance = '';
  private _socialFundBalance = '';

  async enterPreviousCycles(count: string): Promise<void> {
    // Page 1: "Previous Cycles" — fill count and advance
    const cb = await this.waitForElement(s('cb_first_cycle'));
    const checked = await cb.getAttribute('checked');
    if (checked === 'true') {
      await this.waitAndTap(s('cb_first_cycle'));
    }
    await this.typeText(s('edt_previous_cycles'), count);
    await this.hideKeyboard();
    await this.waitAndTap(s('btn_next'), 10000);

    // Page 2: "Current Cycle" — select "We are in the middle of a cycle" then advance
    await this.waitAndTap(s('rd_opt_one'), 10000);
    await this.waitAndTap(s('btn_next'), 10000);
  }

  async enterCurrentMeetingNumber(meetingNumber: string): Promise<void> {
    // Page 3: "Current Cycle Data"
    await this.typeText(s('edt_meeting_number'), meetingNumber);
    await this.hideKeyboard();
  }

  async enterLoanFundBalance(amount: string): Promise<void> {
    await this.typeText(s('edt_loan_fund_balance'), amount);
    this._loanFundBalance = amount;
    await this.hideKeyboard();
  }

  async enterSocialFundBalance(amount: string): Promise<void> {
    await this.typeText(s('edt_social_fund_balance'), amount);
    this._socialFundBalance = amount;
    await this.hideKeyboard();
  }

  async tapNext(): Promise<void> {
    // Page 3 uses btn_done to submit
    await this.hideKeyboard();
    await this.waitAndTap(s('btn_done'), 10000);
  }

  async getLoanFundBalance(): Promise<string> {
    return this._loanFundBalance;
  }

  async getSocialFundBalance(): Promise<string> {
    return this._socialFundBalance;
  }
}
