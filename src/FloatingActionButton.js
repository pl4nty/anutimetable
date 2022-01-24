import { useState } from 'react'

import FABItem from './FABItem'
import SelectModal from './SelectModal'
import { OverlayTrigger, Button, ButtonGroup } from 'react-bootstrap'

import { RiSettings4Fill, RiCloseLine, RiMoonFill, RiSunFill, RiCalendar2Fill } from 'react-icons/ri'
import { BsCalendarWeek } from 'react-icons/bs'

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const FloatingActionButton = ({ startingDay, setStartingDay, hiddenDays, setHiddenDays, darkMode, toggleDarkMode }) => {
  const [menuOpen, setMenuOpen] = useState(false)

  const [weekStartOpen, setWeekStartOpen] = useState(false)
  const WeekStart = () => <>
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
      visible={weekStartOpen}
      title='Calendar Start of Week'
      label='The weekly calendar starts on&nbsp;'
      options={daysOfWeek}
      value={startingDay}
      inline
      onHide={selected => {
        setWeekStartOpen(false)
        setStartingDay(+selected[0])
        localStorage.setItem('startingDay', selected[0])
      }}
    />
  </>

  const HideDays = () => {
    const [hideDaysOpen, setHideDaysOpen] = useState(false)
    return <>
      <FABItem
        className='fab-action'
        title='Toggle Day Visibility'
        content={<BsCalendarWeek size='1.5em' />}
        onClick={() => {
          setHideDaysOpen(true)
          setMenuOpen(false)
        }}
      />
      <SelectModal
        visible={hideDaysOpen}
        title='Toggle Visible Days'
        label='Select days to hide:'
        options={daysOfWeek}
        value={hiddenDays}
        multiple
        onHide={selected => {
          setHideDaysOpen(false)
          setHiddenDays(selected)
          localStorage.setItem('hiddenDays', selected);
        }}
      />
    </>
  }

  const menu = props => <ButtonGroup vertical {...props}>
    <HideDays />
    <WeekStart />
    <FABItem
      className='fab-action'
      title='Toggle Dark Mode'
      content={darkMode ? <RiMoonFill size='1.5em' /> : <RiSunFill size='1.5em' />}
      onClick={toggleDarkMode}
    />
  </ButtonGroup>

  return <OverlayTrigger
    placement='top'
    trigger={['focus','click']}
    rootClose
    overlay={menu}
  >
    <Button
      variant='secondary'
      className='rounded-circle p-3'
      style={{
        position: 'fixed',
        bottom: '1em',
        right: '1em'
      }}
    >
      {menuOpen ? <RiCloseLine size='2em' /> : <RiSettings4Fill size='2em' />}
    </Button>
  </OverlayTrigger>
}

export default FloatingActionButton