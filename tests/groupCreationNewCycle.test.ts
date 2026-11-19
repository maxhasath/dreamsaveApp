// Group Creation Flow — NEW CYCLE variant (first cycle, not started yet, 5 members).
//
// Differs from the mid-cycle flows only in Step 4 (cycle selection), the dates in Step 5 and the
// members' initial data (initial investment only — no loans or fines). Test data: data/testDataNewCycle.ts
//
// Design rules:
//   - All assertions live here, never in page objects.
//   - Explicit waits only — zero undocumented browser.pause() calls anywhere in the repo.
//   - Each `it` block maps to one numbered step in Workflow_Steps.md.

import { WelcomePage }        from '../pages/WelcomePage';
import { PermissionsPage }    from '../pages/PermissionsPage';
import { GroupSetupPage }     from '../pages/GroupSetupPage';
import { PartnerPage }        from '../pages/PartnerPage';
import { NewCycleSetupPage }  from '../pages/NewCycleSetupPage';
import { FinancialRulesPage } from '../pages/FinancialRulesPage';
import { NewCycleMemberPage } from '../pages/NewCycleMemberPage';
import { OfficerElectionPage } from '../pages/OfficerElectionPage';
import { ReviewPage }         from '../pages/ReviewPage';
import { BackupPage }         from '../pages/BackupPage';
import { testDataNewCycle as testData } from '../data/testDataNewCycle';

// Build member full names once — reused in officer assignment
const memberFullNames = testData.members.map(m => `${m.firstName} ${m.lastName}`);

describe('DreamSave — Group Creation Flow (new cycle, 5 members)', () => {
  const welcome        = new WelcomePage();
  const permissions    = new PermissionsPage();
  const groupSetup     = new GroupSetupPage();
  const partner        = new PartnerPage();
  const newCycle       = new NewCycleSetupPage();
  const financialRules = new FinancialRulesPage();
  const memberCreation = new NewCycleMemberPage();
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
  });

  // ─── Step 2: Group Initialization ────────────────────────────────────────────

  it(`Step 2 — creates a new group "${testData.group.name}" as a Real Group in Zambia`, async () => {
    await groupSetup.tapCreateNewGroup();
    await groupSetup.selectFirstAvailableLogo();
    await groupSetup.enterGroupName(testData.group.name);
    await groupSetup.selectGroupType(testData.group.type);
    await groupSetup.selectLocation(testData.group.location);
    await groupSetup.tapNext();

    expect(await groupSetup.getGroupName()).toBe(testData.group.name);
  });

  // ─── Step 3: Partner Integration ─────────────────────────────────────────────

  it(`Step 3 — enters Partner ID ${testData.partner.id} and approves data permissions`, async () => {
    if (testData.partner.worksWithNgo) {
      await partner.confirmWorksWithNgo();
    }
    await partner.enterPartnerId(testData.partner.id);
    await partner.tapNext();

    expect(await partner.getPartnerName()).toContain(testData.partner.name);
  });

  // ─── Step 4: Cycle Selection (first cycle, new cycle) ────────────────────────

  it('Step 4 — selects "first cycle" and "we are starting a new cycle"', async () => {
    await newCycle.startNewCycleAsFirstCycle();

    // A new cycle has no opening balances to enter: the app goes straight to the setup checklist.
    expect(await newCycle.isOnSetupChecklist()).toBe(true);
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

  // ─── Step 6: Member Creation (5 members, initial investment only) ────────────

  for (const [index, member] of testData.members.entries()) {
    it(`Step 6 — creates member ${index + 1} of ${testData.members.length}: ${member.firstName} ${member.lastName}`, async () => {
      const startingInvestment = await memberCreation.createMemberProfile(member);

      // Starting investment = shares × share price, formatted by the app (e.g. "10,000 ZMW").
      const expected = (member.shares * Number(testData.financialRules.sharePriceZmw)).toLocaleString('en-US');
      expect(startingInvestment).toContain(expected);
    });
  }

  // ─── Step 7: Officer Election ─────────────────────────────────────────────────

  it('Step 7 — creates custom officer titles and assigns members', async () => {
    await newCycle.finishMemberList();
    await officerElection.setupOfficers(testData.officers, memberFullNames, testData.bookkeeperMemberIndex);
  });

  // ─── Step 8: Setup Complete ───────────────────────────────────────────────────

  it('Step 8 — confirms the group setup is complete and continues to backup', async () => {
    await newCycle.tapRegisterGroup();
    const { groupName, message } = await newCycle.waitForSetupComplete();
    expect(groupName).toBe(testData.group.name);
    expect(message).toMatch(/setup is now complete/i);

    await newCycle.continueToBackup();
  });

  // ─── Step 9: Data Backup ──────────────────────────────────────────────────────

  it('Step 9 — triggers cloud backup and waits for successful sync confirmation', async () => {
    await backup.tapBackUpNow();
    await backup.waitForBackupToComplete();

    expect(await backup.isBackupErrorDisplayed()).toBe(false);
    const status = await backup.getBackupStatusText();
    expect(status).toMatch(/backed up|backup complete|synced|success/i);
  });
});
