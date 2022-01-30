import { Modal, Form, Button } from 'react-bootstrap'
import { useState } from 'react'

const SelectModal = ({ visible, title, label, options, value, multiple, inline, onChange, onHide, ...props }) => {
  const getValues = options => [].slice.call(options).map(item => +item.value)
  const hide = () => onHide(getValues(selected))

  // if single-select, return selection as singleton array for consistency
  const singleSelect = multiple ? undefined : e => {
    setSelected([e.target])
    onChange(getValues(selected))
  }

  // if multi-select, prevent clearing existing selections
  // allows multiple selections without pressing ctrl
  const multiSelect = !multiple ? undefined : e => {
    e.preventDefault()
    setSelected(e.target.parentNode.selectedOptions)
    e.target.selected = !e.target.selected
    onChange(getValues(selected))
  }

  const [selected, setSelected] = useState([])

  return <Modal size='xl' centered show={visible} onHide={hide} {...props}>
    <Modal.Header closeButton>
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form inline={inline}>
        <Form.Label>{label}</Form.Label>
        <Form.Control as='select' custom multiple={multiple} defaultValue={value} onChange={singleSelect}>
          {options.map((option, index) => <option key={index} value={index} onMouseDown={multiSelect}>
            {option}
          </option>)}
        </Form.Control>
      </Form>
    </Modal.Body>
    <Modal.Footer>
      <Button variant='secondary' onClick={hide}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
}

export default SelectModal