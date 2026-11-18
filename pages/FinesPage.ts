import { s } from './BasePage';
import { MeetingBasePage } from './MeetingBasePage';
import { pickRandom } from '../data/testData';

const FINE_REASONS = [
  { reason: 'Absent',     checkbox: 'cb_fines_reason_absents' },
  { reason: 'Late',       checkbox: 'cb_fines_reason_late' },
  { reason: 'Disruptive', checkbox: 'cb_fines_reason_disruptive' },
  { reason: 'Other',      checkbox: 'cb_fines_reason_other' },
];
const OTHER_REASON_TEXT = 'Disruptive behaviour';

export interface FineResult {
  member: string; reason: string; newFine: number; totalDue: number; paid: number; outstanding: number;
}

// Meeting menu → Fines.
export class FinesPage extends MeetingBasePage {

  private async selectReason(reason: string, checkbox: string): Promise<void> {
    await this.scrollTo(s(checkbox));
    const box = await this.waitForElement(s(checkbox), 10000);
    await this.tapElement(box);
    await this.waitForCheckedState(box);
    // "Other" reveals a mandatory free-text reason and blocks Done until it is filled.
    if (reason === 'Other') {
      await this.scrollTo(s('edt_reason_other'));
      const otherEl = await this.waitForElement(s('edt_reason_other'), 10000);
      await otherEl.setValue(OTHER_REASON_TEXT);
      await this.hideKeyboard();
      await this.waitForKeyboardClosed();
    }
  }

  private async confirmFinesOverview(): Promise<void> {
    await this.waitForElement(s('rcv_fines'), 15000);
    await this.scrollToAndTap(s('btn_verify_cash_box'));
    await this.waitForMenu();
  }

  // A random member is fined `fineData.amount` for a random reason and pays it in full.
  async doFines(fineData: { amount: string }): Promise<FineResult> {
    await this.tapMenuItem('Fines');
    await this.waitForElement(s('rcv_fines'), 10000);
    const member = pickRandom(await this.readAllTexts(s('tv_member_name')), 1, 'fined member')[0];
    await this.tapMemberRow(member);
    await this.waitForElement(s('scv_add_fine'), 10000);

    await this.enterDigits(s('edt_new_fines'), fineData.amount);
    const { reason, checkbox } = pickRandom(FINE_REASONS, 1, 'fine reason')[0];
    await this.selectReason(reason, checkbox);

    // Full payment = everything due today (new fine plus any previous balance).
    const totalDue = await this.readNumber(s('tv_total_due'));
    await this.enterDigits(s('edt_payment_today'), String(totalDue));
    const outstanding = await this.readNumber(s('tv_outstanding_balance'));
    await this.scrollToAndTap(s('btn_done'));

    await this.confirmFinesOverview();
    return { member, reason, newFine: parseInt(fineData.amount, 10), totalDue, paid: totalDue, outstanding };
  }
}
