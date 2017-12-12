// The MIT License (MIT)

// Copyright (c) 2017 Zalando SE

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.


function radar_visualization(config) {

  // custom random number generator, to make random sequence reproducible
  // source: https://stackoverflow.com/questions/521295
  var seed = 42;
  function random() {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  function random_between(min, max) {
    return min + random() * (max - min);
  }

  function normal_between(min, max) {
    return min + (random() + random()) * 0.5 * (max - min);
  }

  const upper_ring =  { min: 0,  max: -1, direction: -1};
  const lower_ring =  { min: 1, max: 0, direction: 1 };
  const center_ring = { min: -1,   max: 1, direction: 0};

  const upper_box =  { x_min: -400, x_max: 400, y_min: -15,  y_max: -400 };
  const lower_box =  { x_min: -400, x_max: 400, y_min: 15,   y_max: 400 };
  const center_box = { x_min: -140, x_max: 140, y_min: -140, y_max: 140 };


  const zones = [
    { ring: upper_ring, box: upper_box, radius_max: 400, radius_min: 310 },
    { ring: upper_ring, box: upper_box, radius_max: 310, radius_min: 220 },
    { ring: upper_ring, box: upper_box, radius_max: 220, radius_min: 130 },
    { ring: center_ring, box: upper_box, radius_max: 130, radius_min: 30 },
    { ring: lower_ring, box: lower_box, radius_max: 220, radius_min: 130 },
    { ring: lower_ring, box: lower_box, radius_max: 310, radius_min: 220 },
    { ring: lower_ring, box: lower_box, radius_max: 400, radius_min: 310 }
  ];

  const title_offset =
    { x: -675, y: -420 };

  const footer_offset =
    { x: -675, y: 420 };

  const legend_offset = [
    { x: -675, y: -310 },
    { x: -675, y: 0 },
    { x: -675, y: 110 },
    { x: 0,    y: 460 },
    { x: 450, y: -310 },
    { x: 450, y: 0},
    { x: 450, y: 110 }
  ];

  function polar(cartesian) {
    var x = cartesian.x;
    var y = cartesian.y;
    return {
      t: Math.atan2(y, x),
      r: Math.sqrt(x * x + y * y)
    }
  }

  function cartesian(polar) {
    return {
      x: polar.r * Math.cos(polar.t),
      y: polar.r * Math.sin(polar.t)
    }
  }

  function bounded_interval(value, min, max) {
    var low = Math.min(min, max);
    var high = Math.max(min, max);
    return Math.min(Math.max(value, low), high);
  }


  function bounded_ring(polar, r_min, r_max) {
    return {
      t: polar.t,
      r: bounded_interval(polar.r, r_min, r_max)
    }
  }

  function bounded_box(point, min, max) {
    return {
      x: bounded_interval(point.x, min.x, max.x),
      y: bounded_interval(point.y, min.y, max.y)
    }
  }

  function segment(zone_id) {
    var polar_min = {
      t: zones[zone_id].ring.min * Math.PI,
      r: zones[zone_id].radius_min
    };
    var polar_max = {
      t: zones[zone_id].ring.max * Math.PI,
      r: zones[zone_id].radius_max
    };
    var cartesian_min = {
      x: zones[zone_id].box.x_min,
      y: zones[zone_id].box.y_min
    };
    var cartesian_max = {
      x: zones[zone_id].box.x_max,
      y: zones[zone_id].box.y_max
    };
    return {
      clipx: function(d) {
        var c = bounded_box(d, cartesian_min, cartesian_max);
        var p = bounded_ring(polar(c), polar_min.r + 15, polar_max.r - 15);
        d.x = cartesian(p).x; // adjust data too!
        return d.x;
      },
      clipy: function(d) {
        var c = bounded_box(d, cartesian_min, cartesian_max);
        var p = bounded_ring(polar(c), polar_min.r + 15, polar_max.r - 15);
        d.y = cartesian(p).y; // adjust data too!
        return d.y;
      },
      random: function() {
        return cartesian({
          t: random_between(polar_min.t, polar_max.t),
          r: normal_between(polar_min.r, polar_max.r)
        });
      }
    }
  }

  // position each entry randomly in its segment
  for (var i = 0; i < config.entries.length; i++) {
    var entry = config.entries[i];
    entry.segment = segment(entry.zone);
    var point = entry.segment.random();
    entry.x = point.x;
    entry.y = point.y;
    entry.color = entry.active || config.print_layout ?
      config.zones[entry.zone].color : config.colors.inactive;
  }

  // partition entries according to segments
  var segmented = new Array(7);
  for (var zone = 0; zone < 7; zone++) {
    segmented[zone] = [];
  }
  for (var i=0; i<config.entries.length; i++) {
    var entry = config.entries[i];
    segmented[entry.zone].push(entry);
  }

  // assign unique sequential id to each entry
  var id = 1;
  for (var zone = 0; zone < 7; zone++) {
      var entries = segmented[zone];
      entries.sort(function(a,b) { return a.label.localeCompare(b.label); })
      for (var i=0; i<entries.length; i++) {
        entries[i].id = "" + id++;
      }
  }

  function translate(x, y) {
    return "translate(" + x + "," + y + ")";
  }
/*
  function viewbox(quadrant) {
    return [
      Math.max(0, quadrants[quadrant].factor_x * 400) - 420,
      Math.max(0, quadrants[quadrant].factor_y * 400) - 420,
      440,
      440
    ].join(" ");
  }
*/
  var svg = d3.select("svg#" + config.svg_id)
    .style("background-color", config.colors.background)
    .attr("width", config.width)
    .attr("height", config.height);

  var radar = svg.append("g");
//  if ("zoomed_quadrant" in config) {
//    svg.attr("viewBox", viewbox(config.zoomed_quadrant));
//  } else {
    radar.attr("transform", translate(config.width / 2, config.height / 2));
//  }

  var grid = radar.append("g");

  // draw grid lines
// FIXME
  grid.append("line")
    .attr("x1", 0).attr("y1", -400)
    .attr("x2", 0).attr("y2", 400)
    .style("stroke", config.colors.grid)
    .style("stroke-width", 1);
  grid.append("line")
    .attr("x1", -400).attr("y1", 0)
    .attr("x2", -130).attr("y2", 0)
    .style("stroke", config.colors.grid)
    .style("stroke-width", 3);
  grid.append("line")
    .attr("x1", -130).attr("y1", 0)
    .attr("x2", 130).attr("y2", 0)
    .style("stroke", config.colors.grid)
    .style("stroke-width", 1);
  grid.append("line")
    .attr("x1", 130).attr("y1", 0)
    .attr("x2", 400).attr("y2", 0)
    .style("stroke", config.colors.grid)
    .style("stroke-width", 3);

  // draw rings
  for (var i = 0; i < zones.length; i++) {
    grid.append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", zones[i].radius_max)
      .style("fill", "none")
      .style("stroke", config.colors.grid)
      .style("stroke-width", 3);
    if (config.print_layout) {
      grid.append("text")
        .text(config.zones[i].name)
        .attr("y", zones[i].ring.direction * (zones[i].radius_max - 52))
        .attr("text-anchor", "middle")
        .style("fill", "#e5e5e5")
        .style("font-family", "Arial, Helvetica")
        .style("font-size", 42)
        .style("font-weight", "bold")
        .style("pointer-events", "none")
        .style("user-select", "none");
    }
  }

// ??
  function legend_transform(quadrant, ring, index=null) {
    var dx = ring < 2 ? 0 : 120;
    var dy = (index == null ? -16 : index * 12);
    if (ring % 2 == 1) {
      dy = dy + 36 + segmented[quadrant][ring-1].length * 12;
    }
    return translate(
      legend_offset[quadrant].x + dx,
      legend_offset[quadrant].y + dy
    );
  }

  // draw title and legend (only in print layout)
  if (config.print_layout) {

    // title
    radar.append("text")
      .attr("transform", translate(title_offset.x, title_offset.y))
      .text(config.title)
      .style("font-family", "Arial, Helvetica")
      .style("font-size", "34");

    // footer
    radar.append("text")
      .attr("transform", translate(footer_offset.x, footer_offset.y))
      .text("▲ moved up     ▼ moved down")
      .attr("xml:space", "preserve")
      .style("font-family", "Arial, Helvetica")
      .style("font-size", "10");

    // legend
    var legend = radar.append("g");
    for (var zone_id = 0; zone_id < 7; zone_id++) {
      legend.append("text")
        .attr("transform", translate(
          legend_offset[zone_id].x,
          legend_offset[zone_id].y - 45
        ))
        .text(config.zones[zone_id].name)
        .style("font-family", "Arial, Helvetica")
        .style("font-size", "18");
    }
  }

  // layer for entries
  var rink = radar.append("g")
    .attr("id", "rink");

  // rollover bubble (on top of everything else)
  var bubble = radar.append("g")
    .attr("id", "bubble")
    .attr("x", 0)
    .attr("y", 0)
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("user-select", "none");
  bubble.append("rect")
    .attr("rx", 4)
    .attr("ry", 4)
    .style("fill", "#333");
  bubble.append("text")
    .style("font-family", "sans-serif")
    .style("font-size", "10px")
    .style("fill", "#fff");
  bubble.append("path")
    .attr("d", "M 0,0 10,0 5,8 z")
    .style("fill", "#333");

  function showBubble(d) {
    if (d.active || config.print_layout) {
      var tooltip = d3.select("#bubble text")
        .text(d.label);
      var bbox = tooltip.node().getBBox();
      d3.select("#bubble")
        .attr("transform", translate(d.x - bbox.width / 2, d.y - 16))
        .style("opacity", 0.8);
      d3.select("#bubble rect")
        .attr("x", -5)
        .attr("y", -bbox.height)
        .attr("width", bbox.width + 10)
        .attr("height", bbox.height + 4);
      d3.select("#bubble path")
        .attr("transform", translate(bbox.width / 2 - 5, 3));
    }
  }

  function CalculateStarPoints(arms, outerRadius, innerRadius)
{
   var results = "";

   var angle = Math.PI / arms;

   for (var i = 0; i < 2 * arms; i++)
   {
      // Use outer or inner radius depending on what iteration we are in.
      var r = (i & 1) == 0 ? outerRadius : innerRadius;
      
      var currX = Math.cos(i * angle) * r;
      var currY = Math.sin(i * angle) * r;

      // Our first time we simply append the coordinates, subsequet times
      // we append a ", " to distinguish each coordinate pair.
      if (i == 0)
      {
         results = "M " + currX + "," + currY;
      }
      else
      {
         results += ", " + currX + "," + currY;
      }
   }

   return results;
}

  function hideBubble(d) {
    var bubble = d3.select("#bubble")
      .attr("transform", translate(0,0))
      .style("opacity", 0);
  }

  // draw blips on radar
  var blips = rink.selectAll(".blip")
    .data(config.entries)
    .enter()
      .append("g")
        .attr("class", "blip")
        .on("mouseover", showBubble)
        .on("mouseout", hideBubble);

  blips.each(function(d) {
    var blip = d3.select(this);
    if (!config.print_layout && d.active && d.hasOwnProperty("link")) {
      blip.append("a")
        .attr("xlink:href", d.link);
    }

    var size = 9;
    if (d.moved) {
      blip.append("path")
       .attr("d", CalculateStarPoints(5, 6, 13))
       .style("fill", d.color);
    } else {
      blip.append("circle")
        .attr("r", 9)
        .attr("fill", d.color);
    }
    
  });

  if (config.print_layout) {
    blips
      .append("text")
        .text(function(d) { return d.id; })
        .attr("y", 3)
        .attr("text-anchor", "middle")
        .style("fill", "#fff")
        .style("font-family", "Arial, Helvetica")
        .style("font-size", function(d) { return d.id.length > 2 ? "8" : "9"; })
        .style("pointer-events", "none")
        .style("user-select", "none");
  }

  // make sure that blips stay inside their segment
  function ticked() {
    blips.attr("transform", function(d) {
      return translate(d.segment.clipx(d), d.segment.clipy(d));
    })
  }

  // distribute blips, while avoiding collisions
  d3.forceSimulation()
    .nodes(config.entries)
    .velocityDecay(0.3) // magic number (found by experimentation)
    .force("collision", d3.forceCollide().radius(12).strength(0.85))
    .on("tick", ticked);
}
