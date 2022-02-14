import { useState } from 'react'

import FABAction from './FABAction'
import SelectModal from './SelectModal'
import { Button } from 'react-bootstrap'

import { RiSettings4Fill, RiCloseLine, RiMoonFill, RiSunFill, RiCalendar2Fill } from 'react-icons/ri'
import { MdRemoveRedEye } from 'react-icons/md'
import { BsCalendarWeek } from 'react-icons/bs'

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

const FloatingActionButton = ({ weekStart, setWeekStart, hiddenDays, setHiddenDays, darkMode, toggleDarkMode, hidden, setHiddenEvents }) => {
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
      <DarkModeAction {...{ darkMode, toggleDarkMode }} />
      {hidden.length ? <HiddenOccurrencesAction {...{ setMenuOpen, hidden, setHiddenEvents }} /> : <></>}
    </div>
  </div>
}

export default FloatingActionButton