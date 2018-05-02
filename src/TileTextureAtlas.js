Potree.Tile = class Tile {
	constructor(index, x, y, zoom) {
		this.index = index;
		this.x = x;
		this.y = y;
		this.zoom = zoom;
		this.stamp = new Date();
	}

	renewStamp() {
		this.stamp = new Date();
	}

	minX(forZoomLevel) {
		if (!forZoomLevel) return this.x;
		else return this._convertValue(forZoomLevel, this.x);
	}

	maxX(forZoomLevel) {
		if (!forZoomLevel) return this.x + 1;
		else return this._convertValue(forZoomLevel, this.x + 1);
	}

	minY(forZoomLevel) {
		if (!forZoomLevel) return this.y;
		else return this._convertValue(forZoomLevel, this.y);
	}
	maxY(forZoomLevel) {
		if (!forZoomLevel) return this.y + 1;
		else return this._convertValue(forZoomLevel, this.y + 1);
	}

	_convertValue(toZoomLevel, oldValue) {
		return oldValue * Math.pow(2, toZoomLevel - this.zoom);
	}

	overlapsNode(node) {
		if (this.maxX(node.zoom) <= node.minX) return false; // the tile is to the left of the node
		if (this.minX(node.zoom) >= node.maxX) return false; // the tile is to the right of the node
		if (this.maxY(node.zoom) <= node.minY) return false; // the tile is to the top of the node
		if (this.minY(node.zoom) >= node.maxY) return false; // the tile is to the bottom of the node

		return true; // The tile overlaps some or all of the node.
	}

	minUFor(node) {
		let minX = this.minX(node.zoom);
		let maxX = this.maxX(node.zoom);
		if (minX <= node.minX) return 0;
		else return this._normalizeValue(node.minX, node.maxX, minX);
	}

	maxUFor(node) {
		let minX = this.minX(node.zoom);
		let maxX = this.maxX(node.zoom);
		if (maxX >= node.maxX) return 1;
		else return this._normalizeValue(node.minX, node.maxX, maxX);
	}

	minVFor(node) {
		let minY = this.minY(node.zoom);
		let maxY = this.maxY(node.zoom);
		if (maxY >= node.maxY) return 0;
		else return 1 - this._normalizeValue(node.minY, node.maxY, maxY);
	}

	maxVFor(node) {
		let minY = this.minY(node.zoom);
		let maxY = this.maxY(node.zoom);
		if (minY <= node.minY) return 1;
		else return 1 - this._normalizeValue(node.minY, node.maxY, minY);
	}

	xOffset(x, node) {
		let minX = this.minX(node.zoom);
		let maxX = this.maxX(node.zoom);

		return x + this._normalizeValue(minX, maxX, node.minX);
	}

	yOffset(y, node) {
		let minY = this.minY(node.zoom);
		let maxY = this.maxY(node.zoom);

		return y + 1 - this._normalizeValue(minY, maxY, node.maxY);
	}

	nodeWidth(node) {
		return (node.maxX - node.minX) / (this.maxX(node.zoom) - this.minX(node.zoom));
	}

	nodeHeight(node) {
		return (node.maxY - node.minY) / (this.maxY(node.zoom) - this.minY(node.zoom));
	}

	// Returns a number between 0 and 1
	_normalizeValue(fromValue, toValue, actualValue) {
		return (actualValue - fromValue) / (toValue - fromValue);
	}
}

Potree.TileTextureAtlas = class TileTextureAtlas {
	constructor(tileHeight, tileWidth, document = document) {
		this._canvas = document.getElementById("texture");
		this._numberOfTilesHeight = Math.pow(2, 5);
		this._numberOfTilesWidth = Math.pow(2, 2);
		this._canvas.height = tileHeight * this._numberOfTilesHeight;
		this._canvas.width = tileWidth * this._numberOfTilesWidth;
		this._tiles = Array(this._numberOfTilesHeight * this._numberOfTilesWidth);
	}

	getNumberOfTilesInAtlas() {
		return this._tiles.length();
	}

	get texture() {
		let texture = new THREE.CanvasTexture(this._canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.needsUpdate = true;
		return texture;
	}

	getTileDataFor(node, maxZoom) {
		let coveringTiles = this._usedTiles()
			.filter(tile => tile.zoom <= maxZoom)
			.filter(tile => tile.overlapsNode(node));

		coveringTiles.forEach(tile => tile.renewStamp());
		coveringTiles.sort((tileA, tileB) => tileB.zoom - tileA.zoom);

		return coveringTiles.map(tile => {
			let x = tile.index % this._numberOfTilesWidth;
			let y = this._numberOfTilesHeight - Math.floor(tile.index / this._numberOfTilesWidth) - 1;
			return {
				numberOfTilesWidth: this._numberOfTilesWidth,
				numberOfTilesHeight: this._numberOfTilesHeight,
				xOffset: tile.xOffset(x, node),
				yOffset: tile.yOffset(y, node),
				width: tile.nodeWidth(node),
				height: tile.nodeHeight(node),
				minU: tile.minUFor(node),
				maxU: tile.maxUFor(node),
				minV: tile.minVFor(node),
				maxV: tile.maxVFor(node)
			}
		});
	}

	hasTile(tile) {
		return this._usedTiles().some(_tile => {
			return _tile.zoom === tile.zoom &&
				_tile.x === tile.X && _tile.y === tile.Y;
		});
	}

	removeIndex(index) {
		if (this._tiles.length > 0 && index !== -1) {
			this._tiles[index] = undefined;
		} else {
			return;
		}
	}

	removeOldestTile() {
		let oldestDate = Math.min(...this._tiles.map(d => d.stamp));
		let tile = this._tiles.find(o => o.stamp.getTime() === oldestDate)
		let index = this._tiles.indexOf(tile);
		this.removeIndex(index);
		return index;
	}

	findNextIndex() {
		if (this._tiles.length > 0) {
			for (var i = 0; i < this._tiles.length; i++) {
				if (this._tiles[i] === undefined) {
					return i;
				}
			}
			//Empty slot not found has to make space in the tile array
			let index = this.removeOldestTile();
			return index;
		} else {
			return 0;
		}
	}

	insert(tileImage) {
		let index = this.findNextIndex();
		let image = tileImage.image;
		let tile = new Potree.Tile(
			index,
			tileImage.tile.X,
			tileImage.tile.Y,
			tileImage.tile.zoom
		);
		this._tiles[index] = tile;
		let ctx = this._canvas.getContext("2d");
		let xOffset = (index % this._numberOfTilesWidth) * image.width;
		let yOffset = Math.floor(index / this._numberOfTilesWidth) * image.height;

		ctx.drawImage(image, xOffset, yOffset);
	}

  _usedTiles() {
		return this._tiles.filter(tile => tile !== null && tile !== undefined);
	}

}
