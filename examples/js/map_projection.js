(function() {

	if (false && 'serviceWorker' in navigator) {
		navigator.serviceWorker.register('../../serviceworker.js')
			.then(function (reg) {
				// registration worked
				console.log('Registration succeeded. Scope is ' + reg.scope);
			}).catch(function (error) {
				// registration failed
				console.log('Registration failed with ' + error);
			});
	}

	window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
	Potree.MapTextureManagerSettings.tileServer = "http://tileserver.bnjamin.com/styles/osm-bright/";
	Potree.MapTextureManagerSettings.maxZoomlevel = 15;
	//viewer.setEDLEnabled(true);
	viewer.setFOV(60);
	viewer.setPointBudget(1*1000*1000);
	viewer.loadSettingsFromURL();

	viewer.setDescription("Point cloud courtesy of <a target='_blank' href='https://www.sigeom.ch/'>sigeom sa</a>");

	// Load and add point cloud to scene
	Potree.loadPointCloud("../pointclouds/aarhus/cloud.js", "sigeom.sa", e => {
		let scene = viewer.scene;
		let pointcloud = e.pointcloud;
		//pointcloud.usesMapTexture = true;

		let material = pointcloud.material;
		material.size = 1.2;
		material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
		material.shape = Potree.PointShape.PARABOLOID;
		//material.interpolate = true;

		scene.addPointCloud(pointcloud);
		viewer.fitToScreen();
	});
})();
