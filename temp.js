/*<div style={{overflow: 'auto'}}>
   <div style={{whiteSpace: 'nowrap'}}>
       {this.state.photos.map(photo =>
           <img key={photo.id} src={photo.url}/>
       )}
   </div>
</div> */


class Service {
    constructor(service) {
            this.oldService = service;
        }
        // object -> Promise<Array<Place>>
    nearbySearch(options) {
        return new Promise(resolve => {
            this.oldService.nearbySearch(options, resolve);
        })
    }
}

class Application {
    constructor(service) {
        this.service = service;
    }
    getImages(pos, radius) {
        function getPhotosFromPlaces(places) {
            return _(places)
                .flatMap(place => _.map(place.photos, photo => [place, photo]))
                .map(([place, photo]) => ({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                    url: photo.getUrl({
                        maxWidth: 100
                    })
                }))
                .value();
        }
        return this.service.nearbySearch({
                position: pos,
                radius: radius,
            })
            .then(places => getPhotosFromPlaces(places));
    }
}

return new Promise(function (resolve, reject) {

    var callback = function callback(places) {
        const points = _(places)
            .flatMap(place => _.map(place.photos, photo => [place, photo]))
            .map(([place, photo]) => ({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                url: photo.getUrl({
                    maxWidth: 100
                })
            }))
            .value();
        resolve(points);
    }

    service.nearbySearch({
        location: loc,
        radius: radius
    }, callback);


});
