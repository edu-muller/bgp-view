import React from "react";
import { format as dateFormat } from "date-fns";

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import HighchartsMap from "highcharts/modules/map";
import HighchartsMarkerClusters from "highcharts/modules/marker-clusters";

import DateFnsUtils from "@date-io/date-fns";
import { TextField, Button, FormControlLabel, Checkbox } from "@material-ui/core";
import { KeyboardDateTimePicker, MuiPickersUtilsProvider } from "@material-ui/pickers";
import { makeStyles } from "@material-ui/core/styles";

import world from "@highcharts/map-collection/custom/world.geo.json";
import ReactTable from "./ReactTable";

HighchartsMap(Highcharts);
HighchartsMarkerClusters(Highcharts);

const worldSerie = {
	name: 'World',
	borderColor: '#707070',
	nullColor: 'rgba(200, 200, 200, 0.3)',
	showInLegend: false,
}

const useStyles = makeStyles((theme) => ({
	form: {
		'&': {
			padding: '20px', 
			textAlign: 'center',
		},
		'& > *': {
			verticalAlign: 'middle',
		},
		'& .MuiTextField-root': {
			margin: theme.spacing(1),
			width: '25ch',
		},
		'& *:focus': {
			outline: 'unset',
		},
	},
	displayOptions: {
		'&': {
			textAlign: 'center',
		},
	}
}));

export default function ResourceView() {
	
	const urlApi = 'https://bgp-report.herokuapp.com/api';
	const classes = useStyles();
	const [inputResource, setInputResource] = React.useState('');
	const [appliedResource, setAppliedResource] = React.useState('');
	const [inputCollector, setInputCollector] = React.useState('');
	const [appliedCollector, setAppliedCollector] = React.useState('');
	const [inputTimestamp, setInputTimestamp] = React.useState(null);
	const [displayLabels] = React.useState(false);
	const [clusterPoints, setClusterPoints] = React.useState(false);
	const [routes, setRoutes] = React.useState(null);
	const [availableCollectors, setAvailableCollectors] = React.useState(null);
	const [inputLive, setInputLive] = React.useState(true);
	const [options, setOptions] = React.useState({
		chart: {
			map: world,
			height: 700,
			shadow: true,
			animation: false,
		},
		
		title: {
			text: "World Map"
		},
		
		subtitle: {
			text: '-',
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
			hideDelay: 0,
			pointFormat: `{point.name} - {point.geographical} ({point.countryCode})<br>Lat: {point.lat} Lon: {point.lon}`,
		},
		
		plotOptions: {
			mappoint: {
				stickyTracking: false,
				dataLabels: {
					format: displayLabels ? '{point.id}' : '',
					enabled: true,
				},
				marker: {
					symbol: 'circle',
				},
				cluster: {
					enabled: clusterPoints,
					allowOverlap: false,
					animation: {
						duration: 50,
					},
				},
			},
		},
		
		colors: ['BLACK', 'GREEN', 'BLUE', 'RED'],
		
		series: [ worldSerie ],
	});
	const inputLiveRef = React.useRef(inputLive);
	const liveUpdateRef = React.useRef(null);
	
	React.useEffect(() => {
		inputLiveRef.current = inputLive;
		if (inputLiveRef.current) updateResources({ collectorFilter: appliedCollector, resourceFilter: appliedResource, liveFilter: true, collectors: availableCollectors });
	}, [inputLive]);
	
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
			Header: "Total Prepends",
			accessor: "prepends.length",
			filter: "integer",
		},
		{
			Header: "Poisoned Routes",
			accessor: "poisonedRoutes.length",
			filter: "integer",
		},
	];
	
	const updateSeries = ({ resource, collector, timestamp, visibles, invisibles, prependeds } = {}) => {
		setOptions({
			subtitle: {
				text: [
					...(resource) ? [`<b>Resource</b>: ${resource}`] : [],
					...(collector) ? [`<b>Collector</b>: ${collector}`] : [],
					...(timestamp) ? [`<b>Timestamp</b>: ${dateFormat(timestamp, 'yyyy-MM-dd HH:mm')}`] : [],
				].join(' | ') || '-',
			},
			series: [ worldSerie, 
				{
					type: 'mappoint',
					name: `Visible (${visibles ? visibles.length : 'loading...'})`,
					data: visibles ?? [],
				}, {
					type: 'mappoint',
					name: `Visible only Prepended (${prependeds ? prependeds.length : 'loading...'})`,
					data: prependeds ?? [],
				}, {
					type: 'mappoint',
					name: `Not Visible (${invisibles ? invisibles.length : 'loading...'})`,
					data: invisibles ?? [],
				}
			]
		});
	}
	
	const search = (event) => {
		event.preventDefault();
		if (!inputResource) return;
		if (liveUpdateRef.current) clearTimeout(liveUpdateRef.current);
		let resourceFilter = inputResource, collectorFilter = inputCollector, timestampFilter = inputTimestamp, liveFilter = inputLiveRef.current;
		setAppliedResource(resourceFilter);
		setAppliedCollector(collectorFilter);
		setRoutes(undefined);
		updateSeries();
		if (timestampFilter) {
			liveFilter = false;
			setInputLive(false);
		}
		
		fetch(`${urlApi}/collectors`).then(res => res.json()).then(collectors => {
			setAvailableCollectors(collectors);
			updateResources({ collectorFilter, timestampFilter, resourceFilter, liveFilter, collectors });
		});
	}
	
	const updateResources = ({ collectorFilter, timestampFilter, resourceFilter, liveFilter, collectors }) => {
		if (!collectors?.length) return;
		fetch(`${urlApi}/resources?resources=${resourceFilter}
				${(collectorFilter) ? `&collectors=${collectorFilter}` : ''}
				${(timestampFilter) ? `&timestamp=${timestampFilter.getTime()}` : ''}
				${(liveFilter) ? `&live=${liveFilter}` : ''}`
				).then(res => res.json()).then(data => {
			process(collectors, data, { resource: resourceFilter, collector: collectorFilter });
			
			if (inputLiveRef.current) {
				liveUpdateRef.current = setTimeout(() => {
					if (inputLiveRef.current) updateResources({ collectorFilter, resourceFilter, liveFilter: true, collectors });
				}, 5000);
			}
		});
	}
	
	const process = (collectors, resources, { resource, collector} = {}) => {
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
							r.poisonedRoutes.push(...r.path.slice(j + 1, i));
						}
						r.prepends.push(current);
						break;
					}
				}
			}
		});
		
		collectors.forEach(c => {
			if (collector && !collector.split(',').includes(`${c.id}`)) return;
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
		updateSeries({ visibles, invisibles, prependeds, resource, collector, timestamp: new Date(resources.queriedAt) });
	}
	
	const onChangeClusterPoints = (event) => {
		setClusterPoints(event.target.checked);
		setOptions({
			plotOptions: {
				mappoint: {
					cluster: {
						enabled: event.target.checked,
					}
				}
			}
		});
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
				<form onSubmit={search} className={classes.form}>
					<TextField id="resource" label="Resource" value={inputResource} onChange={e => setInputResource(e.target.value)} />
					<TextField id="collector" label="Collector" value={inputCollector} onChange={e => setInputCollector(e.target.value)} />
					<MuiPickersUtilsProvider utils={DateFnsUtils}>
						<KeyboardDateTimePicker id="timestamp" label="Timestamp" value={inputTimestamp} clearable showTodayButton 
								ampm={false} format="yyyy-MM-dd HH:mm" onChange={setInputTimestamp} />
					</MuiPickersUtilsProvider>
					<Button type="submit" variant="contained">Search</Button>
				</form>
				<div className={classes.displayOptions}>
					<FormControlLabel label="Cluster Points" control={<Checkbox checked={clusterPoints} onChange={onChangeClusterPoints} />} />
					<FormControlLabel label="Live" control={<Checkbox checked={inputLive} onChange={e => setInputLive(e.target.checked)} />} />
				</div>
				<HighchartsReact highcharts={Highcharts} options={options} constructorType={"mapChart"} />
				<ReactTable data={routes ?? []} columns={columns} />
			</div>
		</React.Fragment>
	);
}