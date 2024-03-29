import { useCallback, useMemo } from 'react'

import { InputGroup } from 'react-bootstrap'
import { components } from 'react-select'
import BigSelect from './BigSelect'

import Export from './Export'
import { stringToColor } from './utils'

export default function Toolbar({ API,
  year, session, modules, selectedModules, darkMode,
  setSelectedModules, setIsPrintView, printViewCaptureFirstSection, setPrintViewCaptureFirstSection
}) {
  const theme = useCallback(theme => ({
    ...theme,
    colors: {
      ...theme.colors,
      neutral0: darkMode ? '#101214' : '#fff',
      neutral10: darkMode ? theme.colors.neutral80 : theme.colors.neutral10,
      neutral80: darkMode ? '#fff' : '#000',
      primary25: darkMode ? '#343A40' : '#deebff',
      primary: '#42A5FF',
      primary50: darkMode ? '#343A40' : '#deebff',
    }
  }), [darkMode])

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

  const styles = useMemo(() => {
    return {
      control: provided => ({
        ...provided,
        margin: '-1px',
        ...(showExport && {
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0
        }),
      }),

      container: provided => ({
        ...provided,
        flexGrow: 10,
      }),

      multiValue: (provided, { data }) => ({
        ...provided,
        backgroundColor: stringToColor(data.value),
      }),

      multiValueLabel: provided => ({
        ...provided,
        a: {
          color: 'white'
        }
      }),

      multiValueRemove: provided => ({
        ...provided,
        color: 'white',
      }),

      option: provided => ({
        ...provided,
        ':hover': {
          transitionDelay: '30ms',
          background: provided[':active'].backgroundColor
        },
      }),
    }
  }, [showExport])

  const value = useMemo(() => selectedModules.map(({ title, id }) => ({ label: title, value: id })), [selectedModules])

  const onChange = useCallback(n => setSelectedModules(n.map(option => ({ ...option, id: option.value }))), [setSelectedModules]);

  return <InputGroup /* style={{ maxWidth: 'none !important', /*flexBasis: 'fit-content' }} */>
    <BigSelect
      className="border"
      styles={styles}
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
      loadingMessage={loadingMessage}
      noOptionsMessage={noOptionsMessage}

      theme={theme}
      // formatOptionLabel={({ label, value }, { context }) => context === "value" ? value : label}
      components={{ MultiValueLabel }}

      value={value}
      onChange={onChange}
      options={options}
    />
    {/* somehow there's no NPM module for this. maybe I should write one? */}
    {showExport && <Export API={API} year={year} session={session} setIsPrintView={setIsPrintView} printViewCaptureFirstSection={printViewCaptureFirstSection} setPrintViewCaptureFirstSection={setPrintViewCaptureFirstSection} />}
  </InputGroup >
}

const loadingMessage = () => 'Loading courses...';
const noOptionsMessage = () => 'No matching courses found';
