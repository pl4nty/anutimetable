import { useState } from 'react'

import FABAction from './FABAction'
import SelectModal from './SelectModal'
import { Button, Modal } from 'react-bootstrap'

import { RiSettings4Fill, RiCloseLine, RiMoonFill, RiSunFill, RiCalendar2Fill } from 'react-icons/ri'
import { MdRemoveRedEye } from 'react-icons/md'
import { BsCalendarWeek, BsClock } from 'react-icons/bs'
import TimezoneSelect from 'react-timezone-select'

// [["0","Sunday"]...]
const daysOfWeek = Object.entries(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])

const WeekStartAction = ({ setMenuOpen, setWeekStart, weekStart, hiddenDays }) => {
  const [weekStartOpen, setWeekStartOpen] = useState(false)
  return <>
    <FABAction
      className='fab-action'
      title='Starting Day of Week'
      content={<RiCalendar2Fill size='1.5em' />}
      onClick={() => {
        setWeekStartOpen(true)
        setMenuOpen(false)
      }}
    />
    <SelectModal
      title='Calendar Start of Week'
      label='The weekly calendar starts on&nbsp;'
      visible={weekStartOpen}
      options={daysOfWeek.filter((_, index) => !hiddenDays.includes(index))}
      value={weekStart}
      inline
      onChange={selected => {
        if (selected.length) {
          setWeekStart(+selected[0])
          localStorage.setItem('weekStart', selected[0])
        }
      }}
      onHide={() => setWeekStartOpen(false)}
    />
  </>
}

const HiddenDaysAction = ({ setMenuOpen, setHiddenDays, hiddenDays }) => {
  const [hiddenDaysOpen, setHiddenDaysOpen] = useState(false)
  return <>
    <FABAction
      className='fab-action'
      title='Toggle Day Visibility'
      content={<BsCalendarWeek size='1.25em' className='m-1' />}
      onClick={() => {
        setHiddenDaysOpen(true)
        setMenuOpen(false)
      }}
    />
    <SelectModal
      title='Toggle Visible Days'
      label='Select days to hide:'
      visible={hiddenDaysOpen}
      options={daysOfWeek}
      value={hiddenDays}
      multiple
      onChange={selected => {
        setHiddenDays(selected)
        localStorage.setItem('hiddenDays', selected)
      }}
      onHide={() => setHiddenDaysOpen(false)}
    />
  </>
}


const TimeZoneAction = ({ setMenuOpen, setTimeZone, timeZone, darkMode }) => {
  const [timeZoneOpen, setTimeZoneOpen] = useState(false)

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

  return <>
    <FABAction
      className='fab-action'
      title='Change Timezone'
      content={<BsClock size='1.25em' className='m-1' />}
      onClick={() => {
        setTimeZoneOpen(true)
        setMenuOpen(false)
      }}
    />

    <Modal size="xl" centered show={timeZoneOpen} onHide={() => setTimeZoneOpen(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Change the timezone</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <TimezoneSelect theme={theme} value={timeZone} onChange={tz => setTimeZone(tz.value)} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setTimeZoneOpen(false)}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  </>
}


const DarkModeAction = ({ darkMode, toggleDarkMode }) => <FABAction
  title='Toggle Dark Mode'
  content={darkMode ? <RiMoonFill size='1.5em' /> : <RiSunFill size='1.5em' />}
  onClick={toggleDarkMode}
/>

const HiddenOccurrencesAction = ({ setMenuOpen, hidden, setHiddenEvents }) => <FABAction
  title={`Show ${hidden.length} Hidden Event${hidden.length > 1 ? 's' : ''}`}
  content={<MdRemoveRedEye size='1.5em' />}
  onClick={() => {
    setHiddenEvents([])
    setMenuOpen(false)
  }}
/>

const FloatingActionButton = ({ weekStart, setWeekStart, hiddenDays, setHiddenDays, darkMode, toggleDarkMode, hidden, setHiddenEvents, timeZone, setTimeZone }) => {
  const [menuOpen, setMenuOpen] = useState(false)
  return <div
    className={'fab' + (menuOpen ? ' fab--open' : '')}
    onMouseEnter={() => setMenuOpen(true)}
    onMouseLeave={() => setMenuOpen(false)}
  >
    <Button
      variant='secondary'
      className='fab-button'
      onClick={() => setMenuOpen(!menuOpen)}
    >
      {menuOpen ? <RiCloseLine size='2em' /> : <RiSettings4Fill size='2em' />}
    </Button>
    <div className='fab-actions'>
      <WeekStartAction {...{ setMenuOpen, weekStart, setWeekStart, hiddenDays }} />
      <HiddenDaysAction {...{ setMenuOpen, hiddenDays, setHiddenDays }} />
      <TimeZoneAction {...{ setMenuOpen, timeZone, setTimeZone, darkMode }} />
      <DarkModeAction {...{ darkMode, toggleDarkMode }} />
      {hidden.length ? <HiddenOccurrencesAction {...{ setMenuOpen, hidden, setHiddenEvents }} /> : <></>}
    </div>
  </div>
}

export default FloatingActionButton