const fetch = require('node-fetch');
const fns = require('date-fns-tz');
const ics = require('ics');

// Convert JavaScript Date to array of integers
function dateToArray(date) {
    return [date.getFullYear(), date.getMonth()+1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()];
}

const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const tz = 'Australia/Canberra';

module.exports = async function (context, req) {
    let data = await fetch('https://raw.githubusercontent.com/pl4nty/anutimetable/master/public/timetable.json').then(res => res.json())
    const events = [];
    process.env.tz = 'Australia/Canberra';
    for (let module of Object.keys(req.query)) {
        const course = data[module];
        
        if (course) {
            let selected = {}
            req.query[module].split(',').forEach(x => {
                const parts = x.split(' ');
                selected[parts[0]] = parts[1];
            });

            for (let session of course.classes) {
                if (!selected[session.activity] || selected[session.activity] === session.occurrence) {    
                    const currentYear = (new Date()).getFullYear();
                
                    // Days from start of year until first Monday - aka Week 0
                    // modulo 7 in case start of year is a Monday
                    const d = new Date(currentYear, 0, 0);
                    d.setDate(d.getDate() + ((7-d.getDay())%7+1) % 7 + 2);
                    const dayDiff = d.getDay() % 7;

                    // repeated weeks are stored as "31\u201136,39\u201144"
                    for (let weeks of session.weeks.split(',')) {
                        const interval = weeks.split('\u2011')
                        const day = dayDiff + 7*(interval[0]-1) + parseInt(session.day) - 6

                        // hardcode hour offset to -10 to suit Functions runtime (timezones are hard and it's 11:30pm mkay)
                        // Azure SWA blocks WEBSITE_TIME_ZONE :(
                        let start = new Date(currentYear, 0, day, ...session.start.split(':'));
                        const weekday = days[start.getUTCDay()]
                        start = dateToArray(start);

                        let end = new Date(currentYear, 0, day, ...session.finish.split(':'))
                        end = dateToArray(end)

                        events.push({
                            start,
                            end,
                            title: `${session.module} ${session.activity} ${parseInt(session.occurrence)}`,
                            description: `${session.activity} ${parseInt(session.occurrence)}`,
                            location: session.location,
                            url: session.locationID,
                            productId: 'anucssa/timetable',
                            uid: session.name+weeks,
                            recurrenceRule: `FREQ=WEEKLY;BYDAY=${weekday};INTERVAL=1;COUNT=${interval[interval.length-1]-interval[0]+1}`,
                            calName: `ANU Timetable ${currentYear} ${session.session}`
                        })
                    }
                }
            }
        }
    }

    const { value, error } = ics.createEvents(events)
    context.res = {
        status: 200,
        headers: {'Content-Type': 'text/calendar'},
        body: value
    };
    context.done();
};