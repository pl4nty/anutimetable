import { Modal, Form, Button } from 'react-bootstrap'
import { useState } from 'react'

const SelectModal = ({ visible, title, label, options, value, multiple, inline, onChange, onHide, ...props }) => {
  const hide = () => onHide(selected)

  // if single-select, return selection as singleton array for consistency
  const singleSelect = multiple ? undefined : e => {
    setSelected([+e.target.value])
    onChange([+e.target.value])
  }

  // if multi-select, prevent clearing existing selections
  // allows multiple selections without pressing ctrl
  const multiSelect = !multiple ? undefined : e => {
    e.preventDefault()
    const newSelect = +e.target.value
    const index = selected.indexOf(newSelect)
    const newSelection = e.target.selected ? [...selected.slice(0, index), ...selected.slice(index+1)] : [...selected, newSelect]
    setSelected(newSelection)
    onChange(newSelection)
    e.target.selected = !e.target.selected
  }

  const [selected, setSelected] = useState([])

  return <Modal size="xl" centered show={visible} onHide={hide} {...props}>
    <Modal.Header closeButton>
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form inline={inline}>
        <Form.Label>{label}</Form.Label>
        <Form.Control as="select" custom multiple={multiple} defaultValue={value} onChange={singleSelect}>
          {options.map(([ key, value ]) => <option key={key} value={key} onMouseDown={multiSelect}>
            {value}
          </option>)}
        </Form.Control>
      </Form>
    </Modal.Body>
    <Modal.Footer>
      <Button variant="secondary" onClick={hide}>
        Close
      </Button>
    </Modal.Footer>
  </Modal>
}

export default SelectModal