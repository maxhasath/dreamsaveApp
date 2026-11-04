import { BasePage, s, byText } from './BasePage';

export class ReviewPage extends BasePage {
  async waitForReviewScreen(): Promise<void> {
    await browser.pause(1500); // stabilise after officer election

    const alreadyVisible = await $(s('tv_confirm_cycle_data_title')).isDisplayed().catch(() => false);
    if (!alreadyVisible) {
      // After officer/bookkeeper setup, the app returns to the setup checklist.
      // Tap "Register Group" to navigate to the Confirm Cycle Data screen.
      const registerGroupEl = await $(byText('txt_item', 'Register Group'));
      const onChecklist = await registerGroupEl.isDisplayed().catch(() => false);
      if (onChecklist) {
        await this.tapElement(registerGroupEl);
      } else {
        const btnDoneShown = await $(s('btn_done'))
          .waitForDisplayed({ timeout: 5000 })
          .catch(() => false);
        if (btnDoneShown) {
          await this.waitAndTap(s('btn_done'), 5000);
        }
      }
    }
    await this.waitForElement(s('tv_confirm_cycle_data_title'));
  }

  async getTotalMemberCount(): Promise<string> {
    const seenNames = new Set<string>();
    // Reset outer page to top.
    for (let i = 0; i < 4; i++) {
      await this.scrollUp(400, 1900);
      await browser.pause(200); // scroll loop momentum settle
    }
    await browser.pause(400); // page settle before first getPageSource() read
    // Use getPageSource() XML parsing instead of findElements — bypasses UIAutomator2's
    // visibility filter which silently drops RecyclerView rows that are partially off-screen.
    // Accumulate names from each scroll position so recycled views are counted only once.
    for (let swipe = 0; swipe < 12; swipe++) {
      const source = await this.getPageSource();
      // UIAutomator2 XML: text= appears BEFORE resource-id= within the same element tag.
      const memberMatches = source.matchAll(/text="([^"]+)"[^>]*?resource-id="[^"]*:id\/tv_name"/g);
      for (const match of memberMatches) {
        if (match[1] && match[1].trim()) {
          seenNames.add(match[1].trim());
        }
      }
      if (seenNames.size >= 6) break;
      await this.scrollDown(400, 1900, 0.2);
      await browser.pause(400); // scroll loop momentum settle
    }
    // Scroll back to top so tv_loan_fund / tv_social_fund remain accessible.
    for (let i = 0; i < 5; i++) {
      await this.scrollUp(400, 1900, 1.0);
      await browser.pause(200); // scroll loop momentum settle
    }
    await browser.pause(400); // page settle before returning member count
    return String(seenNames.size);
  }

  async getDisplayedLoanFundBalance(): Promise<string> {
    const el = await this.waitForElement(s('tv_loan_fund'));
    return el.getText();
  }

  async getDisplayedSocialFundBalance(): Promise<string> {
    const el = await this.waitForElement(s('tv_social_fund'));
    return el.getText();
  }

  async tapConfirmSetup(): Promise<void> {
    // btn_confirm is below rcv_member_totals on the outer ScrollView.
    // Gesture in the y=400-1200 band (above the RecyclerView at ~y=1900) so the outer
    // ScrollView — not the inner RecyclerView — handles each scroll step.
    for (let i = 0; i < 10; i++) {
      await this.scrollDown(400, 800);
      await browser.pause(700); // scroll momentum settle before getPageSource() poll for btn_confirm
      const source = await this.getPageSource();
      if (source.includes(':id/btn_confirm')) break;
    }
    await this.waitAndTap(s('btn_confirm'), 10000);

    await this.waitForElement(s('rd_option_one'));
    await this.waitAndTap(s('rd_option_one'));
    await this.waitAndTap(s('btn_ok'));

    // "Congratulations" screen — tap Next to proceed to the backup screen.
    await this.waitForElement(s('tv_setup_completed'));
    await this.waitAndTap(s('btn_next'));
  }
}
