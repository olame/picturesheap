const HashMap = window.Map;
import _ from 'lodash';

import React from 'react';
import ReactDOM from 'react-dom';
import {
    Map,
    Marker,
    Popup,
    TileLayer,
} from 'react-leaflet';

import './css/common.css';
import './css/themes/black.css';

const googleApiPromise = new Promise(function(resolve) {
    window.initMap = function() {
        resolve(window.google);
    };
});

const placesServicePromise = googleApiPromise.then((google) => {
    const map = new google.maps.Map(document.createElement('div'), {
        center: {
            lat: 0,
            lng: 0
        },
        zoom: 15
    });

    var service = new google.maps.places.PlacesService(map);
    return service;
});

function getImages(bounds) {
    return Promise.all([
        googleApiPromise,
        placesServicePromise,
    ]).then(([google, service]) => {
        const googleBounds = new google.maps.LatLngBounds(bounds.getSouthWest(), bounds.getNorthEast());
        // код, который возвращает Promise<Array<Point>>
        return new Promise(function(resolve) {

            var callback = function callback(places) {
                const points = _(places)
                    .flatMap(place => _.map(place.photos, photo => [place, photo]))
                    .filter(([ , photo]) => photo.html_attributions.length > 0)
                    .map(([place, photo]) => ({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                        url: photo.getUrl({maxWidth: 100}),
                        types: place.types
                    }))
                    .value();
                resolve(points);
            };

            service.nearbySearch({
                bounds: googleBounds
            }, callback);
        });
    });
}

class PictureMap extends React.Component {
    constructor() {
        super();
        this.state = {
            lat: 59.918606,
            lng: 30.348530,
            zoom: 13,
            allPhotosCache: new HashMap(),
            points: [],
            bounds: [[0,0], [0,0]],
        };
    }

    render() {
        const position = [this.state.lat, this.state.lng];
        const getVisiblePhotos = () => {
            const allPhotos = Array.from(this.state.allPhotosCache.values());
            const bounds = this.state.bounds;
            return _.filter(allPhotos, ({ lat, lng }) => bounds.contains([ lat, lng ]));
        };
        return (
            <Map center={position} zoom={this.state.zoom} onMoveEnd={this.handleMoveEnd.bind(this)}>
                <TileLayer
                    attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                    url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'
                />
                {getVisiblePhotos().map(p => (
                    <Marker key={p.url} position={[p.lat, p.lng]}>
                        <Popup>
                            <div>
                                <span>{p.types.join(', ')}</span>
                                <img src={p.url}/>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </Map>
        );
    }

    handleMoveEnd({ target: leafletMap }) {
        const bounds = leafletMap.getBounds();

        this.setState({ bounds });

        getImages(bounds).then(ps => {
            let updatePhotos = function(state){
                ps.forEach(x => state.allPhotosCache.set(x.url, x));
                return state;
            };
            this.setState(updatePhotos);
        });
    }
}

ReactDOM.render(
    <PictureMap/>, document.getElementById('world'));
