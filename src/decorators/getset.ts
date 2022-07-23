import {Factory} from 'konva/lib/Factory';

export function getset<T = unknown>(
    defaultValue?: T,
    after?: Callback,
): PropertyDecorator {
    return function (target, propertyKey) {
        Factory.addGetter(target.constructor, propertyKey, defaultValue);
        Factory.addSetter(target.constructor, propertyKey, undefined, after);
    };
}
