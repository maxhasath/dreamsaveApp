// Next Cycle Setup — end-to-end: complete a meeting, run the shareout, start a new cycle and
// register it. Phase 1 reuses the meeting pages; Phases 2–3 use the NextCycle* pages.

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

  let completedBefore: number;
  let roster: string[];
  let loanAmount: number;
  let borrower: string;
  let paidAmount: number;

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

  // ─── Phase 1: complete meeting cycle ─────────────────────────────────────────

  it('Phase 1 — Step 1: starts the next meeting', async () => {
    const started = await meeting.startMeeting();
    completedBefore = started.completedBefore;
    expect(started.title).toBe(`Meeting ${completedBefore + 1}`);
  });

  it('Phase 1 — Step 2: marks all members present in Attendance', async () => {
    roster = await meeting.doAttendance();
    expect(roster.length).toBeGreaterThan(0);
  });

  it('Phase 1 — Step 3: completes Opening Summary', async () => {
    const { funds, total } = await meeting.doOpeningSummary();
    expect(funds.reduce((sum, fund) => sum + fund, 0)).toBe(total);
  });

  it('Phase 1 — Step 4: adds Savings', async () => {
    const { members } = await savings.doSavings(meetingData.savings);
    expect(new Set(members).size).toBe(meetingData.savings.length);
  });

  it('Phase 1 — Step 5: adds a new loan', async () => {
    const loan = await newLoan.doNewLoan(meetingData.newLoan);
    borrower   = loan.member;
    loanAmount = loan.amount;
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

  it('Phase 2 — Step 1: opens the Shareout Calculator and continues to shareout (By Group)', async () => {
    await shareout.openShareoutCalculator();
    expect(await shareout.getScreenTitle()).toBe('Shareout Calculator');

    await shareout.continueToShareoutByGroup();
  });

  it('Phase 2 — Step 2: continues to shareout on By Members and confirms an early shareout', async () => {
    await shareout.continueToShareoutByMembers();

    const members = await shareout.getShareoutMembers();
    roster.forEach(member => expect(members).toContain(member));
  });

  it('Phase 2 — Step 3: completes shareout and decides what happens to other funds', async () => {
    await shareout.completeShareout(nextCycleData.otherFundsAtShareout);

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
    await setup.reviewGroupProfile();

    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 2: reviews the Constitution (pre-filled values kept)', async () => {
    await setup.reviewConstitution();

    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 3: sets the cycle schedule (empty required fields)', async () => {
    const { meetingDay, startDate, shareOutDate } = nextCycleData.schedule;
    await setup.openCycleSchedule();
    await financialRules.selectMeetingDay(meetingDay);
    await financialRules.tapSave(startDate, shareOutDate);

    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 4: completes every member (terms and permissions, starting investment)', async () => {
    const members = await setup.openMemberProfiles();
    expect(members.length).toBe(roster.length);

    const expectedInvestment = (Number(nextCycleData.initialInvestmentShares) * meetingData.sharePrice).toLocaleString('en-US');
    for (const member of members) {
      const investment = await setup.completeMemberProfile(member, nextCycleData.initialInvestmentShares);
      expect(investment).toContain(expectedInvestment);
    }
    await setup.finishMemberProfiles();
  });

  it('Phase 3 — Step 5: keeps the officers elected for the new cycle', async () => {
    await setup.electOfficers();

    expect(await setup.isOnChecklist()).toBe(true);
  });

  it('Phase 3 — Step 6: registers the new cycle', async () => {
    await setup.openRegisterCycle();
    await review.waitForReviewScreen();

    const memberCount = await review.getTotalMemberCount(roster.length);
    expect(parseInt(memberCount, 10)).toBe(roster.length);

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
