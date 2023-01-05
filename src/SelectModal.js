import { Modal, Form, Button } from 'react-bootstrap'
import { useState } from 'react'

const SelectModal = ({ visible, title, label, options, value, multiple, inline, onChange, onHide, ...props }) => {
  const hide = () => onHide(selected)

  // if single-select, return selection as singleton array for consistency
  const singleSelect = e => {
    const options = Array.from(e.target.selectedOptions).map(o => +o.value)
    setSelected(options)
    onChange(options)
  }

  // if multi-select, prevent clearing existing selections
  // allows multiple selections without pressing ctrl
  const multiSelect = !multiple ? undefined : e => {
    e.preventDefault()
    e.stopPropagation()
    const newSelect = +e.target.value
    const index = selected.indexOf(newSelect)
    const newSelection = e.target.selected ? [...selected.slice(0, index), ...selected.slice(index+1)] : [...selected, newSelect]
    setSelected(newSelection)
    onChange(newSelection)
    e.target.selected = !e.target.selected
  }

  const [selected, setSelected] = useState([])

  // inline forms were deprecated https://github.com/react-bootstrap/react-bootstrap/commit/2113215d52308db93a0afe0104eefb63c0eeec1c
  return <Modal size="md" centered show={visible} onHide={hide} {...props}>
    <Modal.Header closeButton>
      <Modal.Title>{title}</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <Form>
        <Form.Label>{label}</Form.Label>
        <Form.Control as="select" multiple={multiple} defaultValue={value} onChange={singleSelect}>
          {options.map(([ key, value ]) => <option key={key} value={key} onPointerDown={multiSelect}>
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