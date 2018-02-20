(function() {
	window.viewer = new Potree.Viewer(document.getElementById("potree_render_area"));
		
	viewer.setEDLEnabled(true);
	viewer.setFOV(60);
	viewer.setPointBudget(1*1000*1000);
	viewer.loadSettingsFromURL();

	viewer.setDescription("Point cloud courtesy of <a target='_blank' href='https://www.sigeom.ch/'>sigeom sa</a>");



	// Load and add point cloud to scene
	Potree.loadPointCloud("../../pointclouds/vol_total/cloud.js", "sigeom.sa", e => {
		let scene = viewer.scene;
		let pointcloud = e.pointcloud;
		
		let material = pointcloud.material;
		material.size = 1;
		material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
		material.shape = Potree.PointShape.SQUARE;
		
		scene.addPointCloud(pointcloud);
		viewer.fitToScreen();
	});
})();