import { MeetingBasePage } from './MeetingBasePage';

// Shared base for the Next Cycle Setup pages. Bottom buttons on these screens (shareout
// "Continue to Shareout", the Closing Summary "Done") can sit entirely under the nav bar, where
// they cannot even be located, and scrollGesture does not scroll those pages. These helpers swipe
// with a finger instead. They are kept here so the shared meeting pages stay exactly as they are.
export class NextCycleBasePage extends MeetingBasePage {

  // Swipes the page until the target is clear of the nav bar. Targets are the last element of
  // their page, so an extra swipe at the end of a page does no harm; a target that is already
  // clear is returned on the first check with no swipe.
  protected async swipeUntilClear(selector: string, maxSwipes = 8): Promise<void> {
    for (let i = 0; i < maxSwipes; i++) {
      if (await this.waitForOptionalElement(selector, 800) && await this.isClearOfNavBar(selector)) return;
      await driver.execute('mobile: swipeGesture', { left: 100, top: 400, width: 880, height: 1200, direction: 'up', percent: 0.5 });
      await browser.pause(300); // intentional stabilization: swipe momentum — no UIAutomator2 end signal
    }
  }

  protected async swipeToAndTap(selector: string): Promise<void> {
    await this.swipeUntilClear(selector);
    await this.tapElement(await this.waitForElement(selector, 10000));
  }
}
