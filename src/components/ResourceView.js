import React from "react";

import Highcharts from "highcharts";
import HighchartsMap from "highcharts/modules/map";
import HighchartsReact from "highcharts-react-official";

import DateFnsUtils from "@date-io/date-fns";
import { TextField, Button } from '@material-ui/core';
import { KeyboardDateTimePicker, MuiPickersUtilsProvider } from "@material-ui/pickers";
import { makeStyles } from '@material-ui/core/styles';

//import mapData from "@highcharts/map-collection/custom/world.geo.json";
import mapData from "../maps/world";
import ReactTable from "./ReactTable";

HighchartsMap(Highcharts);

const mapSerie = {
	name: 'World',
	mapData: mapData,
	borderColor: '#707070',
	nullColor: 'rgba(200, 200, 200, 0.3)',
	showInLegend: false,
}

const useStyles = makeStyles((theme) => ({
	form: {
		'& > *': {
			verticalAlign: 'middle',
		},
		'& .MuiTextField-root': {
			margin: theme.spacing(1),
			width: '25ch',
		},
		'& *:focus': {
			outline: 'unset',
		}
	},
}));

export default function ResourceView() {
	
	const urlApi = 'https://bgp-report.herokuapp.com/api';
	const classes = useStyles();
	const [resource, setResource] = React.useState('');
	const [appliedResource, setAppliedResource] = React.useState('');
	const [collector, setCollector] = React.useState('');
	const [appliedCollector, setAppliedCollector] = React.useState('');
	const [timestamp, setTimestamp] = React.useState(null);
	const [appliedTimestamp, setAppliedTimestamp] = React.useState(null);
	const [displayLabels, setDisplayLabels] = React.useState(false);
	const [routes, setRoutes] = React.useState(null);
	// const [visibles, setVisibles] = React.useState(null);
	// const [invisibles, setInvisibles] = React.useState(null);
	// const [prependeds, setPrependeds] = React.useState(null);
	
	const [options, setOptions] = React.useState({
		chart: {
			height: 700
		},
		
		title: {
			text: "World Map"
		},
		
		subtitle: {
			text: [
				...(appliedResource) ? [`Resource: ${appliedResource}`] : [],
				...(appliedCollector) ? [`Collector: ${appliedCollector}`] : [],
				...(appliedTimestamp) ? [`Timestamp: ${appliedTimestamp}`] : [],
			].join(' | ') || '-',
		},
		
		legend: {
			align: 'left',
			layout: 'vertical',
			floating: true,
		},
		
		mapNavigation: {
			enabled: true,
		},
		
		tooltip: {
			animation: false,
			formatter: function () {
				return `${this.point.name} - ${this.point.geographical} (${this.point.countryCode})` + (
					this.point.lat ? '<br>Lat: ' + this.point.lat + ' Lon: ' + this.point.lon : '');
			}
		},
		
		series: [ mapSerie ],
	});
	
	const columns = [
		{
			Header: "Collector",
			accessor: "collector",
			filter: "integer",
		},
		{
			Header: "Path",
			accessor: "path",
			filter: "integerArray",
			Cell: cellInfo => <PathSpan values={cellInfo.value} rowData={cellInfo.row.original} />,
		},
		{
			Header: "Path Length",
			accessor: "path.length",
			filter: "integer",
		},
		{
			Header: "Communities",
			accessor: "community",
			filter: "stringMatchArray",
			Cell: ({ cell: { value } }) => <CommunitySpan values={value} />,
		},
		{
			Header: "Origin Prepends",
			accessor: "originPrepends.length",
			filter: "integer",
		},
		{
			Header: "Poisoned Routes",
			accessor: "poisonedRoutes.length",
			filter: "integer",
		},
		{
			Header: "Total Prepends",
			accessor: "prepends.length",
			filter: "integer",
		}
	];
	
	const updateSeries = ({ visibles, invisibles, prependeds } = {}) => {
		setOptions({
			series: [ mapSerie
				, {
					name: `Visível (${visibles?.length ?? 0})`,
					type: 'mappoint',
					marker: {
						fillColor: 'GREEN',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: displayLabels,
					},
					data: visibles,
				}, {
					name: `Visível com Prepend (${prependeds?.length ?? 0})`,
					type: 'mappoint',
					marker: {
						fillColor: 'BLUE',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: displayLabels,
					},
					data: prependeds,
				}, {
					name: `Não Visível (${invisibles?.length ?? 0})`,
					type: 'mappoint',
					marker: {
						fillColor: 'RED',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: displayLabels,
					},
					data: invisibles,
				}
			]
		});
	}
	
	const search = (event) => {
		event.preventDefault();
		if (!resource) return;
		let applied = resource;//-= REVER como corrigir.
		setAppliedResource(resource);
		setAppliedCollector(collector);
		setAppliedTimestamp(timestamp);
		setRoutes(undefined);
		updateSeries();
		
		fetch(`${urlApi}/collectors`).then(res => res.json()).then(collectors => {
			if (!collectors?.length) return;
			let collectorFilter = (collector) ? `&collectors=${collector}` : '';
			let timestampFilter = (timestamp) ? `&timestamp=${timestamp.getTime()}` : '';
			fetch(`${urlApi}/resources?resources=${applied}${collectorFilter}${timestampFilter}`).then(res => res.json()).then(data => {
				process(collectors, data);
			});
		});
	}
	
	const process = (collectors, resources) => {
		let visibles = [], invisibles = [], prependeds = [];
		resources.routes.forEach(r => {
			r.prepends = [];
			r.originPrepends = [];
			r.poisonPrepends = [];
			r.poisonedRoutes = [];
			let origin = r.path[r.path.length - 1];
			for (let i = r.path.length - 1; i >= 0; i--) {
				let current = r.path[i];
				for (let j = i - 1; j >= 0; j--) {
					if (r.path[j] === current) {
						if (current === origin) r.originPrepends.push(current);
						if (j < i - 1) {
							r.poisonPrepends.push(current);
							r.poisonedRoutes.concat(r.path.slice(j, i));
						}
						r.prepends.push(current);
						break;
					}
				}
			}
		});
		
		collectors.forEach(c => {
			if (appliedCollector && !appliedCollector.split(',').includes(`${c.id}`)) return;
			let v = resources.routes.filter(r => r.collector === c.id);
			(!v.length ? invisibles : v.some(r => !r.originPrepends.length) ? visibles : prependeds).push(
				{
					id: c.id,
					name: c.name,
					geographical: c.location.geographical,
					topological: c.location.topological,
					countryCode: c.location.countryCode,
					lat: c.location.latitude,
					lon: c.location.longitude,
				}
			);
		});
		setRoutes(resources.routes);
		updateSeries({ visibles, invisibles, prependeds });
	}
	
	const PathSpan = ({ values, rowData }) => {
		return (
			<>
				{values.map((tag, idx) => {
					let className = [
						"tag",
						"path",
						...(rowData.prepends.includes(tag)) ? ["prepend"] : [],
						...(rowData.originPrepends.includes(tag)) ? ["origin-prepend"] : [],
						...(rowData.poisonPrepends.includes(tag)) ? ["poisoner"] : [],
						...(rowData.poisonedRoutes.includes(tag)) ? ["poisoned"] : [],
					]
					return (
						<span key={idx} className={className.join(" ")}>
							{tag}
						</span>
					);
				})}
			</>
		);
	};
	
	const CommunitySpan = ({ values }) => {
		return (
			<>
				{values.map((tag, idx) => {
					return (
						<span key={idx} className={"tag community"}>
							{tag}
						</span>
					);
				})}
			</>
		);
	};
	
	return (
		<React.Fragment>
			<div>
				<form onSubmit={search} className={classes.form} style={{padding: '20px', textAlign: 'center'}} >
					<TextField id="resource" label="Resource" value={resource} onChange={e => setResource(e.target.value)} />
					<TextField id="collector" label="Collector" value={collector} onChange={e => setCollector(e.target.value)} />
					<MuiPickersUtilsProvider utils={DateFnsUtils}>
						<KeyboardDateTimePicker id="timestamp" label="Timestamp" value={timestamp} clearable showTodayButton 
								ampm={false} format="dd/MM/yyyy HH:mm" onChange={setTimestamp} />
					</MuiPickersUtilsProvider>
					<Button type="submit" variant="contained">Search</Button>
				</form>
				<HighchartsReact highcharts={Highcharts} options={options} constructorType={"mapChart"} />
				<ReactTable data={routes ?? []} columns={columns} />
			</div>
		</React.Fragment>
	);
}