import { BasePage, s } from './BasePage';

export class PartnerPage extends BasePage {
  private _partnerName = '';

  async confirmWorksWithNgo(): Promise<void> {
    await this.waitAndTap(s('rd_working_NGO'), 15000);
  }

  async enterPartnerId(partnerId: string): Promise<void> {
    await this.typeText(s('edt_partner_id_digits'), partnerId);
    await this.hideKeyboard();
    try {
      const nameEl = await this.waitForElement(s('tv_partner_name'), 15000);
      this._partnerName = await nameEl.getText();
    } catch {
      // Partner name may not appear — cache stays empty
    }
  }

  // Taps Next on the Partner Affiliation page, then handles the Partner Permission page
  // if it appears: selects "Yes, I have permission" and taps Next to continue.
  async tapNext(): Promise<void> {
    await this.hideKeyboard();
    await this.waitAndTap(s('btn_next'), 15000);

    const permEl = await $(s('rd_has_permission'));
    const permExists = await permEl.waitForExist({ timeout: 10000 }).catch(() => false);
    if (permExists) {
      const displayed = await permEl.isDisplayed().catch(() => false);
      if (displayed) {
        await this.tapElement(permEl);
      }
      await this.waitAndTap(s('btn_next'), 10000);
    }
  }

  async getPartnerName(): Promise<string> {
    if (await this.isDisplayed(s('tv_partner_name'))) {
      const el = await $(s('tv_partner_name'));
      this._partnerName = await el.getText();
    }
    return this._partnerName;
  }
}
