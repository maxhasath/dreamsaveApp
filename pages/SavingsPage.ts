import { s } from './BasePage';
import { MeetingBasePage } from './MeetingBasePage';
import { pickRandom } from '../data/testData';
import type { MemberSavings } from '../data/testData';

export interface SavingsRow    { newSaving: number; social: number; total: number; }
export interface SavingsResult { members: string[]; rows: SavingsRow[]; }

// Meeting menu → Savings.
export class SavingsPage extends MeetingBasePage {

  private async enterSavingsForMember(name: string, data: MemberSavings): Promise<void> {
    await this.tapMemberRow(name);
    await this.waitForElement(s('sv_saving'), 10000);
    await this.enterDigits(s('edt_saving_payment'), data.shares);
    await this.enterDigits(s('edt_social_payment'), data.socialPayment);
    await this.scrollToAndTap(s('btn_add_saving'));
    await this.waitForElement(s('rcv_savings'), 10000);
  }

  // Saved rows can sit outside the viewport, so scroll through the list collecting them.
  // Rows are keyed by their values; entries with identical values would collapse into one.
  private async readSavingsRows(expectedCount: number): Promise<SavingsRow[]> {
    const rows = new Map<string, SavingsRow>();
    // The list keeps its scroll position after an entry is saved, so start from the top.
    await this.swipeList('up', 4);
    for (let pass = 0; pass < 6 && rows.size < expectedCount; pass++) {
      const newSavings = await this.readNumbers(s('tv_new_saving'));
      const socials    = await this.readNumbers(s('tv_social_payment'));
      const totals     = await this.readNumbers(s('tv_total'));
      newSavings.forEach((newSaving, i) => {
        rows.set(`${newSaving}|${socials[i]}|${totals[i]}`, { newSaving, social: socials[i], total: totals[i] });
      });
      if (rows.size < expectedCount) await this.swipeList('down');
    }
    return [...rows.values()];
  }

  // Picks `entries.length` distinct members at random from the Savings list and records
  // one entry for each. Returns the chosen members and one row per recorded saving.
  async doSavings(entries: MemberSavings[]): Promise<SavingsResult> {
    await this.tapMenuItem('Savings');
    await this.waitForElement(s('tv_member_name'), 10000);
    const members = pickRandom(await this.readAllTexts(s('tv_member_name')), entries.length, 'savings members');
    for (let i = 0; i < entries.length; i++) {
      await this.enterSavingsForMember(members[i], entries[i]);
    }

    const rows = await this.readSavingsRows(entries.length);

    await this.scrollToAndTap(s('btn_verify_cash_box'));
    await this.dismissAwardDialogs();
    await this.waitForMenu();
    return { members, rows };
  }
}
