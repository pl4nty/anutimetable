import fetch from 'node-fetch'
import ics from 'ics'
import { DateTime } from 'luxon'

// https://docs.microsoft.com/en-us/azure/azure-functions/functions-app-settings#azure_functions_environment
const tz = 'Australia/Canberra'
const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

// eg 2021-02-16,10:00 => [2021,2,16,10,0]
function timesToArray(date, timeString) {
    const times = timeString.split(':').map(x => parseInt(x))
    return [date.year, date.month, date.day, times[0], times[1], 0]
}

// eg ?COMP2310_S2=LecA 01,LecB 01
export default async function (context, req) {
    const SOURCE = process.env.AZURE_FUNCTIONS_ENVIRONMENT === 'Development' ? 'http://localhost:3000/' : 'https://raw.githubusercontent.com/pl4nty/anutimetable/master/public/'
    const TIMETABLE_JSON = SOURCE+`timetable_data/${req.query.y}/${req.query.s}.min.json`

    context.log.info(`Running in node ${process.version}`)

    const courseCodes = Object.keys(req.query)

    let hiddenClasses = [];
    if (req.query.hasOwnProperty('hide')) {
        hiddenClasses = req.query.hide.split(',')
    }

    // require Intl module for timezone handling
    if (courseCodes.length === 0 || typeof Intl !== 'object') {
        context.log.warn(`Invalid query: ${req.query}`)
        context.res = {
            status: 404,
            body: 'Please provide a course code eg /GetICS?COMP2310)'
        }
    }

    let timetable
    try {
        timetable = await fetch(TIMETABLE_JSON).then(res => res.json())
    } catch (e) {
        const err = "Couldn't load timetable data"
        context.log.error(err+`: ${e}`)
        context.res = {
            status: 503,
            body: err
        }
    }

    const events = []
    for (let courseCode of courseCodes) {
        const course = timetable[courseCode] || timetable[courseCode+'_'+req.query.s]

        if (course) {
            // Convert client qs format to ANU database lookup
            // LecA1,LecA2,LecB1 => { LecA: [01, 02], LecB: [01] }
            const selected = req.query[courseCode].split(',').reduce((acc,val) => {
                // TutA1 => ['TutA1', 'TutA', '1']
                const r = val.match(/([^0-9]*)([0-9]+)$/)
                if (r) {
                    acc[r[1]] = acc[r[1]] || []
                    acc[r[1]].push(r[2].padStart(2,'0'))
                }
                return acc
            }, {})

            for (let session of course.classes) {
                const eventString = [courseCode, session.activity, parseInt(session.occurrence).toString()].join('_')
                const hidden = hiddenClasses.includes(eventString)
                // If occurrence of activity is selected (eg TutA 01), skip other occurrences (eg TutA 02)
                if (!hidden && (!selected[session.activity] || selected[session.activity].includes(session.occurrence))) {
                    // repeated weeks are stored as "31\u201136,39\u201144"
                    for (let weeks of session.weeks.split(',')) {
                        const interval = weeks.split('\u2011')
                        const repetitions = interval[interval.length-1]-interval[0]+1
                        const year = parseInt(req.query.y)
                        const day = DateTime.local().setZone(tz).set( {weekYear: year, weekNumber: interval[0], weekday: parseInt(session.day) + 1} )
                        const weekday = days[day.weekday] // assumes no multi-day events

                        let { lat, lon } = session

                        const description = `${lat ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}` : session.locationID}
https://wattlecourses.anu.edu.au/course/search.php?q=${courseCode}+${year}
https://programsandcourses.anu.edu.au/${year}/course/${courseCode}`

                        events.push({
                            start: timesToArray(day, session.start),
                            startOutputType: 'local',
                            end: timesToArray(day, session.finish),
                            title: `${courseCode} ${session.activity} ${parseInt(session.occurrence)}`,
                            description,
                            location: session.location,
                            geo: lat && { lat: parseFloat(lat), lon: parseFloat(lon) }, // could mapReduce, but it's only 2 elements
                            url: `https://programsandcourses.anu.edu.au/${year}/course/${courseCode}`,
                            productId: 'anucssa/timetable',
                            uid: session.name+weeks.replace('\u2011','-'),
                            recurrenceRule: `FREQ=WEEKLY;BYDAY=${weekday};INTERVAL=1;COUNT=${repetitions}`,
                            calName: `ANU Timetable ${year} ${req.query.s}`
                        })
                    }
                }
            }
        }
    }

    if (events.length !== 0) {
        const createICS = events => new Promise((resolve, reject) => {
            ics.createEvents(events, (err, val) => {
                if (err) reject(err)
                else resolve (val);
            })
        })

        try {
            let value = await createICS(events)

            // Cursed timezone magic, breaks if Canberra TZ changes
            value = value.replace(/DTSTART/g, 'DTSTART;TZID=Australia/Canberra')
            value = value.replace(/DTEND/g, 'DTEND;TZID=Australia/Canberra')
            value = value.replace(/BEGIN:VEVENT/,`BEGIN:VTIMEZONE\r
TZID:Australia/Canberra\r
X-LIC-LOCATION:Australia/Canberra\r
BEGIN:STANDARD\r
DTSTART:19700329T020000\r
TZOFFSETFROM:+1100\r
TZOFFSETTO:+1000\r
TZNAME:AEST\r
RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU\r
END:STANDARD\r
BEGIN:DAYLIGHT\r
DTSTART:19701025T020000\r
TZOFFSETFROM:+1000\r
TZOFFSETTO:+1100\r
TZNAME:AEDT\r
RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=1SU\r
END:DAYLIGHT\r
END:VTIMEZONE\r
BEGIN:VEVENT`)

            context.res = {
                status: 200,
                headers: {'Content-Type': 'text/calendar'},
                body: value
            }
        } catch(err) {
            const msg = "ICS creation failed"
            context.log.error(`${msg}: ${err}`)
            context.res = {
                status: 500,
                body: msg
            }
        }
    } else {
        context.res = {
            status: 404,
            body: 'No course data found'
        }
    }
}
