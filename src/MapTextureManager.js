Potree.MapTextureManagerSettings = {
	tileServer: null
};

Potree.MapTextureManager = class MapTextureManager {
	constructor(projection, matrixWorld) {
		this.projection = projection;
		this._textureAtlas = new Potree.TileTextureAtlas(256, 256);
		proj4.defs('test', this.projection);
		this._inputCoordinateSystem = proj4.defs("test");
		this._WGS84 = proj4.defs("WGS84");
		this._matrixWorld = matrixWorld;
		this._tilesRequested = [];
	}

	getTileDataFor(geometryNode) {
		let nodeBox = Potree.utils.computeTransformedBoundingBox(geometryNode.boundingBox, this._matrixWorld);
		let minWeb = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.min.x, nodeBox.min.y]);
		let maxWeb = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.max.x, nodeBox.max.y]);
		let zoom = this.getZoomLevel(minWeb, maxWeb);
		let yValues = [
			this.lat2tileDouble(minWeb[1], zoom),
			this.lat2tileDouble(maxWeb[1], zoom)
		];
		let xValues = [
			this.long2tileDouble(minWeb[0], zoom),
			this.long2tileDouble(maxWeb[0], zoom)
		];
		let minY = Math.min(...yValues);
		let minX = Math.min(...xValues);
		let maxY = Math.max(...yValues);
		let maxX = Math.max(...xValues);

		let node = {
			minX: minX,
			minY: minY,
			maxX: maxX,
			maxY: maxY,
			zoom: zoom
		}

		return this._textureAtlas.getTileDataFor(node);
	}

	updateTextureFor(visibleNodes, callback) {
		let promises = [];
		visibleNodes.forEach(node => {
			let nodeBox = Potree.utils.computeTransformedBoundingBox(node.geometryNode.boundingBox, this._matrixWorld);
			let minCoord = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.min.x, nodeBox.min.y]);
			let maxCoord = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.max.x, nodeBox.max.y]);
			let tiles = this.getTiles(minCoord, maxCoord);
			tiles.forEach(tile => {
				if (!this._textureAtlas.hasTile(tile) && !this._isInRequestedTiles(tile)) {
					this._tilesRequested.push(tile);
					promises.push(this.tilePromiseFor(tile));
				}
			});
		});
		promises.forEach(promise => {
			promise.then(tileImage => {
				this._textureAtlas.insert(tileImage);
				this._tilesRequested = this._tilesRequested.filter(tile => {
					return !this._tilesEqual(tile, tileImage.tile);
				});
			});
		});
		if (promises.length === 0) {
			return;
		}
		Promise.all(promises).then(() => {
			callback(this._textureAtlas.texture);
		});
	}

	_isInRequestedTiles(tile) {
		return this._tilesRequested.some(tileRequested => {
			return this._tilesEqual(tileRequested, tile);
		});
	}

	_tilesEqual(tile1, tile2) {
		return tile1.X === tile2.X && tile1.Y === tile2.Y && tile1.zoom === tile2.zoom;
	}

	long2tile(lon, zoom) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tile(lat, zoom) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	long2tileDouble(lon, zoom) { return (((lon + 180) / 360 * Math.pow(2, zoom))); }
	lat2tileDouble(lat, zoom) { return (((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

	getTiles(minCoord, maxCoord, zoom = 19) {
		let maxZoom = 19;
		let maxNumberOfTiles = 1;
		let minX = this.long2tile(minCoord[0], zoom);
		let minY = this.lat2tile(minCoord[1], zoom);
		let maxX = this.long2tile(maxCoord[0], zoom);
		let maxY = this.lat2tile(maxCoord[1], zoom);
		let arrayX = [minX, maxX].sort();
		let arrayY = [minY, maxY].sort();
		let tiles = [];
		for (var x = arrayX[0]; x <= arrayX[1]; x++) {
			for (var y = arrayY[0]; y <= arrayY[1]; y++) {
				tiles.push({ X: x, Y: y, zoom: zoom });
			}
		}

		// We want at least minNumberOfTiles tiles per pointcloud node
		if (tiles.length === maxNumberOfTiles || zoom === 1) {
			return tiles;
		} else {
			return this.getTiles(minCoord, maxCoord, zoom - 1);
		}
	}

	// Finds a zoom level where minWeb and maxWeb is inside the same tile
	getZoomLevel(minWeb, maxWeb) {
		let currentZoomLevel = 18;

		while(true) {
			let minLong = this.long2tile(minWeb[0], currentZoomLevel);
			let maxLong = this.long2tile(maxWeb[0], currentZoomLevel);
			let minLat =  this.lat2tile(minWeb[1], currentZoomLevel);
			let maxLat =  this.lat2tile(maxWeb[1], currentZoomLevel);

			if (minLong === maxLong && minLat === maxLat) {
				return currentZoomLevel;
			} else {
				currentZoomLevel--;
			}
		}
	}

	tilePromiseFor(tile) {
		return new Promise((resolve, reject) => {
			fetch(Potree.MapTextureManagerSettings.tileServer + tile.zoom + "/" + tile.X + "/" + tile.Y + ".png",
				{ mode: 'cors', cache: 'force-cache' })
				.then(response => response.blob() )
				.then(blob => {
					let imageURL = URL.createObjectURL(blob);
					let image = new Image(256, 256);
					image.onload = () => {
						let data = { tile: tile, image: image }
						resolve(data);
						URL.revokeObjectURL(imageURL);
					}
					image.src = imageURL;
				});
		});
	}



};
