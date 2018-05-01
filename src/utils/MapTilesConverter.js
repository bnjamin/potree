Potree.MapTilesConverter = class MapTilesConverter {
	constructor(projection, matrixWorld) {
		this.projection = projection;
		proj4.defs('inputCoord', this.projection);
		this._inputCoordinateSystem = proj4.defs("inputCoord");
		this._WGS84 = proj4.defs("WGS84");
		this._cachedTileData = new Map();
		this._matrixWorld = matrixWorld;
	}

	CalcTileData(geometryNode) {
		if (this._cachedTileData.has(geometryNode.id)) {
			return this._cachedTileData.get(geometryNode.id);
		}
		let nodeBox = Potree.utils.computeTransformedBoundingBox(geometryNode.boundingBox, this._matrixWorld);
		let data = this.convertCoordinates(nodeBox);		
		let wantedZoomLevel = this.getZoomLevel(data.min, data.max);
		let yValues = [
			this.lat2tileDouble(data.min[1], wantedZoomLevel),
			this.lat2tileDouble(data.max[1], wantedZoomLevel)
		];
		let xValues = [
			this.long2tileDouble(data.min[0], wantedZoomLevel),
			this.long2tileDouble(data.max[0], wantedZoomLevel)
		];
		let minY = Math.min(...yValues);
		let minX = Math.min(...xValues);
		let maxY = Math.max(...yValues);
		let maxX = Math.max(...xValues);

		let tileData = {
			minY: minY,
			minX: minX,
			maxY: maxY,
			maxX: maxX,
			zoom: wantedZoomLevel
		};

		this._cachedTileData.set(geometryNode.id, tileData);

		return tileData;
	}

	convertCoordinates(nodeBox) {
		let minCoord = proj4(this.projection, "WGS84", [nodeBox.min.x, nodeBox.min.y]);
		let maxCoord = proj4(this.projection, "WGS84", [nodeBox.max.x, nodeBox.max.y]);
		return {
			min: minCoord,
			max: maxCoord
		};
	}

	// Finds a zoom level where minWeb and maxWeb is inside the same tile
	getZoomLevel(minWeb, maxWeb) {
		let currentZoomLevel = 19;
		while (true) {
			let minLong = this.long2tile(minWeb[0], currentZoomLevel);
			let maxLong = this.long2tile(maxWeb[0], currentZoomLevel);
			let minLat = this.lat2tile(minWeb[1], currentZoomLevel);
			let maxLat = this.lat2tile(maxWeb[1], currentZoomLevel);

			if (minLong === maxLong && minLat === maxLat) {
				return currentZoomLevel;
			} else {
				currentZoomLevel--;
			}
		}
	}

	long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tile(lat, zoom) {
		if (lat > 0) {
			lat = Math.min(lat, 85.0511);
		} else {
			lat = Math.max(lat, -85.0511);
		}
		return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
	}

	long2tileDouble(lon, zoom) { return (((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tileDouble(lat, zoom) {
		//Lat has to be s
		if (lat > 0) {
			lat = Math.min(lat, 85.0511);
		} else {
			lat = Math.max(lat, -85.0511);
		}
		return (((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
	}

	//https://www.movable-type.co.uk/scripts/latlong.html
    CalcDistanceBetween(minCoord, maxCoord) {
        //Radius of the earth in:  1.609344 miles,  6371 km  | var R = (6371 / 1.609344);
        let R = 3958.7558657440545; // Radius of earth in Miles 
        let lat1 = minCoord[1];
        let lat2 = maxCoord[1];
        let lon1 = minCoord[0];
        let lon2 = maxCoord[0];
        let dLat =this._toRad(lat2 - lat1);
        let dLon = this._toRad(lon2 - lon1);
        let a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this._toRad(lat1)) * Math.cos(this._toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        let distance = 1000 * R * c;
        return distance;
    }

	_toRad(Value) {
        /** Converts numeric degrees to radians */
        return Value * Math.PI / 180;
    }



}
