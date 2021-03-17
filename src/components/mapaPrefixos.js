import React from "react";
import Highcharts from "highcharts";
import HighchartsMap from "highcharts/modules/map";
import HighchartsReact from "highcharts-react-official";

//-= import map from "@highcharts/map-collection/custom/world.geo.json";
import mapData from './maps/world';

HighchartsMap(Highcharts);

export class PrefixMap extends React.Component {
	
	constructor(props) {
		super(props);
		this.chartRef = React.createRef();
		this.state = {
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
						enabled: false,
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
						enabled: false,
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
						enabled: false,
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
	
	render() {
		return (
			<HighchartsReact highcharts={Highcharts} options={this.state} constructorType={"mapChart"} ref={this.chartRef} />
		);
	}
}