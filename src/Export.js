import { useState } from 'react'
import { Dropdown, DropdownButton, InputGroup } from 'react-bootstrap'
import { SiApple, SiGooglecalendar, SiMicrosoftoutlook, SiMicrosoftexchange } from 'react-icons/si'
import { RiCalendar2Fill } from 'react-icons/ri'
import { BsCardImage } from 'react-icons/bs'
import * as htmlToImage from 'html-to-image'
import { saveAs, cropCanvas } from './utils'

const Export = ({ API, year, session }) => {
  const [path, setPath] = useState('')
  const encoded = encodeURIComponent('http://' + path)
  const name = `ANU Timetable ${session} ${year}`

  return <DropdownButton
    as={InputGroup.Append}
    variant='outline-primary'
    title='Export'
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
    <Dropdown.Item eventKey="ics" download={`${name} as of ${new Date().toLocaleDateString().replace(/(\/|\\)/g, '.')}.ics`} href={`${window.location.protocol}//${path}`}>
      <RiCalendar2Fill /> Download ICS file
    </Dropdown.Item>
    <Dropdown.Item as="Button">
      <div onClick={exportToPng}>
        <BsCardImage /> Download PNG
      </div>
    </Dropdown.Item>
  </DropdownButton>
}

// This function exports the current timetable to a PNG
// This turned out being quite hacky for a number of reasons, html-to-image
const exportToPng = () => {
  // start screenshot at 8 am
  const startTime = 7;
  // end screenshot at 6pm (24 - timeFromEnd)
  const timeFromEnd = 6;

  // Create a temporary element and position it off the screen
  var elem = window.document.createElement('div');
  elem.style.position = 'absolute';
  elem.style.left = '-9999px';
  document.body.appendChild(elem);

  // Select the table and header elements that we want to export to an image
  const node = document.getElementsByClassName('fc-scroller fc-scroller-liquid-absolute')[0];
  const header = document.getElementsByClassName('fc-scrollgrid-section fc-scrollgrid-section-header')[0];

  // Export the header of the timetable to a canvas and append it to our temporary element
  const head = htmlToImage.toCanvas(header, { width: node.scrollWidth }).then((canvas) => {
    elem.appendChild(canvas);
  });

  // Append the body of the timetable below the header in the temp div
  const body = htmlToImage.toCanvas(node, { width: node.scrollWidth, height: node.scrollHeight }).then(function (canvas) {
    const canvasBeginOffset = 100 * startTime; // Each hour is 100px in height
    const canvasBottomOffset = node.scrollHeight - 100 * startTime - 100 * timeFromEnd;
    const canv = cropCanvas(canvas, 0, canvasBeginOffset, node.scrollWidth, canvasBottomOffset);
    elem.appendChild(canv);
  });

  // Once both have been appended to our new temporary element we can export this to a PNG
  Promise.all([head, body]).finally(() => {
    const imageHeight = (24 - timeFromEnd - startTime) * 100 + header.offsetHeight;
    htmlToImage.toPng(elem,
      {
        width: node.scrollWidth, height: imageHeight, style: {
          backgroundColor: 'white',
          // Revert the off-screen positioning of the element so it renders
          position: 'relative',
          left: 0,
        },
      }).then((image) => {
        saveAs(image, 'timetable.png'); // Save image
      });
    document.body.removeChild(elem); // Remove our temporary element
  }
  )
}

export default Export