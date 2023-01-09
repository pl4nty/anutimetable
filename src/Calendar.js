import { formatDate } from '@fullcalendar/core'
import FullCalendar from '@fullcalendar/react'
// Bootstrap 5 support is WIP: fullcalendar/fullcalendar#6625
import bootstrapPlugin from '@fullcalendar/bootstrap5'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import rrulePlugin from '@fullcalendar/rrule' // causes build warns: jakubroztocil/rrule#522
import luxonPlugin from '@fullcalendar/luxon2'

// import { AiOutlineFullscreen, AiOutlineFullscreenExit } from 'react-icons/ai'

import { DateTime } from 'luxon'

import { getStartOfSession, stringToColor, parseEvents } from './utils'
import { useMemo, useState, useEffect, useCallback, createRef } from 'react'

// Monkey patch rrulePlugin for FullCalendar to fix https://github.com/fullcalendar/fullcalendar/issues/5273
// (Recurring events don't respect timezones in FullCalendar)
// We simply replace the expand function here: https://github.com/fullcalendar/fullcalendar/blob/ede23c4b2bf0ee0bb2cbe4694b3e899a09d14da6/packages/rrule/src/main.ts#L36-L56
// With a custom version below
// somehow this pins us to rrule 2.6.8, since 2.7 removes Luxon with jakubroztocil/rrule#508 and starts returning "invalid date" on the rruleset
rrulePlugin.recurringTypes[0].expand = function (errd, fr, de) {
  return errd.rruleSet.between(
    fr.start,
    fr.end,
    true, // inclusive (will give extra events at start, see https://github.com/jakubroztocil/rrule/issues/84)
  ).map(date => new Date(de.createMarker(date).getTime() + date.getTimezoneOffset() * 60 * 1000))
}

const formatEventContent = (setSpecifiedOccurrences, setHiddenEvents, { event, view, borderColor }) => {
  // view-specific eventContent options seem to have broken since FullCalendar 6, so we have to apply them manually
  if (view.type !== 'dayGridMonth') {
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
    return (<>
      <div className='hide-button' title='Hide this event' onClick={() => setHiddenEvents(events => [...events, values])}>
        <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path></svg>
      </div>
      <p>{event.title}</p>
      <p>{locationLine}</p>
      <p>{button}</p>
    </>)
  } else return <>
    <div className="fc-daygrid-event-dot" style={{ borderColor: borderColor }}></div>
    <div className="fc-event-title">{event.title}</div>
  </>
}

const weekNumberCalculation = date => {
  const startDate = getStartOfSession()
  const start = startDate ? DateTime.fromJSDate(startDate).weekNumber : 0
  const end = DateTime.fromJSDate(date).plus({ days: 1 }).weekNumber // Add 1 to convert FullCalendar (Sun-Sat) to Luxon/ISO (Mon-Sun)
  return end - start + 1 // 0 weeks after start is week 1
}

export const getEvents = (timetableData, selectedModules, session, year, specifiedOccurrences, hiddenEvents) => {
  // Ensure we have data
  if (!selectedModules) return []
  if (Object.keys(timetableData).length === 0) return []

  return selectedModules.map(mod => {
    const { id } = mod;

    // Which events are currently chosen?
    // Basically the module's full list of classes, minus alternatives to chosen options (from the query string)
    const eventsForModule = [...timetableData[`${id}_${session}`].classes]

    // Generate the events parameters
    let eventsList = parseEvents(eventsForModule, year, session, id)

    const occurrences = specifiedOccurrences.filter(oc => oc[0] === id)
    const hidden = hiddenEvents.filter(oc => oc[0] === id)

    // Hide all but the valid occurrence
    for (const [, groupId, occurrence] of occurrences) {
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
    for (const [, groupId, occurrence] of hidden) {
      eventsList.forEach((event, index) => {
        if (event.activity === groupId && parseInt(event.occurrence) === occurrence) {
          eventsList[index].display = 'none'
        }
      })
    }

    return {
      id,
      color: stringToColor(id),
      events: eventsList
    }
  })
}

const getLocaleStartFinishTime = (events, timeZone) => {
  // 9 - 5 Workday
  let startTime = DateTime.fromFormat('09:00', 'HH:mm', { zone: 'Australia/Sydney' })
  // Exclusive times mean end of 7pm equals 8pm
  let finishTime = DateTime.fromFormat('18:00', 'HH:mm', { zone: 'Australia/Sydney' })

  // Find any events that push these default boundaries
  events.forEach(eventList => {
    eventList.events.forEach(e => {
      if (e.display === 'auto') {
        let start = DateTime.fromFormat(e.start, 'HH:mm', { zone: 'Australia/Sydney' })
        let finish = DateTime.fromFormat(e.finish, 'HH:mm', { zone: 'Australia/Sydney' })
        if (start < startTime) startTime = start
        if (finish > finishTime) finishTime = finish
      }
    })
  })

  // Change the local to the users timezone
  startTime = startTime.setZone(timeZone)
  finishTime = finishTime.setZone(timeZone)

  // Unfortunatly when an event wrappes around past midnight local time, we must show all of the calendar rows
  if (startTime.hour >= finishTime.hour) {
    startTime = DateTime.fromFormat('00:00', 'HH:mm')
    finishTime = DateTime.fromFormat('23:59', 'HH:mm')
  }

  return [startTime.toLocaleString(DateTime.TIME_24_SIMPLE), finishTime.toLocaleString(DateTime.TIME_24_SIMPLE)]
}

export default function Calendar({ timetableData, selectedModules, session, year, specifiedOccurrences, hiddenEvents, weekStart, hiddenDays, timeZone, setSpecifiedOccurrences, setHiddenEvents, isPrintView, printViewCaptureFirstSection }) {
  // Set the initial date to max(start of sem, today)
  const startOfSemester = getStartOfSession()
  const initialDate =
    startOfSemester && startOfSemester.getTime() > new Date().getTime()
      ? startOfSemester
      : new Date();

  // Where the events are stored
  // const events = useMemo(() => getEvents(timetableState), [timetableState])
  const events = useMemo(() =>
    getEvents(timetableData, selectedModules, session, year, specifiedOccurrences, hiddenEvents),
    [timetableData, selectedModules, session, year, specifiedOccurrences, hiddenEvents])

  // const events = timetableState.events;
  let [startTime, finishTime] = useMemo(() => getLocaleStartFinishTime(events, timeZone), [events, timeZone])

  if (isPrintView) {
    if (startTime === '00:00' &&
      finishTime === '23:59') {
      window.secondPictureNeeded = true

      if (printViewCaptureFirstSection) {
        finishTime = '12:00'
      } else {
        startTime = '12:00'
      }
    }
  }

  const [fullScreen, setFullScreen] = useState(false)

  useEffect(() => {
    const func = () => setFullScreen(!fullScreen)
    document.addEventListener('fullscreenchange', func, false);
    return () => document.removeEventListener('fullscreenchange', func, false)
  }, [fullScreen])

  // Handler for calendar to display event content
  const getEventContent = useCallback(e => {
    return formatEventContent(setSpecifiedOccurrences, setHiddenEvents, e)
  }, [setSpecifiedOccurrences, setHiddenEvents])

  const fullScreenClick = useCallback(() => {
    if (fullScreen) document.exitFullscreen()
    else document.getElementsByClassName('fc')[0].requestFullscreen()
  }, [fullScreen])

  const calendarRef = createRef()
  window.calendar = calendarRef

  // .render doesn't redraw the events somehow
  useEffect(() => {
    const api = calendarRef.current.getApi()
    api.next()
    api.prev()
  }, [calendarRef, timeZone])

  return <FullCalendar
    ref={calendarRef}
    plugins={[bootstrapPlugin, dayGridPlugin, timeGridPlugin, listPlugin, rrulePlugin, luxonPlugin]}
    themeSystem='bootstrap'
    bootstrapFontAwesome={false}
    //   expandRows={true}
    // can't apply in print context because FC events need JS to resize (CSS inset prop)
    viewClassNames={isPrintView ? 'print-view' : ''}
    height='100%'
    expandRows={true}

    eventSources={events}

    headerToolbar={{
      start: 'prev,next',
      center: 'title',
      end: 'timeGridDay,timeGridWeek,dayGridMonth,listTwoDay,fullScreen'
    }}
    buttonText={{
      today: 'Today',
      prev: 'Back',
      next: 'Next',
      day: 'Day',
      week: 'Week',
      month: 'Month'
    }}
    customButtons={{
      fullScreen: {
        text: fullScreen ? 'Exit' : 'FullScreen', // see fullcalendar/fullcalendar#7120 <AiOutlineFullscreenExit size='1.5em' /> : <AiOutlineFullscreen size='1.5em' />,
        hint: fullScreen ? 'Exit FullScreen' : 'Enter FullScreen',
        click: fullScreenClick
      }
    }}

    eventContent={getEventContent}

    views={{
      timeGridDay: {
        titleFormat: { year: 'numeric', month: 'short', day: 'numeric' },
        eventContent: getEventContent,
      },
      timeGridWeek: {
        weekends: true,
        dayHeaderFormat: { weekday: 'short' },
        eventContent: getEventContent,
      },
      listTwoDay: {
        type: 'list',
        duration: { days: 2 },
        buttonText: 'Agenda',
        listDayFormat: { weekday: 'long', month: 'short', day: 'numeric' },
        displayEventTime: true,
        weekends: true,
        eventContent: getEventContent,
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
    slotLabelClassNames={'slot-label'}
    // Don't show indicator in print view
    nowIndicator={!isPrintView}
    navLinks
    // businessHours={{
    //   daysOfWeek: [1, 2, 3, 4, 5],
    //   startTime: '07:00',
    //   endTime: '19:00'
    // }}
    displayEventTime={false}
    defaultAllDay={false} // allDay=false required for non-string rrule inputs (eg Dates) https://github.com/fullcalendar/fullcalendar/issues/6689

    slotEventOverlap={false}


    // Week 1 = start of semester
    weekNumbers
    weekNumberCalculation={weekNumberCalculation}
    weekText='Week'
    firstDay={weekStart}

    hiddenDays={hiddenDays}

    fixedWeekCount={false}

    timeZone={timeZone}

    slotMinTime={startTime}
    slotMaxTime={finishTime}

    eventSourceFailure={err => console.error(err.message)}
  />
}
