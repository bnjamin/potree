

Potree.TileTextureAtlas = class TileTextureAtlas {
	constructor(height, width) {
		this._canvas = document.createElement('canvas');
		this._canvas.height = height;
		this._canvas.width = width * 100;
		this._tiles = Array(100);
	}

	getNumberOfTilesInAtlas() {
		return this._tiles.length();
	}

	getImages(X_min, Y_min, X_max, Y_max, zoomLevel) {
		return this._tiles.filter(e => e.zoomLevel === zoomLevel && (e.X === X_max || e.X === X_min && e.Y === Y_max || e.Y === Y_min));
	}

	getImageBasedOnTile(tile) {
		let image = this._tiles.filter(e => e.tile.zoomLevel === tile.zoomLevel && e.tile.X === tile.X && e.tile.Y === tile.Y)[0];
		if (image) {
			let index = this._tiles.indexOf(image);
			this._tiles[index].Stamp = new Date();
			return image
		} else {
			return undefined;
		}
	}

	getImage(boundingBox, zoomLevel) {
		let tile = this._tiles.filter(e => e.zoomLevel === zoomLevel && e.X === X && e.Y === Y);
		if (tile) {
			return tile
		} else {
			return undefined;
		}
	}

	removeImage(X, Y, zoomLevel) {
		if (this._tiles.length() > 0) {
			let index = this._tiles.findIndex()(o => o.tile.X === X && o.tile.Y === Y && o.tile.zoomLevel === zoomLevel);
			if (index !== -1) {
				this._tiles[index] = undefined;
			}
		} else {
			return;
		}
	}

	removeIndex(index) {
		if (this._tiles.length > 0 && index !== -1) {
			this._tiles[index] = undefined;
		} else {
			return;
		}
	}

	removeOldestTile() {
		let oldestDate = Math.min(...this._tiles.map(d => d.Stamp));
		let tile = this._tiles.find(o => o.Stamp.getTime() === oldestDate)
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
		tileImage.Stamp = new Date();
		this._tiles[index] = tileImage;
		let ctx = this._canvas.getContext("2d");
		ctx.drawImage(tileImage.image, index * tileImage.image.width, 0);
	}




}
