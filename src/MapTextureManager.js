Potree.MapTextureManagerSettings = {
	tileServer: null,
	maxZoomlevel: 17,
	zoomLevelCorrection: 3
};

Potree.MapTextureManager = class MapTextureManager {
	constructor(matrixWorld, mapTilesConverter, tileTextureAtlas) {
		this._mapTilesConverter = mapTilesConverter;
		this._textureAtlas = tileTextureAtlas;
		this._matrixWorld = matrixWorld;
		this._tilesRequested = [];
		this._lowerLimit = 100;
		this._textureLastUpdatedAt = null;
	}

	getTileDataFor(geometryNode, resolution) {
		let node = this._mapTilesConverter.CalcTileData(geometryNode);
		let lat = this._mapTilesConverter.tile2lat(node.minY, node.zoom);
		let maxZoom = this._calcMaxZoom(resolution, lat);
		maxZoom = Math.min(maxZoom, Potree.MapTextureManagerSettings.maxZoomlevel);
		let tiles = this._textureAtlas.getTileDataFor(node, maxZoom);
		return tiles;
	}

	// _calculateOverlap(coveringTiles) {
	// 	let minU, minV = 1;
	// 	let maxU, maxV = 0;
	// 	let i = 0;
	// 	let area = 0;
	// 	while (minU !== 0 && minV !== 0 && maxU !== 1 && maxV !== 1) {
	// 		let tiles = coveringTiles;
	// 		tiles.length = i;
	// 		tiles = tiles.filter(tile => this._overlapsTile(coveringTiles[i], tile));
	// 		let areaCurrentTile = (coveringTiles[i].maxU - coveringTiles[i].minU) * (coveringTiles[i].maxV - coveringTiles[i].minV)
	// 		let overlappedArea = this._calcOverlappedArea(coveringTiles[i], tiles);
	// 		area = area + (areaCurrentTile - overlappedArea);
	// 		minU = Math.min(coveringTiles[i].minU, minU);
	// 		minV = Math.min(coveringTiles[i].minV, minV);
	// 		maxU = Math.max(coveringTiles[i].maxU, maxU);
	// 		maxV = Math.max(coveringTiles[i].maxV, maxV);
	// 		i++;
	// 		if (i >= tiles.length)
	// 			break;
	// 	}
	// 	tiles.length = i;
	// 	return tiles;
	// }

	// _calcOverlappedArea(currentTile, tiles) {
	// 	tiles.forEach(tile => {

	// 	});
	// }

	// _overlapsTile(currentTile, tile) {
	// 	if (currentTile.maxU <= tile.minU) return false; // the tile is to the left of the node
	// 	if (currentTile.maxV <= node.minV) return false; // the tile is to the right of the node
	// 	if (currentTile.minV >= node.maxV) return false; // the tile is to the top of the node
	// 	if (currentTile.minU >= node.maxU) return false; // the tile is to the bottom of the node

	// 	return true; // The tile overlaps some or all of the node.
	// }


	_calcMaxZoom(resolution, lat) {
		return Math.floor(Math.log2(Math.abs(Math.cos(lat)) * 156543.03 / resolution)) - Potree.MapTextureManagerSettings.zoomLevelCorrection;
	}

	_calculateCamObjPos(camera) {
		let world = this._matrixWorld;
		let view = camera.matrixWorld;
		let worldI = new THREE.Matrix4().getInverse(world);
		let camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
		return new THREE.Vector3().setFromMatrixPosition(camMatrixObject);
	}

	_guessZoomlevel(minCoord, maxCoord) {
		let dLat = Math.abs(maxCoord[1] - minCoord[0]);
		let dLon = Math.abs(maxCoord[0] - minCoord[0]);
		let pixelsInTile = 256;
		let distance = this._mapTilesConverter.CalcDistanceBetween(minCoord, maxCoord);
		let resolution = distance / (Math.sqrt(Math.pow(pixelsInTile, 2) + (dLat / dLon * Math.pow(pixelsInTile, 2))));
		let zoom = this._calcMaxZoom(resolution, maxCoord[1]);
		return zoom;
	}

	_calculateAngleToSurface(camera) {
		let vector = camera.getWorldDirection();
		let angle = Math.abs(Math.atan2(vector.x, vector.z) * 180 / Math.PI) - 90;
		return angle;
	}


	updateTextureFor(visibleNodes, camera, domHeight, resolution, callback) {
		if (visibleNodes.length === 0) return;
		if (this._shouldThrottleTextureUpdate()) return;
		// let numberOfPoints = visibleNodes.reduce((accumulator, currentValue) => accumulator + currentValue);
		let rootNode = visibleNodes[0];
		let node = this._mapTilesConverter.CalcTileData(rootNode.geometryNode);
		let lat = this._mapTilesConverter.tile2lat(node.minY, node.zoom);
		let maxZoom = this._calcMaxZoom(resolution, lat);

		let promises = [];
		let camObjPos = this._calculateCamObjPos(camera);

		visibleNodes.forEach(node => {
			let pixelsInNodeRadius = this._calculateNumberOfPixelsForNode(node, camera, camObjPos, domHeight);
			if (pixelsInNodeRadius < this._lowerLimit || pixelsInNodeRadius > domHeight) {
				return;
			}
			let nodeBox = Potree.utils.computeTransformedBoundingBox(node.geometryNode.boundingBox, this._matrixWorld);
			let boundingBoxCoord = this._mapTilesConverter.convertCoordinates(nodeBox);
			let zoomlevelGuess = this._guessZoomlevel(boundingBoxCoord.min, boundingBoxCoord.max);
			zoomlevelGuess = Math.min(maxZoom, zoomlevelGuess, Potree.MapTextureManagerSettings.maxZoomlevel);

			let tiles = this.getTiles(boundingBoxCoord.min, boundingBoxCoord.max, zoomlevelGuess);
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

	_calculateNumberOfPixelsForNode(node, camera, camObjPos, domHeight) {
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


	getTiles(minCoord, maxCoord, zoom, maxNumberOfTiles = 1) {
		let minX = this._mapTilesConverter.long2tile(minCoord[0], zoom);
		let minY = this._mapTilesConverter.lat2tile(minCoord[1], zoom);
		let maxX = this._mapTilesConverter.long2tile(maxCoord[0], zoom);
		let maxY = this._mapTilesConverter.lat2tile(maxCoord[1], zoom);
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

	_calculateNumberOfPixelsForNode(node, camera, camObjPos, domHeight) {
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
		let screenPixels = 2 * radius * projFactor;

		return screenPixels;
	}


	tilePromiseFor(tile) {
		return new Promise((resolve, reject) => {
			let image = new Image(256, 256);
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

  _shouldThrottleTextureUpdate() {
		if (this._textureLastUpdatedAt === null) {
			this._textureLastUpdatedAt = new Date();
			return false;
		}

		let timeNow = new Date();
		if (timeNow - this._textureLastUpdatedAt > 1000) {
			this._textureLastUpdatedAt = timeNow;
			return false;
		} else {
			return true;
		}
	}

};
