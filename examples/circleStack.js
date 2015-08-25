(function() {

    var World = Matter.World,
        Bodies = Matter.Bodies,
        Composites = Matter.Composites;

    Example.circleStack = function(demo) {
        var engine = demo.engine,
            world = engine.world;
        
        var stack = Composites.stack(100, 100, 10, 10, 20, 0, function(x, y, column, row) {
            return Bodies.circle(x, y, 20);
        });
        
        World.add(world, stack);
    };

})();