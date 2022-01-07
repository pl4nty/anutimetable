import { useState, useEffect, forwardRef } from 'react'

import { Button, Dropdown, DropdownButton, InputGroup } from 'react-bootstrap'
import { Token, Typeahead } from 'react-bootstrap-typeahead'

import { DateTime } from 'luxon'

import stringToColor from 'string-to-color'

// hardcode to semester 1 or 2 as majority only want them
// allows app to function even if /sessions endpoint is down
const getInitialSession = () => {
  // If semester 2 complete, default to next year
  let now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth()
  return [month < 10 ? year : year+1, month < 5 ? 'S1' : 'S2']
}

export default forwardRef(({ API }, calendar) => {
  let [y, s] = getInitialSession()
  const [year, setYear] = useState(y)
  const [session, setSession] = useState(s)
  
  const [sessions, setSessions] = useState({})
  useEffect(() => (async () => {
    try {
      let res = await fetch(`${API}/sessions`)
      if (!res.ok) return
      let json = await res.json()
      setSessions(json)
    } catch (err) {
      console.error(err)
    }
  })(), [API])
  
  const [modules, setModules] = useState({})
  useEffect(() => (async () => {
    try {
      let res = await fetch(`${API}/modules?year=${year}&session=${session}`)
      if (!res.ok) return
      let json = await res.json()
      setModules(json)
    } catch (err) {
      console.error(err)
    }
  })(), [API, year, session])

  const [JSON, setJSON] = useState({})
  useEffect(() => (async () => {
    try {
      let res = await fetch(`/timetable_${year}_${session}.json`)
      if (!res.ok) return
      let json = await res.json()
      setJSON(json)
    } catch (err) {
      console.error(err)
    }
  })(), [API, year, session])
    
  const [selectedModules, setSelectedModules] = useState([])
  const selectModules = list => {
    const cached = selectedModules.length
    const next = list.length
    
    if (next > cached) {
      const { id } = list[list.length - 1]
      
      calendar.current.getApi().addEventSource({
        // url: `${API}/events/${id}`,
        id,
        // format: 'ics',
        // url: `${API}/GetICS?${id}_${session}`,
        // extraParams: {
          // year,
          // session
        // },
        color: stringToColor(id),
        events: JSON[`${id}_${session}`].classes.reduce((arr, c) => {
          const zone = 'Australia/Canberra'
          
          const intervals = c.weeks.split(',').map(w => w.split('\u2011').map(x => parseInt(x)))
          const range = ([start, end]) => Array.from({ length: end-start+1 }, (_, i) => start+i) // inclusive
          
          const start = DateTime.fromFormat(c.start, 'HH:mm', { zone })
            .set({ year, ordinal: intervals[0][0]*7-4+c.day })
          const end = DateTime.fromFormat(c.finish, 'HH:mm', { zone })
            .set({ year, ordinal: intervals[intervals.length-1][1]*7-4+c.day })
          
          arr.push({
            id: `${c.name}`,
            title: `${c.module} ${c.activity} ${c.occurrence}`,
            duration: c.duration,
            rrule: {// intervals[0][0]*7-4 intervals[intervals.length-1][1]*7-4
              freq: 'weekly',
              // assume all sessions are shorter than a year
              dtstart: start.toISO(),
              until: end.toISO(),
              byweekday: start.toUTC().weekday-1, // ignored by tzid, so manually convert
              // '3\u20116,8\u201110' => [ 3, 4, 5, 8, 9 ]
              // lib violates RFC per its README - compliant byweekno is only valid for YEARLY 
              byweekno: intervals.flatMap(range)
            }
          })
          return arr
        }, [])
      })
    } else if (next < cached) {
      const { id } = selectedModules.find(m => !list.includes(m))

      calendar.current.getApi().getEventSourceById(id).remove()
    }
    
    setSelectedModules(list)
  }

  const selectYear = e => {
    setYear(e)
    // Assume ascending session order
    setSession(sessions[e]?.[sessions[e].length-1] || '')
  }

  // TODO dropdown with ICS export via NPM module
  // TODO display current timezone
  return <InputGroup className="mb-2">
    <DropdownButton
      as={InputGroup.Prepend}
      variant="outline-secondary"
      title={year}
    >
      {/* reverse() - years (numerical keys) are in ascending order per ES2015 spec */}
      {Object.keys(sessions).reverse().map(e => <Dropdown.Item key={e} onClick={() => selectYear(e)}>{e}</Dropdown.Item>)}
    </DropdownButton>

    <DropdownButton
      as={InputGroup.Prepend}
      variant="outline-secondary"
      title={session}
    >
      {sessions[year]?.map(e => <Dropdown.Item key={e} onClick={() => setSession(e)}>{e}</Dropdown.Item>)}
    </DropdownButton>

    <Typeahead
      id="course-search-box"

      clearButton
      emptyLabel="No matching courses found"
      isLoading={false}
      multiple

      // onInputChange={}
      labelKey={'title'}
      placeholder="Enter a course code here (for example LAWS1201)"
      // Overwrite bad id property (eg LAWS1201_S1 -> LAWS1201)
      options={Object.entries(modules).map(([id, val]) => ({...val, id}))}
      onChange={selectModules}
      selected={selectedModules}
      renderToken={(option, { onRemove }, idx) => <Token
        key={option.id}
        onRemove={onRemove}
        option={option}
        href={`http://programsandcourses.anu.edu.au/${year}/course/${option.id}`}
      ><a
        href={`http://programsandcourses.anu.edu.au/${year}/course/${option.id}`}
        target={"_blank"}
        rel={"noreferrer"}
      >{option.id}</a></Token>}
    />
    
    {selectedModules.length !== 0 && <InputGroup.Append>
      <Button href={`${API}/GetICS?${selectedModules.map(m => m.id).join('&')}`}>
        Export .ics
      </Button>
    </InputGroup.Append>}
  </InputGroup>
})