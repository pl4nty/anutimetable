import { OverlayTrigger, Tooltip, Button } from 'react-bootstrap'

const FABItem = ({ title, content, onClick, ...props }) => {
  const overlay = <Tooltip>{title}</Tooltip>
  
  return <OverlayTrigger placement='left' overlay={overlay} trigger={['hover', 'click']} {...props}>
    <Button className='fab-action' variant='primary' onClick={onClick} >
      {content}
    </Button>
  </OverlayTrigger>
}

export default FABItem