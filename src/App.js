import { useState, useEffect, useMemo, useReducer } from 'react'
import { Container, Navbar, Row, Col } from 'react-bootstrap'

import FloatingActionButton from './FloatingActionButton'

import Header from './Header'
import Calendar from './Calendar'
import { loadCachedQSIfNotExists, getInitialState, setQueryParam, appendQueryParamElement, popQueryParamElement, unsetQueryParam, fetchJsObject } from './utils'
import { ApplicationInsights } from '@microsoft/applicationinsights-web'
import { ReactPlugin, withAITracking } from '@microsoft/applicationinsights-react-js'

import { ThemeConfig } from 'bootstrap-darkmode';

const isDevelopment = process.env.NODE_ENV === 'development'
const API = `${isDevelopment ? 'localhost:7071' : window.location.host}/api`

let App = () => {
  // Dark mode
  const [darkMode, setDarkMode] = useState(false)


  const themeConfig = useMemo(() => {
    const tc = new ThemeConfig();

    tc.loadTheme = () => {
      const theme = localStorage.getItem('darkMode')
      if (theme === 'true') {
        setDarkMode(true);
        return 'dark';
      }
      return 'light';
    }

    tc.saveTheme = (theme) => {
      setDarkMode(theme === 'dark');
      localStorage.setItem('darkMode', theme === 'dark' ? 'true' : 'false');
    }

    return tc;
  }, [])

  useEffect(() => {
    themeConfig.initTheme();
  }, [themeConfig])

  function toggleDarkMode() {
    const theme = themeConfig.getTheme();
    themeConfig.setTheme(theme === 'dark' ? 'light' : 'dark');
  }

  // Timezone string, like "Australia/Sydney"
  const [timeZone, setTimeZone] = useState(
    localStorage.timeZone
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
  const [sessions, setSessions] = useState({})
  useEffect(() => fetchJsObject(`${window.location.protocol}//${API}/sessions`, setSessions), [])

  // Timetable data as a JS object
  const [timetableData, setTimetableData] = useState({})
  useEffect(() => fetchJsObject(`/timetable_data/${year}/${session}.min.json`, setTimetableData), [year, session])

  // Modules (courses) are in an object like { COMP1130: { title: 'COMP1130 Pro...', dates: 'Displaying Dates: ...', link: "" }, ... }
  const processModule = ({ classes, id, title, ...module }) => ({ title: title.replace(/_[A-Z][1-9]/, ''), ...module })

  // Events that are manually hidden with the eye icon
  const [hiddenEvents, setHiddenEvents] = useState(h)

  // Update URL parameters
  useEffect(() => {
    const hide = hiddenEvents.map(x => x.join('_')).join(',')
    if (hide.length > 0)
      setQueryParam('hide', hide)
    else
      unsetQueryParam('hide')
  })

  const [modules, setModules] = useState({})
  useEffect(() => setModules(Object.entries(timetableData).reduce((acc, [key, module]) => ({ ...acc, [key.split('_')[0]]: processModule(module) }), {})), [timetableData])

  // This needs to be a reducer to access the previous value 
  const selectedModulesReducer = (state, updatedModules) => {
    // Find no longer present entries
    state.forEach(module => {
      // No longer present
      if (!updatedModules.includes(module)) {
        unsetQueryParam(module.id)
      }
    })
    // Find new entries
    updatedModules.forEach(module => {
      // New module
      if (!state.includes(module)) {
        setQueryParam(module.id)
      }
    })

    setHiddenEvents(hidden => hidden.filter(([module]) => updatedModules.map(({ id }) => id).includes(module)))

    return updatedModules
  }

  // Selected modules are stored as an *array* of module objects as above, with
  // an additional `id` field that has the key in `modules`
  const [selectedModules, setSelectedModules] = useReducer(selectedModulesReducer, m.map(([id]) => ({ id })))

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

  const changeOccurrences = (state, action) => {
    // If called as empty reset state based on url params
    if (!action) {
      return getSpecOccurrences()
    }
    let [module, groupId, occurrence] = action.values
    switch (action.type) {
      case 'select':
        appendQueryParamElement(module, groupId + occurrence)
        return [...state, action.values]
      case 'reset':
        popQueryParamElement(module, groupId + occurrence)
        return state.filter(
          ([m, g, o]) => !(m === module && g === groupId && o === occurrence)
        )
      default:
        throw new Error()
    }
  }

  const [specifiedOccurrences, setSpecifiedOccurrences] = useReducer(changeOccurrences, getSpecOccurrences())
  useEffect(() => {
    setSpecifiedOccurrences()
  }, [selectedModules])


  // Starting day of the week
  const [weekStart, setWeekStart] = useState(0);
  useEffect(() => {
    let localWeekStart = localStorage.getItem('weekStart')
    if (localWeekStart) {
      localWeekStart = parseInt(localWeekStart)
      if (localWeekStart >= 0 && localWeekStart <= 6) {
        setWeekStart(localWeekStart)
      } else {
        localStorage.removeItem('weekStart')
      }
    }
  }, []);

  // 0-indexed days of the week to hide (starting from Sunday)
  const [hiddenDays, setHiddenDays] = useState([])
  useEffect(() => {
    // use reduce to discard non-int days
    const localHiddenDays = localStorage.getItem('hiddenDays')?.split(',')
      .reduce((acc, x) => [...acc, ...([parseInt(x)] || [])], [])
    if (localHiddenDays) {
      setHiddenDays(localHiddenDays)
    }
  }, []);

  const timetableState = {
    timeZone, year, session, sessions, specifiedOccurrences, hiddenEvents, timetableData, modules, selectedModules, weekStart, darkMode,
    setTimeZone, setYear, setSession, setSessions, setSpecifiedOccurrences, setHiddenEvents, setTimetableData, setModules, setSelectedModules,
    hiddenDays,
  }

  return <>
    {/* // fluid="xxl" is only supported in Bootstrap 5 */}
    <Container fluid className='d-flex flex-column vh-100 px-0'>
      <Row className="m-0">
        <Col className="p-0">
          <Header API={API} timetableState={timetableState} />
        </Col>
      </Row>
      <Row className="flex-column flex-grow-1 m-0 pt-3 pb-3">
        <Col className="w-100">
          <Calendar timetableState={timetableState} />
        </Col>
      </Row>
      <Row className="m-0">
        <Col className="p-0">
          <Navbar>
            <Navbar.Text>
              Made with <span role="img" aria-label="love">💖</span> by the&nbsp;
              <a target="_blank" rel="noreferrer" href="https://cssa.club/">ANU CSSA</a>&nbsp;
              (and a <a target="_blank" rel="noreferrer" href="/contributors.html">lot of people</a>), report issues&nbsp;
              <a target="_blank" rel="noreferrer" href="https://forms.office.com/r/sZnsxtsh2F">here</a>
            </Navbar.Text>
          </Navbar>
        </Col>
      </Row>
    </Container>

    <FloatingActionButton {...{
      weekStart, setWeekStart,
      hiddenDays, setHiddenDays,
      darkMode, toggleDarkMode,
      hidden: hiddenEvents, setHiddenEvents, 
      timeZone, setTimeZone
    }} />
  </>
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
  appInsights.trackPageView()

  App = withAITracking(reactPlugin, App)
}

export default App
