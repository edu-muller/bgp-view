import React from "react";
import { render } from "react-dom";

import Highcharts from "highcharts";
import HighchartsMap from "highcharts/modules/map";
import HighchartsReact from "highcharts-react-official";

//-= import map from "@highcharts/map-collection/custom/world.geo.json";
import mapData from './maps/world';

HighchartsMap(Highcharts);

class MapaPrefixos extends React.Component {
	
	urlApi = 'https://bgp-report.herokuapp.com/api';
	
	constructor(props) {
		super(props);
		this.chartRef = React.createRef();
		this.state = {
			prefix: '',
			displayLabels: false,
		}
		
		this.handleChange = this.handleChange.bind(this);
		this.search = this.search.bind(this);
		
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
					name: 'Visível com Prepend',
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
		this.chartRef.current.chart.series[1].setData(invisibles, true);
		this.chartRef.current.chart.series[2].setData(visibles, true);
		this.chartRef.current.chart.series[3].setData(prependeds, true);
		//-= this.chartRef.current.chart.update(this.options);
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
			
			fetch(`${this.urlApi}/resources?resources=${this.state.prefix}`).then(res => res.json()).then(data => {
				let visibles = [], invisibles = [], prependeds = [];
				collectors.forEach(collector => {
					((!data.routes.some(r => r.collector === collector.id)) ? invisibles : 
					(!data.prepends.some(r => r.collector === collector.id)) ? visibles : prependeds).push(
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
			});
		});
	}
	
	render() {
		return (
			<div>
				<form onSubmit={this.search} style={{padding: '20px', textAlign: 'center'}} >
					<label>Prefixo</label>
					<input name="prefix" value={this.state.prefix} required onChange={this.handleChange} style={{margin: '5px'}} />
					<button type="submit">Buscar</button>
					<input name="displayLabels" type="checkbox" checked={this.state.displayLabels} onChange={this.handleChange} />
				</form>
				<HighchartsReact highcharts={Highcharts} options={this.options} constructorType={"mapChart"} ref={this.chartRef} />
			</div>
		);
	}
}
render(<MapaPrefixos />, document.getElementById("root"));
