let chai = require("chai");
// Tell chai that we'll be using the "should" style assertions.
chai.should();
Potree = {
	utils: {}
};
Potree.utils.computeTransformedBoundingBox = function () {
	let boundingBox = arguments[0];
	return {
		min: {
			x: boundingBox.min.x,
			y: boundingBox.min.y
		},
		max: {
			x: boundingBox.max.x,
			y: boundingBox.max.y
		}
	}
};
proj4 = function () {
	let coordinates = arguments[2];
	return coordinates;
}

proj4.defs = function () { };
require('../src/utils/MapTilesConverter');


describe('MapTileConverter', function () {
	let projection = "Irrelevant";
	let matrixWorld = "Irrelevant";
	let mapTileConverter = new Potree.MapTilesConverter(projection, matrixWorld);


	describe('lat2tile', function () {
		it('should return 0 when zoomlevel is 1', () => {
			let zoom = 1;
			let lat = 45;
			let tile = mapTileConverter.lat2tile(lat, zoom);
			tile.should.equal(0);
		});

		it('should return 2^zoom/2 when zoomlevel is greater than 0 and lat is on equator', () => {
			let zoom = 6;
			let lat = 0;
			let tile = mapTileConverter.lat2tile(lat, zoom);
			tile.should.equal(Math.pow(2, zoom) / 2);
		});

		it('should return 0 when lat is greather than 85.0511', () => {
			let zoom = 6;
			let lat = 90;
			let tile = mapTileConverter.lat2tile(lat, zoom);
			tile.should.equal(0);
		});

		it('should return 2^zoom-1 when lat is less than -85.0511', () => {
			let zoom = 8;
			let lat = -90;
			let tile = mapTileConverter.lat2tile(lat, zoom);
			tile.should.equal(Math.pow(2, zoom) - 1);
		});
	})

	describe('long2tile', function () {
		it('should return 1 when zoomlevel is 1', () => {
			let zoom = 1;
			let long = 45;
			let tile = mapTileConverter.long2tile(long, zoom);
			tile.should.equal(1);
		});

		it('should return 2^zoom/2 when zoomlevel is greater than 0 and long is 0', () => {
			let zoom = 6;
			let long = 0;
			let tile = mapTileConverter.long2tile(long, zoom);
			tile.should.equal(Math.pow(2, zoom) / 2);
		});

	})



	describe('toRad', function () {
		it('should return pi then 180 deg is inut', () => {
			let rad = mapTileConverter._toRad(180);
			rad.should.equal(Math.PI);
		});

		it('should return 2 times pi then 360 deg is inut', () => {
			let rad = mapTileConverter._toRad(360);
			rad.should.equal(2 * Math.PI);
		});
	})


	describe('convertCoordinates', () => {
		it('should return nodeBox coordinates', () => {
			let min = {
				x: 10,
				y: 10
			};
			let max = {
				x: 12,
				y: 12
			};
			let nodeBox = {
				min: min,
				max: max
			};

			let coordinateData = mapTileConverter.convertCoordinates(nodeBox);
			coordinateData.min.should.have.lengthOf(2);
			coordinateData.max.should.have.lengthOf(2);
			coordinateData.min.should.deep.equal(Object.values(min));
			coordinateData.max.should.deep.equal(Object.values(max));
		})
	});

	describe('CalcTileData', function () {
		it('should return nodeBox coordinates', () => {
			let min = {
				x: -157,
				y: 70
			};
			let max = {
				x: 147,
				y: 40
			};
			let nodeBox = {
				min: min,
				max: max
			};
			let geometryNode = {
				id: 4,
				boundingBox: nodeBox
			}

			let tile = {
				minX: 0.06388888888888888,
				minY: 0.22380009854461985,
				maxX: 0.9083333333333333,
				maxY: 0.3785791577410809,
				zoom: 0
			}
			let tileData = mapTileConverter.CalcTileData(geometryNode);
			tileData.should.deep.equal(tile);
		})

		it('should return tileData  coordinates', () => {
			let min = {
				x: -133.59375,
				y: 84.54136107313408
			};
			let max = {
				x: -132.890625,
				y: 84.47406458459159
			};
			let nodeBox = {
				min: min,
				max: max
			};

			let geometryNode = {
				id: 4,
				boundingBox: nodeBox
			}

			let tile = {
				minX: 33,
				minY: 4,
				maxX: 33.5,
				maxY: 4.500000000000114,
				zoom: 8
			}
			let tileData = mapTileConverter.CalcTileData(geometryNode);
			tileData.should.deep.equal(tile);
		})
	})

	describe('CalcDistanceBetween', function () {
		it('should return 6575m', () => {
			let minCoord = [-133.59375, 84.54136107313408];
			let maxCoord = [-132.890625, 84.47406458459159];
			let distance = Math.floor(mapTileConverter.CalcDistanceBetween(minCoord, maxCoord));
			distance.should.equal(6575);

		})

		it('should return 165.665km between Aarhus and Copenhagen', () => {
			let minCoord = [56.144695, 10.154284];
			let maxCoord = [55.666243, 12.505653];
			let distance = Math.floor(mapTileConverter.CalcDistanceBetween(minCoord, maxCoord));
			distance.should.equal(165665);
		})


	})


	describe('getZoomlevel', function () {
		it('should return 0 if input coordinates are in Alaska and Australia', () => {
			let minWeb = [-157, 70];
			let maxWeb = [147, -40];
			let zoomLevel = mapTileConverter.getZoomLevel(minWeb, maxWeb);
			zoomLevel.should.equal(0);
		});

		it('should return 4 if input coordinates are in Basel and Leipzig', () => {
			let minWeb = [9.18, 48.19];
			let maxWeb = [14.32, 51.52];
			let zoomLevel = mapTileConverter.getZoomLevel(minWeb, maxWeb);
			zoomLevel.should.equal(4);
		});

		it('should return 19 (max) if the input coordinates are the same', () => {
			let minWeb = [-157, 70];
			let maxWeb = minWeb;
			let zoomLevel = mapTileConverter.getZoomLevel(minWeb, maxWeb);
			zoomLevel.should.equal(19);
		})
	})
})