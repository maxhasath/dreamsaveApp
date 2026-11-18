import { s, byText, APP_PKG } from './BasePage';
import { MeetingBasePage } from './MeetingBasePage';
import { pickRandom } from '../data/testData';

// The two loan-date warnings put "Yes, continue" on different ids (btn_cancel, then btn_ok).
const YES_CONTINUE  = 'android=new UiSelector().text("Yes, continue")';
const ELIGIBLE_NAME =
  `android=new UiSelector().resourceId("${APP_PKG}:id/rcv_eligible_members")` +
  `.childSelector(new UiSelector().resourceId("${APP_PKG}:id/tv_member_name"))`;
const radioByText = (text: string) =>
  `android=new UiSelector().className("android.widget.RadioButton").text("${text}")`;

export interface LoanRequest { amount: string; term: string; purpose: string; }
export interface LoanSummary {
  member: string; eligible: string[]; totalLoanFund: number; maxLoan: number;
  amount: number; ratePercent: number; interest: number; balanceDue: number;
}

// Meeting menu → New Loans.
export class NewLoanPage extends MeetingBasePage {

  private async fillLoanForm(loanData: LoanRequest): Promise<void> {
    await this.enterDigits(s('edt_loan_amount'), loanData.amount);
    await this.scrollToAndTap(radioByText(loanData.term));
    await this.scrollToAndTap(radioByText(loanData.purpose));
    await this.scrollToAndTap(s('tv_member_signature'));
    await this.signAndConfirm();
    await this.scrollToAndTap(s('btn_done'));
    // Up to two due-date warnings (outside meeting schedule / after cycle end).
    for (let i = 0; i < 2 && await this.waitForOptionalElement(YES_CONTINUE, 5000); i++) {
      await this.waitAndTap(YES_CONTINUE);
    }
  }

  private async readLoanSummary(): Promise<Omit<LoanSummary, 'member' | 'eligible' | 'totalLoanFund' | 'maxLoan'>> {
    await this.waitForElement(byText('btn_done', 'Approve Loan'), 15000);
    return {
      amount:      await this.readNumber(s('tv_amount')),
      ratePercent: await this.readNumber(s('tv_interest_rate')),
      interest:    await this.readNumber(s('tv_interest')),
      balanceDue:  await this.readNumber(s('tv_balance_due')),
    };
  }

  // Members with an outstanding loan are ineligible, so the eligible list is read first
  // and the borrower is picked from it at random. The requested amount is capped by both
  // "Total Loan Fund" and "Max Loan" under Current Balances.
  async doNewLoan(loanData: LoanRequest): Promise<LoanSummary> {
    await this.tapMenuItem('New Loans');
    await this.waitForElement(ELIGIBLE_NAME, 10000);
    const eligible = await this.readAllTexts(ELIGIBLE_NAME);
    const member   = pickRandom(eligible, 1, 'borrower')[0];
    await this.tapMemberRow(member);

    const totalLoanFund = await this.readNumber(s('tv_new_loan_fund'));
    const maxLoan       = await this.readNumber(s('tv_max_loan'));
    const requested     = Math.min(parseInt(loanData.amount, 10), totalLoanFund, maxLoan);
    await this.fillLoanForm({ ...loanData, amount: String(requested) });

    const summary = await this.readLoanSummary();
    await this.waitAndTap(byText('btn_done', 'Approve Loan'));

    // Back on the New Loans overview
    await this.waitForElement(s('scr_new_loans'), 15000);
    await this.scrollToAndTap(byText('btn_done', 'Done'));
    await this.waitForMenu();
    return { member, eligible, totalLoanFund, maxLoan, ...summary };
  }
}
