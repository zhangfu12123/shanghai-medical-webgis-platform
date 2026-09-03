/**
 * Spatial analysis tools used by the map workspace.
 *
 * The module deliberately keeps Turf calculations separate from OpenLayers
 * rendering, so it can also be used by a page without a map instance.
 */
(function (root, factory) {
	if (typeof module === 'object' && module.exports) {
		module.exports = factory(root.turf);
	} else {
		root.SpatialAnalysis = factory(root.turf);
	}
}(typeof window !== 'undefined' ? window : globalThis, function (turf) {
	'use strict';

	function requireTurf() {
		if (!turf) {
			throw new Error('SpatialAnalysis requires Turf.js');
		}
		return turf;
	}

	function asFeatureCollection(points) {
		var features = (points || []).map(function (point) {
			if (point && point.type === 'Feature') {
				return point;
			}

			var coordinates = point.coordinates || [point.longitude, point.latitude];
			if (!coordinates || coordinates.some(function (value) { return value === undefined; })) {
				throw new Error('Each point must contain coordinates or longitude/latitude');
			}
			return turf.point(coordinates, point.properties || point);
		});
		return turf.featureCollection(features);
	}

	function pointCoordinates(point) {
		if (point.type === 'Feature') {
			return point.geometry.coordinates;
		}
		return point.coordinates || [point.longitude, point.latitude];
	}

	/** Create a service-circle polygon around a WGS84 coordinate. */
	function createServiceCircle(center, minutes, speedKmh) {
		var api = requireTurf();
		var coordinate = pointCoordinates(center);
		var duration = Number(minutes) || 15;
		var speed = Number(speedKmh) || 5;
		var radiusKm = speed * duration / 60;
		return api.circle(coordinate, radiusKm, {
			steps: 64,
			units: 'kilometers',
			properties: {
				analysis: 'service-area',
				minutes: duration,
				speedKmh: speed,
				radiusKm: Number(radiusKm.toFixed(3))
			}
		});
	}

	/** Return the points whose geometry is inside a drawn polygon. */
	function pointsInPolygon(points, polygon) {
		var api = requireTurf();
		var collection = asFeatureCollection(points);
		return collection.features.filter(function (feature) {
			return api.booleanPointInPolygon(feature, polygon);
		});
	}

	/** Summarise selected points by their category/type property. */
	function countByCategory(points, categoryKey) {
		var key = categoryKey || 'type';
		return points.reduce(function (summary, point) {
			var properties = point.properties || point;
			var category = properties[key] || '其他';
			summary[category] = (summary[category] || 0) + 1;
			return summary;
		}, {});
	}

	/**
	 * Calculate the part of an analysis area not covered by service circles.
	 * The returned value is a GeoJSON Polygon or MultiPolygon feature.
	 */
	function extractBlindArea(area, medicalPoints, options) {
		var api = requireTurf();
		var settings = options || {};
		var minutes = Number(settings.minutes) || 15;
		var speedKmh = Number(settings.speedKmh) || 5;
		var circles = (medicalPoints || []).map(function (point) {
			return createServiceCircle(pointCoordinates(point), minutes, speedKmh);
		});

		if (!circles.length) {
			return area;
		}

		var covered = circles.reduce(function (union, circle) {
			return union ? api.union(union, circle) : circle;
		}, null);
		return api.difference(area, covered) || api.featureCollection([]);
	}

	/** Convert an OpenLayers geometry (already transformed to lon/lat) to Turf. */
	function analyzeSelection(geometry, points, categoryKey) {
		var api = requireTurf();
		var polygon = geometry && geometry.type === 'Feature'
			? geometry
			: api.polygon([geometry]);
		var selected = pointsInPolygon(points, polygon);
		return {
			total: selected.length,
			byCategory: countByCategory(selected, categoryKey),
			points: selected
		};
	}

	return {
		createServiceCircle: createServiceCircle,
		pointsInPolygon: pointsInPolygon,
		countByCategory: countByCategory,
		extractBlindArea: extractBlindArea,
		analyzeSelection: analyzeSelection
	};
}));
