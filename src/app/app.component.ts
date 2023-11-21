import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { CalendarModule } from './calendar/calendar.module';
import { CalendarView, CalendarEvent } from 'angular-calendar';
import { HttpParams } from '@angular/common/http';
import { subDays } from 'date-fns';
import { TeamMember, Sprint, Jira, Holiday } from './interfaces';
import { CustomTooltipComponent } from './customtooltip.component';
import { ApiService } from './api.service';
import { lastValueFrom } from 'rxjs';

//Used by angular calendar library. Allows additional custom data to be passed around with calendar events.
type EventMeta = {
  type: 'holiday' | 'sprint';
  sprint?: Sprint;
  holiday?: Holiday;
};

type CalendarEventWithMeta = CalendarEvent<EventMeta>;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, CalendarModule, CustomTooltipComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  //When page loads, make our API requests
  constructor(private apiServce: ApiService) {}
  ngOnInit(): void {
    //Ensure that we have our team members first to get their countries before querying public holidays for respective country
    (async () => {
      await this.GetTeamMembers();
      this.GetPublicHolidays();
    })();

    //Ensure we get sprints after the Jiras, so we can reference the relevant Jiras from each sprint
    (async () => {
      await this.GetJiras();
      this.GetTeamSprints();
    })();
  }

  //Hard coded array of month names, but could likely use some kind of "Date()" functionality instead
  monthNames: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November','December'];

  //Vars needed for events and calendar
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate = new Date(); //Today's date
  events: CalendarEventWithMeta[] = [];
  eventsTemp: CalendarEventWithMeta[] = []; //Used when toggling public holiday setting between all and overlapping
  sprints: Sprint[] = [];
  jiras: Jira[] = [];
  teamMembers: TeamMember[] = [];

  //API Auth details
  email: string = 'user@humanforce.com';
  key: string = '12345ABCEF';

  //Convert month value to month name
  public GetCurrentMonthName(): string {
    return this.monthNames[this.viewDate.getMonth()];
  }

  public GoPreviousMonth() {
    this.viewDate = new Date(
      this.viewDate.setMonth(this.viewDate.getMonth() - 1)
    ); //Need to create a new date object and re-assign so DOM update triggers. Subtract a month.
  }

  public GoNextMonth() {
    this.viewDate = new Date(
      this.viewDate.setMonth(this.viewDate.getMonth() + 1)
    ); //Need to create a new date object and re-assign so DOM update triggers. Add a month.
  }

  //Gets the currently selected year from the viewDate
  public GetCurrentYear(): number {
    return this.viewDate.getFullYear();
  }

  CalculateSprintVelocity(event: CalendarEvent): number {
    const sprintCount = 3;
    if (event.meta.type == 'sprint') {
      let currentSprintIndex = this.sprints.findIndex(
        (sprint) => sprint === event.meta.sprint
      );

      let startPreviousIndex = currentSprintIndex - sprintCount; //Go back to start 3 sprints ago
      let totalStoryPoints = 0;
      let sprintsFound = 0; //Used to calculate average of past sprints. Used rather than "sprintCount" in case there are not 3 sprints prior.
      for (let i = startPreviousIndex; i < startPreviousIndex + sprintCount; i++ ) {
        //Ensure that we don't go outside the bounds of the array, i.e the first 3 sprints in the array
        if (this.sprints[i] != undefined) {
          totalStoryPoints += this.sprints[i].sprintStoryTotal!;
          sprintsFound++;
        }
      }
      let roundedValue =
        Math.round((totalStoryPoints / sprintsFound) * 100) / 100; //Round to 2 decimal places
      return sprintsFound > 0 ? roundedValue : 0; //Return average velocity for previous sprints. Return 0 if no previous sprints.
    }
    return 0;
  }

  //Toggles between all holidays, and just those that overlap with sprints
  //False is "all", true is "overlapping"
  TogglePublicHolidays(toggleState: boolean) {
    if (toggleState == false) {
      this.events = this.eventsTemp;
    } else {
      this.eventsTemp = this.events.slice(); //Store a copy of all events in case we want to toggle back later
      let eventsToRemove: CalendarEventWithMeta[] = [];

      this.events.forEach((event) => {
        if (event.meta?.type === 'holiday') {
          let overlapsWithSprint = false;

          //Check if the holiday overlaps with any sprint
          for (const sprint of this.sprints) {
            if (
              event.start >= sprint.sprintStart &&
              event.start <= sprint.sprintEnd
            ) {
              overlapsWithSprint = true;
              break; //Stop checking further if we find an overlap
            }
          }

          //If the event does not overlap with any sprints, mark it for removal
          if (!overlapsWithSprint) {
            eventsToRemove.push(event);
          }
        }
      });

      this.events = this.events.filter(
        (item) => !eventsToRemove.includes(item)
      ); //Finally remove the holidays that don't overlap
    }
  }

  AddSprintsToCalendar() {
    let tempEvents: CalendarEventWithMeta[] = [];
    this.sprints.forEach((sprint) => {
      let sprintEvent: CalendarEventWithMeta = {
        start: new Date(sprint.sprintStart),
        end: subDays(new Date(sprint.sprintEnd), 1), //End date technically listed as the next day in public holiday data, subtract 1 day so single-day holidays maintain consistency
        title: sprint.sprintName,
        color: { primary: '#ff0037', secondary: '#ff0037' }, //red
        meta: {
          type: 'sprint',
          sprint: sprint, //Add sprint as metadata so we can reference it later
        },
      };
      tempEvents.push(sprintEvent);
    });

    this.events = this.events.concat(tempEvents); //Add our sprints to the event calendar
  }

  /////////////////////////
  //HTTP REQUESTS TO API///
  /////////////////////////
  private GetTeamSprints() {
    this.apiServce.APIGetSprints().subscribe({
      next: (sprintData) => {
        sprintData.values.forEach((sprint) => {
          const sprintJiras = this.jiras.filter(
            (jira) => jira.jiraSprintId === sprint.id
          ); //Get all Jiras that contain this sprint ID

          //Get the total story points for this sprint
          let sprintStoryTotal = 0;
          sprintJiras.forEach((jira) => {
            sprintStoryTotal += jira.jiraStoryPoints;
          });

          this.sprints.push({
            sprintId: sprint.id,
            sprintName: sprint.name,
            sprintStart: new Date(sprint.startDate),
            sprintEnd: new Date(sprint.endDate),
            sprintJiras: sprintJiras,
            sprintStoryTotal: sprintStoryTotal,
          });
        });
      },
      error: (error) => {
        console.error(error);
      },
      complete: () => {
        this.AddSprintsToCalendar();
      },
    });
  }

  //Loop through each team members country and make a request for their public holidays
  private GetPublicHolidays() {
    this.teamMembers.forEach((teamMember) => {
      let tempEvents: CalendarEventWithMeta[] = []; //Push all returned events into a temp array, so we can assign it to the events in the component to force DOM update on page load
      let params = new HttpParams().set(
        'countryName',
        teamMember.country.toLowerCase()
      ); //Send team members country as param to public holiday request
      this.apiServce.APIGetPublicHolidays(params).subscribe({
        next: (holidayData) => {
          holidayData.items.forEach((holiday) => {
            let holidayEvent: CalendarEventWithMeta = {
              start: new Date(holiday.start.date),
              end: subDays(new Date(holiday.end.date), 1), //Adjust end date so that it doesn't spill over into the next day if its 1 day holiday ending at 12am
              title: holiday.summary,
              meta: {
                type: 'holiday',
                holiday: {
                  holidayName: holiday.summary,
                  holidayCountry: teamMember.country,
                  startDate: holiday.start.date,
                  endDate: holiday.end.date,
                },
              },
            };

            tempEvents.push(holidayEvent);
          });
        },
        error: (error) => {
          console.error(error);
        },
        complete: () => {
          //Concat temp events to our events list used by the calendar
          this.events = this.events.concat(tempEvents);
        },
      });
    });
  }

  private async GetJiras(): Promise<void> {
    try {
      const jiraData = await lastValueFrom(
        this.apiServce.APIGetJiras(this.email, this.key)
      );
      //requestSuccess is optional and only returned by my local API for authentication purposes. Real API probably doesn't use this field, thus reason for being optional.
      if (jiraData.requestSuccess == false) {
        console.error('JIRA Authentication failed.');
      } else {
        jiraData.issues.forEach((jira) => {
          this.jiras.push({
            jiraId: jira.id,
            jiraStoryPoints: parseInt(jira.fields.customfield_10016),
            jiraSprintId: jira.fields.customfield_10020[0].id,
          });
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async GetTeamMembers(): Promise<void> {
    try {
      const teamMembers = await lastValueFrom(
        this.apiServce.APIGetTeamMembers()
      );
      teamMembers.forEach((teamMember) => {
        this.teamMembers.push({
          name: teamMember.Name,
          country: teamMember.Location.Country,
          region: teamMember.Location.Region,
        });
      });
    } catch (error) {
      console.error(error);
    }
  }
}
