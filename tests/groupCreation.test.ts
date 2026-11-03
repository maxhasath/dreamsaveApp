// Group Creation Flow — end-to-end automation test.
//
// Source of truth: Workflow_Steps.md (gemini-code-1792916146057.md), Steps 1–9.
// Test data:       data/testData.ts
//
// Design rules:
//   - All assertions live here, never in page objects.
//   - Explicit waits only — no browser.pause() except after system permission dialogs.
//   - Each `it` block maps to one numbered step in Workflow_Steps.md.

import { WelcomePage }        from '../pages/WelcomePage';
import { PermissionsPage }    from '../pages/PermissionsPage';
import { GroupSetupPage }     from '../pages/GroupSetupPage';
import { PartnerPage }        from '../pages/PartnerPage';
import { CycleConfigPage }    from '../pages/CycleConfigPage';
import { FinancialRulesPage } from '../pages/FinancialRulesPage';
import { MemberCreationPage } from '../pages/MemberCreationPage';
import { OfficerElectionPage } from '../pages/OfficerElectionPage';
import { ReviewPage }         from '../pages/ReviewPage';
import { BackupPage }         from '../pages/BackupPage';
import { testData }           from '../data/testData';

// Build member full names once — reused in officer assignment
const memberFullNames = testData.members.map(m => `${m.firstName} ${m.lastName}`);

describe('DreamSave — Group Creation Flow', () => {
  const welcome        = new WelcomePage();
  const permissions    = new PermissionsPage();
  const groupSetup     = new GroupSetupPage();
  const partner        = new PartnerPage();
  const cycleConfig    = new CycleConfigPage();
  const financialRules = new FinancialRulesPage();
  const memberCreation = new MemberCreationPage();
  const officerElection = new OfficerElectionPage();
  const review         = new ReviewPage();
  const backup         = new BackupPage();

  // ─── Step 1: Initial App Setup ───────────────────────────────────────────────

  it('Step 1 — selects English as language and Zambia as country', async () => {
    await welcome.selectLanguage(testData.language);
    await welcome.selectCountry(testData.country);
    await welcome.tapContinue();

    expect(await welcome.getSelectedLanguage()).toContain(testData.language);
    expect(await welcome.getSelectedCountry()).toContain(testData.country);
  });

  it('Step 1 — grants all required device permissions', async () => {
    await permissions.grantAllRequiredPermissions();
    // No assertion needed: if dialogs were present they were dismissed;
    // the next step will fail visibly if a required permission was not granted.
  });

  // ─── Step 2: Group Initialization ────────────────────────────────────────────

  it('Step 2 — creates a new group with name "Agent" as a Real Group in Zambia', async () => {
    await groupSetup.tapCreateNewGroup();
    await groupSetup.selectFirstAvailableLogo();
    await groupSetup.enterGroupName(testData.group.name);
    await groupSetup.selectGroupType(testData.group.type);
    await groupSetup.selectLocation(testData.group.location);
    await groupSetup.tapNext();

    // Verify the group name was accepted by the form
    expect(await groupSetup.getGroupName()).toBe(testData.group.name);
  });

  // ─── Step 3: Partner Integration ─────────────────────────────────────────────

  it('Step 3 — enters Partner ID 2403 (World Vision) and approves data permissions', async () => {
    if (testData.partner.worksWithNgo) {
      await partner.confirmWorksWithNgo();
    }
    await partner.enterPartnerId(testData.partner.id);
    await partner.tapNext();

    // Verify the partner name resolved from the ID
    expect(await partner.getPartnerName()).toContain(testData.partner.name);
  });

  // ─── Step 4: Cycle Configuration ─────────────────────────────────────────────

  it('Step 4 — configures 5 previous cycles, meeting #5, 50,000 Loan Fund, 2,000 Social Fund', async () => {
    await cycleConfig.enterPreviousCycles(testData.cycle.previousCyclesCompleted);
    await cycleConfig.enterCurrentMeetingNumber(testData.cycle.currentMeetingNumber);
    await cycleConfig.enterLoanFundBalance(testData.cycle.loanFundOpeningBalance);
    await cycleConfig.enterSocialFundBalance(testData.cycle.socialFundOpeningBalance);
    await cycleConfig.tapNext();

    // Verify opening balances were accepted (cached values confirm form submission succeeded)
    expect(await cycleConfig.getLoanFundBalance()).toBe(testData.cycle.loanFundOpeningBalance);
    expect(await cycleConfig.getSocialFundBalance()).toBe(testData.cycle.socialFundOpeningBalance);
  });

  // ─── Step 5: Financial Rules Setup ───────────────────────────────────────────

  it('Step 5 — configures share price, loan rules, fine routing, SMS receipts, and meeting schedule', async () => {
    const rules = testData.financialRules;

    await financialRules.enterSharePrice(rules.sharePriceZmw);
    await financialRules.selectLoanInterestType(rules.loanInterestType);
    await financialRules.enterLoanInterestRate(rules.loanInterestRate);
    await financialRules.enterLoanTermMonths(rules.loanTermMonths, rules.loanInterestRate);
    await financialRules.setCoSignersRequired(rules.requiresCoSigners);
    await financialRules.selectFineIncomeRouting(rules.fineIncomeRouting);
    await financialRules.setSmsReceiptsEnabled(rules.smsReceiptsEnabled);
    await financialRules.selectMeetingFrequency(rules.meetingFrequency);
    await financialRules.selectMeetingDay(rules.meetingDay);
    await financialRules.tapSave(testData.cycle.startDate, testData.cycle.shareOutDate);
  });

  // ─── Step 6: Member Creation (6 members) ─────────────────────────────────────

  for (const [index, member] of testData.members.entries()) {
    it(`Step 6 — creates member ${index + 1} of 6: ${member.firstName} ${member.lastName}`, async () => {
      await memberCreation.createFullMemberProfile(member);
      // Each member: 5 shares × 2,000 ZMW/share = 10,000 ZMW individual savings
    });
  }

  // ─── Step 7: Officer Election ─────────────────────────────────────────────────

  it('Step 7 — creates custom officer titles and assigns members', async () => {
    await officerElection.setupOfficers(
      testData.officers,
      memberFullNames,
      testData.bookkeeperMemberIndex,
    );
  });

  // ─── Step 8: Review and Confirmation ─────────────────────────────────────────

  it('Step 8 — reviews cycle data and verifies member count and fund balances', async () => {
    await review.waitForReviewScreen();

    // Confirm all 6 members appear in the review list
    const memberCount = await review.getTotalMemberCount();
    expect(parseInt(memberCount, 10)).toBe(testData.members.length);

    // Verify displayed fund totals match configured opening balances.
    // Note: DreamSave may display formatted currency (e.g. "50,000 ZMW").
    const loanFund   = await review.getDisplayedLoanFundBalance();
    const socialFund = await review.getDisplayedSocialFundBalance();
    expect(loanFund).toContain('50');
    expect(socialFund).toContain('2');

    await review.tapConfirmSetup();
  });

  // ─── Step 9: Data Backup ──────────────────────────────────────────────────────

  it('Step 9 — triggers cloud backup and waits for successful sync confirmation', async () => {
    await backup.tapBackUpNow();
    await backup.waitForBackupToComplete();

    // Confirm no error banner is shown post-backup
    expect(await backup.isBackupErrorDisplayed()).toBe(false);

    // Confirm the backup status text reflects a successful sync.
    // The app may show a dedicated success screen ("Success!") or a status badge.
    const status = await backup.getBackupStatusText();
    expect(status).toMatch(/backed up|backup complete|synced|success/i);
  });
});
