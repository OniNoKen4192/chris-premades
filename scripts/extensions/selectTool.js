import {genericUtils} from '../utils.js';
async function getControlButtons(controls) {
    // V14: the templates layer no longer exists (templates are Region-backed)
    let types = game.release.generation > 13 ? ['lighting', 'sounds'] : ['lighting', 'sounds', 'templates'];
    types.forEach(type => {
        if (!controls[type]?.tools) return;
        if (!controls[type].tools.select) {
            controls[type].tools.select = {
                icon: 'fas fa-expand',
                name: 'select',
                order: 0,
                title: 'CONTROLS.' + type.capitalize() + 'Select'
            };
        }
    });
}
function placeableRefresh(placeable) {
    if (placeable.controlled) placeable.controlIcon.border.visible = true;
}
function canvasReady() {
    let types = game.release.generation > 13 ? ['AmbientLight', 'AmbientSound', 'Note'] : ['AmbientLight', 'AmbientSound', 'MeasuredTemplate', 'Note'];
    types.forEach(type => {
        let layer = canvas.getLayerByEmbeddedName(type);
        if (layer) layer.options.controllableObjects = true;
    });
}
function selectToolPatch(...args) {
    Object.getPrototypeOf(foundry.canvas.placeables.AmbientLight).prototype._onDragLeftCancel.apply(this, args);
    this.updateSource({defer: true});
}
async function init() {
    Hooks.on('getSceneControlButtons', getControlButtons);
    Hooks.on('canvasReady', canvasReady);
    let types = game.release.generation > 13 ? ['AmbientSound', 'AmbientLight', 'Note'] : ['AmbientSound', 'MeasuredTemplate', 'AmbientLight', 'Note'];
    for (let i of types) Hooks.on('refresh' + i, placeableRefresh);
    Hooks.on('drawNote', async (note) => {
        await genericUtils.sleep(10);
        placeableRefresh(note);
    });
    libWrapper.register('chris-premades', 'foundry.canvas.placeables.AmbientLight.prototype._onDragLeftCancel', selectToolPatch, 'OVERRIDE');
}
export let selectTool = {
    init
};
