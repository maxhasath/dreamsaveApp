import { s } from './BasePage';
import { MeetingBasePage } from './MeetingBasePage';
import { pickRandom, randomInt } from '../data/testData';

export type RepaymentMode = 'full' | 'partial';
export interface RepaymentResult {
  member: string; outstandingLoans: number; mode: RepaymentMode;
  outstandingBefore: number; paid: number; balanceAfter: number;
}

// Meeting menu → Loan Repayments.
export class LoanRepaymentPage extends MeetingBasePage {

  private async repayMember(member: string, mode: RepaymentMode, outstandingLoans: number): Promise<RepaymentResult> {
    await this.waitForElement(s('tv_member_name'), 10000);
    await this.tapMemberRow(member);

    // Remaining Balance sits just below the payment field, so scroll to it (not the field).
    await this.scrollTo(s('tv_remaining_balance_require'));
    const outstandingBefore = await this.readNumber(s('tv_balance_due'));
    if (mode === 'partial' && outstandingBefore < 2) {
      throw new Error(`Cannot pay part of ${member}'s loan: balance ${outstandingBefore} is below 2`);
    }
    const paid = mode === 'full' ? outstandingBefore : randomInt(1, outstandingBefore - 1);
    console.log(`[random] repayment ${mode}: ${member} pays ${paid} of ${outstandingBefore}`);
    await this.enterDigits(s('edt_payment_today'), String(paid));
    await this.scrollToAndTap(s('btn_done'));
    // A full repayment earns an "early repayment" Dream Stars dialog before the confirmation.
    await this.dismissAwardDialogs();

    // Payment confirmation — the last tv_balance is the balance after today's payment.
    await this.scrollTo(s('btn_goes_back'));
    const balances     = await this.readNumbers(s('tv_balance'));
    const balanceAfter = balances[balances.length - 1];
    await this.waitAndTap(s('btn_goes_back'), 10000);
    return { member, outstandingLoans, mode, outstandingBefore, paid, balanceAfter };
  }

  // Several outstanding loans → one random borrower repays in full and a different random
  // borrower repays part of their loan (strictly below the balance).
  // A single outstanding loan → one partial payment.
  async doLoanRepayment(): Promise<RepaymentResult[]> {
    await this.tapMenuItem('Loan Repayments');
    await this.waitForElement(s('tv_member_name'), 10000);
    const borrowers = await this.readAllTexts(s('tv_member_name'));
    const count     = borrowers.length;

    const results: RepaymentResult[] = [];
    if (count > 1) {
      const [full, partial] = pickRandom(borrowers, 2, 'repayment borrowers (full, partial)');
      results.push(await this.repayMember(full, 'full', count));
      results.push(await this.repayMember(partial, 'partial', count));
    } else {
      results.push(await this.repayMember(borrowers[0], 'partial', count));
    }

    await this.scrollToAndTap(s('btn_verify_cash_box'));
    await this.waitForMenu();
    return results;
  }
}
