import { Nav, Navbar, NavDropdown } from 'react-bootstrap'
import TimezoneSelect from 'react-timezone-select'

import { useMemo } from 'react'

const select = (state, setState, setModules, callback) => e => {
  const val = e.target.text
  if (val !== state) {
    setModules([])
    setState(val)
    if (callback) callback(val)
  }
}

const Header = ({ sessions, year, setYear, session, setSession, setSelectedModules, timeZone, setTimeZone, darkMode }) => {
  const selectYear = select(year, setYear, setSelectedModules, yr => {
    const s = sessions[yr]
    setSession(s?.[s.length-1] || '')
  })
  const selectSession = select(session, setSession, setSelectedModules)
  const years = useMemo(() => Object.keys(sessions).reverse(), [sessions])
  const mode = darkMode ? 'dark' : 'light'
  const theme = theme => ({
    ...theme,
    colors: {
      ...theme.colors,
      neutral0: darkMode ? '#101214' : '#fff',
      neutral80: darkMode ? '#fff' : '#000',
      primary25: darkMode ? '#343A40' : '#deebff',
      primary: '#42A5FF',
    }
  })

  return <Navbar variant={mode} bg={mode} expand="md" sticky="top">
    <Navbar.Brand href="/">ANU Timetable</Navbar.Brand>
    <Navbar.Toggle />
    <Navbar.Collapse>
      <Nav className="mr-auto">
        <NavDropdown title={year}>
          {/* reverse() - years (numerical keys) are in ascending order per ES2015 spec */}
          {years.map(k => <NavDropdown.Item key={k} onClick={selectYear}>{k}</NavDropdown.Item>)}
        </NavDropdown>
        <NavDropdown title={session}>
          {sessions[year]?.map(k => <NavDropdown.Item key={k} onClick={selectSession}>{k}</NavDropdown.Item>)}
        </NavDropdown>
      </Nav>
      <TimezoneSelect theme={theme} value={timeZone} onChange={tz => setTimeZone(tz.value)}
      />
    </Navbar.Collapse>
  </Navbar>
}

export default Header