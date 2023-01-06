import { useState, forwardRef } from 'react'
import { Dropdown, DropdownButton, InputGroup } from 'react-bootstrap'
import { SiApple, SiGooglecalendar, SiMicrosoftoutlook, SiMicrosoftexchange } from 'react-icons/si'
import { BsFillCalendarWeekFill, BsFillPrinterFill, BsCardImage } from 'react-icons/bs'

import { toPng } from 'html-to-image';

// Export types
const EXPORT_DOWNLOAD = 0
const EXPORT_PRINT = 1


const Export = forwardRef(({ API, year, session, setIsPrintView, setPrintViewCaptureFirstSection }, calendar) => {
  const [path, setPath] = useState('')
  const encoded = encodeURIComponent('http://' + path)

  const name = `ANU Timetable ${session} ${year}`
  const staticName = `${name} as of ${new Date().toLocaleDateString().replace(/(\/|\\)/g, '.')}`

  const exportDownload = (exportType, image1, image2) => {
    if (exportType === EXPORT_DOWNLOAD) {
      const linka = document.createElement('a')
      linka.download = `${staticName}.png`
      linka.href = image1
      linka.click()
      if (image2) {
        const linkb = document.createElement('a')
        linkb.download = `${staticName}-2.png`
        linkb.href = image2
        linkb.click()
      }
    } else if (exportType === EXPORT_PRINT) {
      // Create a container iframe
      const iframe = document.createElement('iframe');

      // Hide the iframe
      iframe.style.height = 0;
      iframe.style.visibility = 'hidden';
      iframe.style.width = 0;

      // Create minimal skeleton for displaying the img
      let html = !!image2 ? `<img src="${image1}"/><img src="${image2}"/>` : `<img src="${image1}"/>`

      iframe.setAttribute('srcdoc', `<html><body>${html}</body></html>`);

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
  }


  const exportImage = exportType => () => {
    setIsPrintView(true)
    setPrintViewCaptureFirstSection(true)

    // Globals are needed as I can't work out how to update react state from a timeout
    window.secondPictureNeeded = false

    setTimeout(() => {
      // can't use calendar.scrollToTime() because there's no getScollTime method - fullcalendar/fullcalendar#5736
      const scroller = document.querySelector('td[role="presentation"]>.fc-scroller-harness>.fc-scroller')
      const { scrollTop } = scroller

      // hack to force calendar resize, since passing the ref is a pain
      window.calendar.current.getApi().updateSize()

      // set height to view whole timetable - should use props/class instead
      const cal = document.querySelector('.fc-view-harness')

      toPng(cal, {
        cacheBust: true,
        backgroundColor: 'white',
      }).then(image1 => {
        if (window.secondPictureNeeded) {
          // Tell the calendar to render the second picture
          setPrintViewCaptureFirstSection(false)

          setTimeout(() => {
            toPng(cal, {
              cacheBust: true,
              backgroundColor: 'white',
            }).then(image2 => {
              exportDownload(exportType, image1, image2)

              // Reset to initial state
              scroller.scrollTop = scrollTop
              setIsPrintView(false)
            })
          }, 50)
        } else {
          exportDownload(exportType, image1, null)

          // Reset to initial state
          scroller.scrollTop = scrollTop
          setIsPrintView(false)
        }
      })
    }, 100);
  }

  return <DropdownButton
    style={{ flexGrow: 1 }}
    as={InputGroup.Append}
    align='end'
    title='Export'
    variant='outline-secondary'
    id='export-button'
    onToggle={() => setPath(`${API}/GetICS${window.location.search}`)}
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
    <Dropdown.Item eventKey="png" onClick={exportImage(EXPORT_DOWNLOAD)}>
      <BsCardImage /> PNG image
    </Dropdown.Item>
    <Dropdown.Item eventKey="print" onClick={exportImage(EXPORT_PRINT)}>
      <BsFillPrinterFill /> Print
    </Dropdown.Item>
  </DropdownButton>
})

export default Export
