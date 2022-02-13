import FullCalendar, { formatDate } from '@fullcalendar/react'
// Bootstrap 5 support is WIP: fullcalendar/fullcalendar#6625
import bootstrapPlugin from '@fullcalendar/bootstrap'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import rrulePlugin from '@fullcalendar/rrule'
import luxonPlugin from '@fullcalendar/luxon'

import { DateTime } from 'luxon'

import { getStartOfSession, stringToColor, parseEvents } from './utils'

// Monkey patch rrulePlugin for FullCalendar to fix https://github.com/fullcalendar/fullcalendar/issues/5273
// (Recurring events don't respect timezones in FullCalendar)
// We simply replace the expand function here: https://github.com/fullcalendar/fullcalendar/blob/ede23c4b2bf0ee0bb2cbe4694b3e899a09d14da6/packages/rrule/src/main.ts#L36-L56
// With a custom version below
rrulePlugin.recurringTypes[0].expand = function (errd, fr, de) {
  return errd.rruleSet.between(
    fr.start,
    fr.end,
    true, // inclusive (will give extra events at start, see https://github.com/jakubroztocil/rrule/issues/84)
  ).map(date => new Date(de.createMarker(date).getTime() + date.getTimezoneOffset() * 60 * 1000))
}

const formatEventContent = ({ setSpecifiedOccurrences, setHiddenEvents }, { event }) => {
  const { location, locationID, lat, lon, activity, hasMultipleOccurrences } = event.extendedProps
  const url = lat ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : locationID
  // causes a nested <a> in the event
  // fix PR is unmerged since Apr 2021: fullcalendar/fullcalendar#5710
  const locationLine = url
    ? <a href={url} target="_blank" rel="noreferrer">{location}</a>
    : location;
  const values = [event.source.id, event.groupId, event.extendedProps.occurrence];
  const button = activity.startsWith('Lec') ? null :
    hasMultipleOccurrences
      ? <button className='choose-button' onClick={() => setSpecifiedOccurrences({ type: 'select', values })}>Choose</button>
      : <button className='choose-button' onClick={() => setSpecifiedOccurrences({ type: 'reset', values })}>Reset</button>
  return <>
    <div className='hide-button' title='Hide this event' onClick={() => setHiddenEvents(events => [...events, values])}>
      <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path></svg>
    </div>
    <p>{event.title}</p>
    <object>{locationLine}</object>
    <p>{button}</p>
  </>
}

const weekNumberCalculation = date => {
  const startDate = getStartOfSession()
  const start = startDate ? DateTime.fromJSDate(startDate).weekNumber : 0
  const end = DateTime.fromJSDate(date).plus({ days: 1 }).weekNumber // Add 1 to convert FullCalendar (Sun-Sat) to Luxon/ISO (Mon-Sun)
  return end - start + 1 // 0 weeks after start is week 1
}

export default function Calendar({ timetableState }) {
  // Set the initial date to max(start of sem, today)
  const startOfSemester = getStartOfSession()
  const initialDate =
    startOfSemester && startOfSemester.getTime() > new Date().getTime()
      ? startOfSemester
      : new Date();

  // Where the events are stored
  const events = [];

  // Ensure we have data
  if (timetableState.selectedModules && Object.keys(timetableState.timetableData).length !== 0) {

    // Iterate over each module and add the appropriate times to the calendar if needed
    for (let i = 0; i < timetableState.selectedModules.length; i++) {
      const { id } = timetableState.selectedModules[i];
      let timetableData = timetableState.timetableData

      // Which events are currently chosen?
      // Basically the module's full list of classes, minus alternatives to chosen options (from the query string)
      const eventsForModule = [...timetableData[`${id}_${timetableState.session}`].classes]

      // Generate the events parameters
      let eventsList = parseEvents(eventsForModule, timetableState.year, timetableState.session, id)

      // Hide all but the valid occurrence
      for (const [module, groupId, occurrence] of timetableState.specifiedOccurrences) {
        if (module !== id) continue

        eventsList.forEach((event, index) => {
          if (event.groupId === groupId) {
            if (parseInt(event.occurrence) === occurrence) {
              eventsList[index].hasMultipleOccurrences = false
            } else {
              eventsList[index].display = 'none'
            }
          }
        })
      }

      // Hide hidden occurrences
      for (const [module, groupId, occurrence] of timetableState.hiddenEvents) {
        if (module !== id) continue

        eventsList.forEach((event, index) => {
          if (event.activity === groupId && parseInt(event.occurrence) === occurrence) {
            eventsList[index].display = 'none'
          }
        })
      }

      // Add event to the list
      events[i] = {
        id,
        color: stringToColor(id),
        events: eventsList
      }
    }
  }

  return <FullCalendar
    plugins={[bootstrapPlugin, dayGridPlugin, timeGridPlugin, listPlugin, rrulePlugin, luxonPlugin]}
    themeSystem='bootstrap'
    bootstrapFontAwesome={false}
    //   expandRows={true}
    height={'80vh'}

    eventSources={events}

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
        eventContent: e => formatEventContent(timetableState, e),
      },
      timeGridWeek: {
        weekends: true,
        dayHeaderFormat: { weekday: 'short' },
        eventContent: e => formatEventContent(timetableState, e),
      },
      listTwoDay: {
        type: 'list',
        duration: { days: 2 },
        buttonText: 'Agenda',
        listDayFormat: { weekday: 'long', month: 'short', day: 'numeric' },
        displayEventTime: true,
        weekends: true,
        eventContent: e => formatEventContent(timetableState, e),
      },
      dayGridMonth: {
        weekNumberFormat: { week: 'short' }
      }
    }}
    initialView={window.navigator.userAgent.includes('Mobi') ? 'listTwoDay' : 'timeGridWeek'}
    initialDate={initialDate}

    // timeGrid options
    allDaySlot={false}
    // Earliest business hour is 8am AEDT
    scrollTime={formatDate('2020-01-01T08:00+11:00', {
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

    // Week 1 = start of semester
    weekNumbers
    weekNumberCalculation={weekNumberCalculation}
    weekText='Week'
    firstDay={timetableState.weekStart}

    hiddenDays={timetableState.hiddenDays}

    fixedWeekCount={false}

    timeZone={timetableState.timeZone}

    eventSourceFailure={err => console.error(err.message)}
  />
}
