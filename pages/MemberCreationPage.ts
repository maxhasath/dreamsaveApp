import { BasePage, s, byText, APP_PKG } from './BasePage';
import type { MemberData } from '../data/testData';

const EDUCATION_MAP: Record<string, string> = {
  None:      'No Formal Education',
  Primary:   'Primary School',
  Secondary: 'Secondary School',
  Tertiary:  'College',
};

export class MemberCreationPage extends BasePage {
  async tapAddMember(): Promise<void> {
    // Tap "Member Profiles" from the setup checklist if visible (first member and post-minimum-count cases)
    const memberProfilesEl = await $(byText('txt_item', 'Member Profiles'));
    const onChecklist = await memberProfilesEl.isDisplayed().catch(() => false);
    if (onChecklist) {
      await this.tapElement(memberProfilesEl);
    }

    // Wait for the add-member entry point (first member = btn_create, subsequent = view_add_member)
    let found = await browser.waitUntil(
      async () => {
        const hasCreate = await $(s('btn_create')).isDisplayed().catch(() => false);
        const hasAdd    = await $(s('view_add_member')).isDisplayed().catch(() => false);
        return hasCreate || hasAdd;
      },
      { timeout: 15000, interval: 500 },
    ).catch(() => false);

    if (!found) {
      // "Member Profiles" may be scrolled below the viewport — use UiScrollable to find it.
      const scrolledEl = await $(
        `android=new UiScrollable(new UiSelector().scrollable(true))` +
        `.scrollIntoView(new UiSelector().resourceId("${APP_PKG}:id/txt_item").text("Member Profiles"))`,
      );
      await this.tapElement(scrolledEl);

      await browser.waitUntil(
        async () => {
          const hasCreate = await $(s('btn_create')).isDisplayed().catch(() => false);
          const hasAdd    = await $(s('view_add_member')).isDisplayed().catch(() => false);
          return hasCreate || hasAdd;
        },
        { timeout: 15000, interval: 500 },
      );
    }

    if (await this.isDisplayed(s('btn_create'))) {
      await this.waitAndTap(s('btn_create'));
    } else {
      await this.waitAndTap(s('view_add_member'));
    }
  }

  private async selectMemberType(): Promise<void> {
    const firstTimeEl = await $(byText('btn_radio', 'First Time User'));
    await firstTimeEl.waitForExist({ timeout: 5000 });
    await this.tapElement(firstTimeEl);
    await browser.pause(400); // radio selection state: brief UI settle
    await this.waitAndTap(s('btn_next'), 8000);
  }

  private async fillPersonalDetails(member: MemberData): Promise<void> {
    await $(s('edt_first_name')).waitForExist({ timeout: 15000 });
    await this.typeViaShell(s('edt_first_name'), member.firstName);
    await this.hideKeyboard();
    await browser.pause(500); // keyboard close animation
    await this.typeViaShell(s('edt_last_name'), member.lastName);
    await this.hideKeyboard();
    await browser.pause(300); // keyboard close animation

    if (member.gender === 'Female') {
      await this.waitAndTap(s('rd_female'));
    } else {
      await this.waitAndTap(s('rd_male'));
    }

    // Marital status and education are vertical radio lists that may be off-screen.
    // Use UiScrollable.scrollIntoView to bring each item into the tree before tapping.
    const maritalEl = await $(
      `android=new UiScrollable(new UiSelector().scrollable(true).resourceId("${APP_PKG}:id/scr_member_view"))` +
      `.scrollIntoView(new UiSelector().resourceId("${APP_PKG}:id/tv_value_item").text("${member.maritalStatus}"))`,
    );
    await this.tapElement(maritalEl);
    await browser.pause(400); // UiScrollable scroll momentum settle

    const educationLabel = EDUCATION_MAP[member.educationLevel] ?? member.educationLevel;
    const eduEl = await $(
      `android=new UiScrollable(new UiSelector().scrollable(true).resourceId("${APP_PKG}:id/scr_member_view"))` +
      `.scrollIntoView(new UiSelector().resourceId("${APP_PKG}:id/tv_value_item").text("${educationLabel}"))`,
    );
    await this.tapElement(eduEl);

    // Birth date: opens a system scroll-wheel dialog. Dismiss it immediately with OK.
    await this.waitAndTap(s('view_birth_date'));
    await browser.pause(800); // dialog open: system date picker may take a moment to animate in
    const okBtn = await $('android=new UiSelector().text("OK")');
    if (await okBtn.waitForExist({ timeout: 4000 }).then(() => true).catch(() => false)) {
      await this.tapElement(okBtn);
    }
    // If the picker did not open, the field accepts the default date silently.
    await browser.pause(300); // dialog close animation

    await this.waitAndTap(s('btn_next'));
  }

  private async handlePhotoPrompt(): Promise<void> {
    if (await this.isDisplayed(s('rd_no'))) {
      await this.waitAndTap(s('rd_no'));
      await this.waitAndTap(s('btn_ok'));
    }
  }

  private async fillFamilyInfo(member: MemberData): Promise<void> {
    await $(s('edt_adults')).waitForExist({ timeout: 10000 });
    await this.typeViaShell(s('edt_adults'), member.adultsInFamily);
    await this.hideKeyboard();
    await browser.pause(300); // keyboard close animation
    await this.typeViaShell(s('edt_dependents'), member.dependents);
    await this.hideKeyboard();
    await this.waitAndTap(s('btn_next'));
  }

  private async fillContactInfo(member: MemberData): Promise<void> {
    await $(s('edt_phone_number')).waitForExist({ timeout: 10000 });
    const phone = member.mobileNumber.replace(/^0/, '');
    await this.typeViaShell(s('edt_phone_number'), phone);
    await this.hideKeyboard();
    await browser.pause(300); // keyboard close animation
    await this.typeViaShell(s('edt_re_enter_number'), phone);
    await this.hideKeyboard();
    await this.waitAndTap(s('btn_next'));
    if (await this.isDisplayed(s('btn_ok'))) {
      await this.waitAndTap(s('btn_ok'));
    }
  }

  private async skipAdditionalInfo(): Promise<void> {
    // Additional Info has many optional sections; scroll to the absolute bottom to reach btn_next.
    try {
      await $(s('scr_member_view')).waitForExist({ timeout: 10000 });
    } catch { /* proceed */ }
    await browser.pause(400); // UiScrollable preparation: scroll container needs to settle

    try {
      await $(`android=new UiScrollable(new UiSelector().scrollable(true).resourceId("${APP_PKG}:id/scr_member_view")).scrollToEnd(5)`);
    } catch { /* already at end or not scrollable */ }
    await browser.pause(400); // UiScrollable scroll momentum settle

    // btn_next is clickable:false — use scrollIntoViewAndTap which calls tapElement internally.
    await this.scrollIntoViewAndTap('btn_next');
  }

  private async fillSecurityInfo(member: MemberData): Promise<void> {
    await this.waitForElement(s('edt_passcode'));
    await this.typeText(s('edt_passcode'), member.passcode);
    await this.typeText(s('edt_confirm_passcode'), member.passcode);
    await this.hideKeyboard();
    await this.waitAndTap(s('btn_next'));
  }

  private async acceptPermissionAgreement(): Promise<void> {
    await browser.pause(500); // screen transition: allow permission agreement screen to load

    // Scroll scr_member_view to end so rd_yes (last element) is in view.
    try {
      await $(`android=new UiScrollable(new UiSelector().scrollable(true).resourceId("${APP_PKG}:id/scr_member_view")).scrollToEnd(5)`);
    } catch { /* not scrollable or already at end */ }
    await browser.pause(400); // UiScrollable scroll momentum settle

    // rd_yes centre may overlap the nav bar — tapElement handles the nav-bar-safe nudge.
    const rdYesEl = await $(s('rd_yes'));
    await rdYesEl.waitForDisplayed({ timeout: 10000 });
    await this.tapElement(rdYesEl);
    await browser.pause(700); // radio selection state: settle before next scroll

    // Scroll to end to reveal cb_agreement and btn_create.
    try {
      await $(`android=new UiScrollable(new UiSelector().scrollable(true).resourceId("${APP_PKG}:id/scr_member_view")).scrollToEnd(5)`);
    } catch { /* already at end */ }
    await browser.pause(400); // UiScrollable scroll momentum settle

    const cbEl = await $(s('cb_agreement'));
    await cbEl.waitForDisplayed({ timeout: 10000 });
    // Only check if not already checked — tapping a pre-checked box would uncheck it,
    // which disables the "Create My Profile" button.
    const alreadyChecked = await cbEl.getAttribute('checked');
    if (alreadyChecked !== 'true') {
      await this.tapElement(cbEl);
    }
    await browser.pause(400); // checkbox state settle: allow UI to reflect new checked state

    const createEl = await $(s('btn_create'));
    await createEl.waitForDisplayed({ timeout: 10000 });
    await this.tapElement(createEl);
    await browser.pause(2000); // API call: member creation hits the server; dialog may appear after

    if (await this.isDisplayed(s('btn_ok'))) {
      await this.waitAndTap(s('btn_ok'));
    }
  }

  private async completeProfileOverview(): Promise<void> {
    await browser.pause(1500); // screen transition: profile overview slide-in animation

    // Profile overview uses nestedScrollView (not scr_member_view).
    try {
      await $(`android=new UiScrollable(new UiSelector().scrollable(true)).scrollToEnd(5)`);
    } catch { /* already at end */ }
    await browser.pause(500); // UiScrollable scroll momentum settle

    // btn_proceed (Done) — tapElement is nav-bar-safe and handles clickable:false.
    const doneEl = await $(s('btn_proceed'));
    await doneEl.waitForExist({ timeout: 15000 });
    await this.tapElement(doneEl);
    await browser.pause(700); // screen transition: profile overview exit animation

    if (await this.isDisplayed(s('btn_ok'))) {
      await this.waitAndTap(s('btn_ok'));
    }
  }

  private async tapDeliverMyStar(): Promise<void> {
    // After profile overview Done: "Welcome to DreamSave!" dialog appears.
    // Step 1: tap btn_deliver ("Deliver My Star"), Step 2: tap btn_ok ("Done") to dismiss.
    const deliverEl = await $(s('btn_deliver'));
    const exists = await deliverEl.waitForExist({ timeout: 5000 }).catch(() => false);
    if (!exists) return;
    await this.tapElement(deliverEl);
    const okEl = await $(s('btn_ok'));
    await okEl.waitForExist({ timeout: 5000 });
    await this.tapElement(okEl);
  }

  private async fillCycleData(member: MemberData): Promise<void> {
    await this.waitForElement(s('edt_saving_input'));
    await this.typeText(s('edt_saving_input'), String(member.shares));
    await this.waitAndTap(s('rd_no_loan'));
    await this.hideKeyboard();
    await this.waitAndTap(s('rd_option_no_unpaid_fine'));
    // Scroll btn_create into view then tap — it may be below the keyboard.
    await this.scrollIntoViewAndTap('btn_create');
    if (await this.isDisplayed(s('btn_ok'))) {
      await this.waitAndTap(s('btn_ok'));
    }
  }

  private async fillPersonalGoal(member: MemberData): Promise<void> {
    await this.waitForElement(s('btn_next'));
    await this.waitAndTap(s('btn_next'));

    await this.waitForElement(s('rcv_personal_goal'));
    // Tap the logo image (view_personal_goal_logo) for the matching category.
    const categoryEls = await $$(s('tv_personal_goal_category'));
    const logoEls     = await $$(s('view_personal_goal_logo'));
    let logoTapped = false;
    for (let i = 0; i < categoryEls.length; i++) {
      const text = await categoryEls[i].getText().catch(() => '');
      if (text.toLowerCase().includes(member.savingsGoal.category.toLowerCase())) {
        await this.tapElement(logoEls[i]);
        logoTapped = true;
        break;
      }
    }
    if (!logoTapped && logoEls.length > 0) {
      await this.tapElement(logoEls[0]);
    }

    await this.waitForElement(s('edt_cost_goal'));
    await this.typeText(s('edt_cost_goal'), member.savingsGoal.targetAmount);
    await this.hideKeyboard();
    await this.waitAndTap(s('btn_save_goal'));
    await browser.pause(1500); // screen transition: goal save and navigation to next step
  }

  async createFullMemberProfile(member: MemberData): Promise<void> {
    await this.tapAddMember();
    await this.selectMemberType();
    await this.fillPersonalDetails(member);
    await this.handlePhotoPrompt();
    await this.fillFamilyInfo(member);
    await this.fillContactInfo(member);
    await this.skipAdditionalInfo();
    await this.fillSecurityInfo(member);
    await this.acceptPermissionAgreement();
    await this.completeProfileOverview();
    await this.tapDeliverMyStar();
    await this.fillCycleData(member);
    await this.fillPersonalGoal(member);
  }
}
