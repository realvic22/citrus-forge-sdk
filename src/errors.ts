export class MilestoneJournalSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MilestoneJournalSDKError';
  }
}

export class MilestoneJournalConfigError extends MilestoneJournalSDKError {
  constructor(message: string) {
    super(message);
    this.name = 'MilestoneJournalConfigError';
  }
}

export class MilestoneJournalRequestError extends MilestoneJournalSDKError {
  constructor(message: string) {
    super(message);
    this.name = 'MilestoneJournalRequestError';
  }
}

export class MilestoneJournalResponseError extends MilestoneJournalSDKError {
  constructor(message: string) {
    super(message);
    this.name = 'MilestoneJournalResponseError';
  }
}
