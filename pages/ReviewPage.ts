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

  async getTotalMemberCount(): Promise<string> {
    const seenNames = new Set<string>();
    // Reset outer page to top.
    for (let i = 0; i < 4; i++) {
      await this.scrollUp(400, 1900);
      await browser.pause(200); // intentional stabilization: scroll gesture momentum — no UIAutomator2 end signal
    }
    await browser.pause(400); // intentional stabilization: page settle before getPageSource() — avoids mid-animation XML
    // Use getPageSource() XML parsing instead of findElements — bypasses UIAutomator2's
    // visibility filter which silently drops RecyclerView rows that are partially off-screen.
    // Accumulate names from each scroll position so recycled views are counted only once.
    for (let swipe = 0; swipe < 20; swipe++) {
      const source = await this.getPageSource();
      // UIAutomator2 XML: text= appears BEFORE resource-id= within the same element tag.
      const memberMatches = source.matchAll(/text="([^"]+)"[^>]*?resource-id="[^"]*:id\/tv_name"/g);
      for (const match of memberMatches) {
        if (match[1] && match[1].trim()) {
          seenNames.add(match[1].trim());
        }
      }
      await this.scrollDown(400, 1900, 0.2);
      await browser.pause(400); // intentional stabilization: scroll gesture momentum — no UIAutomator2 end signal
    }
    // Scroll back to top so tv_loan_fund / tv_social_fund remain accessible.
    for (let i = 0; i < 5; i++) {
      await this.scrollUp(400, 1900, 1.0);
      await browser.pause(200); // intentional stabilization: scroll gesture momentum — no UIAutomator2 end signal
    }
    await browser.pause(400); // intentional stabilization: page settle — ensures RecyclerView is fully rendered
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
    // Single deterministic scroll: UiScrollable brings btn_confirm into the viewport.
    await $(
      `android=new UiScrollable(new UiSelector().scrollable(true))` +
      `.scrollIntoView(new UiSelector().resourceId("${APP_PKG}:id/btn_confirm"))`,
    );
    await browser.pause(500); // intentional stabilization: UiScrollable fling deceleration
    // UiScrollable can land btn_confirm at the very bottom of the viewport, right at the
    // gesture-nav-bar boundary. One small scroll (120 px content travel) lifts it clear
    // so the element centrepoint is safely above the nav-bar zone before we tap.
    await this.scrollDown(400, 800, 0.15);
    await browser.pause(300); // intentional stabilization: micro-scroll settle
    // waitAndTap re-resolves a fresh element reference, waits for it to be displayed,
    // then taps via tapElement — no hardcoded coordinates.
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
