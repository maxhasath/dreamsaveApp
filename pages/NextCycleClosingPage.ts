import { s } from './BasePage';
import { NextCycleBasePage } from './NextCycleBasePage';
import type { ClosingSummary } from './MeetingPage';
import { TIMEOUT } from './timeouts';

// Meeting menu → Closing Summary, for the Next Cycle Setup flow.
// Same steps as MeetingPage.doClosingSummary; only the final Done tap differs (see
// NextCycleBasePage). Kept here so the shared meeting pages stay exactly as they are.
export class NextCycleClosingPage extends NextCycleBasePage {

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
    await this.waitAndTap(s('view_officer_selected'), TIMEOUT.ui);
    await this.signAndConfirm();

    await this.swipeToAndTap(s('btn_verify'));
    await this.dismissAwardDialogs(); // conditional award / intro screen before the menu returns
    await this.waitForMenu();
    return { ...figures, signer };
  }
}
