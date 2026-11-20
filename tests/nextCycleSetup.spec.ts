// Next Cycle Setup — end-to-end: complete a meeting, run the shareout, start a new cycle and
// register it. Phase 1 reuses the meeting pages; Phases 2–3 use the NextCycle* pages.
//
// The test group is stateful: every run shares out the current cycle and registers a new one, so
// the group is ready for the next run. If a run stops partway the group is left mid-flow — Phase 0
// reports that state; finish the setup by hand (Create New Cycle → register) before re-running.

import { LoginPage }          from '../pages/LoginPage';
import { MeetingPage }        from '../pages/MeetingPage';
import { SavingsPage }        from '../pages/SavingsPage';
import { NewLoanPage }        from '../pages/NewLoanPage';
import { LoanRepaymentPage }  from '../pages/LoanRepaymentPage';
import { NextCycleClosingPage } from '../pages/NextCycleClosingPage';
import { FinancialRulesPage } from '../pages/FinancialRulesPage';
import { ReviewPage }         from '../pages/ReviewPage';
import { BackupPage }         from '../pages/BackupPage';
import { NextCycleShareoutPage } from '../pages/NextCycleShareoutPage';
import { NextCycleSetupPage } from '../pages/NextCycleSetupPage';
import { getNextCycleLoginData, meetingData, nextCycleData, RANDOM_SEED } from '../data/testData';

const digitsOf = (text: string): number => parseInt(text.replace(/[^\d]/g, ''), 10) || 0;

describe('DreamSave — Next Cycle Setup', () => {
  const login      = new LoginPage();
  const meeting    = new MeetingPage();
  const savings    = new SavingsPage();
  const newLoan    = new NewLoanPage();
  const repayments = new LoanRepaymentPage();
  const closingSummary = new NextCycleClosingPage();
  const shareout   = new NextCycleShareoutPage();
  const setup      = new NextCycleSetupPage();
  const financialRules = new FinancialRulesPage();
  const review     = new ReviewPage();
  const backup     = new BackupPage();

  const { schedule, wizardPages, memberCount, initialInvestmentShares, otherFundsAtShareout } = nextCycleData;

  let groupName: string;
  let completedBefore: number;
  let roster: string[];
  let borrower: string;
  let loanAmount: number;
  let paidAmount: number;
  let groupTotals: { savings: number; profit: number; shareTotal: number };
  let otherFunds: { otherFundsShown: boolean; balance: number };
  let members: string[];

  before(async () => {
    console.log(`[random] seed ${RANDOM_SEED} — replay with TEST_SEED=${RANDOM_SEED}`);
    const data = getNextCycleLoginData();
    // wdio.meeting.conf.ts clears app data, so the full Group Login flow always runs first.
    await login.ensureLoggedIn({
      country:   data.country,
      dreamId1:  data.member1.dreamId,  passcode1: data.member1.passcode,
      dreamId2:  data.member2.dreamId,  passcode2: data.member2.passcode,
      dreamId3:  data.member3.dreamId,  passcode3: data.member3.passcode,
      groupName: '',
    });
  });

  // ─── Phase 0: precondition ───────────────────────────────────────────────────

  it('Phase 0 — Step 1: the group is in an active cycle, ready for a meeting', async () => {
    groupName = await setup.getGroupHeaderName();
    expect(groupName.length).toBeGreaterThan(0);

    // "Create New Cycle" means the group was already shared out (a previous run stopped partway).
    expect(await setup.getMeetingsTabAction()).toMatch(/meeting/i);
  });

  // ─── Phase 1: complete meeting cycle ─────────────────────────────────────────

  it('Phase 1 — Step 1: starts the next meeting', async () => {
    const started = await meeting.startMeeting();
    completedBefore = started.completedBefore;
    expect(started.title).toBe(`Meeting ${completedBefore + 1}`);
  });

  it('Phase 1 — Step 2: marks all members present in Attendance', async () => {
    roster = await meeting.doAttendance();
    expect(roster.length).toBe(memberCount);
    expect(new Set(roster).size).toBe(roster.length);
  });

  it('Phase 1 — Step 3: completes Opening Summary', async () => {
    const { funds, total } = await meeting.doOpeningSummary();
    expect(funds.reduce((sum, fund) => sum + fund, 0)).toBe(total);
  });

  it('Phase 1 — Step 4: adds Savings', async () => {
    const result = await savings.doSavings(meetingData.savings);
    expect(new Set(result.members).size).toBe(meetingData.savings.length);
    result.members.forEach(member => expect(roster).toContain(member));
  });

  it('Phase 1 — Step 5: adds a new loan', async () => {
    const loan = await newLoan.doNewLoan(meetingData.newLoan);
    borrower   = loan.member;
    loanAmount = loan.amount;
    expect(roster).toContain(borrower);
    expect(loan.amount).toBeGreaterThan(0);
    expect(loan.balanceDue).toBe(loan.amount + loan.interest);
  });

  it('Phase 1 — Step 6: settles the newly added loan in Loan Repayments', async () => {
    const result = await repayments.settleLoan(borrower);
    paidAmount = result.paid;
    expect(result.member).toBe(borrower);
    expect(result.balanceAfter).toBe(0);
  });

  it('Phase 1 — Step 7: completes Closing Summary', async () => {
    const closing = await closingSummary.doClosingSummary();
    expect(closing.newLoans).toBe(-loanAmount);
    expect(closing.loanRepayments).toBe(paidAmount);
    expect(closing.endBalance).toBe(
      closing.startingBalance + closing.newSavings + closing.loanRepayments + closing.newLoans + closing.fines,
    );
  });

  it('Phase 1 — Step 8: backs up meeting data and ends the meeting', async () => {
    const { completedMeeting } = await meeting.endMeeting();
    expect(completedMeeting).toBe(`Meeting ${completedBefore + 1}`);
  });

  // ─── Phase 2: shareout and start a new cycle ─────────────────────────────────

  it('Phase 2 — Step 1: opens the Shareout Calculator; the group totals add up', async () => {
    await shareout.openShareoutCalculator();
    expect(await shareout.getScreenTitle()).toBe('Shareout Calculator');

    groupTotals = await shareout.getGroupTotals();
    expect(groupTotals.savings).toBeGreaterThan(0);
    expect(groupTotals.shareTotal).toBe(groupTotals.savings + groupTotals.profit);

    await shareout.continueToShareoutByGroup();
  });

  it('Phase 2 — Step 2: member savings add up to the group total, then continues to shareout', async () => {
    const memberSavings = await shareout.getMemberSavings();
    expect(Object.keys(memberSavings).sort()).toEqual([...roster].sort());
    expect(Object.values(memberSavings).reduce((sum, value) => sum + value, 0)).toBe(groupTotals.savings);

    await shareout.continueToShareoutByMembers();
    expect(await shareout.getShareoutMembers()).toEqual(expect.arrayContaining(roster));
  });

  it('Phase 2 — Step 3: completes shareout and decides what happens to other funds', async () => {
    otherFunds = await shareout.completeShareout(otherFundsAtShareout);

    expect(await shareout.isBackupPromptShown()).toBe(true);
  });

  it('Phase 2 — Step 4: backs up data', async () => {
    await backup.tapBackUpNow();
    await backup.waitForBackupToComplete();
    expect(await backup.isBackupErrorDisplayed()).toBe(false);

    await shareout.continueToCycleCompleted();
  });

  it('Phase 2 — Step 5: selects Start New Cycle on the Congratulations screen', async () => {
    await setup.startSetup();

    expect(await setup.isOnChecklist()).toBe(true);
  });

  // ─── Phase 3: next cycle group setup and registration ────────────────────────

  it('Phase 3 — Step 1: reviews Group Profile (pre-filled values kept)', async () => {
    const profile = await setup.reviewGroupProfile();

    expect(profile.pages).toEqual(wizardPages.groupProfile);
    expect(profile.groupName).toBe(groupName);
    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 2: reviews the Constitution (pre-filled values kept)', async () => {
    expect(await setup.reviewConstitution()).toEqual(wizardPages.constitution);

    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 3: sets the cycle schedule (empty required fields)', async () => {
    await setup.openCycleSchedule();
    await financialRules.selectMeetingDay(schedule.meetingDay);
    await financialRules.tapSave(schedule.startDate, schedule.shareOutDate);

    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 4.0: opens Member Profiles and lists the roster', async () => {
    members = await setup.openMemberProfiles();

    expect([...members].sort()).toEqual([...roster].sort());
  });

  // One test per member, so a failure names the member that broke.
  for (let index = 0; index < memberCount; index++) {
    it(`Phase 3 — Step 4.${index + 1}: completes member ${index + 1} (terms and permissions, starting investment)`, async () => {
      const investment = await setup.completeMemberProfile(members[index], initialInvestmentShares);

      const expected = (Number(initialInvestmentShares) * meetingData.sharePrice).toLocaleString('en-US');
      expect(investment).toContain(expected);
    });
  }

  it('Phase 3 — Step 4.6: finishes the member list', async () => {
    await setup.finishMemberProfiles();

    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 5: keeps the officers elected for the new cycle', async () => {
    expect(await setup.electOfficers()).toEqual(wizardPages.officers);

    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 6: registers the new cycle with the expected schedule and balances', async () => {
    await setup.openRegisterCycle();
    await review.waitForReviewScreen();

    // The schedule set in Step 3 gives a known number of weekly meetings, none completed yet.
    expect(await setup.getCycleProgress()).toEqual({ completed: 0, remaining: schedule.meetings });

    // Social Fund: carried over when transferred at shareout, otherwise paid out (zero).
    const expectedSocialFund = otherFundsAtShareout === 'transfer' ? otherFunds.balance : 0;
    expect(digitsOf(await review.getDisplayedSocialFundBalance())).toBe(expectedSocialFund);

    const memberTotal = await review.getTotalMemberCount(memberCount);
    expect(parseInt(memberTotal, 10)).toBe(memberCount);

    await review.tapConfirmSetup();
  });

  it('Phase 3 — Step 7: performs the final backup and reaches Group Login instructions', async () => {
    await backup.tapBackUpNow();
    await backup.waitForBackupToComplete();
    expect(await backup.isBackupErrorDisplayed()).toBe(false);

    const message = await setup.continueToLoginInstructions();
    expect(message).toMatch(/new cycle setup is now saved/i);
  });
});
