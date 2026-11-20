import { MeetingBasePage } from './MeetingBasePage';
import { PAGE_SWIPE, PAGE_SWIPE_SLOW } from './gestures';
import { TIMEOUT } from './timeouts';

// Shared base for the Next Cycle Setup pages. Bottom buttons on these screens (shareout
// "Continue to Shareout", the Closing Summary "Done") can sit entirely under the nav bar, where
// they cannot even be located, and scrollGesture does not scroll those pages. These helpers swipe
// with a finger instead. They are kept here so the shared meeting pages stay exactly as they are.
export class NextCycleBasePage extends MeetingBasePage {

  // One finger swipe that scrolls the page down.
  protected async swipePageDown(): Promise<void> {
    await driver.execute('mobile: swipeGesture', PAGE_SWIPE);
    await browser.pause(300); // intentional stabilization: swipe momentum — no UIAutomator2 end signal
  }

  // A slow swipe that scrolls the page without flinging it (for reading long lists in order).
  protected async swipePageSlowly(): Promise<void> {
    await driver.execute('mobile: swipeGesture', PAGE_SWIPE_SLOW);
    await browser.pause(300); // intentional stabilization: swipe momentum — no UIAutomator2 end signal
  }

  // Swipes the page until the target is clear of the nav bar. Targets are the last element of
  // their page, so an extra swipe at the end of a page does no harm; a target that is already
  // clear is returned on the first check with no swipe.
  protected async swipeUntilClear(selector: string, maxSwipes = 8): Promise<void> {
    for (let i = 0; i < maxSwipes; i++) {
      if (await this.waitForOptionalElement(selector, TIMEOUT.probe) && await this.isClearOfNavBar(selector)) return;
      await this.swipePageDown();
    }
  }

  protected async swipeToAndTap(selector: string): Promise<void> {
    await this.swipeUntilClear(selector);
    await this.tapElement(await this.waitForElement(selector, TIMEOUT.ui));
  }
}
