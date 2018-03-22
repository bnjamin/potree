let chai = require("chai");
// Tell chai that we'll be using the "should" style assertions.
chai.should();
Potree = {};
let MapTilesConverter = require('../src/utils/MapTilesConverter');


describe('MapTileConverter', function () {
	let mapTileConverter;
	beforeEach(() => {
		let projection = "Irrelevant";
		let proj4Fake = function(){
			this.defs = function(){}
			let coordinates = arguments[2]; 
			return coordinates;
		};
		mapTileConverter = new Potree.MapTilesConverter(projection, proj4Fake);
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
		it('should return third argument', )
	});

	describe('CalcTileData', function () {
		it('should return ', () => {
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