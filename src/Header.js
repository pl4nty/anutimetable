import { Nav, Navbar, NavDropdown } from 'react-bootstrap'
import Toolbar from './Toolbar'

import { useMemo } from 'react'

const select = (state, setState, setModules, callback) => e => {
  const val = e.target.text
  if (val !== state) {
    setModules([])
    setState(val)
    if (callback) callback(val)
  }
}

const Header = ({ API, timetableState}) => {
  let {sessions, year, setYear, session, setSession, setSelectedModules, darkMode} = timetableState
  const selectYear = select(year, setYear, setSelectedModules, yr => {
    const s = sessions[yr]
    setSession(s?.[s.length-1] || '')
  })
  const selectSession = select(session, setSession, setSelectedModules)
  const years = useMemo(() => Object.keys(sessions).reverse(), [sessions])
  const mode = darkMode ? 'dark' : 'light'

  return <Navbar variant={mode} bg={mode} expand="md" sticky="top">
    <Navbar.Brand>
      {/* eslint-disable-next-line react/jsx-no-target-blank */}
      <a href="https://cssa.club/" target="_blank"><img
        alt="CSSA logo"
        src="/cssa-mono.svg"
        
        width="30"
        height="30"
        style={darkMode ? {
          filter: 'invert(.75)'
        } : {
          filter: 'invert(.25)'
        }}
        className="d-inline-block align-top mr-1"
      /></a>{' '}
      ANU Timetable
    </Navbar.Brand>
    <Navbar.Toggle />
    <Navbar.Collapse>
      <Nav className="mr-auto flex-row">
        <NavDropdown title={year} className="mr-3">
          {/* reverse() - years (numerical keys) are in ascending order per ES2015 spec */}
          {years.map(k => <NavDropdown.Item key={k} onClick={selectYear}>{k}</NavDropdown.Item>)}
        </NavDropdown>
        <NavDropdown title={session}>
          {sessions[year]?.map(k => <NavDropdown.Item key={k} onClick={selectSession}>{k}</NavDropdown.Item>)}
        </NavDropdown>
        {/* <NavDropdown title="About">
          <NavDropdown.Item href="/contributors.html">
            Contributors
          </NavDropdown.Item>
          <NavDropdown.Item href="https://forms.office.com/r/sZnsxtsh2F" target="_blank" rel="noreferrer">
            Feedback
          </NavDropdown.Item>
        </NavDropdown> */}
      </Nav>
      <Toolbar API={API} timetableState={timetableState} />
    </Navbar.Collapse>
  </Navbar>
}

export default Header