import { useState, forwardRef } from 'react'
import { Dropdown, DropdownButton, InputGroup } from 'react-bootstrap'
import { SiApple, SiGooglecalendar, SiMicrosoftoutlook, SiMicrosoftexchange } from 'react-icons/si'
import { BsFillCalendarWeekFill, BsFillPrinterFill, BsCardImage  } from 'react-icons/bs'

import { useReactToPrint } from 'react-to-print';
import { toPng } from 'html-to-image';

const Export = forwardRef(({ API, year, session, setIsPrintView }, calendar) => {
  const [path, setPath] = useState('')
  const encoded = encodeURIComponent('http://'+path)
  const name = `ANU Timetable ${session} ${year}`
  const staticName = `${name} as of ${new Date().toLocaleDateString().replace(/(\/|\\)/g,'.')}`

  const exportImage = converter => () => {
    // can't use calendar.scrollToTime() because there's no getScollTime method - fullcalendar#5736
    const scroller = document.querySelector('td[role="presentation"]>.fc-scroller-harness>.fc-scroller')
    const { scrollTop } = scroller

    // set height to view whole timetable - should use props/class instead
    const cal = document.querySelector('.fc-view-harness')
    cal.style.minHeight = '270vh'

    converter(cal, {
      cacheBust: true
    }).then(dataUrl => {
      const link = document.createElement('a')
      link.download = `${staticName}.png`
      link.href = dataUrl
      link.click()

      // reset height and scroll position
      cal.style.minHeight = ''
      scroller.scrollTop = scrollTop
    })
  }

  return <DropdownButton
    style={{flexGrow: 1}}
    as={InputGroup.Append}
    alignRight
    title='Export'
    variant='outline-primary'
    id='export-button'
    onClick={() => setPath(`${API}/GetICS${window.location.search}`)}
  >
    <Dropdown.Item eventKey="web" target={"_blank"} rel={"noreferrer"}
      href={`webcal://${path}`}>
      <SiApple /> WebCal (eg iOS)
    </Dropdown.Item>
    <Dropdown.Item eventKey="gcal" target={"_blank"} rel={"noreferrer"}
      href={`https://www.google.com/calendar/render?cid=${encoded}`}>
      <SiGooglecalendar /> Google Calendar
    </Dropdown.Item>
    <Dropdown.Item eventKey="msol" target={"_blank"} rel={"noreferrer"}
      // undocumented OWA MSOL/AAD deeplinks. removing the 0 is supposed to work and could be necessary for some accounts
      // but in our case it drops all but the first qs param during parsing (maybe need double-encode?) and adds a 10s+ delay
      // source code - /owa/node_modules/calendar-bootstrap-config/src/routing/browseDiscoverCalendarsRouteHandler.ts
      href={`https://outlook.live.com/calendar/0/addfromweb?name=${name}&url=${encoded}`}>
      <SiMicrosoftoutlook /> Outlook.com
    </Dropdown.Item>
    <Dropdown.Item eventKey="aad" target={"_blank"} rel={"noreferrer"}
      href={`https://outlook.office.com/calendar/0/addfromweb?name=${name}&url=${encoded}`}>
      <SiMicrosoftexchange /> Office 365
    </Dropdown.Item>
    <Dropdown.Divider />
    <Dropdown.Item eventKey="ics" download={`${staticName}.ics`} href={`${window.location.protocol}//${path}`}>
      <BsFillCalendarWeekFill /> ICS file
    </Dropdown.Item>
    <Dropdown.Item eventKey="print" onClick={useReactToPrint({
      documentTitle: staticName,
      content: () => calendar.current,
      bodyClass: 'print-view',
      pageStyle: '', // suppress default styles
      onBeforeGetContent: () => {
        setIsPrintView(true)

        // updateSize() isn't a Promise, so we poll instead
        // could use the Calendar's windowResize handler prop, but it wouldn't be pretty
        const cal = document.querySelector('.fc-v-event') // TODO is this the ideal selector?
        const height = cal.clientHeight // height might not change in certain screen dimensions
        const poll = resolve => {
          if (document.querySelector('.fc-v-event').clientHeight !== height) {
            resolve()
          } else {
            setTimeout(() => poll(resolve), 300)
          }
        }
        calendar.current.getApi().updateSize()
        return new Promise(resolve => poll(resolve))
      },
      onAfterPrint: () => setIsPrintView(false)
    })}>
      <BsFillPrinterFill /> Print
    </Dropdown.Item>
    <Dropdown.Item eventKey="png" onClick={exportImage(toPng)}>
      <BsCardImage /> PNG image
    </Dropdown.Item>
  </DropdownButton>
})

export default Export
