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
		this._lowerLimit = 100;
		this._cachedNodes = new Map();
	}

	getTileDataFor(geometryNode) {
		let node = undefined;
		if (this._cachedNodes.has(geometryNode.id)) {
			node = this._cachedNodes.get(geometryNode.id);
		} else {
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

			node = {
				minX: minX,
				minY: minY,
				maxX: maxX,
				maxY: maxY,
				zoom: zoom
			}

			this._cachedNodes.set(geometryNode.id, node);
		}

		return this._textureAtlas.getTileDataFor(node);
	}

    _toRad(Value) {
        /** Converts numeric degrees to radians */
        return Value * Math.PI / 180;
    }

	_guessZoomlevel(minCoord, maxCoord){
        let dLat = Math.abs(maxCoord[1] - minCoord[0]);
        let dLon = Math.abs(maxCoord[0] - minCoord[0]);
        let pixelsInTile = 256;
        let distance = this._calcDistanceBetween(minCoord, maxCoord);
        let meterPrPixel = distance / (Math.sqrt(Math.pow(pixelsInTile, 2) + (dLat / dLon * Math.pow(pixelsInTile, 2))));

        let zoom = 0;
        let pixelLength = 156543.03;
        while (pixelLength / 2 > meterPrPixel) {
            pixelLength = Math.abs(156543.03 * Math.cos(maxCoord[1])) / Math.pow(2, zoom);
            zoom++;
        }
        zoom--;

	
        return zoom;
	}

	//https://www.movable-type.co.uk/scripts/latlong.html
	_calcDistanceBetween(minCoord, maxCoord) {
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


	calculateCamObjPos(camera){
		let frustum = new THREE.Frustum();
		let viewI = camera.matrixWorldInverse;
		let world = this._matrixWorld;
		
		// use close near plane for frustum intersection
		let frustumCam = camera.clone();
		frustumCam.near = Math.min(camera.near, 0.1);
		frustumCam.updateProjectionMatrix();
		let proj = camera.projectionMatrix;

		let fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
		frustum.setFromMatrix(fm);

		// camera position in object space
		let view = camera.matrixWorld;
		let worldI = new THREE.Matrix4().getInverse(world);
		let camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
		return new THREE.Vector3().setFromMatrixPosition(camMatrixObject);
	}

	updateTextureFor(visibleNodes, camera, domHeight, callback) {
		let promises = [];
		let maxZoomlevel = 18;
		let camObjPos = this.calculateCamObjPos(camera);

		visibleNodes.forEach(node => {
			let pixelsInNodeRadius = this._calculateNumberOfPixelsForNode (node, camera, camObjPos, domHeight);
			if(pixelsInNodeRadius < this._lowerLimit || pixelsInNodeRadius > domHeight){
				return;
			}

			let nodeBox = Potree.utils.computeTransformedBoundingBox(node.geometryNode.boundingBox, this._matrixWorld);
			let minCoord = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.min.x, nodeBox.min.y]);
			let maxCoord = proj4(this._inputCoordinateSystem, this._WGS84, [nodeBox.max.x, nodeBox.max.y]);
			let zoomlevelGuess = this._guessZoomlevel(minCoord, maxCoord);
			if(maxZoomlevel <= zoomlevelGuess){
				zoomlevelGuess = maxZoomlevel;
			}
			let tiles = this.getTiles(minCoord, maxCoord, zoomlevelGuess);
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

	_calculateNumberOfPixelsForNode(node, camera, camObjPos, domHeight){
		let sphere = node.getBoundingSphere();
		let center = sphere.center;
		
		let dx = camObjPos.x - center.x;
		let dy = camObjPos.y - center.y;
		let dz = camObjPos.z - center.z;
				
		let dd = dx * dx + dy * dy + dz * dz;
		let distance = Math.sqrt(dd);
		let radius = sphere.radius;
				
		let fov = (camera.fov * Math.PI) / 180;
		let slope = Math.tan(fov / 2);
		let projFactor = (0.5 * domHeight) / (slope * distance);
		let screenPixelRadius = 2 * radius * projFactor;

		return screenPixelRadius;
				
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

	getTiles(minCoord, maxCoord, zoom, maxNumberOfTiles = 1) {
		let minX = this.long2tile(minCoord[0], zoom);
		let minY = this.lat2tile(minCoord[1], zoom);
		let maxX = this.long2tile(maxCoord[0], zoom);
		let maxY = this.lat2tile(maxCoord[1], zoom);
		let arrayX = [minX, maxX].sort();
		let arrayY = [minY, maxY].sort();
		let numberOfTiles = (arrayX[1] - arrayX[0] + 1) * (arrayY[1] - arrayY[0] + 1);

		// We want at least minNumberOfTiles tiles per pointcloud node
		if (numberOfTiles === maxNumberOfTiles || zoom === 1) {
			let tiles = [];
			for (var x = arrayX[0]; x <= arrayX[1]; x++) {
				for (var y = arrayY[0]; y <= arrayY[1]; y++) {
					tiles.push({ X: x, Y: y, zoom: zoom });
				}
			}
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
			let image = new Image(256,256);
			image.crossOrigin = true;
			image.onload = () => {
				let data = { tile: tile, image: image }
				resolve(data);
			}
			let imageURL = Potree.MapTextureManagerSettings.tileServer + tile.zoom + "/" + tile.X + "/" + tile.Y + ".png";
			image.src = imageURL;
			// fetch(Potree.MapTextureManagerSettings.tileServer + tile.zoom + "/" + tile.X + "/" + tile.Y + ".png",
			// 	{ mode: 'cors', cache: 'no-cache, no-store' })
			// 	.then(response => response.blob() )
			// 	.then(blob => {
			// 		let imageURL = URL.createObjectURL(blob);
			// 		let image = this._tileImage;
			// 		image.onload = () => {
			// 			let data = { tile: tile, image: image }
			// 			resolve(data);
			// 			URL.revokeObjectURL(imageURL);
			// 		}
			// 		image.src = imageURL;
			// 	});
		});
	}



};
