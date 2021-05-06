// Reference https://medium.com/@blaiseiradukunda/react-table-7-tutorial-3d8ba6ac8b16
import React from "react";
import { useTable, useSortBy, useFilters, useFlexLayout, useResizeColumns } from "react-table";
import { Form } from "react-bootstrap";

const CustomInput = (props) => {
	let { placeholder, name, value, onChange = () => null } = props;
	return (
		<Form.Group>
			<Form.Control name={name} placeholder={placeholder}
				value={value ? value : ""} onChange={onChange} />
		</Form.Group>
	);
};

const ColumnFilter = ({ column: { filterValue, setFilter, filter } }) => {
	return (
		<CustomInput
			value={filterValue || ""}
			onChange={e => {
				setFilter(e.target.value || undefined);
			}}
			placeholder={`Search ${filter ? filter : ""}...`}
		/>
	);
};

const ReactTable = ({ columns, data }) => {
	const filterTypes = {
		integer: (rows, id, filterValue) => {
			return rows.filter(row => {
				const rowValue = row.values[id];
				return rowValue !== undefined &&
					Number(filterValue) === rowValue;
			});
		},
		text: (rows, id, filterValue) => {
			return rows.filter(row => {
				const rowValue = row.values[id];
				return rowValue !== undefined
					? String(rowValue)
						.toLowerCase()
						.startsWith(String(filterValue).toLowerCase())
					: true;
			});
		},
		integerArray: (rows, id, filterValue) => {
			return rows.filter(row => {
				const rowValue = row.values[id];
				return !!rowValue &&
					rowValue.includes(Number(filterValue));
			});
		},
		stringMatchArray: (rows, id, filterValue) => {
			return rows.filter(row => {
				const rowValue = row.values[id];
				return !!rowValue &&
					rowValue.some(c => RegExp(filterValue).test(c));
			});
		},
	};
	const defaultColumn = React.useMemo(() => ({
		Filter: ColumnFilter,
		minWidth: 40,
		maxWidth: 400
	}), [])
	const {
		getTableProps,
		getTableBodyProps,
		headerGroups,
		rows,
		prepareRow,
	} = useTable(
		{
			columns,
			data,
			defaultColumn,
			filterTypes
		},
		useFilters,
		useSortBy,
		useFlexLayout,
		useResizeColumns
	);
	return (
		<table {...getTableProps()}>
			<thead>
				{headerGroups.map(headerGroup => (
					<tr {...headerGroup.getHeaderGroupProps()}>
						{headerGroup.headers.map((column, i) => {
							const {
								render,
								getHeaderProps,
								isSorted,
								isSortedDesc,
								getSortByToggleProps,
								canFilter,
								isResizing,
								getResizerProps
							} = column;
							const extraClass = isSorted
								? isSortedDesc
									? "desc"
									: "asc"
								: "";
							const { onClick, ...rest } = getHeaderProps(getSortByToggleProps())
							return (
								<th key={`th-${i}`} className={`${extraClass} th`} {...rest} >
									<div onClick={onClick}>
										{render("Header")}
									</div>
									<div {...getResizerProps()} className={`resizer ${isResizing ? 'isResizing' : ''}`} />
									<div>{canFilter ? render("Filter") : null}</div>
								</th>
							);
						})}
					</tr>
				))}
			</thead>
			<tbody {...getTableBodyProps()}>
				{rows.map((row, i) => {
					prepareRow(row);
					return (
						<tr {...row.getRowProps()}>
							{row.cells.map(cell => {
								return (
									<td {...cell.getCellProps()}>{cell.render("Cell")}</td>
								);
							})}
						</tr>
					);
				})}
			</tbody>
		</table>
	);
};

export default ReactTable;