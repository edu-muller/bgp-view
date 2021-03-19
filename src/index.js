import React from "react";
import { render } from "react-dom";
import "./App.css";

import Highcharts from "highcharts";
import HighchartsMap from "highcharts/modules/map";
import HighchartsReact from "highcharts-react-official";

//-= import map from "@highcharts/map-collection/custom/world.geo.json";
import mapData from "./maps/world";
import ReactTable from "./components/ReactTable";

HighchartsMap(Highcharts);

class MapaPrefixos extends React.Component {
	
	urlApi = 'https://bgp-report.herokuapp.com/api';
	
	constructor(props) {
		super(props);
		this.chartRef = React.createRef();
		this.state = {
			prefix: '',
			collector: '',
			timestamp: '',
			displayLabels: false,
		}
		
		this.handleChange = this.handleChange.bind(this);
		this.search = this.search.bind(this);
		this.onFilteredChangeCustom = this.onFilteredChangeCustom.bind(this);
		
		this.options = {
			chart: {
				height: 700
			},
		
			title: {
				text: "Mapa Mundi"
			},
		
			subtitle: {
				text: "Visibilidade do prefixo"
			},
		
			legend: {
				align: 'left',
				layout: 'vertical',
				floating: true
			},
		
			mapNavigation: {
				enabled: true,
			},
		
			tooltip: {
				formatter: function () {
					return `${this.point.name} - ${this.point.geographical} (${this.point.countryCode})` + (
						this.point.lat ?
							'<br>Lat: ' + this.point.lat + ' Lon: ' + this.point.lon : ''
					);
				}
			},
		
			series: [
				{
					name: 'World',
					mapData: mapData,
					borderColor: '#707070',
					nullColor: 'rgba(200, 200, 200, 0.3)',
					showInLegend: false,
				}, {
					name: 'Não Visível',
					type: 'mappoint',
					marker: {
						fillColor: 'RED',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: this.state.displayLabels,
					},
				}, {
					name: 'Visível',
					type: 'mappoint',
					marker: {
						fillColor: 'GREEN',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: this.state.displayLabels,
					},
				}, {
					name: 'Visível com Origin Prepend',
					type: 'mappoint',
					marker: {
						fillColor: 'BLUE',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: this.state.displayLabels,
					},
				}
			]
		};
	}
	
	setData(invisibles, visibles, prependeds) {
		this.chartRef.current.chart.series[1].setData(visibles, true);
		this.chartRef.current.chart.series[2].setData(prependeds, true);
		this.chartRef.current.chart.series[3].setData(invisibles, true);
		this.setState({invisibles: invisibles, visibles: visibles, prependeds: prependeds});
	}
	
	onFilteredChangeCustom(value, accessor) {
		let filtered = this.state.filtered ?? [];
		let insertNewFilter = 1;

		if (filtered.length) {
			filtered.forEach((filter, i) => {
				if (filter["id"] === accessor) {
					if (value === "" || !value.length) filtered.splice(i, 1);
					else filter["value"] = value;

					insertNewFilter = 0;
				}
			});
		}

		if (insertNewFilter) {
			filtered.push({ id: accessor, value: value });
		}

		this.setState({ filtered: filtered });
	}
	
	handleChange(event) {
		const target = event.target;
		const value = target.type === 'checkbox' ? target.checked : target.value;
		const name = target.name;

		this.setState({
			[name]: value
		});
	}
	
	search(event) {
		event.preventDefault();
		if (!this.state.prefix) return;
		this.setData(undefined, undefined, undefined);
		
		fetch(`${this.urlApi}/collectors`).then(res => res.json()).then(collectors => {
			if (!collectors?.length) return;
			
			let collectorFilter = (this.state.collector) ? `&collectors=${this.state.collector}` : '';
			let timestampFilter = (this.state.timestamp) ? `&timestamp=${this.state.timestamp}` : '';
			
			fetch(`${this.urlApi}/resources?resources=${this.state.prefix}${collectorFilter}${timestampFilter}`).then(res => res.json()).then(data => {
				this.process(collectors, data);
			});
		});
	}
	
	process(collectors, resources) {
		let visibles = [], invisibles = [], prependeds = [], routes = resources.routes;
		routes.forEach(r => {
			r.prepends = [];
			r.originPrepends = [];
			r.poisonPrepends = [];
			let origin = r.path[r.path.length - 1];
			for (let i = r.path.length - 1; i >= 0; i--) {
				let current = r.path[i];
				for (let j = i - 1; j >= 0; j--) {
					if (r.path[j] == current) {
						if (current == origin) r.originPrepends.push(current);
						if (j < i - 1) r.poisonPrepends.push(current);
						r.prepends.push(current);
						break;
					}
				}
			}
		});
		
		collectors.forEach(collector => {
			if (this.state.collector && !this.state.collector.split(',').includes(`${collector.id}`)) return;
			let v = routes.filter(r => r.collector === collector.id);
			(!v.length ? invisibles : v.some(r => !r.originPrepends.length) ? visibles : prependeds).push(
				{
					id: collector.id,
					name: collector.name,
					geographical: collector.location.geographical,
					topological: collector.location.topological,
					countryCode: collector.location.countryCode,
					lat: collector.location.latitude,
					lon: collector.location.longitude,
				}
			);
		});
		this.setData(invisibles, visibles, prependeds);
		this.setState({routes: routes});
	}
	
	render() {
		
		this.options = {
			chart: {
				height: 700
			},
		
			title: {
				text: "Mapa Mundi"
			},
		
			subtitle: {
				text: "Visibilidade do prefixo"
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
		
			series: [
				{
					name: 'World',
					mapData: mapData,
					borderColor: '#707070',
					nullColor: 'rgba(200, 200, 200, 0.3)',
					showInLegend: false,
				}, {
					name: `Visível (${this.state.visibles?.length ?? 0})`,
					type: 'mappoint',
					marker: {
						fillColor: 'GREEN',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: this.state.displayLabels,
					},
					data: this.state.visibles,
				}, {
					name: `Visível com Prepend (${this.state.prependeds?.length ?? 0})`,
					type: 'mappoint',
					marker: {
						fillColor: 'BLUE',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: this.state.displayLabels,
					},
					data: this.state.prependeds,
				}, {
					name: `Não Visível (${this.state.invisibles?.length ?? 0})`,
					type: 'mappoint',
					marker: {
						fillColor: 'RED',
						symbol: 'circle',
					},
					dataLabels: {
						format: '{point.id}',
						enabled: this.state.displayLabels,
					},
					data: this.state.invisibles,
				}
			]
		};
		
		const PathSpan = ({ values, rowData}) => {
			return (
				<>
					{values.map((tag, idx) => {
						let className = [
							"tag",
							"path",
							...(rowData.prepends.includes(tag)) ? ["prepend"] : [],
							...(rowData.originPrepends.includes(tag)) ? ["origin-prepend"] : [],
							...(rowData.poisonPrepends.includes(tag)) ? ["poison-prepend"] : [],
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
		
		const columns = [
			{
				Header: "Coletor",
				accessor: "collector",
			},
			{
				Header: "Caminho",
				accessor: "path",
				Cell: cellInfo => <PathSpan values={cellInfo.value} rowData={cellInfo.row.original} />,
			},
			{
				Header: "Comunidades",
				accessor: "community",
				Cell: ({ cell: { value } }) => <CommunitySpan values={value} />,
			},
			{
				Header: "Origin Prepends",
				accessor: "originPrepends.length",
			},
			{
				Header: "Poison Prepends",
				accessor: "poisonPrepends.length",
			},
			{
				Header: "Total Prepends",
				accessor: "prepends.length",
			}
		];
		
		const data = this.state.routes ?? [];
		
		return (
			<div>
				<form onSubmit={this.search} style={{padding: '20px', textAlign: 'center'}} >
					<label htmlFor="prefix">Prefixo</label>
					<input id="prefix" name="prefix" value={this.state.prefix} required onChange={this.handleChange} style={{margin: '5px'}} />
					<label htmlFor="collector">Coletor</label>
					<input id="collector" name="collector" value={this.state.collector} onChange={this.handleChange} style={{margin: '5px'}} />
					<label htmlFor="timestamp">Timestamp</label>
					<input id="timestamp" name="timestamp" value={this.state.timestamp} onChange={this.handleChange} style={{margin: '5px'}} />
					<button type="submit">Buscar</button>
					<input id="displayLabels" name="displayLabels" type="checkbox" checked={this.state.displayLabels} onChange={this.handleChange} style={{margin: '0px 5px 0px 10px'}} />
					<label htmlFor="displayLabels">Exibir rótulos</label>
				</form>
				<HighchartsReact highcharts={Highcharts} options={this.options} constructorType={"mapChart"} ref={this.chartRef} />
				<ReactTable data={data} columns={columns} />
			</div>
		);
	}
}

render(<MapaPrefixos />, document.getElementById("root"));