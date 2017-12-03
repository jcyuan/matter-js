/**
* The `Matter.SAT` module contains methods for detecting collisions using the Separating Axis Theorem.
*
* @class SAT
*/

// TODO: true circles and curves

var SAT = {};

module.exports = SAT;

var Vertices = require('../geometry/Vertices');
var Vector = require('../geometry/Vector');

(function() {

    /**
     * Detect collision between two bodies using the Separating Axis Theorem.
     * @method collides
     * @param {body} bodyA
     * @param {body} bodyB
     * @param {collision} previousCollision
     * @return {collision} collision
     */
    SAT.collides = function(bodyA, bodyB) {
        var overlapAB,
            overlapBA, 
            minOverlap;

        overlapAB = _overlapAxes(bodyA.vertices, bodyB.vertices, bodyA.axes);

        if (overlapAB.overlap <= 0) {
            return null;
        }

        overlapBA = _overlapAxes(bodyB.vertices, bodyA.vertices, bodyB.axes);

        if (overlapBA.overlap <= 0) {
            return null;
        }

        var collision = {};

        if (overlapAB.overlap < overlapBA.overlap) {
            minOverlap = overlapAB;
            collision.axisBody = bodyA;
        } else {
            minOverlap = overlapBA;
            collision.axisBody = bodyB;
        }

        var depth = minOverlap.overlap;

        // important for reuse later
        collision.axisNumber = minOverlap.axisNumber;

        collision.bodyA = bodyA.id < bodyB.id ? bodyA : bodyB;
        collision.bodyB = bodyA.id < bodyB.id ? bodyB : bodyA;
        collision.depth = depth;
        collision.parentA = collision.bodyA.parent;
        collision.parentB = collision.bodyB.parent;
        
        bodyA = collision.bodyA;
        bodyB = collision.bodyB;

        // ensure normal is facing away from bodyA
        var normal;
        var positionA = bodyA.position;
        var positionB = bodyB.position;
        var axis = minOverlap.axis;
        if (axis.x * (positionB.x - positionA.x) + axis.y * (positionB.y - positionA.y) < 0) {
            normal = {
                x: axis.x,
                y: axis.y
            };
        } else {
            normal = {
                x: -axis.x,
                y: -axis.y
            };
        }

        collision.normal = normal;

        collision.tangent = {
            x: -normal.y,
            y: normal.x
        };

        collision.penetration = {
            x: normal.x * depth,
            y: normal.y * depth
        };

        // find support points, there is always either exactly one or two
        var verticesB = _findSupports(bodyA, bodyB, normal),
            supports = [];

        // find the supports from bodyB that are inside bodyA
        if (Vertices.contains(bodyA.vertices, verticesB[0]))
            supports.push(verticesB[0]);

        if (Vertices.contains(bodyA.vertices, verticesB[1]))
            supports.push(verticesB[1]);

        // find the supports from bodyA that are inside bodyB
        if (supports.length < 2) {
            var verticesA = _findSupports(bodyB, bodyA, Vector.neg(normal));
                
            if (Vertices.contains(bodyB.vertices, verticesA[0]))
                supports.push(verticesA[0]);

            if (supports.length < 2 && Vertices.contains(bodyB.vertices, verticesA[1]))
                supports.push(verticesA[1]);
        }

        // account for the edge case of overlapping but no vertex containment
        if (supports.length < 1)
            supports = [verticesB[0]];
        
        collision.supports = supports;

        return collision;
    };

    /**
     * Find the overlap between two sets of vertices.
     * @method _overlapAxes
     * @private
     * @param {} verticesA
     * @param {} verticesB
     * @param {} axes
     * @return result
     */
    var _overlapAxes = function(verticesA, verticesB, axes) {
        var projectionA = Vector._temp[0], 
            projectionB = Vector._temp[1],
            result = { overlap: Number.MAX_VALUE },
            overlap,
            axis;

        for (var i = 0; i < axes.length; i++) {
            axis = axes[i];

            _projectToAxis(projectionA, verticesA, axis);
            _projectToAxis(projectionB, verticesB, axis);

            overlap = Math.min(projectionA.max - projectionB.min, projectionB.max - projectionA.min);

            if (overlap <= 0) {
                result.overlap = overlap;
                return result;
            }

            if (overlap < result.overlap) {
                result.overlap = overlap;
                result.axis = axis;
                result.axisNumber = i;
            }
        }

        return result;
    };

    /**
     * Projects vertices on an axis and returns an interval.
     * @method _projectToAxis
     * @private
     * @param {} projection
     * @param {} vertices
     * @param {} axis
     */
    var _projectToAxis = function(projection, vertices, axis) {
        var min = Vector.dot(vertices[0], axis),
            max = min;

        for (var i = 1; i < vertices.length; i += 1) {
            var dot = Vector.dot(vertices[i], axis);

            if (dot > max) { 
                max = dot; 
            } else if (dot < min) { 
                min = dot; 
            }
        }

        projection.min = min;
        projection.max = max;
    };
    
    /**
     * Finds supporting vertices given two bodies along a given direction using hill-climbing.
     * @method _findSupports
     * @private
     * @param {} bodyA
     * @param {} bodyB
     * @param {} normal
     * @return [vector]
     */
    var _findSupports = function(bodyA, bodyB, normal) {
        var nearestDistance = Number.MAX_VALUE,
            vertexToBodyX,
            vertexToBodyY,
            vertices = bodyB.vertices,
            bodyAPosition = bodyA.position,
            bodyAPositionX = bodyAPosition.x,
            bodyAPositionY = bodyAPosition.y,
            distance,
            vertex,
            vertexA,
            vertexB;

        // find closest vertex on bodyB
        for (var i = 0; i < vertices.length; i++) {
            vertex = vertices[i];
            vertexToBodyX = vertex.x - bodyAPositionX;
            vertexToBodyY = vertex.y - bodyAPositionY;
            distance = -(normal.x * vertexToBodyX + normal.y * vertexToBodyY);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                vertexA = vertex;
            }
        }

        // find next closest vertex using the two connected to it
        var prevIndex = vertexA.index - 1 >= 0 ? vertexA.index - 1 : vertices.length - 1;
        vertex = vertices[prevIndex];
        vertexToBodyX = vertex.x - bodyAPositionX;
        vertexToBodyY = vertex.y - bodyAPositionY;
        nearestDistance = -(normal.x * vertexToBodyX + normal.y * vertexToBodyY);
        vertexB = vertex;

        var nextIndex = (vertexA.index + 1) % vertices.length;
        vertex = vertices[nextIndex];
        vertexToBodyX = vertex.x - bodyAPositionX;
        vertexToBodyY = vertex.y - bodyAPositionY;
        distance = -(normal.x * vertexToBodyX + normal.y * vertexToBodyY);
        if (distance < nearestDistance) {
            vertexB = vertex;
        }

        return [vertexA, vertexB];
    };

})();
