const fetch = require('node-fetch')
// const setTZ = require('set-tz')
const fns = require('date-fns-tz')
const ics = require('ics')

const TIMETABLE_JSON = 'https://raw.githubusercontent.com/pl4nty/anutimetable/master/public/timetable.json'
const tz = 'Australia/Canberra'
const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

function timesToArray(date, timeString, context) {
    const times = timeString.split(':')
    date.setHours(times[0])
    date.setMinutes(times[1])
    date.setSeconds(0)
    context.log.error('date:',date)
    let date2 = fns.format(date, 'y,M,d,H,m,s', { timeZone: tz}).split(',').map(x => parseInt(x))
    context.log.error('date2:',date2)
    return date2
}

// eg ?COMP2310_S2=COMP2310_S2-LecA/01,COMP2310_S2-LecB/01
module.exports = async function (context, req) {
    context.log.info(`Running in node ${process.version}`)

    const courseCodes = Object.keys(req.query)
    
    // require Intl module for timezone handling
    if (courseCodes.length === 0 || typeof Intl !== 'object') {
        context.res = {
            status: 404,
            body: 'Please provide a course code in the query parameter (eg COMP2310)'
        }
        context.done()
    }


    let timetable
    try {
        timetable = await fetch(TIMETABLE_JSON).then(res => res.json())
    } catch (e) {
        throw `Couldn't load timetable data: ${e}`
    }
    
    // hardcode timezone (timezones are hard and it's 11:30pm mkay)
    // Azure SWA blocks WEBSITE_TIME_ZONE in its Function runtime :(
    const events = []
    for (let courseCode of courseCodes) {
        const course = timetable[courseCode]
        
        if (course) {
            // LecA 01,LecA 02,LecB 01 => { LecA: [01, 02], LecB: [01] }
            const selected = req.query[courseCode].split(',').reduce((acc,val) => {
                const parts = val.split(' ')
                const activity = acc[parts[0]]
                acc[parts[0]] = activity === undefined ? [parts[1]] : activity.concat(parts[1])
                return acc
            }, {})

            for (let session of course.classes) {
                
                // If occurrence of activity is selected (eg TutA 01), skip other occurrences (eg TutA 02)
                if (!selected[session.activity] || selected[session.activity] === session.occurrence) {
                    
                    // Static Web App Functions don't support WEBSITE_TIME_ZONE and default to UTC, so manually handle timezones
                    // Days from start of year until first Monday - aka Week 0
                    let yearStart = fns.utcToZonedTime(new Date(), tz)
                    context.log.warn('yr:',yearStart)
                    context.log.warn('date:',new Date())
                    yearStart.setMonth(0,1)
                    context.log.warn('start:',yearStart)

                    const year = yearStart.getFullYear()
                    const dayOffset = (8 - yearStart.getDay()) % 7

                    // repeated weeks are stored as "31\u201136,39\u201144"
                    for (let weeks of session.weeks.split(',')) {
                        const interval = weeks.split('\u2011')
                        const repetitions = interval[interval.length-1]-interval[0]+1
                        
                        const day = dayOffset + 7*(interval[0]-2) + parseInt(session.day) + 1
                        
                        let startDay = fns.utcToZonedTime(new Date(yearStart.getTime()), tz)
                        context.log.warn('startday:',startDay)
                        startDay.setDate(day)
                        context.log.warn('startdayset:',startDay)
                        const weekday = days[startDay.getDay()] // assumes no multi-day events

                        console.log(process.version)

                        events.push({
                            start: timesToArray(startDay, session.start, context),
                            startOutputType: 'local',
                            end: timesToArray(startDay, session.finish, context),
                            title: `${session.module} ${session.activity} ${parseInt(session.occurrence)}`,
                            description: `${session.activity} ${parseInt(session.occurrence)}`,
                            location: session.location,
                            url: session.locationID,
                            productId: 'anucssa/timetable',
                            uid: session.name+weeks.replace('\u2011','-'),
                            recurrenceRule: `FREQ=WEEKLY;BYDAY=${weekday};INTERVAL=1;COUNT=${repetitions}`,
                            calName: `ANU Timetable ${year} ${session.session}`
                        })
                    }
                }
            }
        }
    }

    if (events.length !== 0) {
        let { value, error } = await ics.createEvents(events)

        // Cursed timezone magic
        // Breaks if Canberra TZ changes
        value = value.replace(/DTSTART/g, 'DTSTART;TZID="Australia/Canberra"')
        value = value.replace(/DTEND/g, 'DTEND;TZID="Australia/Canberra"')
        value = value.replace(/BEGIN:VEVENT/,`BEGIN:VTIMEZONE
TZID:Australia/Canberra
X-LIC-LOCATION:Australia/Canberra
BEGIN:DAYLIGHT
TZOFFSETFROM:+1000
TZOFFSETTO:+1100
TZNAME:EST
DTSTART:19701025T020000
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU
END:DAYLIGHT
BEGIN:STANDARD
TZOFFSETFROM:+1000
TZOFFSETTO:+1000
TZNAME:EST
DTSTART:19700329T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU
END:STANDARD
END:VTIMEZONE
BEGIN:VEVENT`)

        context.res = {
            status: 200,
            headers: {'Content-Type': 'text/calendar'},
            body: value
        }
    } else {
        context.res = {
            status: 404,
            body: 'No course data found'
        }
    }
    
    context.done()
}