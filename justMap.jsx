import React from 'react';
import ReactDOM from 'react-dom';
import {
    Map,
    Marker,
    TileLayer,
} from 'react-leaflet';


import './css/common.css';
import './css/themes/black.css';

class JustMap extends React.Component {
    constructor() {super();
        this.state = {
            lat: 59.918606,
            lng: 30.348530,
            zoom: 13,
        };
    }

    render() {
        const position = [this.state.lat, this.state.lng];

        return (
                <Map center={position} zoom={this.state.zoom}>
                    <TileLayer
                        attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                        url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'/>
                    <Marker position={position} />
                </Map>
        );
    }
}

ReactDOM.render(
    <JustMap/>, document.getElementById('testApi'));
