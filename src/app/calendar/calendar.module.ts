import { NgModule } from '@angular/core';
import { CalendarModule as AngularCalendarModule, DateAdapter} from 'angular-calendar';
import { adapterFactory } from 'angular-calendar/date-adapters/date-fns';

@NgModule({
  imports: [
    AngularCalendarModule.forRoot({
      provide: DateAdapter,
      useFactory: adapterFactory,
    }),
  ],
  exports: [
    AngularCalendarModule,
  ],
})
export class CalendarModule {}
