import FullCalendar, { formatDate } from '@fullcalendar/react'
// Bootstrap 5: support is WIP at fullcalendar/fullcalendar#6625
import bootstrapPlugin from '@fullcalendar/bootstrap'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import rrulePlugin from '@fullcalendar/rrule'
import luxonPlugin from '@fullcalendar/luxon'
import { forwardRef } from 'react'

const eventContent = ({ event }) => ({ html: [event.title, event.extendedProps?.location].join('<br>') })

export default forwardRef((props, ref) => <FullCalendar
  ref={ref}
  plugins={[bootstrapPlugin, dayGridPlugin, timeGridPlugin, listPlugin, rrulePlugin, luxonPlugin]}
  themeSystem='bootstrap'
  bootstrapFontAwesome={false}
  //   expandRows={true}
  height={'80vh'}

  headerToolbar={{
    start: 'prev,next',
    center: 'title',
    end: 'timeGridDay,timeGridWeek,dayGridMonth,listTwoDay'
  }}
  buttonText={{
    today: 'Today',
    prev: 'Back',
    next: 'Next',
    day: 'Day',
    week: 'Week',
    month: 'Month'
  }}

  views={{
    timeGridDay: {
      titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
    },
    timeGridWeek:{
      weekends: false, // support timezones, and ANU moving prerecorded events to Sunday
      dayHeaderFormat: { weekday: 'short' },
      eventContent
    },
    listTwoDay: {
      type: 'list',
      duration: { days: 2 },
      buttonText: 'Agenda',
      listDayFormat: { weekday: 'long', month: 'short', day: 'numeric' },
      displayEventTime: true,
      weekends: false
    },
    dayGridMonth: {
      weekNumberFormat: { week: 'short' }
    }
  }}
  initialView={window.navigator.userAgent.includes('Mobi') ? 'listTwoDay' : 'timeGridWeek'}

  // timeGrid options
  allDaySlot={false}
  // Earliest business hour is 8am AEDT
  scrollTime={formatDate('2020-01-01T08:00+11:00',{
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}
  scrollTimeReset={false}
  slotDuration={'01:00:00'}
  nowIndicator
  navLinks
  // businessHours={{
  //   daysOfWeek: [1, 2, 3, 4, 5],
  //   startTime: '07:00',
  //   endTime: '19:00'
  // }}
  displayEventTime={false}
  defaultAllDay={false} // allDay=false required for non-string rrule inputs (eg Dates) https://github.com/fullcalendar/fullcalendar/issues/6689
  weekNumbers
  weekNumberCalculation={'ISO'}
  weekText='Week'

  fixedWeekCount={false}

  // disable in Day and Agenda view - some events aren't in memory and won't be deleted
  eventClick={info => {
    info.jsEvent.preventDefault();
    
    ref.current.getApi().getEvents().forEach(event => {
      if (event.groupId === info.event.groupId && event.id !== info.event.id) event.remove()
    })
  }}

  eventRemove={console.log}

  eventSourceFailure={err => console.error(err.message)}
/>)