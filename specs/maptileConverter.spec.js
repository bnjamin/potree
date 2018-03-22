let chai = require("chai");
// Tell chai that we'll be using the "should" style assertions.
chai.should();
Potree = {};
proj4 = function () {
	let coordinates = arguments[2];
	return coordinates;
}
let MapTilesConverter = require('../src/utils/MapTilesConverter');


describe('MapTileConverter', function () {
	let mapTileConverter;
	beforeEach(() => {
		let projection = "Irrelevant";
		mapTileConverter = new Potree.MapTilesConverter(projection);
	});

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

			let tile = {
				minX: 0.06388888888888888,
				minY: 0.22380009854461985,
				maxX: 0.9083333333333333,
				maxY: 0.3785791577410809,
				zoomLevel: 0
			}
			let tileData = mapTileConverter.CalcTileData(nodeBox);
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

			let tile = {
				minX: 33,
				minY: 4,
				maxX: 33.5,
				maxY: 4.500000000000114,
				zoomLevel: 8
			}
			let tileData = mapTileConverter.CalcTileData(nodeBox);
			tileData.should.deep.equal(tile);
		})
	})

	describe('getZoomlevel', function () {
		it('should return 0 if input coordinates are in Alaska and Australia', () => {
			let minWeb = [-157, 70];
			let maxWeb = [147, -40];
			let zoomLevel = mapTileConverter.getZoomLevel(minWeb, maxWeb);
			zoomLevel.should.equal(0);
		});

		it('should return 18 if the input coordinates are the same', () => {
			let minWeb = [-157, 70];
			let maxWeb = minWeb;
			let zoomLevel = mapTileConverter.getZoomLevel(minWeb, maxWeb);
			zoomLevel.should.equal(18);
		})

	})
})