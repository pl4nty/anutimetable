import { useState } from 'react'

import FABItem from './FABItem'
import SelectModal from './SelectModal'
import { Button } from 'react-bootstrap'

import { RiSettings4Fill, RiCloseLine, RiMoonFill, RiSunFill, RiCalendar2Fill } from 'react-icons/ri'
import { MdRemoveRedEye } from 'react-icons/md'
import { BsCalendarWeek } from 'react-icons/bs'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const WeekStart = ({ setMenuOpen, setWeekStart, weekStart }) => {
  const [weekStartOpen, setWeekStartOpen] = useState(false)
  return <>
    <FABItem
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
      options={daysOfWeek}
      value={weekStart}
      inline
      onHide={selected => {
        setWeekStartOpen(false)
        setWeekStart(+selected[0])
        localStorage.setItem('weekStart', selected[0])
      }}
    />
  </>
}

const HiddenDays = ({ setMenuOpen, setHiddenDays, hiddenDays }) => {
  const [hiddenDaysOpen, setHiddenDaysOpen] = useState(false)
  return <>
    <FABItem
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
      onHide={selected => {
        setHiddenDaysOpen(false)
        setHiddenDays(selected)
        localStorage.setItem('hiddenDays', selected);
      }}
    />
  </>
}

const FloatingActionButton = ({ weekStart, setWeekStart, hiddenDays, setHiddenDays, darkMode, toggleDarkMode, hiddenOccurrences, setHiddenOccurrences }) => {
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
      <WeekStart {...{setMenuOpen, weekStart, setWeekStart}} />
      <HiddenDays {...{setMenuOpen, hiddenDays, setHiddenDays}} />
      <FABItem
        title='Toggle Dark Mode'
        content={darkMode ? <RiMoonFill size='1.5em' /> : <RiSunFill size='1.5em' />}
        onClick={toggleDarkMode}
      />
      {hiddenOccurrences.length ? <FABItem
        title={`Show ${hiddenOccurrences.length} Hidden Event${hiddenOccurrences.length > 1 ? 's' : ''}`}
        // content={<svg viewBox="0 0 24 24" width='24' height='24'><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="rgba(255,255,255,1)"></path></svg>}
        content={<MdRemoveRedEye size='1.5em' />}
        onClick={() => setHiddenOccurrences([])}
      /> : <></>}
    </div>
  </div>
}

export default FloatingActionButton