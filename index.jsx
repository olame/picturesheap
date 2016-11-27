import _ from 'lodash';

import React from 'react';
import ReactDOM from 'react-dom';
import {Map, Marker, Popup, TileLayer} from 'react-leaflet';

import './css/common.css';
import './css/themes/black.css';

const googleApiPromise = new Promise(function(resolve, reject) {
    window.initMap = function() {
        resolve(window.google);
    };
})

const placesServicePromise = googleApiPromise.then((google) => {
    const map = new google.maps.Map(document.createElement('div'), {
        center: {
            lat: 0,
            lng: 0
        },
        zoom: 15
    });

    const infowindow = new google.maps.InfoWindow();
    var service = new google.maps.places.PlacesService(map);
    return service;
});

function getImages(loc, radius) {
    return placesServicePromise.then((service) => {
        // код, который возвращает Promise<Array<Point>>
        return new Promise(function(resolve, reject) {

            var callback = function callback(places) {
                const points = _(places).flatMap(place => _.map(place.photos, photo => [place, photo])).map(([place, photo]) => ({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    url: photo.getUrl({maxWidth: 100})
                })).value();
                resolve(points);
            }

            service.nearbySearch({
                location: loc,
                radius: radius
            }, callback);
        });
    })
};

class PictureMap extends React.Component {
    constructor() {
        super();
        this.state = {
            lat: 59.918606,
            lng: 30.348530,
            zoom: 13,
            points: []
        };
    }

    render() {
        const position = [this.state.lat, this.state.lng];
        return (
            <Map center={position} zoom={this.state.zoom} onMoveEnd={this.handleMoveEnd.bind(this)}>
                <TileLayer attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors' url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'/>
                  {this.state.points.map(p => <Marker key={p.url} position={[p.lat, p.lng]}>
                    <Popup>
                        <div>
                            <img src={p.url}/>
                        </div>
                    </Popup>
                </Marker>)}
            </Map>
        );
    }

    handleMoveEnd({target}) {
      var center = target.getCenter();
      var promise = getImages({lat: center.lat, lng: center.lng}, 500);
      promise.then(ps =>
        {
          //кто такой this в данном случае?
          this.state.points = ps;
          this.forceUpdate();
        });
    }
}

ReactDOM.render(
    <PictureMap/>, document.getElementById('world'));
