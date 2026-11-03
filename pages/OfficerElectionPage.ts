import { BasePage, s, byText } from './BasePage';
import type { OfficerAssignment } from '../data/testData';

export class OfficerElectionPage extends BasePage {
  private async navigateToOfficerSetup(): Promise<void> {
    await browser.pause(2000);

    if (await this.isDisplayed(s('btn_ok'))) {
      await this.waitAndTap(s('btn_ok'));
      await browser.pause(500);
    }

    if (await this.isDisplayed(s('btn_done'))) {
      await this.waitAndTap(s('btn_done'));
      await browser.pause(1500);
    }

    const electOfficersEl = await $(byText('txt_item', 'Elect Officers'));
    if (await electOfficersEl.isDisplayed().catch(() => false)) {
      await this.tapElement(electOfficersEl);
    }

    await this.waitForElement(s('btn_start'), 15000);
    await this.waitAndTap(s('btn_start'));
    await this.waitForElement(s('btn_next'));
    await this.waitAndTap(s('btn_next'));
  }

  private async addOfficer(title: string, memberFullName: string): Promise<void> {
    const alreadyOnForm = await $(s('edt_title_officer')).isDisplayed().catch(() => false);
    if (!alreadyOnForm) {
      await this.waitForElement(s('view_add_officer'));
      await this.waitAndTap(s('view_add_officer'));
      await this.waitForElement(s('edt_title_officer'));
    }

    await this.hideKeyboard();
    await this.typeText(s('edt_title_officer'), title);
    await this.hideKeyboard();

    await this.waitAndTap(s('edt_member'));
    await this.waitForElement(s('rcv_elect_officers'));
    const memberEl = await $(byText('tv_value_item', memberFullName));
    await memberEl.waitForDisplayed({ timeout: 5000 });
    await this.tapElement(memberEl);
    if (await this.isDisplayed(s('btn_ok'))) {
      await this.waitAndTap(s('btn_ok'));
    }

    await this.waitAndTap(s('btn_save_officer'));
  }

  private async designateBookkeeper(memberFullName: string): Promise<void> {
    await this.waitAndTap(s('btn_next'));

    await this.waitForElement(s('rcv_book_keeper'));
    const rows = await $$(s('view_item_book_keeper'));
    for (const row of rows) {
      const nameEl = await row.$(s('tv_officer_name'));
      const name   = await nameEl.getText();
      if (name === memberFullName) {
        const cb = await row.$(s('cb_book_keeper'));
        await this.tapElement(cb);
        break;
      }
    }
    await this.waitAndTap(s('btn_done'));
  }

  async setupOfficers(
    assignments: OfficerAssignment[],
    memberFullNames: string[],
    bookkeeperMemberIndex: number,
  ): Promise<void> {
    await this.navigateToOfficerSetup();

    for (const { title, memberIndex } of assignments) {
      await this.addOfficer(title, memberFullNames[memberIndex]);
    }

    // bookkeeperMemberIndex is a direct index into memberFullNames (same as members array index)
    await this.designateBookkeeper(memberFullNames[bookkeeperMemberIndex]);
  }
}
