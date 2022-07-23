import {Group} from 'konva/lib/Group';
import {GetSet} from 'konva/lib/types';
import {Shape} from 'konva/lib/Shape';
import {ContainerConfig} from 'konva/lib/Container';
import {Node} from 'konva/lib/Node';
import {Origin, Size} from '../types';
import {KonvaNode} from '../decorators';
import {getset} from '../decorators/getset';
import {fixedPartition} from './ImageLayout';

export enum LayoutType {
    FixedColumns = 1,
    FixedPartition = 2,
    Single = 3,
}

export interface SmartLayoutConfig extends ContainerConfig {
    layoutType?: LayoutType.FixedPartition;
    align?: string | undefined;
    maxWidth: number;
    idealElementHeight: number;
    maxHeight?: number;
    spacing?: number;
}

@KonvaNode()
export class SmartLayout extends Group {
    @getset(LayoutType.FixedPartition, Node.prototype.markDirty)
    public layoutType: GetSet<LayoutType, this>;

    @getset(0)
    public maxWidth: GetSet<SmartLayoutConfig['maxWidth'], this>;

    @getset(0)
    public idealElementHeight: GetSet<
    SmartLayoutConfig['idealElementHeight'],
    this
    >;

    @getset(null)
    public maxHeight: GetSet<SmartLayoutConfig['maxHeight'], this>;

    @getset(0)
    public spacing: GetSet<SmartLayoutConfig['spacing'], this>;

    private contentSize: Size;
    private readonly originalChildSizesMap: Map<Group | Shape, Size>;
    private lockedLayout: boolean;

    public constructor(config?: SmartLayoutConfig) {
        super(config);
        this.lockedLayout = false;
        this.originalChildSizesMap = new Map();
    }

    public getLayoutSize(): Size {
        return this.getPadd().expand({
            width: this.contentSize?.width ?? 0,
            height: this.contentSize?.height ?? 0,
        });
    }

    // TODO Recalculate upon removing children as well.
    public add(...children: Array<Group | Shape>): this {
        for (const child of children) {
            this.originalChildSizesMap.set(child, child.size());
        }

        super.add(...children);
        this.recalculateLayout();
        return this;
    }

    private getMaxWidthWithMargin() {
        return this.maxWidth() - this.getMargin().left - this.getMargin().right;
    }

    private getMaxHeightWithMargin() {
        return this.maxHeight() !== null
            ? this.maxHeight() - this.getMargin().top - this.getMargin().bottom
            : null;
    }

    private getOriginalChildSizes() {
        return this.children.map(child => this.originalChildSizesMap.get(child));
    }

    public recalculateLayout() {
        if (!this.children || this.lockedLayout) {
            return;
        }

        // Const childSizes = this.children.map(child => child.getSize())
        // console.warn(this.originalChildSizesMap)

        const layout = fixedPartition(this.getOriginalChildSizes(), {
            align: 'center',
            maxWidth: this.getMaxWidthWithMargin(),
            maxHeight: this.getMaxHeightWithMargin(),
            idealElementHeight: this.idealElementHeight(),
            spacing: this.spacing(),
        });
        // Console.warn(layout);

        // Set content size
        this.contentSize = {width: layout.width, height: layout.height};

        // Layout children
        for (const [idx, child] of this.children.entries()) {
            const margin = child.getMargin();
            const scale = child.getAbsoluteScale(this);
            const offset = child.getOriginDelta(Origin.TopLeft);
            const position = layout.positions[idx];
            // Console.warn(offset)

            child.position({
                x:
          position.x
          - (offset.x + margin.left) * scale.x
          - this.contentSize.width / 2,
                y:
          position.y
          - (offset.y + margin.top) * scale.y
          - this.contentSize.height / 2,
            });
            // Child.position({x:0, y:0})

            // console.warn({idx: idx, oldSize: child.getSize(), newSize: newSize});
            child.size(position);
            // Child.scale({
            //   x: position.width / child.getSize().width,
            //   y: position.height / child.getSize().height,
            // });
            // Changing the size of the children sets their "dirty" property to true.
            // We need to set it back to false, otherwise it starts an infintite loop
            // as the child super.recalculateLayout() which calls the child again.
            //
            // ! This is no longer true as we do the layout with the original child
            // ! sizes. However, this also prevents the layout from updating if children
            // ! resize themselves.
            // child.attrs.dirty = false;
        }

        super.recalculateLayout();
    }

    public applyLayoutScale() {
        if (!this.children) {
            return;
        }

        this.lockedLayout = true;

        for (const child of this.children) {
            const size = child.size();
            const scale = child.scale();
            child.size({
                width: size.width * scale.x,
                height: size.height * scale.y,
            });

            child.scale({x: 1, y: 1});
        }

        console.warn('locked');
    }
}
