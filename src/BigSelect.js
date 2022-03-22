// Customised react-select for rendering many items
// Source: https://github.com/JedWatson/react-select/issues/3128#issuecomment-1010558587

import React, { useState, useEffect, useRef } from "react";
import Select, { components, createFilter } from 'react-select';
import { Virtuoso } from 'react-virtuoso';

const InnerItem = React.memo(({ children }) => {
	return <>{children}</>;
});

const NUMBER_ITEMS_VISIBLE = 6;
const ITEM_HEIGHT = 60;

const getListHeight = (length) => {
	return length < NUMBER_ITEMS_VISIBLE ?
		length * ITEM_HEIGHT :
		NUMBER_ITEMS_VISIBLE * ITEM_HEIGHT;
};

const CustomMenuList = ({ options, children, getValue, hasValue, focusedOption, ...rest }) => {
	const virtuosoRef = useRef(null);
	const [initialFocus, setInitialFocus] = useState(false);
	const [option] = getValue();

	useEffect(() => {
		let wasSetTrue = false;
		if (virtuosoRef?.current) {
			let selectedOptionIndex = 0;
			// scroll to the selected option
			if (option && !initialFocus) {
				selectedOptionIndex = options.findIndex((item) => item.value === option.value);
				wasSetTrue = true;
			//scroll to the focused option
			} else if (initialFocus && focusedOption) {
				selectedOptionIndex = options.findIndex((item) => item.value === focusedOption.value);
			}
			virtuosoRef.current.scrollToIndex({
				index: selectedOptionIndex,
				align: "center",
				behavior: "auto",
			});
		}
		return () => {
			// Component update to track that we can now scroll to whatever receives focus as opposed to the currently selected option
			if (wasSetTrue) setInitialFocus(true);
		}
	}, [children, virtuosoRef, options, option, getValue, focusedOption, initialFocus]);

	return Array.isArray(children) ? (
		<Virtuoso
			ref={virtuosoRef}
			overscan={{ main: 12, reverse: 12 }}
			style={{ height: `${getListHeight(children.length)}px` }}
			totalCount={children.length}
			itemContent={(index) => <InnerItem children={children[index]} />}
		/>
	) : (
		<div>{children}</div>
	);
};

const CustomOption = ({ children, ...props }) => {
	// Remove the niceties for mouseover and mousemove to optimize for large lists
	// eslint-disable-next-line no-unused-vars
	const { onMouseMove, onMouseOver, ...rest } = props.innerProps;
	const newProps = { ...props, innerProps: rest };
	return (
		<components.Option
			{...newProps}
			className="custom-option"
		>
			{children}
		</components.Option>
	);
};

/**
 * BigSelect
 */
const BigSelect = React.memo((props) => {
	const ref = useRef(null);
	const { value, onChange, ...rest } = props;
	return (
		<Select
			ref={ref}
			{...rest}
			classNamePrefix="big-select"
			components={{
				Option: CustomOption,
				MenuList: CustomMenuList,
				...rest.components
			}}
			captureMenuScroll={false}
			filterOption={createFilter({ ignoreAccents: false })}
			value={value}
			onChange={(...args) => {
				onChange(...args);
				if (ref.current) ref.current.setState({ focusedOption: args[0] });
			}}
		/>
	);
});

export default BigSelect;