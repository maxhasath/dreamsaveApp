export interface MemberCredential { dreamId: string; passcode: string; }

// Group Login data for one app environment. One file per environment lives next to this one.
export interface LoginCredentials {
  country:     string;
  groupName:   string; // shown on the Dashboard after login; '' skips the name check
  groupNumber: string;
  members:     string[]; // group roster as shown in the meeting steps
  chairperson: string;   // signs the Closing Summary
  member1: MemberCredential;
  member2: MemberCredential;
  member3: MemberCredential;
}
