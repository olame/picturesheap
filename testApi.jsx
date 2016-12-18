import url from 'url';
import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import NotificationSystem from 'react-notification-system';
import $ from 'jquery';
import {
    Map,
    Marker,
    Popup,
    TileLayer,
    Pane,
    MapControl,
    ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';

import './css/common.css';
import './css/themes/black.css';

const flickrApiKey = 'd85870ac341987e679c7bff28adc0c30';

// const flickrPlace = new Promise(function(resolve){
//     const initPoint = {lat: 59.918606, lng: 30.348530};
//     resolve(getPlaceUrl(initPoint.lat, initPoint.lng));
// });

const setState = React.Component.prototype.setState;
React.Component.prototype.setState = function (...args) {
    try {
        console.log('setState', JSON.stringify(args[0]));
    } catch (e) {}
    return setState.apply(this, args);
};

class flickrApi {
    constructor(){
        this._defaultOptions = {
            protocol: 'https',
            hostname: 'api.flickr.com',
            pathname: '/services/rest/',
            query: {
                format: 'json',
                nojsoncallback: 1,
                api_key: flickrApiKey,
            }
        };
    }

    _callApi(options){
        options = _.defaultsDeep(
            {},
            this._defaultOptions,
            options
        );
        const requestUrl = url.format(options);
        return axios.get(requestUrl)
            .then(res => res.data);
    }

    findByLatLon ({ lat, lon }) {
        return this._callApi({query: {
            method: 'flickr.places.findByLatLon',
            lat: lat,
            lon: lon,
        }});
    }

    getChildrenWithPhotosPublic (placeId) {
        return this._callApi({query: {
            method: '',
            placeId: placeId,
        }});
    }

    photossearch ({lat, lon, lng}) {
        return this._callApi({query: {
            method: 'flickr.photos.search',
            lat: lat,
            lon: lon || lng,
            radius: 20,
            extras: 'url_sq, geo',
        }});
        //geo_context?
        // 0, not defined.
        // 1, indoors.
        // 2, outdoors.
    }
}

const flickr = new flickrApi();

class PhotosLayer extends MapControl {
    constructor(props){
        super(_.defaults(props, {
            size: { x: 0, y: 0 },
            onPhotoSelected: _.noop,
        }));
    }

    componentWillMount () {
        const gallery = L.control({position: 'topleft'});

        gallery.onAdd = () => {
            const div = L.DomUtil.create('div', 'photosGallery');
            $(div).on('mousewheel', function mousewheelHandler (e) {
                //to stop catch event of mousewheel
                e.stopPropagation();
            });
            this.div = div;

            this._render();

            return div;
        };

        this.leafletElement = gallery;
    }

    _render () {
        ReactDOM.render(
            <Photos size={this.props.size} place={this.props.place} onPhotoSelected={this.props.onPhotoSelected.bind(this)}/>, this.div
        );
    }

    componentDidUpdate() {
        this._render();
    }
}
class Photos extends React.Component {
    constructor(props) {
        super(_.defaults(props, {
            onPhotoSelected: _.noop,
        }));
        this.state = {
            place: {lat: 59.918606, lon: 30.348530},
            photos: [],
        };
        this._previousPlace = null;
    }

    componentDidUpdate(){
        const place = this.props.place;
        if (_.isEqual(place, this._previousPlace)){
            return;
        }
        this._previousPlace = place;

        flickr.photossearch(place).then(data => {
            return data.photos.photo.map(i => ({
                id: i.id,
                lat: i.latitude,
                lon: i.longitude,
                url: i.url_sq,
            }));
        }).then(photos => {
            this.setState({photos});
        });
    }

    render(){
        return (<div className="photos" style={{overflow: 'auto', width: this.props.size.x}}>
           <div style={{whiteSpace: 'nowrap'}}>
               {this.state.photos.map(photo =>
                   <PictureItem onClick={this.handleClick.bind(this, photo)} key={photo.id} src={photo.url}/>
               )}
           </div>
       </div>);
    }

    handleClick(photo, e){
        e.stopPropagation();
        if(this.props.onPhotoSelected && photo){
            this.props.onPhotoSelected(photo);
        }
    }
}

Photos.propTypes = {
    size: React.PropTypes.object,
    onPhotoSelected: React.PropTypes.func,
    place: React.PropTypes.object,
};

class PictureItem extends React.Component {
    constructor (...args) {
        super(...args);

        this._boundElements = new WeakSet;
    }

    render () {
        return <img ref={this._imgRef.bind(this)} src={this.props.src}/>;
    }

    _imgRef (img) {
        this._bindImgEvents(img);
    }

    // NOTE, WORKAROUND: Bind native events directly on element instead of react events
    // since react event are processed later then native (see react event batching)
    _bindImgEvents (img) {
        if (!img) {
            return;
        }
        if (this._boundElements.has(img)) {
            return;
        }
        $(img).on('click', this.props.onClick);
        this._boundElements.add(img);
    }
}

PictureItem.propTypes = {
    onClick: React.PropTypes.func,
    src: React.PropTypes.string,
};

class Main extends React.Component {
    constructor() {
        super();
        this.state = {
            marker: null,
            place: {lat: 59.918606, lon: 30.348530},
            mapPosition: [59.918606, 30.348530],
            size: {},
        };

    }

    componentDidMount() {
        this._notificationSystem = this.refs.notificationSystem;
    }

    render() {
        const zoom = 13;

        return (
            <div id="world">
                <FixedMap center={this.state.mapPosition} zoom={zoom} zoomControl={false}
                    onResize={this.handleResize.bind(this)}
                    onLoad={this.handleLoad.bind(this)}
                    onClick={this.handleClick.bind(this)}>
                    <PhotosLayer place={this.state.place} size={this.state.size} onPhotoSelected={this.handlePhotoSelected.bind(this)} />
                    <ZoomControl />
                        <TileLayer
                            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                            url='http://{s}.tile.osm.org/{z}/{x}/{y}.png'/>
                        {this.state.marker?
                            <Marker position={this.state.marker} />
                            : null
                        }
                </FixedMap>
                <NotificationSystem ref="notificationSystem" />

            </div>
        );
    }

    _addNotification(message) {
        this._notificationSystem.addNotification({
            message: message,
            level: 'success',
            autoDismiss: 1,
            position: 'bc',
        });
    }

    handleClick({latlng: coordinate}){ //из первого элта получить ключ таргет и присвоить в leafletElement
        this._addNotification('new coordinate selected');
        this.setState({place: coordinate});
    }
    handlePhotoSelected(photo){
        const markerPos = {lat: Number(photo.lat), lng: Number(photo.lon)};
        this.setState({marker : markerPos, mapPosition: markerPos});
    }

    handleResize({newSize: newSize}){
        this.setState({size: newSize});
    }
    handleLoad({target: leafletMap}){
        this.setState({size: leafletMap.getSize()});
    }
}

class FixedMap extends Map {
    constructor(...args) {
        super(...args);
        console.log(this);
    }

    componentDidMount(...args){
        super.componentDidMount(...args);
        this.props.onLoad({target : this.leafletElement});
        this.leafletElement.on('onResize', this.props.onResize);
    }
}

ReactDOM.render(
    <Main/>, document.getElementById('testApi')
);
