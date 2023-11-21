import { Component, Input, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalendarEvent } from 'angular-calendar';
import { Holiday, Sprint, TeamMember } from './interfaces';

@Component({
  selector: 'app-customtooltip-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customtooltip.component.html',
  styleUrls: ['./customtooltip.component.css'],
})
export class CustomTooltipComponent {
  @Input() eventInfo: CalendarEvent | undefined;
  @Input() teamMembers: TeamMember[] = [];
  @Input() sprintVelocity: Number | undefined;

  holidayObject: Holiday | undefined;
  sprintObject: Sprint | undefined;
  absentTeamMembers: TeamMember[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['eventInfo']) {
      this.UpdateTooltip();
    }
  }

  UpdateTooltip() {
    if (this.eventInfo?.meta.type == 'holiday') {
      this.holidayObject = this.eventInfo.meta.holiday;
      this.teamMembers?.forEach((teamMember) => {
        if (teamMember.country.toLowerCase() == this.holidayObject?.holidayCountry.toLowerCase()) {
          this.absentTeamMembers?.push(teamMember);
        }
      });
    }
    else if (this.eventInfo?.meta.type == 'sprint') {
      this.sprintObject = this.eventInfo.meta.sprint;
    }
  }
}
