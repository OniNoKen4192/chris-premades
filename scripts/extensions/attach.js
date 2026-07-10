import {genericUtils} from '../utils.js';
async function updateAttachments(entity, delta) {
    let attachedEntityUuids = entity.flags['chris-premades']?.attached?.attachedEntityUuids ?? [];
    let removedEntityUuids = [];
    await Promise.all(attachedEntityUuids.map(async uuid => {
        let document = await fromUuid(uuid);
        if (!document) {
            removedEntityUuids.push(uuid);
        } else if (document.documentName === 'Region') {
            // Regions have no top-level x/y; shift each shape by the delta instead
            let shapes = genericUtils.duplicate(document.toObject().shapes);
            shapes.forEach(shape => {
                if (shape.points?.length) {
                    shape.points = shape.points.map((point, index) => index % 2 ? point + delta.y : point + delta.x);
                } else {
                    shape.x = (shape.x ?? 0) + delta.x;
                    shape.y = (shape.y ?? 0) + delta.y;
                }
            });
            await genericUtils.update(document, {shapes}, {animate: false});
        } else {
            let updates = {
                x: document.x + delta.x,
                y: document.y + delta.y
            };
            if (document.documentName === 'Token' && entity.documentName === 'Token'  && document.sort <= entity.sort) updates.sort = entity.sort + 1;
            await genericUtils.update(document, updates, {animate: false});
        }
    }));
    if (removedEntityUuids.length) await genericUtils.setFlag(entity, 'chris-premades', 'attached.attachedEntityUuids', attachedEntityUuids.filter(i => !removedEntityUuids.includes(i)));
}
export let attach = {
    updateAttachments
};
