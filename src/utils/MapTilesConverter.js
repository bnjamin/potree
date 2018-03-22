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
		let minWeb = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.min.x, nodeBox.min.y]);
		let maxWeb = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.max.x, nodeBox.max.y]);
		let wantedZoomLevel = this.getZoomLevel(minWeb, maxWeb);
		let yValues = [
			this.lat2tileDouble(minWeb[1], wantedZoomLevel),
			this.lat2tileDouble(maxWeb[1], wantedZoomLevel)
		];
		let xValues = [
			this.long2tileDouble(minWeb[0], wantedZoomLevel),
			this.long2tileDouble(maxWeb[0], wantedZoomLevel)
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
			zoomLevel: wantedZoomLevel
		};

		this._cachedTileData.set(geometryNode.id, tileData);

		return tileData;
	}

	convertCoordinates(nodeBox) {
		let minCoord = this.coordinateTransformer(this._inputCoordinateSystem, this._WGS84, [nodeBox.min.x, nodeBox.min.y]);
		let maxCoord = this.coordinateTransformer(this._inputCoordinateSystem, this._WGS84, [nodeBox.max.x, nodeBox.max.y]);
		return {
			min: minCoord,
			max: maxCoord
		};
	}

	// Finds a zoom level where minWeb and maxWeb is inside the same tile
	getZoomLevel(minWeb, maxWeb) {
		let currentZoomLevel = 18;
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


}
