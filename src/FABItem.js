import { OverlayTrigger, Tooltip, Button } from 'react-bootstrap'

const FABItem = ({ title, content, onClick, ...props }) => {
  const overlay = <Tooltip>{title}</Tooltip>
  
  return <OverlayTrigger placement='left' overlay={overlay} trigger='hover' {...props}>
    <Button className='rounded-circle m-0 p-2 mb-2 align-items-center' style={{ width: '105%'}} variant='primary' onClick={onClick} >
      {content}
    </Button>
  </OverlayTrigger>
}

export default FABItem