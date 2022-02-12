import { forwardRef, useMemo } from 'react'

import { InputGroup } from 'react-bootstrap'
import Select, { components } from 'react-select'
import BigSelect from './BigSelect'

import Export from './Export'



export default forwardRef(({ API, state: {
  year, session, modules, selectedModules, darkMode,
  setSelectedModules,
} }, calendar) => {

  const theme = theme => ({
    ...theme,
    colors: {
      ...theme.colors,
      neutral0: darkMode ? '#101214' : '#fff',
      neutral10: darkMode ? theme.colors.neutral80 : theme.colors.neutral10,
      neutral80: darkMode ? '#fff' : '#000',
      primary25: darkMode ? '#343A40' : '#deebff',
      primary: '#42A5FF',
    }
  })

  const MultiValueLabel = props => <components.MultiValueLabel {...props}>
    <a variant="link" size="sm" target="_blank" rel="noreferrer"
      href={`http://programsandcourses.anu.edu.au/${year}/course/${props.data.value}`}
      onMouseDown={e => e.stopPropagation()} // prevent dropdown from opening on href
    >{props.data.value}</a> {/* use value (eg COMP1130) instead of label to save space */}
  </components.MultiValueLabel>

  const options = useMemo(() => {
    return Object.entries(modules).map(([id, { title }]) => ({ label: title, value: id }))
  }, [modules])
  const showExport = selectedModules.length !== 0

  return <InputGroup>
    <BigSelect
      className="form-control p-0"
      styles={{
        control: provided => ({
          ...provided,
          margin: '-1px',
          ...(showExport && {
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0
          })
        })
      }}
      isMulti
      isSearchable

      autoFocus
      // controlShouldRenderValue broken?
      blurInputOnSelect={false}
      closeMenuOnSelect
      // openMenuOnClick={false}
      // captureMenuScroll overriden by BigSelect
      // closeMenuOnScroll broken?
      backspaceRemovesValue
      escapeClearsValue
      tabSelectsValue
      
      isLoading={Object.keys(modules).length === 0}
      loadingMessage={() => 'Loading courses...'}
      noOptionsMessage={() => 'No matching courses found'}

      theme={theme}
      // formatOptionLabel={({ label, value }, { context }) => context === "value" ? value : label}
      components={{ MultiValueLabel }}
      
      defaultValue={selectedModules.map(({ title, id }) => ({ label: title, value: id }))}
      onChange={n => setSelectedModules(n.map(option => ({ ...option, id: option.value })))}
      options={options}
    />
    {/* somehow there's no NPM module for this. maybe I should write one? */}
    {showExport && <Export API={API} year={year} session={session} />}
  </InputGroup>
})
