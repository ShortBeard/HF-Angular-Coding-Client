export interface Sprint {
  sprintId: number;
  sprintName: string;
  sprintStart: Date;
  sprintEnd: Date;
  sprintJiras?: Jira[];
  sprintStoryTotal?: number;
}

export interface Holiday {
  holidayName: string;
  holidayCountry: string;
  startDate: Date;
  endDate: Date;
}

export interface Jira {
  jiraId: number;
  jiraStoryPoints: number;
  jiraSprintId: number;
}

export interface TeamMember {
  name: string;
  country: string;
  region: string;
}
