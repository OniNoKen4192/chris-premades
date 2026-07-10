import {genericUtils, regionUtils, tokenUtils} from '../../utils.js';
// V14: MeasuredTemplates are backed by Region documents (flags.core.MeasuredTemplate). All helpers in
// this file accept either a MeasuredTemplateDocument (V13, or a V14 compat proxy) or the backing
// RegionDocument (V14) and are collectively referred to as "template".
function isRegionTemplate(template) {
    return template?.documentName === 'Region';
}
function resolveTemplate(template) {
    if (game.release.generation < 14 || !template || template.documentName !== 'MeasuredTemplate') return template;
    // V14 compat proxy shares its id and flags with the backing Region
    return template.parent?.regions?.get(template.id) ?? template;
}
function getSceneTemplates(scene) {
    if (!scene) return [];
    if (game.release.generation > 13) return scene.regions.filter(region => region.flags?.core?.MeasuredTemplate);
    return Array.from(scene.templates);
}
function getTemplatePosition(template) {
    template = resolveTemplate(template);
    if (isRegionTemplate(template)) {
        let shape = template.shapes?.[0];
        if (!shape) return {x: 0, y: 0};
        if (shape.points?.length) return {x: shape.points[0], y: shape.points[1]};
        return {x: shape.x ?? 0, y: shape.y ?? 0};
    }
    return {x: template.x, y: template.y};
}
function getDistancePixels(scene) {
    scene ??= canvas.scene;
    return scene.grid.size / scene.grid.distance;
}
// Replaces template.distance (grid units)
function getTemplateDistance(template) {
    template = resolveTemplate(template);
    if (!isRegionTemplate(template)) return template.distance;
    let shape = template.shapes?.[0];
    if (!shape) return 0;
    let distancePixels = getDistancePixels(template.parent);
    switch (shape.type) {
        case 'circle':
        case 'cone': return (shape.radius ?? 0) / distancePixels;
        case 'line': return (shape.length ?? 0) / distancePixels;
        case 'ellipse': return (shape.radiusX ?? 0) / distancePixels;
        case 'rectangle': return Math.hypot(shape.width ?? 0, shape.height ?? 0) / distancePixels;
        default: return 0;
    }
}
// Replaces template.width (grid units)
function getTemplateWidth(template) {
    template = resolveTemplate(template);
    if (!isRegionTemplate(template)) return template.width;
    let shape = template.shapes?.[0];
    if (!shape) return 0;
    return (shape.width ?? 0) / getDistancePixels(template.parent);
}
// Replaces template.object.shape.radius (pixels)
function getTemplateRadius(template) {
    template = resolveTemplate(template);
    if (!isRegionTemplate(template)) return template.object?.shape?.radius ?? (template.distance * getDistancePixels(template.parent));
    let shape = template.shapes?.[0];
    if (!shape) return 0;
    return shape.radius ?? shape.radiusX ?? ((shape.length ?? Math.hypot(shape.width ?? 0, shape.height ?? 0)) || 0);
}
// Replaces template.object.ray
function getTemplateRay(template) {
    template = resolveTemplate(template);
    if (!isRegionTemplate(template)) return template.object.ray;
    let shape = template.shapes?.[0];
    let {x, y} = getTemplatePosition(template);
    if (!shape) return foundry.canvas.geometry.Ray.fromAngle(x, y, 0, 0);
    let direction = Math.toRadians(shape.rotation ?? shape.direction ?? 0);
    let distance = shape.length ?? shape.radius ?? shape.radiusX ?? 0;
    return foundry.canvas.geometry.Ray.fromAngle(x, y, direction, distance);
}
// Replaces template.object.ray.project(0.5) / template.object.center style center lookups
function getTemplateCenter(template) {
    template = resolveTemplate(template);
    if (isRegionTemplate(template)) {
        let shape = template.shapes?.[0];
        if (!shape) return {x: 0, y: 0};
        if (shape.type === 'rectangle') return {x: (shape.x ?? 0) + (shape.width ?? 0) / 2, y: (shape.y ?? 0) + (shape.height ?? 0) / 2};
        if (shape.points?.length) {
            let bounds = new PIXI.Polygon(Array.from(shape.points)).getBounds();
            return {x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2};
        }
        return {x: shape.x ?? 0, y: shape.y ?? 0};
    }
    if (template.t === 'rect' && template.object?.ray) return template.object.ray.project(0.5);
    return {x: template.x, y: template.y};
}
function shiftShapes(shapes, deltaX, deltaY) {
    shapes.forEach(shape => {
        if (shape.points?.length) {
            shape.points = shape.points.map((point, index) => index % 2 ? point + deltaY : point + deltaX);
        } else {
            shape.x = (shape.x ?? 0) + deltaX;
            shape.y = (shape.y ?? 0) + deltaY;
        }
    });
    return shapes;
}
// Replaces genericUtils.update(template, {x, y, direction}) with another template as source
async function copyTemplatePlacement(template, sourceTemplate) {
    template = resolveTemplate(template);
    sourceTemplate = resolveTemplate(sourceTemplate);
    if (isRegionTemplate(template) && isRegionTemplate(sourceTemplate)) {
        return await genericUtils.update(template, {shapes: genericUtils.duplicate(sourceTemplate.toObject().shapes)});
    }
    return await genericUtils.update(template, {x: sourceTemplate.x, y: sourceTemplate.y, direction: sourceTemplate.direction});
}
// Replaces genericUtils.update(template, {x, y})
async function moveTemplate(template, {x, y}) {
    template = resolveTemplate(template);
    if (!isRegionTemplate(template)) return await genericUtils.update(template, {x, y});
    let position = getTemplatePosition(template);
    let shapes = shiftShapes(genericUtils.duplicate(template.toObject().shapes), x - position.x, y - position.y);
    return await genericUtils.update(template, {shapes});
}
function testRegionTemplatePoint(region, point, elevation) {
    if (elevation !== undefined && elevation !== null) {
        let {bottom, top} = region.elevation ?? {};
        if ((bottom ?? -Infinity) > elevation || elevation > (top ?? Infinity)) return false;
    }
    // Tolerance of 1px keeps parity with the boundary-inclusive MeasuredTemplate shape.contains behavior
    return region.polygonTree.testPoint(point, 1);
}
function getTokensInShape(shape, scene, {x: offsetX, y: offsetY}={x: 0, y: 0}) {
    let tokens = new Set();
    if (!shape && !scene) return tokens;
    let sceneTokens = scene.tokens;
    for (let token of sceneTokens) {
        let pointCollisions = tokenUtils.getTokenCenterPoints(token)
            .map(i => ({x: i.x - offsetX, y: i.y - offsetY}))
            .filter(i => shape.contains(i.x, i.y));
        for (let point of pointCollisions) {
            if (shape.getBounds().pointIsOn(point)) continue;
            tokens.add(token.object);
            break;
        }
    }
    return tokens;
}
function getTokensInTemplate(template) {
    template = resolveTemplate(template);
    if (isRegionTemplate(template)) {
        let tokens = new Set();
        let scene = template.parent;
        if (!scene) return tokens;
        for (let token of scene.tokens) {
            let inside = tokenUtils.getTokenCenterPoints(token).some(i => testRegionTemplatePoint(template, i, token.elevation));
            if (inside && token.object) tokens.add(token.object);
        }
        return tokens;
    }
    return getTokensInShape(template?.object?.shape, template?.parent, template);
}
function getTemplatesInToken(token) {
    let templates = new Set();
    let scene = token?.document?.parent;
    if (!scene) return templates;
    let sceneTemplates = getSceneTemplates(scene);
    let pointsToTest = tokenUtils.getTokenCenterPoints(token.document);
    for (let template of sceneTemplates) {
        if (isRegionTemplate(template)) {
            if (pointsToTest.some(i => testRegionTemplatePoint(template, i, token.document.elevation))) templates.add(template);
        } else if (template.object?.shape && pointsToTest.some(i => template.object.testPoint(i))) {
            templates.add(template);
        }
    }
    return templates;
}
function containsPoint(template, point) {
    template = resolveTemplate(template);
    if (isRegionTemplate(template)) return testRegionTemplatePoint(template, point);
    return template.object.shape.contains(point.x - template.object.center.x, point.y - template.object.center.y);
}
function findGrids(A, B, template) {
    template = resolveTemplate(template);
    let locations = new Set();
    let scene = template.parent;
    if (!scene) return locations;
    let ray = new foundry.canvas.geometry.Ray(A, B);
    if (!ray.distance) return locations;
    let gridCenter = scene.grid.size / 2;
    let spacer = scene.grid.type === CONST.GRID_TYPES.SQUARE ? 1.41 : 1;
    let nMax = Math.max(Math.floor(ray.distance / (spacer * Math.min(scene.grid.sizeX, scene.grid.sizeY))), 1);
    let tMax = Array.fromRange(nMax + 1).map(t => t / nMax);
    let prior = null;
    for (let [i, t] of tMax.entries()) {
        let [r0, c0] = (i === 0) ? [null, null] : prior;
        let {i: r1, j: c1} = scene.grid.getOffset(ray.project(t));
        if (r0 === r1 && c0 === c1) continue;
        let {x: x1, y: y1} = scene.grid.getTopLeftPoint({i: r1, j: c1});
        let contained = containsPoint(template, {x: x1 + gridCenter, y: y1 + gridCenter});
        if (contained) locations.add({x: x1, y: y1});
        prior = [r1, c1];
        if (i === 0) continue;
        if (!scene.grid.testAdjacency({i: r0, j: c0}, {i: r1, j: c1})) {
            let th = tMax[i - 1] + (0.5 / nMax);
            let {x: xh, y: yh} = scene.grid.getTopLeftPoint(ray.project(th));
            let contained = containsPoint(template, {x: xh + gridCenter, y: yh + gridCenter});
            if (contained) locations.add({x: xh, y: yh});
        }
    }
    return locations;
}
function getCastData(template) {
    return template.flags['chris-premades']?.castData;
}
function getCastLevel(template) {
    return getCastData(template)?.castLevel;
}
function getBaseLevel(template) {
    return getCastData(template)?.baseLevel;
}
async function setCastData(template, data) {
    await template.setFlag('chris-premades', 'castData', data);
}
async function setCastLevel(template, level) {
    let data = getCastData(template) ?? {};
    data.castLevel = level;
    await setCastData(template, data);
}
async function setBaseLevel(template, level) {
    let data = getCastData(template) ?? {};
    data.baseLevel = level;
    await setCastData(template, data);
}
function getSaveDC(template) {
    return getCastData(template)?.saveDC;
}
async function setSaveDC(template, dc) {
    let data = getCastData(template) ?? {};
    data.saveDC = dc;
    await setCastData(template, data);
}
function getName(template) {
    return template.flags['chris-premades']?.template?.name ?? genericUtils.translate('CHRISPREMADES.Template.UnknownTemplate');
}
async function setName(template, name) {
    await template.setFlag('chris-premades', 'template.name', name);
}
async function placeTemplate(templateData, returnTokens=false) {
    let templateDoc = new CONFIG.MeasuredTemplate.documentClass(templateData, {parent: canvas.scene});
    let previewTemplate = new game.dnd5e.canvas.AbilityTemplate(templateDoc);
    let template = false;
    try {
        [template] = await previewTemplate.drawPreview();
    } catch (error) {/* Why does this throw an error when a template isn't placed by the user? */}
    if (template) template = resolveTemplate(template);
    if (!returnTokens) return template;
    if (!template) return {template: null, tokens: []};
    await genericUtils.sleep(100);
    let tokens = getTokensInTemplate(template);
    return {template, tokens};
}
function rayIntersectsTemplate(templateDoc, ray) {
    templateDoc = resolveTemplate(templateDoc);
    if (isRegionTemplate(templateDoc)) return regionUtils.rayIntersectsRegion(templateDoc, ray);
    return getIntersections(templateDoc.object, ray.A, ray.B, true);
}
function getIntersections(templateObj, A, B, boolOnly = false) {
    if (templateObj instanceof foundry.abstract.Document) {
        let resolved = resolveTemplate(templateObj);
        if (isRegionTemplate(resolved)) return regionUtils.getIntersections(resolved, A, B, boolOnly);
        templateObj = resolved.object;
    }
    if (templateObj.shape.segmentIntersections) {
        let adjustedA = {
            x: A.x - templateObj.center.x,
            y: A.y - templateObj.center.y
        };
        let adjustedB = {
            x: B.x - templateObj.center.x,
            y: B.y - templateObj.center.y
        };
        let intersections = templateObj.shape.segmentIntersections(adjustedA, adjustedB);
        if (boolOnly) return intersections.length;
        return intersections.map(i => ({x: i.x + templateObj.center.x, y: i.y + templateObj.center.y}));
    }
    let intersections = [];
    let points = templateObj.shape.points;
    for (let i = 0; i < points.length; i += 2) {
        let currCoord = {
            x: points[i] + templateObj.center.x,
            y: points[i + 1] + templateObj.center.y
        };
        let nextCoord = {
            x: points[(i + 2) % points.length] + templateObj.center.x,
            y: points[(i + 3) % points.length] + templateObj.center.y
        };
        if (foundry.utils.lineSegmentIntersects(A, B, currCoord, nextCoord)) {
            if (boolOnly) return true;
            intersections.push(foundry.utils.lineLineIntersection(A, B, currCoord, nextCoord));
        }
    }
    if (boolOnly) return false;
    return intersections;
}
async function getSourceActor(template) {
    return (await fromUuid(template.flags.dnd5e?.origin))?.parent;
}
function getTemplatePolygons(template) {
    template = resolveTemplate(template);
    if (isRegionTemplate(template)) return template.polygons.map(i => new PIXI.Polygon(Array.from(i.points)));
    let shape = template.object.shape;
    let polygon = (shape.type === PIXI.SHAPES.POLY ? shape : shape.toPolygon()).clone();
    for (let i = 0; i < polygon.points.length; i++) {
        if (i % 2) polygon.points[i] += template.y;
        else polygon.points[i] += template.x;
    }
    return [polygon];
}
function overlap(template1, template2) {
    let polygons1 = getTemplatePolygons(template1);
    let polygons2 = getTemplatePolygons(template2);
    return polygons1.some(shape1 => polygons2.some(shape2 => shape1.intersectPolygon(shape2).points.length > 0));
}
async function attachToTemplate(template, uuidsToAttach) {
    let currAttached = template.flags?.['chris-premades']?.attached?.attachedEntityUuids ?? [];
    await genericUtils.update(template, {
        flags: {
            'chris-premades': {
                attached: {
                    attachedEntityUuids: currAttached.concat(...uuidsToAttach)
                }
            }
        }
    });
}
export let templateUtils = {
    getTokensInShape,
    getTokensInTemplate,
    getTemplatesInToken,
    findGrids,
    getCastData,
    getCastLevel,
    getBaseLevel,
    setCastData,
    setCastLevel,
    setBaseLevel,
    getSaveDC,
    setSaveDC,
    getName,
    setName,
    placeTemplate,
    rayIntersectsTemplate,
    getIntersections,
    getSourceActor,
    overlap,
    attachToTemplate,
    isRegionTemplate,
    resolveTemplate,
    getSceneTemplates,
    getTemplatePosition,
    getTemplatePolygons,
    containsPoint,
    getTemplateDistance,
    getTemplateWidth,
    getTemplateRadius,
    getTemplateRay,
    getTemplateCenter,
    shiftShapes,
    moveTemplate,
    copyTemplatePlacement
};
