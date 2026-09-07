(function (root, factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory();
	} else {
		root.HeatMap = factory();
	}
}(typeof window !== 'undefined' ? window : globalThis, function () {
	'use strict';

	function getOpenLayers() {
		if (typeof ol === 'undefined') {
			throw new Error('HeatMap requires OpenLayers');
		}
		return ol;
	}

	function getCoordinates(point) {
		if (point && point.type === 'Feature') {
			return point.geometry.coordinates;
		}
		if (Array.isArray(point)) {
			return point;
		}
		return point.coordinates || [point.longitude, point.latitude];
	}

	function getProperties(point) {
		return point && point.properties ? point.properties : (point || {});
	}

	function numericValue(value, fallback) {
		var number = Number(value);
		return Number.isFinite(number) ? number : fallback;
	}

	function resolveWeight(point, options) {
		var properties = getProperties(point);
		var value = numericValue(properties[options.weightKey], options.defaultWeight);
		var min = numericValue(options.min, 0);
		var max = numericValue(options.max, 100);
		if (max <= min) {
			return 0.5;
		}
		return Math.max(0, Math.min(1, (value - min) / (max - min)));
	}

	function toFeature(point, options) {
		var api = getOpenLayers();
		var coordinates = getCoordinates(point);
		if (!Array.isArray(coordinates) || coordinates.length < 2 ||
			!Number.isFinite(Number(coordinates[0])) || !Number.isFinite(Number(coordinates[1]))) {
			throw new Error('Each heatmap point must contain valid coordinates');
		}

		var projected = options.coordinatesAreProjected
			? coordinates
			: api.proj.fromLonLat([Number(coordinates[0]), Number(coordinates[1])]);
		var feature = new api.Feature({
			geometry: new api.geom.Point(projected),
			weight: resolveWeight(point, options),
			data: getProperties(point)
		});
		return feature;
	}

	function normalizeOptions(options) {
		var settings = options || {};
		return {
			weightKey: settings.weightKey || 'accessibility',
			defaultWeight: numericValue(settings.defaultWeight, 50),
			min: numericValue(settings.min, 0),
			max: numericValue(settings.max, 100),
			coordinatesAreProjected: settings.coordinatesAreProjected === true,
			visible: settings.visible !== false,
			blur: numericValue(settings.blur, 15),
			radius: numericValue(settings.radius, 10),
			gradient: settings.gradient || ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']
		};
	}

	function createSource(points, options) {
		var api = getOpenLayers();
		return new api.source.Vector({
			features: (points || []).map(function (point) {
				return toFeature(point, options);
			})
		});
	}

	function createLayer(map, points, options) {
		var api = getOpenLayers();
		var settings = normalizeOptions(options);
		var layer = new api.layer.Heatmap({
			source: createSource(points, settings),
			blur: settings.blur,
			radius: settings.radius,
			gradient: settings.gradient,
			visible: settings.visible !== false
		});

		if (map && typeof map.addLayer === 'function') {
			map.addLayer(layer);
		}
		return layer;
	}

	function updateLayer(layer, points, options) {
		if (!layer || typeof layer.getSource !== 'function') {
			throw new Error('A valid OpenLayers heatmap layer is required');
		}
		var settings = normalizeOptions(options);
		var source = layer.getSource();
		source.clear();
		source.addFeatures((points || []).map(function (point) {
			return toFeature(point, settings);
		}));
		layer.setBlur(settings.blur);
		layer.setRadius(settings.radius);
		layer.setGradient(settings.gradient);
		return layer;
	}

	function setVisible(layer, visible) {
		if (!layer || typeof layer.setVisible !== 'function') {
			throw new Error('A valid OpenLayers heatmap layer is required');
		}
		layer.setVisible(Boolean(visible));
		return layer;
	}

	function removeLayer(map, layer) {
		if (map && layer && typeof map.removeLayer === 'function') {
			map.removeLayer(layer);
		}
	}

	return {
		createLayer: createLayer,
		updateLayer: updateLayer,
		setVisible: setVisible,
		removeLayer: removeLayer,
		resolveWeight: resolveWeight
	};
}));
