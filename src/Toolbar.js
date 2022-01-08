import { useState, useEffect, forwardRef } from 'react'

import { InputGroup, Dropdown, DropdownButton } from 'react-bootstrap'
import { Token, Typeahead } from 'react-bootstrap-typeahead'

import Export from './Export'

import { DateTime } from 'luxon'
import color from 'randomcolor'

// hardcode to semester 1 or 2 as users usually want them
// allows app to function even if /sessions endpoint is down
const getInitialSession = () => {
  const qs = new URLSearchParams(window.location.search)
  let year = qs.get('y')
  let session = qs.get('s')

  let now = new Date()
  if (!session) {
    let month = now.getMonth()

    // If semester 2 complete (after Sept), default to next year
    if (!year && month > 9) {
      year = now.getFullYear()+1
      session = 'S1'
    } else {
      session = month < 5 ? 'S1' : 'S2'
    }
  }
  year ?? (year = now.getFullYear())

  qs.set('y', year)
  qs.set('s', session)
  window.history.replaceState(null, '', '?'+qs.toString())
  return [year, session]
}

const parseEvents = (source, year, session, id) => source[`${id}_${session}`].classes.reduce((arr, c) => {
  const location = c.location
  const occurrence = parseInt(c.occurrence)

  const title = [
    c.module,
    c.activity,
    ...(c.activity.startsWith('Lec') ? [] : [occurrence])
  ].join(' ')

  const inclusiveRange = ([start, end]) => Array.from({ length: end-start+1 }, (_, i) => start+i)
  // '1\u20113,5\u20117' (1-3,6-8) => [1,2,3,6,7,8]
  const weeks = c.weeks.split(',').flatMap(w => inclusiveRange(w.split('\u2011').map(x => parseInt(x))))

  const [start, end] = [
    [weeks[0], c.start],
    [weeks[weeks.length-1], c.finish]
  ].map(([week, time]) => DateTime
    .fromFormat(time, 'HH:mm', { zone: 'UTC' })
    .set({ weekYear: year, weekNumber: week, weekday: c.day+1 }) // ANU 0-offset => Luxon 1-offset
  )
  
  // handles timezone across days/weeks, not verified across years
  const rrule = {
    freq: 'weekly',
    dtstart: start.toJSDate(),
    until: end.toJSDate(),
    byweekday: start.weekday-1, // Luxon 1-offset => rrule 0-offset
    byweekno: weeks, // rrule allows RFC violation (compliant byweekno requires freq=YEARLY) 
    tzid: 'Australia/Canberra'
  }
  
  arr.push({
    id: c.name,
    title,
    groupId: c.activity, // identifies selection groups eg COMP1130TutA
    location,
    duration: c.duration,
    rrule,

    // extendedProps
    occurrence
  })
  return arr
}, [])

export default forwardRef(({ API }, calendar) => {
  let [y, s] = getInitialSession()
  const [year, setYear] = useState(y)
  const [session, setSession] = useState(s)
  const [isLoading, setIsLoading] = useState(true)

  // TODO call setSelectedModules and selectOccurrence
  
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
      setIsLoading(false)
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
  })(), [year, session])
    
  const [selectedModules, setSelectedModules] = useState([])
  const selectModules = list => {
    const cached = selectedModules.length
    const next = list.length
    
    if (next > cached) {
      const { id } = list[list.length - 1]
      
      calendar.current.getApi().addEventSource({
        id,
        color: color({ 
          seed: id,
          luminosity: 'dark'
        }),
        events: parseEvents(JSON, year, session, id)
      })
    } else if (next < cached) {
      const { id } = selectedModules.find(m => !list.includes(m))
      calendar.current.getApi().getEventSourceById(id)?.remove()
    }
    
    setSelectedModules(list)
  }

  const selectYear = e => {
    setYear(e)
    // Assume ascending session order
    setSession(sessions[e]?.[sessions[e].length-1] || '')
  }

  return <InputGroup className="mb-2">
    <DropdownButton
      as={InputGroup.Prepend}
      variant="outline-primary"
      title={year}
    >
      {/* reverse() - years (numerical keys) are in ascending order per ES2015 spec */}
      {Object.keys(sessions).reverse().map(e => <Dropdown.Item key={e} onClick={() => selectYear(e)}>{e}</Dropdown.Item>)}
    </DropdownButton>

    <DropdownButton
      as={InputGroup.Prepend}
      variant="outline-primary"
      title={session}
    >
      {sessions[year]?.map(e => <Dropdown.Item key={e} onClick={() => setSession(e)}>{e}</Dropdown.Item>)}
    </DropdownButton>

    <Typeahead
      id="course-search-box"

      clearButton
      emptyLabel="No matching courses found"
      isLoading={isLoading}
      multiple
      highlightOnlyResult

      labelKey='title'
      placeholder="Enter a course code here (for example LAWS1201)"
      // Overwrite bad id property (eg LAWS1201_S1 -> LAWS1201)
      options={Object.entries(modules).map(([id, val]) => ({...val, id}))}
      onChange={selectModules}
      selected={selectedModules}
      // modified from default: https://github.com/ericgio/react-bootstrap-typeahead/blob/8dcac67b57e9ee121f5a44f30c59346a32b66d48/src/components/Typeahead.tsx#L143-L156
      renderToken={(option, props, idx) => <Token
        disabled={props.disabled}
        key={idx}
        onRemove={props.onRemove}
        option={option}
        tabIndex={props.tabIndex}
        href={`http://programsandcourses.anu.edu.au/${year}/course/${option.id}`}
      >
        <a
          href={`http://programsandcourses.anu.edu.au/${year}/course/${option.id}`}
          target={"_blank"}
          rel={"noreferrer"}  
        >{option.id}</a> {/** use id (eg COMP1130) instead of label to save space */}
      </Token>}
    />
    
    {/* somehow there's no NPM module for this. maybe I should write one? */}
    {selectedModules.length !== 0 && <Export API={API} />}
  </InputGroup>
})