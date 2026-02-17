// script.js
/* 
We use plotly for drawing the figures. See plotly documentation here: https://plotly.com/javascript/
*/

/* TODO
    - Draw vertical lines at Rcr and barlen. 
    - Add ideas for them to try out: e.g. make corotation so small it disappears (i.e. bar rotates so fast relative to disc that Rcr approaches 0.), note that, if you increase Omega, Rcr shrinks. 

*/




/* Config and inputs from HTML */

var VflatInput = document.getElementById('Vflat');
var rtInput = document.getElementById('rt');
var VsysInput = document.getElementById('Vsys');
var paInput = document.getElementById('pa');
var rmaxInput = document.getElementById('rmax');
var precisionInput = document.getElementById('precision');
var incInput = document.getElementById('inc');
var warpInput = document.getElementById('warp');


var nPrecision = 400; // Number of points for precision 



const layoutRotationCurve = {
    title: {text: 'Rotation Curve'},
    xaxis: {title:{text: 'Radius [arcsec]'}},
    yaxis: {title:{text:'Velocity [km s-1]'}},
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'

}

const layoutVelocityField = {
    title: {text: 'Velocity Field'},
    xaxis: {title:{text: 'X [arcsec]'}},
    yaxis: {title:{text:'Y [arcsec]'}},
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
}




const configRotationCurve = {
    staticPlot: true
}




/* Load and update graphs */



updateCharts();

VflatInput.addEventListener('input', updateCharts);
rtInput.addEventListener('input', updateCharts);
VsysInput.addEventListener('input', updateCharts);
paInput.addEventListener('input', updateCharts);
rmaxInput.addEventListener('input', updateCharts);
precisionInput.addEventListener('input', updateCharts);
incInput.addEventListener('input', updateCharts);
warpInput.addEventListener('input', updateCharts);







/* Graph functions */





function rotationCurveFunc(xdata, Vflat, rt, Vsys) {
    var r0 = 0;
    return Vsys + (2 / Math.PI) * Vflat * Math.atan((xdata - r0) / rt);
}




function cart2pol(x, y) {
    return {
        r: Math.sqrt(x*x + y*y),
        theta: Math.atan2(y, x)
    };
}



function velocityFieldFunc(rMax, Vflat, rt, PA, inc, precision, Vsys, warp) {

    var xCoords = [];
    var yCoords = [];
    var velField = [];
    
    PA = PA * (Math.PI / 180); /*Convert to radians*/
    inc = inc * (Math.PI / 180); /*Convert to radians*/
    


    for (var x = -rMax; x <= rMax; x += precision) {

        var y_list = []
        for (var y = -rMax; y <= rMax; y += precision) {
                var polar = cart2pol(x,y);
                var r = polar.r;
                var theta = polar.theta;

                if (r < rMax) {
                    phi = theta- PA;

                    var totalWarp = (warp * r)* (Math.PI / 180);

                    phi = phi - totalWarp

                    v = Vsys + 2/Math.PI * Vflat*Math.atan(r / rt)*Math.cos(phi)*Math.sin(inc)
                    y_list.push(v)
                } else {
                    y_list.push(null)
                }



        }
        
        velField.push(y_list)
    }



    for (var x = -rMax; x <= rMax; x += precision) {
        xCoords.push(x);
    }
 
    for (var y = -rMax; y <= rMax; y += precision) {
        yCoords.push(y);
    }


    return {
        xCoords: xCoords,
        yCoords: yCoords,   
        velField: velField
    };
    
}




function updateCharts() {

    /* Get inputs */
    if (parseFloat(VflatInput.value) < 0) {
        VflatInput.value = 0;
    }
    if (parseFloat(rtInput.value) < 0) {
        rtInput.value = 0;
    }

    if (parseFloat(VsysInput.value) < 0) {
        VsysInput.value = 0;
    }

    if (parseFloat(precisionInput.value) <= 0.1) {
        precisionInput.value = 0.1;
    }

    if (parseFloat(incInput.value) < 0) {
        incInput.value = 0;
    }

    if (parseFloat(incInput.value) > 90) {
        incInput.value = 90;
    }


    /* Rotation curve */

    var xData = [];
    var yData = [];


    for (var x = 0; x <= parseFloat(rmaxInput.value); x += parseFloat(precisionInput.value)) {
        xData.push(x);
        var r = x;
        var V = rotationCurveFunc(r, parseFloat(VflatInput.value), parseFloat(rtInput.value), parseFloat(VsysInput.value));
        yData.push(V);
    }

    rotationCurve = document.getElementById('rotationCurve');
    Plotly.newPlot(rotationCurve, [{
    x: xData,
    y: yData}], 
    layoutRotationCurve, 
    configRotationCurve);





    /* Velocity Field */
    velocityField = document.getElementById('velocityField');
    var rMax = 20;

    results = velocityFieldFunc(
                                parseFloat(rmaxInput.value), parseFloat(VflatInput.value), parseFloat(rtInput.value), 
                                parseFloat(paInput.value), parseFloat(incInput.value), parseFloat(precisionInput.value),
                                parseFloat(VsysInput.value), parseFloat(warpInput.value));


    // Flatten the 2D array and find the absolute max value
    const allValues = results.velField.flat().filter(v => v !== null);
    const maxAbsV = Math.max(...allValues.map(Math.abs));


    var data = [
    {
        x: results.xCoords,
        y : results.yCoords,
        z: results.velField,
        type: 'heatmap',
        zmin: -maxAbsV,
        zmax: maxAbsV,
        colorscale: 'RdBu', // Diverging scale
        colorbar: {
            title: {text: 'Velocity [km s<sup>-1</sup>]',
                    side: 'right'
            },
        }
    }
    ];

    Plotly.newPlot(velocityField, 
        data, 
        layoutVelocityField, 
        configRotationCurve);

}






            









