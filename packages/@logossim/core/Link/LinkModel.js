import { Point } from '@projectstorm/geometry';
import {
  PointModel,
  LabelModel,
  LinkModel as RDLinkModel,
} from '@projectstorm/react-diagrams';
import { DefaultLabelModel } from '@projectstorm/react-diagrams-defaults';

import { sameAxis } from '../Diagram/states/common';
import { isValueValid } from '../Simulation/utils';

export default class LinkModel extends RDLinkModel {
  constructor(options) {
    super({
      type: 'link',
      ...options,
    });

    this.bifurcations = [];
    this.bifurcationSource = null;
    this.bifurcationTarget = null;

    this.value = null;
  }

  addLabel(label) {
    if (label instanceof LabelModel) {
      return super.addLabel(label);
    }

    const newLabel = new DefaultLabelModel();
    newLabel.setLabel(label);
    return super.addLabel(newLabel);
  }

  setBifurcationSource(link) {
    this.bifurcationSource = link;
  }

  getBifurcationSource() {
    return this.bifurcationSource;
  }

  setBifurcationTarget(link) {
    this.bifurcationTarget = link;
  }

  getBifurcationTarget() {
    return this.bifurcationTarget;
  }

  isBifurcation() {
    return !!(
      this.getBifurcationSource() || this.getBifurcationTarget()
    );
  }

  addBifurcation(link) {
    if (
      this.bifurcations.find(
        bifurcation => bifurcation.getID() === link.getID(),
      )
    ) {
      return;
    }

    this.bifurcations.push(link);
  }

  removeBifurcation(link) {
    this.bifurcations = this.bifurcations.filter(
      b => b.getID() !== link.getID(),
    );
  }

  getBifurcations() {
    return this.bifurcations;
  }

  getAllBifurcations() {
    const result = [...this.bifurcations];
    this.bifurcations.forEach(bifurcation =>
      result.push(bifurcation.getAllBifurcations()),
    );
    return result.flat(Infinity);
  }

  getSelectionEntities() {
    return [...super.getSelectionEntities(), ...this.bifurcations];
  }

  setSelected(selected) {
    super.setSelected(selected);
    this.bifurcations.forEach(b => b.setSelected(selected));

    if (this.getSourcePort()) {
      this.getSourcePort().setSelected(selected);
    }
    if (this.getTargetPort()) {
      this.getTargetPort().setSelected(selected);
    }
  }

  remove() {
    this.bifurcations.forEach(bifurcation => bifurcation.remove());

    if (this.bifurcationSource) {
      this.bifurcationSource.removeBifurcation(this);
    }

    if (this.bifurcationTarget) {
      this.bifurcationTarget.removeBifurcation(this);
    }

    super.remove();
  }

  serialize() {
    return {
      ...super.serialize(),
      bifurcations: this.bifurcations.map(b => b.getID()),
      bifurcationSource: this.bifurcationSource
        ? this.bifurcationSource.getID()
        : null,
      bifurcationTarget: this.bifurcationTarget
        ? this.bifurcationTarget.getID()
        : null,
      value: this.value,
    };
  }

  deserialize(event) {
    super.deserialize(event);

    const {
      getModel,
      registerModel,
      data: { bifurcationSource, bifurcationTarget, bifurcations },
    } = event;

    registerModel(this);

    requestAnimationFrame(() => {
      this.points = event.data.points.map(
        point =>
          new PointModel({
            link: this,
            position: new Point(point.x, point.y),
          }),
      );

      bifurcations.forEach(b =>
        getModel(b).then(bifurcation =>
          this.addBifurcation(bifurcation),
        ),
      );

      if (bifurcationSource) {
        getModel(bifurcationSource).then(source =>
          this.setBifurcationSource(source),
        );
      }

      if (bifurcationTarget) {
        getModel(bifurcationTarget).then(target =>
          this.setBifurcationTarget(target),
        );
      }

      event.engine.repaintCanvas();
    });
  }

  addPoint(pointModel, index = 1) {
    super.addPoint(pointModel, index);

    return pointModel;
  }

  getMiddlePoint() {
    if (!this.hasMiddlePoint()) return null;

    return this.getPoints()[1];
  }

  getSecondPoint() {
    return this.getPoints()[1];
  }

  getSecondLastPoint() {
    const points = this.getPoints();
    return points[points.length - 2];
  }

  getFirstPosition() {
    return this.getFirstPoint().getPosition();
  }

  getSecondPosition() {
    return this.getSecondPoint().getPosition();
  }

  getMiddlePosition() {
    if (!this.hasMiddlePoint()) return null;

    return this.getMiddlePoint().getPosition();
  }

  getSecondLastPosition() {
    return this.getSecondLastPoint().getPosition();
  }

  getLastPosition() {
    return this.getLastPoint().getPosition();
  }

  hasMiddlePoint() {
    return this.getPoints().length === 3;
  }

  isStraight() {
    if (!this.hasMiddlePoint()) return true;

    const first = this.getFirstPosition();
    const middle = this.getMiddlePosition();
    const last = this.getLastPosition();

    if (sameAxis(first, middle, last)) return true;

    return false;
  }

  getValue() {
    return this.value;
  }

  setValue(value) {
    this.value = value;
  }

  getColor() {
    if (this.isSelected()) return 'var(--link-selected)';

    if (!isValueValid(this.value)) return 'var(--value-error)';
    if (this.value === 1) return 'var(--value-on)';
    if (this.value === 0) return 'var(--value-off)';

    return 'var(--link-unselected)';
  }
}
