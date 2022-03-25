import { useState, forwardRef } from 'react'
import { Dropdown, DropdownButton, InputGroup } from 'react-bootstrap'
import { SiApple, SiGooglecalendar, SiMicrosoftoutlook, SiMicrosoftexchange } from 'react-icons/si'
import { BsFillCalendarWeekFill, BsFillPrinterFill, BsCardImage } from 'react-icons/bs'

import { toPng } from 'html-to-image';

// Export types
const EXPORT_DOWNLOAD = 0
const EXPORT_PRINT = 1

const Export = forwardRef(({ API, year, session, setIsPrintView }, calendar) => {
  const [path, setPath] = useState('')
  const encoded = encodeURIComponent('http://' + path)
  const name = `ANU Timetable ${session} ${year}`
  const staticName = `${name} as of ${new Date().toLocaleDateString().replace(/(\/|\\)/g, '.')}`

  const exportImage = exportType => () => {
    setIsPrintView(true)

    setTimeout(() => {
      // can't use calendar.scrollToTime() because there's no getScollTime method - fullcalendar#5736
      const scroller = document.querySelector('td[role="presentation"]>.fc-scroller-harness>.fc-scroller')
      const { scrollTop } = scroller

      // set height to view whole timetable - should use props/class instead
      const cal = document.querySelector('.fc-view-harness')

      toPng(cal, {
        cacheBust: true,
        backgroundColor: 'white',
      }).then(dataUrl => {
        if (exportType === EXPORT_DOWNLOAD) {
          const link = document.createElement('a')
          link.download = `${staticName}.png`
          link.href = dataUrl
          link.click()
        } else if (exportType === EXPORT_PRINT) {
          // Create a container iframe
          const iframe = document.createElement('iframe');

          // Hide the iframe
          iframe.style.height = 0;
          iframe.style.visibility = 'hidden';
          iframe.style.width = 0;

          // Create minimal skeleton for displaying the img
          iframe.setAttribute('srcdoc', `<html><body><img src="${dataUrl}"/></body></html>`);

          document.body.appendChild(iframe)

          // Remove print iframe after printing
          iframe.contentWindow.addEventListener('afterprint', () => {
            document.body.removeChild(iframe)
          })

          // Once the iframe has loaded ask to print it
          iframe.addEventListener('load', () => {
            iframe.contentWindow.print()
          })
        }

        // Reset to initial state
        scroller.scrollTop = scrollTop
        setIsPrintView(false)
      })
    }, 100);
  }

  return <DropdownButton
    style={{ flexGrow: 1 }}
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
    <Dropdown.Item eventKey="print" onClick={exportImage(EXPORT_PRINT)}>
      <BsFillPrinterFill /> Print
    </Dropdown.Item>
    <Dropdown.Item eventKey="png" onClick={exportImage(EXPORT_DOWNLOAD)}>
      <BsCardImage /> PNG image
    </Dropdown.Item>
  </DropdownButton>
})

export default Export
