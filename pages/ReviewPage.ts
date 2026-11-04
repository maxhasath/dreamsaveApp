import { BasePage, s, byText, APP_PKG } from './BasePage';

export class ReviewPage extends BasePage {
  async waitForReviewScreen(): Promise<void> {
    const alreadyVisible = await this.waitForOptionalElement(s('tv_confirm_cycle_data_title'), 2000);
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

  async getTotalMemberCount(minExpected = 1): Promise<string> {
    const seenNames = new Set<string>();
    await browser.pause(400); // intentional stabilization: page settle before getPageSource() — avoids mid-animation XML
    // Use getPageSource() XML parsing instead of findElements — bypasses UIAutomator2's
    // visibility filter which silently drops RecyclerView rows that are partially off-screen.
    // Accumulate names from each scroll position so recycled views are counted only once.
    // Break as soon as minExpected unique names are found to avoid unnecessary scrolling.
    for (let swipe = 0; swipe < 20; swipe++) {
      const source = await this.getPageSource();
      // UIAutomator2 XML: text= appears BEFORE resource-id= within the same element tag.
      const memberMatches = source.matchAll(/text="([^"]+)"[^>]*?resource-id="[^"]*:id\/tv_name"/g);
      for (const match of memberMatches) {
        if (match[1] && match[1].trim()) {
          seenNames.add(match[1].trim());
        }
      }
      if (seenNames.size >= minExpected) break;
      // Gesture starts at y=1950, inside the RecyclerView (which begins at ~y=1900).
      // This scrolls the inner list only — the outer ScrollView (and btn_confirm) stays put.
      await this.scrollDown(1950, 350, 1.5);
      await browser.pause(400); // intentional stabilization: scroll gesture momentum — no UIAutomator2 end signal
    }
    // Page is left near the bottom — caller must read top-of-page elements
    // (tv_loan_fund, tv_social_fund) BEFORE calling this method.
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
    // Scroll the outer ScrollView until btn_confirm is visibly on screen.
    // Gesture in y=400–1200 (above the RecyclerView at ~y=1900) so the outer ScrollView
    // handles each step. waitForOptionalElement checks actual display state, not just
    // DOM presence — avoids tapping at off-screen coordinates if already scrolled past.
    for (let i = 0; i < 15; i++) {
      const visible = await this.waitForOptionalElement(s('btn_confirm'), 800);
      if (visible) break;
      await this.scrollDown(400, 1200, 0.4);
      await browser.pause(300); // intentional stabilization: scroll gesture momentum
    }
    await this.waitAndTap(s('btn_confirm'), 10000);

    // "Please Review Carefully" dialog — "Yes, continue" (rd_option_one) then Ok.
    await this.waitForElement(s('rd_option_one'));
    await this.waitAndTap(s('rd_option_one'));
    await this.waitAndTap(s('btn_ok'));

    // "Congratulations" screen — tap Next to proceed to the backup screen.
    await this.waitForElement(s('tv_setup_completed'));
    await this.waitAndTap(s('btn_next'));
  }
}
