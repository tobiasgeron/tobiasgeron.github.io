// script.js

/* TODO
    - Draw vertical lines at Rcr and barlen. 
    - Show actual animation
    - Add slow/fast/ultrafast
*/


var VflatInput = document.getElementById('Vflat');
var rtInput = document.getElementById('rt');
var omegaInput = document.getElementById('omega');
var RbarInput = document.getElementById('Rbar'); 
var corotationRadiusInfo = document.getElementById('corotationRadiusInfo');
var curlyRInfo = document.getElementById('curlyRInfo');
var corotationRadius = 0;
var curlyR = 0;
var Vsys = 0;
var r0 = 0;
var ctx = document.getElementById('rotationCurveCanvas').getContext('2d');
var chart = null;
var nPrecision = 400; // Number of points for precision 


function velFunc(xdata, Vflat, rt) {
    return Vsys + (2 / Math.PI) * Vflat * Math.atan((xdata - r0) / rt);
}

function omegaTimesRadius(xdata, omega) {
    return omega * xdata;
}

   
function findCorotationRadius(xData) {
    //This basically finds the first intersection between the two curves after 0.
    var corotationRadius = null;
    var maxXaxis = Math.max(...xData);
    var maxArcsec = Math.max(parseFloat(VflatInput.value) / Math.abs(parseFloat(omegaInput.value)) * 1.2, maxXaxis) //Vflat / Omega is the theoretical highest value for Rcr. Add buffer. 
    var previousSign = 1 //They intersect at 0
    for (var i = 0; i <= nPrecision; i ++) {
        var x = i*maxArcsec/nPrecision

        var V = velFunc(x, parseFloat(VflatInput.value), parseFloat(rtInput.value));
        var omegaRadius = Math.abs(parseFloat(omegaInput.value)) * x;
        var difference = V - omegaRadius;

        if (i > 1 && Math.sign(difference) !== previousSign) {
            corotationRadius = x;
            break;
        }
        previousSign = Math.sign(difference)
    }
    return corotationRadius;
}





function updateChart() {
    var xData = [];
    var yData = [];
    var omegaTimesRadiusData = [];
    var xMax = 20


    if (parseFloat(VflatInput.value) < 0) {
        VflatInput.value = 0;
    }
    if (parseFloat(rtInput.value) < 0) {
        rtInput.value = 0;
    }
    if (!omegaInput.value) {
        omegaInput.value = 0;
    }

    for (var x = 0; x <= xMax; x += xMax/nPrecision) {
        xData.push(x);
        var r = x;
        var V = velFunc(r, parseFloat(VflatInput.value), parseFloat(rtInput.value));
        yData.push(V);
        omegaTimesRadiusData.push(Math.abs(parseFloat(omegaInput.value) * r));
    }

    corotationRadius = findCorotationRadius(xData);


    if (corotationRadius !== null) {
        corotationRadiusInfo.textContent = corotationRadius.toFixed(2);
        // Calculate and display curly R
        curlyR = corotationRadius / parseFloat(RbarInput.value);
        curlyRInfo.textContent = curlyR.toFixed(2);
    } else {
        corotationRadiusInfo.textContent = 'N/A';
        curlyRInfo.textContent = 'N/A';
    }

    if (!chart) {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: xData,
                datasets: [{
                    label: 'Rotation Curve',
                    borderColor: 'green',
                    data: yData,
                    fill: false
                }, {
                    label: 'Omega * Radius',
                    borderColor: 'blue',
                    data: omegaTimesRadiusData,
                    fill: false
                }]
            },
            options: {
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Radius [arcsec]'
                        },
                        max: xMax
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Circular velocity [km s-1]'
                        },
                        max: Math.max(Math.round(yData[yData.length - 1]*1.3),400)
                    }
                },
                elements: {
                    line: {
                        tension: 0
                    }
                },

                

            }
        });
    } else {
        chart.data.labels = xData;
        chart.data.datasets[0].data = yData;
        chart.data.datasets[1].data = omegaTimesRadiusData;
        chart.options.scales.x.max = xMax;  // Update x-axis scale
        //chart.options.scales.y.max = Math.round(parseFloat(VflatInput.value)*1.3);// Update y-axis scale
        chart.options.scales.y.max = Math.max(Math.round(yData[yData.length - 1]*1.3),400);

        chart.update();
    }
}

updateChart();

VflatInput.addEventListener('input', updateChart);
rtInput.addEventListener('input', updateChart);
omegaInput.addEventListener('input', updateChart);
RbarInput.addEventListener('input', updateChart);








// For the actual barred galaxy animation

/*
    Note on Omegas: Omega it the pattern speed, i.e. angular frequency, typically in rad/sec. 
    However, in this context, default units are km s-1 kpc-1. This can be interpreted as the 
    velocity in km s-1 at 1 kpc distance from the centre of the galaxy. To convert to units that
    I can plot here, you can do (if Omega = 25 km s-1 kpc-1):

    Om = 25  #km s-1, at one kpc
    Om = Om * 3.24078e-17 #kpc s-1, at one kpc
    Om = Om * 60 * 60 * 24 * 365.25 * 10**6 # kpc Myr-1, at one kpc
    
    which roughly corresponds to dividing the km s-1 kpc-1 by 1000. This implies that one period takes 

    2*np.pi/Om #Myr

    to complete. Or, in other words, if Omega = 25 km s-1 kpc-1, then the change in angle (in rad) in 1 Myr equals
    25 / 1000. So we want 1 s (here) = 1 Myr (real), then 25/1000 is the angle that the animation should do 
    in 1 sec. Seems rather slow. Maybe 1s = 100 Myr?


*/

const canvas = document.getElementById('animationCanvas');
const ctx_animation = canvas.getContext('2d');

// Initial ellipse properties
let centerX = canvas.width / 2;
let centerY = canvas.height / 2;
let pixscale = canvas.width/40 // arcsec / pixel
let barLength = parseFloat(RbarInput.value) * pixscale;
let barWidth = barLength/4;
let rotationAngle = 0;
let relativeTime = 1/1000*100*2 // Om / 1000 is roughly the angle that the bar  covers in 1 Myr. We want to cover 100 Myr per sec, so times that by 200
var timeElapsedInfo = document.getElementById('timeElapsedInfo');
var timeElapsed = 0; //Time elapsed relative to galaxy (1 s real time is approx 100 Myr galaxy time). This unit will be in Gyr

let lastFrameTime = 0;
const frameRate = 60;  // Set your desired frame rate (frames per second)
const frameInterval = 1000 / frameRate;



function drawEllipse(timestamp) {
    // Calculate the time elapsed since the last frame
    const elapsed = timestamp - lastFrameTime;

    // Check if enough time has passed to draw the next frame
    if (elapsed > frameInterval) {

        //Update timeElapsed
        timeElapsed +=  1*relativeTime * elapsed/1000 //Display this in Gyr
        timeElapsedInfo.textContent = timeElapsed.toFixed(1);


        barLength = parseFloat(RbarInput.value)* pixscale;
        barWidth = barLength/4;

        // Clear animation
        ctx_animation.clearRect(0, 0, canvas.width, canvas.height);

        console.log(canvas.width, canvas.height);

        // Update bar
       
        ctx_animation.beginPath();
        ctx_animation.setLineDash([]);
        ctx_animation.ellipse(centerX, centerY, barLength, barWidth, rotationAngle, 0, 2 * Math.PI);
        ctx_animation.stroke();
        if (omegaInput.value) {
            rotationAngle += parseFloat(omegaInput.value)*relativeTime* elapsed/1000; // doing *elapsed/1000 instead of /frameRate to see how much time actually passed.
        }
        


        /*
        // Instead of ellipse, bar can also be rounded rectangle. Seems more convoluted though.
        // Set rectangle properties
        // Calculate the top-left corner coordinates
        const cornerRadius = 20;
        // Save the current transformation matrix
        ctx_animation.save();
        // Rotate the canvas
        if (omegaInput.value) {
            rotationAngle += parseFloat(omegaInput.value)*relativeTime* elapsed/1000;
            console.log(rotationAngle)
            ctx_animation.translate(centerX, centerY);
            ctx_animation.rotate(rotationAngle);
        }
        // Draw the rounded rectangle
        const x = -barLength / 2;
        const y = -barWidth / 2;
        ctx_animation.beginPath();
        ctx_animation.moveTo(x + cornerRadius, y);
        ctx_animation.lineTo(x + barLength - cornerRadius, y);
        ctx_animation.arc(x + barLength - cornerRadius, y + cornerRadius, cornerRadius, -Math.PI / 2, 0);
        ctx_animation.lineTo(x + barLength, y + barWidth - cornerRadius);
        ctx_animation.arc(x + barLength - cornerRadius, y + barWidth - cornerRadius, cornerRadius, 0, Math.PI / 2);
        ctx_animation.lineTo(x + cornerRadius, y + barWidth);
        ctx_animation.arc(x + cornerRadius, y + barWidth - cornerRadius, cornerRadius, Math.PI / 2, Math.PI);
        ctx_animation.lineTo(x, y + cornerRadius);
        ctx_animation.arc(x + cornerRadius, y + cornerRadius, cornerRadius, Math.PI, -Math.PI / 2);
        ctx_animation.closePath();
        ctx_animation.stroke();
        // Restore the transformation matrix
        ctx_animation.restore();    
        */




        // Update corotation radius
        ctx_animation.beginPath();
        ctx_animation.setLineDash([5, 5]);
        ctx_animation.arc(centerX, centerY, corotationRadius*pixscale, 0, 2 * Math.PI);
        ctx_animation.stroke();


        //Update galaxy border 
        ctx_animation.beginPath();
        ctx_animation.setLineDash([]);
        ctx_animation.arc(centerX, centerY, canvas.width/2, 0, 2 * Math.PI);
        ctx_animation.stroke();



        lastFrameTime = timestamp;  // Update last frame time

        // Request the next frame
        requestAnimationFrame(drawEllipse);
    } else {
        // If not enough time has passed, wait for the next frame
        requestAnimationFrame(drawEllipse);
    }
}

// Start the animation
requestAnimationFrame(drawEllipse);