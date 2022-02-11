import {useRef, useState, useEffect, useMemo} from 'react'
import { Container, Navbar } from 'react-bootstrap'

import FloatingActionButton from './FloatingActionButton'

import Toolbar from './Toolbar'
import Calendar from './Calendar'
import { loadCachedQSIfNotExists, getInitialState, setQueryParam, unsetQueryParam, fetchJsObject, stringToColor, parseEvents } from './utils'

import { ApplicationInsights } from '@microsoft/applicationinsights-web'
import { ReactPlugin, withAITracking } from '@microsoft/applicationinsights-react-js'

import {ThemeConfig} from 'bootstrap-darkmode';

const isDevelopment = process.env.NODE_ENV === 'development'
const API = `${isDevelopment ? 'localhost:7071' : window.location.host}/api`

let App = () => {
  const calendar = useRef()

  // Dark mode
  const [darkMode, setDarkMode] = useState(false)


  const themeConfig = useMemo(()=>{
    const tc = new ThemeConfig();

    tc.loadTheme = ()=>{
      const theme = localStorage.getItem('darkMode')
      if(theme === 'true'){
        setDarkMode(true);
        return 'dark';
      }
      return 'light';
    }

    tc.saveTheme = (theme)=>{
      setDarkMode(theme === 'dark');
      localStorage.setItem('darkMode', theme === 'dark' ? 'true' : 'false');
    }

    return tc;
  }, [])

  useEffect(()=>{
    themeConfig.initTheme();
  }, [themeConfig])

  function toggleDarkMode() {
    const theme = themeConfig.getTheme();
    themeConfig.setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  // Timezone string, like "Australia/Sydney"
  const [timeZone, setTimeZone] = useState(localStorage.timeZone
    // If localStorage is empty, use browser's timezone and handle UTC special case
    || Intl.DateTimeFormat()?.resolvedOptions()?.timeZone.replace(/^UTC$/, 'Etc/GMT')
    || 'Australia/Canberra' // Default to Canberra if API is missing (pre-2018 browsers)
  )
  useEffect(() => localStorage.timeZone = timeZone, [timeZone])

  loadCachedQSIfNotExists()

  const [y, s, m, h] = getInitialState()

  const [year, setYear] = useState(y)
  useEffect(() => setQueryParam('y', year), [year])

  // Current session (eg "S1" is semester 1)
  const [session, setSession] = useState(s)
  useEffect(() => setQueryParam('s', session), [session])

  // List of all supported sessions
  const [sessions, setSessions] = useState([])
  useEffect(() => fetchJsObject(`${window.location.protocol}//${API}/sessions`, setSessions), [])

  // Timetable data as a JS object
  const [timetableData, setTimetableData] = useState({})
  useEffect(() => fetchJsObject(`/timetable_data/${year}/${session}.min.json`, setTimetableData), [year, session])

  // Modules (courses) are in an object like { COMP1130: { title: 'COMP1130 Pro...', dates: 'Displaying Dates: ...', link: "" }, ... }
  const processModule = ({classes, id, title, ...module}) => ({ title: title.replace(/_[A-Z][1-9]/, ''), ...module })
  const [modules, setModules] = useState({})
  useEffect(() => setModules(Object.entries(timetableData).reduce((acc, [key, module]) => ({...acc, [key.split('_')[0]]: processModule(module)}),{})),  [timetableData])

  // Selected modules are stored as an *array* of module objects as above, with
  // an additional `id` field that has the key in `modules`
  const [selectedModules, setSelectedModules] = useState(m.map(([id]) => ({ id })))

  // List of events chosen from a list of alternatives globally
  // List of lists like ['COMP1130', 'ComA', 1] (called module, groupId, occurrence)
  const getSpecOccurrences = () => m.flatMap(([module, occurrences]) => occurrences.split(',').flatMap(o => {
    // We're flatMapping so that we can return [] to do nothing and [result] to return a result
    if (!o || !selectedModules.map(({ id }) => id).includes(module)) return []
    const r = o.match(/([^0-9]*)([0-9]+)$/)
    if (!r || !r[2]) {
      console.error("Failed to find regex or second pattern in regex for input", o)
      return []
    }
    return [[module, r[1], parseInt(r[2])]]
  }))
  const [specifiedOccurrences, setSpecifiedOccurrences] = useState(getSpecOccurrences())
  const updateSpecifiedOccurrences = () => setSpecifiedOccurrences(getSpecOccurrences())

  // Events that are manually hidden with the eye icon
  const [hiddenOccurrences, setHiddenOccurrences] = useState(h)
  useEffect(() => {
    const hide = hiddenOccurrences.map(x => x.join('_')).join(',')
    if (hide.length > 0)
      setQueryParam('hide', hide)
    else
      unsetQueryParam('hide')
  })
  // Updating clears hidden occurrences from no longer selected modules
  const updateHiddenOccurrences = () => setHiddenOccurrences(
    hiddenOccurrences.filter(([module]) => selectedModules.map(({ id }) => id).includes(module))
  )

  // Update query string parameters and calendar events whenever anything changes
  useEffect(() => {
    const api = calendar.current.getApi()
    const sources = api.getEventSources()

    // Remove no longer selected modules from the query string
    // Remove all calendar events (we re-add them after)
    const selected = selectedModules.map(({ id }) => id)
    sources.forEach(s => {
      if (!selected.includes(s.id)) {
        const qs = new URLSearchParams(window.location.search)
        qs.delete(s.id) // if no value, just ensure param exists
        window.history.replaceState(null, '', '?'+qs.toString())
      }
      s.remove()
    })

    // Update the query string and the events the calendar receives
    selectedModules.forEach(({ id }) => {
      // Update query string
      setQueryParam(id, specifiedOccurrences.filter(([m]) => m === id).map(([m,groupId,occurrence]) => groupId+occurrence).join(','))

      if (Object.keys(timetableData).length === 0) return

      // What events are currently visible?
      // Basically the module's full list of classes, minus alternatives to chosen options (from the query string)
      const eventsForModule = [...timetableData[`${id}_${session}`].classes]
      for (const [module, groupId, occurrence] of specifiedOccurrences) {
        if (module !== id) continue
        // Delete alternatives to an explicitly chosen event
        for (let i = eventsForModule.length - 1; i >= 0; i--) {
          const event = eventsForModule[i]
          if (event.activity === groupId && parseInt(event.occurrence) !== occurrence) {
            eventsForModule.splice(i, 1)
          }
        }
      }
      // Delete hidden occurrences
      for (const [module, groupId, occurrence] of hiddenOccurrences) {
        if (module !== id) continue
        for (let i = eventsForModule.length - 1; i >= 0; i--) {
          const event = eventsForModule[i]
          if (event.activity === groupId && parseInt(event.occurrence) === occurrence) {
            eventsForModule.splice(i, 1)
          }
        }
      }

      // Add currently visible events to the calendar
      api.addEventSource({
        id,
        color: stringToColor(id),
        events: parseEvents(eventsForModule, year, session, id)
      })
    })
  }, [timetableData, year, session, selectedModules, calendar, timeZone, m, modules, specifiedOccurrences, hiddenOccurrences])

  // Remove specified events for modules that have been removed
  useEffect(() => {
    updateSpecifiedOccurrences()
    updateHiddenOccurrences()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModules])

  // We select occurrences by adding them to specifiedOccurrences, which
  // edits the query string in an effect
  const selectOccurrence = (module, groupId, occurrence) => {
    // Eg adding ['COMP1130', 'ComA', 1]
    setSpecifiedOccurrences([...specifiedOccurrences, [module, groupId, occurrence]])
  }
  const resetOccurrence = (module, groupId, occurrence) => {
    setSpecifiedOccurrences(specifiedOccurrences.filter(
      ([m, g, o]) => !(m === module && g === groupId && o === occurrence)
    ))
  }
  const hideOccurrence = (module, groupId, occurrence) => {
    setHiddenOccurrences([...hiddenOccurrences, [module, groupId, occurrence]])
  }

  // Starting day of the week
  const [weekStart, setWeekStart] = useState(0);
  useEffect(()=>{
    let localWeekStart = localStorage.getItem('weekStart')
    if (localWeekStart) {
      localWeekStart = parseInt(localWeekStart)
      if (localWeekStart >= 0 && localWeekStart <= 6) {
        setWeekStart(localWeekStart)
      } else {
        localStorage.removeItem('weekStart')
      }
    }
  },[]);

  // 0-indexed days of the week to hide (starting from Sunday)
  const [hiddenDays, setHiddenDays] = useState([])
  useEffect(()=>{
    // use reduce to discard non-int days
    const localHiddenDays = localStorage.getItem('hiddenDays')?.split(',')
      .reduce((acc, x) => [...acc, ...([parseInt(x)] || [])], [])
    if (localHiddenDays) {
      setHiddenDays(localHiddenDays)
    }
  },[]);

  const state = {
    timeZone, year, session, sessions, timetableData, modules, selectedModules, weekStart, darkMode,
    setTimeZone, setYear, setSession, setSessions, setTimetableData, setModules, setSelectedModules,
    selectOccurrence, resetOccurrence, hideOccurrence, hiddenDays,
  }

  // fluid="xxl" is only supported in Bootstrap 5
  return <Container fluid>
    <h2 className="mt-2">ANU Timetable</h2>

    <Toolbar API={API} ref={calendar} state={state} />

    <Calendar ref={calendar} state={state} />

    <Navbar>
      <Navbar.Text>
          Made with <span role="img" aria-label="love">💖</span> by the&nbsp;
        <a target="_blank" rel="noreferrer" href="https://cssa.club/">ANU CSSA</a>&nbsp;
        (and a <a target="_blank" rel="noreferrer" href="/contributors.html">lot of people</a>), report issues&nbsp;
          <a target="_blank" rel="noreferrer" href="https://forms.office.com/r/sZnsxtsh2F">here</a>
      </Navbar.Text>
    </Navbar>

    <FloatingActionButton {...{
      weekStart, setWeekStart,
      hiddenDays, setHiddenDays,
      darkMode, toggleDarkMode,
      hiddenOccurrences, setHiddenOccurrences
    }} />
  </Container>
}

// Analytics
if (!isDevelopment) {
  const reactPlugin = new ReactPlugin();
  const appInsights = new ApplicationInsights({
    config: {
      connectionString: process.env.REACT_APP_INSIGHTS_STRING,
      disableFetchTracking: false,
      enableCorsCorrelation: true,
      extensions: [reactPlugin]
    }
  })
  appInsights.loadAppInsights()

  App = withAITracking(reactPlugin, App)
}

export default App
