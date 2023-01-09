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

const Header = ({ API, sessions, year, setYear, session, modules, selectedModules, setSession, setSelectedModules, darkMode, setIsPrintView, printViewCaptureFirstSection, setPrintViewCaptureFirstSection }) => {
  const selectYear = select(year, setYear, setSelectedModules, yr => {
    const s = sessions[yr]
    setSession(s?.[s.length - 1] || '')
  })
  const selectSession = select(session, setSession, setSelectedModules)
  const years = useMemo(() => Object.keys(sessions).reverse(), [sessions])
  const mode = darkMode ? 'dark' : 'light'

  return <Navbar variant={mode} bg={mode} expand="lg" sticky="top" className="px-3">
    <Navbar.Brand style={{ fontSize: '1.135rem' }} className="me-0 me-sm-2 me-lg-3">
      {/* eslint-disable-next-line react/jsx-no-target-blank */}
      <a href="https://cssa.club/" target="_blank"><img
        alt="CSSA logo"
        src="/cssa-mono.svg"
        width="28"
        height="28"
        style={darkMode ? {
          filter: 'invert(.75)'
        } : {
          filter: 'invert(.25)'
        }}
        className="d-inline-block align-top me-1"
      /></a>&nbsp;
      ANU Timetable
    </Navbar.Brand>
    <Nav className="me-auto flex-row">
      <NavDropdown title={year}>
        {/* reverse() - years (numerical keys) are in ascending order per ES2015 spec */}
        {years.map(k => <NavDropdown.Item key={k} onClick={selectYear}>{k}</NavDropdown.Item>)}
      </NavDropdown>
      <NavDropdown title={session} className="me-0 me-sm-2 me-lg-3">
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
    <Navbar.Toggle className="mb-1" />
    <Navbar.Collapse>
      <Toolbar API={API} year={year} session={session} modules={modules} selectedModules={selectedModules} darkMode={darkMode} setSelectedModules={setSelectedModules} setIsPrintView={setIsPrintView} printViewCaptureFirstSection={printViewCaptureFirstSection} setPrintViewCaptureFirstSection={setPrintViewCaptureFirstSection} />
    </Navbar.Collapse>
  </Navbar>
}

export default Header