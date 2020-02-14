import { Point } from '@projectstorm/geometry';

export const snap = (position, gridSize = 15) => {
  if (position instanceof Point) {
    return new Point(
      Math.round(position.x / gridSize) * gridSize,
      Math.round(position.y / gridSize) * gridSize,
    );
  }

  return Math.round(position / gridSize) * gridSize;
};

export const samePosition = (p1, p2) =>
  p1 && p2 && p1.x === p2.x && p1.y === p2.y;

export const sameX = (...points) =>
  points.map(p => p.x).every((p, i, arr) => p === arr[0]);

export const sameY = (...points) =>
  points.map(p => p.y).every((p, i, arr) => p === arr[0]);

export const sameAxis = (...points) =>
  sameX(...points) || sameY(...points);

export const nearby = (p1, p2, tolerance) =>
  Math.abs(p1.x - p2.x) <= tolerance &&
  Math.abs(p1.y - p2.y) <= tolerance;

const distance = (A, B) => Math.hypot(A.x - B.x, A.y - B.y);

const closestPointOnSegment = (P, segment) => {
  const { A, B } = segment;

  const v = new Point(B.x - A.x, B.y - A.y);
  const u = new Point(A.x - P.x, A.y - P.y);

  const vu = v.x * u.x + v.y * u.y;
  const vv = v.x ** 2 + v.y ** 2;

  const t = -vu / vv;

  // Closest point lies between A and B
  if (t >= 0 && t <= 1) {
    const closest = new Point(
      (1 - t) * A.x + t * B.x,
      (1 - t) * A.y + t * B.y,
    );
    return {
      point: closest,
      distance: distance(P, closest),
    };
  }

  // Closest point is either A or B
  const distanceToA = distance(P, A);
  const distanceToB = distance(P, B);

  return distanceToA <= distanceToB
    ? { point: A, distance: distanceToA }
    : { point: B, distance: distanceToB };
};

export const closestPointToLink = (P, link) => {
  if (!link.hasMiddlePoint()) {
    return closestPointOnSegment(P, {
      A: link.getFirstPosition(),
      B: link.getLastPosition(),
    }).point;
  }

  const firstSegment = closestPointOnSegment(P, {
    A: link.getFirstPosition(),
    B: link.getMiddlePosition(),
  });

  const lastSegment = closestPointOnSegment(P, {
    A: link.getMiddlePosition(),
    B: link.getLastPosition(),
  });

  if (firstSegment.distance <= lastSegment.distance) {
    return firstSegment.point;
  }
  return lastSegment.point;
};

const isPointOverSegment = (point, segment) => {
  const { A, B } = segment;

  if (sameX(A, point, B)) {
    const max = Math.max(A.y, B.y);
    const min = Math.min(A.y, B.y);

    return min <= point.y && point.y <= max;
  }

  if (sameY(A, point, B)) {
    const max = Math.max(A.x, B.x);
    const min = Math.min(A.x, B.x);

    return min <= point.x && point.x <= max;
  }

  return false;
};

export const isPointOverFirstLinkSegment = (point, link) =>
  isPointOverSegment(point, {
    A: link.getFirstPosition(),
    B: link.getSecondPosition(),
  });

export const isPointOverSecondLinkSegment = (point, link) => {
  if (!link.hasMiddlePoint()) return false;

  return isPointOverSegment(point, {
    A: link.getSecondPosition(),
    B: link.getLastPosition(),
  });
};

export const isPointOverLink = (point, link) =>
  isPointOverFirstLinkSegment(point, link) ||
  isPointOverSecondLinkSegment(point, link);

const getRelativePoint = (point, model) => {
  const zoomLevelPercentage = model.getZoomLevel() / 100;
  const engineOffsetX = model.getOffsetX() / zoomLevelPercentage;
  const engineOffsetY = model.getOffsetY() / zoomLevelPercentage;

  return new Point(point.x - engineOffsetX, point.y - engineOffsetY);
};

export const nextLinkPosition = (
  event,
  model,
  initialRelative,
  sourcePosition,
) => {
  const point = getRelativePoint(sourcePosition, model);

  const zoomLevelPercentage = model.getZoomLevel() / 100;
  const initialXRelative = initialRelative.x / zoomLevelPercentage;
  const initialYRelative = initialRelative.y / zoomLevelPercentage;

  const linkNextX =
    point.x +
    (initialXRelative - sourcePosition.x) +
    event.virtualDisplacementX;
  const linkNextY =
    point.y +
    (initialYRelative - sourcePosition.y) +
    event.virtualDisplacementY;

  return snap(
    new Point(linkNextX, linkNextY),
    model.options.gridSize,
  );
};

export function handleMouseMoved(event, link) {
  const first = link.getFirstPosition();
  const last = link.getLastPosition();

  const nextPosition = nextLinkPosition(
    event,
    this.engine.getModel(),
    { x: this.initialXRelative, y: this.initialYRelative },
    first,
  );

  if (!this.hasStartedMoving && samePosition(first, last)) {
    /**
     * For some reason, inputs are only valid after the first and last
     * position are equals once. Before that, the last position is
     * (0, 0).
     */
    this.hasStartedMoving = true;
  }

  if (this.hasStartedMoving) {
    if (!link.hasMiddlePoint()) {
      if (last.x !== nextPosition.x) {
        if (!this.moveDirection) {
          this.moveDirection = 'horizontal';
        }

        if (this.moveDirection === 'vertical') {
          link.addPoint(link.generatePoint(last.x, last.y), 1);
        }
      } else if (last.y !== nextPosition.y) {
        if (!this.moveDirection) {
          this.moveDirection = 'vertical';
        }

        if (this.moveDirection === 'horizontal') {
          link.addPoint(link.generatePoint(last.x, last.y), 1);
        }
      }
    } else if (link.hasMiddlePoint()) {
      const middle = link.getMiddlePosition();

      if (samePosition(middle, last)) {
        link.removePoint(link.getMiddlePoint());
      } else if (samePosition(first, middle)) {
        link.removePoint(link.getMiddlePoint());
        this.moveDirection =
          this.moveDirection === 'horizontal'
            ? 'vertical'
            : 'horizontal';
      } else if (this.moveDirection === 'horizontal') {
        if (last.x !== nextPosition.x) {
          link.getMiddlePoint().setPosition(nextPosition.x, first.y);
        }
      } else if (this.moveDirection === 'vertical') {
        if (last.y !== nextPosition.y) {
          link.getMiddlePoint().setPosition(first.x, nextPosition.y);
        }
      }
    }
  }

  /**
   * Sometimes, user input may be fast enough to skip the creation of
   * a middle point. If this happens, we add it here.
   */
  if (
    !link.hasMiddlePoint() &&
    first.x !== nextPosition.x &&
    first.y !== nextPosition.y
  ) {
    if (samePosition(first, last)) {
      link.addPoint(link.generatePoint(nextPosition.x, first.y), 1);
    } else {
      link.addPoint(link.generatePoint(last.x, last.y), 1);
    }
  }

  link.getLastPoint().setPosition(nextPosition.x, nextPosition.y);

  this.engine.repaintCanvas();
}

export function handleReverseBifurcation(link, landingLink) {
  if (link.getBifurcationSource()) {
    // Link to link bifurcation
    link.setBifurcationTarget(landingLink);
    landingLink.addBifurcation(link);
    landingLink.setSelected(true);
  } else {
    // Port to link bifurcation
    const reverseLink = this.engine
      .getFactoryForLink(landingLink)
      .generateModel();
    reverseLink.setPoints(link.getPoints().reverse());
    reverseLink.setTargetPort(link.getSourcePort());
    reverseLink.setBifurcationSource(landingLink);

    landingLink.addBifurcation(reverseLink);
    landingLink.setSelected(true);

    link.remove();
    this.engine.getModel().addLink(reverseLink);
  }
}

export const getBifurcationLandingLink = (link, engine) => {
  const point = link.getLastPoint().getPosition();

  return Object.values(
    engine
      .getModel()
      .getLinkLayers()[0]
      .getLinks(),
  ).find(target => {
    if (target.getID() === link.getID()) return false;
    return isPointOverLink(point, target);
  });
};
